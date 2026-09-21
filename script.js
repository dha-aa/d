// ---- Auto-pagination: splits any .auto-page section's list into
// extra full-screen sections if its items don't fit one screen ----

const originalPages = {};

function capturePageOriginals() {
  document.querySelectorAll('.auto-page[data-page-id]').forEach(section => {
    const id = section.dataset.pageId;
    if (originalPages[id]) return;
    const list = section.querySelector('.page-list');
    const heading = section.querySelector('.page-heading');
    originalPages[id] = {
      headingText: heading ? heading.textContent : '',
      itemsHTML: list ? Array.from(list.children).map(el => el.outerHTML) : [],
      listClass: list ? list.className : '',
      sectionClass: section.className.replace(/\bactive\b|\babove\b/g, '').trim()
    };
  });
}

function clearPageClones() {
  document.querySelectorAll('[data-page-clone]').forEach(el => el.remove());
}

function paginateSections() {
  clearPageClones();

  Object.keys(originalPages).forEach(id => {
    const data = originalPages[id];
    const primary = document.querySelector('.auto-page[data-page-id="' + id + '"]');
    if (!primary || !data.itemsHTML.length) return;

    const list = primary.querySelector('.page-list');
    const heading = primary.querySelector('.page-heading');
    list.innerHTML = '';

    // Measure available height inside this section
    const styles = getComputedStyle(primary);
    const padTop = parseFloat(styles.paddingTop);
    const padBottom = parseFloat(styles.paddingBottom);
    const available = primary.clientHeight - padTop - padBottom - 40; // small buffer

    // Use a hidden probe to measure real rendered heights at this width
    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.top = '-9999px';
    probe.style.left = '0';
    probe.style.width = primary.clientWidth + 'px';
    probe.className = data.listClass;
    document.body.appendChild(probe);

    const headingHeight = heading ? heading.offsetHeight + 24 : 0;

    const pages = [[]];
    let usedHeight = headingHeight;

    data.itemsHTML.forEach(html => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const el = wrapper.firstElementChild;
      probe.appendChild(el);
      const gap = parseFloat(getComputedStyle(probe).rowGap) || 0;
      const h = el.offsetHeight + gap;

      if (usedHeight + h > available && pages[pages.length - 1].length > 0) {
        pages.push([]);
        usedHeight = headingHeight;
      }
      pages[pages.length - 1].push(html);
      usedHeight += h;
    });

    probe.remove();

    // Fill primary section with first page
    list.innerHTML = pages[0].join('');

    // Create additional sections for remaining pages
    let insertAfter = primary;
    for (let p = 1; p < pages.length; p++) {
      const clone = document.createElement('section');
      clone.className = data.sectionClass;
      clone.setAttribute('data-page-clone', id);

      const h = document.createElement('p');
      h.className = 'statement page-heading';
      h.textContent = data.headingText + ' (continued)';
      clone.appendChild(h);

      const newList = document.createElement('div');
      newList.className = data.listClass;
      newList.innerHTML = pages[p].join('');
      clone.appendChild(newList);

      insertAfter.parentNode.insertBefore(clone, insertAfter.nextSibling);
      insertAfter = clone;
    }
  });
}

capturePageOriginals();
paginateSections();

// ---- Section navigation ----

let sections = [];
let dotsContainer;
let dots = [];
let current = 0;
let animating = false;
const DURATION = 1800;

function buildNav() {
  sections = Array.from(document.querySelectorAll('section'));
  dotsContainer.innerHTML = '';
  sections.forEach((s, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', 'Go to section ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });
  dots = Array.from(dotsContainer.children);
  current = Math.max(0, Math.min(current, sections.length - 1));
}

function render() {
  sections.forEach((s, i) => {
    s.classList.remove('active', 'above');
    if (i < current) s.classList.add('above');
    if (i === current) s.classList.add('active');
  });
  dots.forEach((d, i) => d.classList.toggle('active', i === current));
}

function renderInstant() {
  sections.forEach(s => { s.style.transition = 'none'; });
  render();
  void document.body.offsetHeight;
  sections.forEach(s => { s.style.transition = ''; });
}

function buzz() {
  if (navigator.vibrate) navigator.vibrate(15);
}

function goTo(index) {
  if (animating) return;
  index = Math.max(0, Math.min(sections.length - 1, index));
  if (index === current) return;
  animating = true;
  current = index;
  render();
  buzz();
  setTimeout(() => { animating = false; }, DURATION);
}

dotsContainer = document.getElementById('dots');
buildNav();
render();

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    paginateSections();
    buildNav();
    renderInstant();
  }, 200);
});

let wheelCooldown = false;
window.addEventListener('wheel', (e) => {
  if (wheelCooldown) return;
  if (Math.abs(e.deltaY) < 10) return;
  wheelCooldown = true;
  if (e.deltaY > 0) goTo(current + 1); else goTo(current - 1);
  setTimeout(() => { wheelCooldown = false; }, DURATION);
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown') goTo(current + 1);
  if (e.key === 'ArrowUp' || e.key === 'PageUp') goTo(current - 1);
});

let touchStartY = null;
window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (touchStartY === null) return;
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diff) > 50) {
    if (diff > 0) goTo(current + 1); else goTo(current - 1);
  }
  touchStartY = null;
});
