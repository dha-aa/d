const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const galleryDir = path.join(__dirname, '../gallery');
const thumbDir = path.join(galleryDir, 'thumbs');
const templatePath = path.join(__dirname, '../templates/gallery-template.html');
const outputPath = path.join(__dirname, '../gallery/index.html');

// Image extensions to include
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

// Small previews are made for these; others (animated gif, svg) are used as-is.
const thumbExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
const THUMB_SIZE = 900; // longest side, px
const THUMB_QUALITY = 72;

// Extract date from filename
function extractDate(filename) {
  // Try various date patterns
  const patterns = [
    /IMG_(\d{4})(\d{2})(\d{2})/, // IMG_YYYYMMDD
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /Screenshot_(\d{4})_(\d{2})_(\d{2})/, // Screenshot_YYYY_MM_DD
    /Videoshot_(\d{4})(\d{2})(\d{2})/, // Videoshot_YYYYMMDD
    /Firefly (\d{4})(\d{2})(\d{2})/, // Firefly YYYYMMDD
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return new Date(`${year}-${month}-${day}`);
    }
  }

  // If no date found, return null (will be sorted last)
  return null;
}

// Get year from date
function getYear(date) {
  return date ? date.getFullYear() : null;
}

// Format date for alt text
function formatDate(date) {
  if (!date) return 'Undated';
  const options = { year: 'numeric', month: 'long' };
  return date.toLocaleDateString('en-US', options);
}

// Small fixed tilt so output is the same on every run.
function tiltFor(i) {
  return ((((i * 37) % 7) - 3) * 0.8).toFixed(1);
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ---------- thumbnails ----------
// Full photos are several MB each; pages show gallery/thumbs/<file>.jpg
// instead and open the full photo on click. Thumbnails are made with
// macOS `sips`. Where it is missing, existing thumbnails are kept and
// photos without one fall back to the original file.

let haveSips = true;
function sips(args) {
  if (!haveSips) return null;
  try {
    return execFileSync('sips', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    if (err.code === 'ENOENT') {
      haveSips = false;
      console.warn('⚠️  sips not found: new photos will use the full-size file until thumbnails are made on a Mac');
    }
    return null;
  }
}

function thumbName(file) {
  return file + '.jpg';
}

function makeThumb(file) {
  if (!thumbExtensions.includes(path.extname(file).toLowerCase())) return null;
  const src = path.join(galleryDir, file);
  const out = path.join(thumbDir, thumbName(file));
  const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
  if (!fresh) {
    sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', String(THUMB_QUALITY),
      '-Z', String(THUMB_SIZE), src, '--out', out]);
  }
  return fs.existsSync(out) ? out : null;
}

// Pixel size, so the page can reserve space before the image loads.
function sizeOf(file) {
  const info = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  const w = info && info.match(/pixelWidth: (\d+)/);
  const h = info && info.match(/pixelHeight: (\d+)/);
  return w && h ? { w: w[1], h: h[1] } : null;
}

function removeStaleThumbs(images) {
  const keep = new Set(images.map(thumbName));
  fs.readdirSync(thumbDir)
    .filter(f => !f.startsWith('.') && !keep.has(f))
    .forEach(f => fs.unlinkSync(path.join(thumbDir, f)));
}

// Homepage gallery section: index.html, between the HOME_GALLERY markers.
// Only the newest HOME_VISIBLE photos go on the homepage; the rest are on
// gallery/index.html, linked from the "See all photos" button.
const homePath = path.join(__dirname, '../index.html');
const HOME_VISIBLE = 9;

function updateHomepage(photos) {
  if (!fs.existsSync(homePath)) return;
  const home = fs.readFileSync(homePath, 'utf8');
  const markers = /<!-- HOME_GALLERY:START -->[\s\S]*?<!-- HOME_GALLERY:END -->/;
  if (!markers.test(home)) {
    throw new Error('index.html is missing HOME_GALLERY markers');
  }

  const items = photos.slice(0, HOME_VISIBLE).map((p, i) => {
    const label = escapeAttr(p.label);
    return `
        <button class="polaroid" type="button" style="--r:${tiltFor(i)}deg" data-full="${escapeAttr('gallery/' + p.full)}" aria-label="Open photo: ${label}">
          <img src="${escapeAttr('gallery/' + p.thumb)}"${p.dims} alt="${label}" loading="lazy" decoding="async">
          <span>${label}</span>
        </button>`;
  }).join('');

  fs.writeFileSync(homePath, home.replace(markers,
    `<!-- HOME_GALLERY:START -->${items}\n        <!-- HOME_GALLERY:END -->`));
  console.log(`✅ Updated homepage gallery with ${Math.min(photos.length, HOME_VISIBLE)} of ${photos.length} images`);
}

// Generate gallery HTML
function generateGallery() {
  fs.mkdirSync(thumbDir, { recursive: true });

  // Read gallery directory
  const files = fs.readdirSync(galleryDir);

  // Filter image files (exclude .DS_Store and non-images)
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext) && !file.startsWith('.');
  });

  // Sort by date (newest first), then by name so the order is stable
  const sortedImages = imageFiles.sort((a, b) => {
    const dateA = extractDate(a);
    const dateB = extractDate(b);

    if (!dateA && !dateB) return a.localeCompare(b);
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateB - dateA || a.localeCompare(b);
  });

  removeStaleThumbs(sortedImages);

  const photos = sortedImages.map(file => {
    const thumbPath = makeThumb(file);
    const size = thumbPath && sizeOf(thumbPath);
    const date = extractDate(file);
    return {
      file,
      date,
      label: formatDate(date),
      full: encodeURI(file),
      thumb: thumbPath ? 'thumbs/' + encodeURI(thumbName(file)) : encodeURI(file),
      dims: size ? ` width="${size.w}" height="${size.h}"` : '',
    };
  });

  // Generate gallery items
  let html = '';
  let lastYear = null;

  photos.forEach((p, index) => {
    const year = getYear(p.date);

    // Add year label before first image of new year
    if (year && year !== lastYear) {
      html += `    <div class="gallery-label">${year}</div>\n`;
      lastYear = year;
    }

    html += `    <a class="gallery-item" href="${escapeAttr(p.full)}" style="transform: rotate(${tiltFor(index)}deg);">
      <img src="${escapeAttr(p.thumb)}"${p.dims} alt="${escapeAttr(p.label)}" loading="lazy" decoding="async">
    </a>\n`;
  });

  // Read template
  const template = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholder with generated HTML
  const output = template.replace('<!-- GALLERY_ITEMS -->', html);

  // Write output
  fs.writeFileSync(outputPath, output);

  // Also fill the gallery section on the homepage
  updateHomepage(photos);

  console.log(`✅ Generated gallery with ${sortedImages.length} images`);
}

generateGallery();
