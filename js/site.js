// Homepage interactions: letter intro, scroll reveals, word-by-word statement,
// a scroll-scrubbed edit timeline, a REC timecode and draggable stickers.
// Everything animates transform/opacity only and runs off one rAF loop.

(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // ---- Name: split into letters for the intro ----
  var letters = document.querySelector('.name-letters');
  if (letters) {
    var text = letters.textContent;
    letters.textContent = '';
    Array.prototype.forEach.call(text, function (c, i) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      s.style.setProperty('--i', i);
      letters.appendChild(s);
    });
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('loaded'); });
  });

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- Statement: wrap words so they light up as you scroll ----
  var big = document.querySelector('[data-words]');
  var words = [];
  if (big) {
    Array.prototype.slice.call(big.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            frag.appendChild(w);
          }
        });
        big.replaceChild(frag, n);
      } else if (n.nodeType === 1) {
        n.classList.add('w');
      }
    });
    words = Array.prototype.slice.call(big.querySelectorAll('.w'));
  }

  // ---- Timeline ----
  var nle = document.getElementById('nle');
  var nleTc = document.getElementById('nleTc');
  var scrubbed = nle ? Array.prototype.slice.call(nle.querySelectorAll('[data-s]')) : [];
  var YEARS = 8;      // ruler spans 2019 → 2026
  var NOW = 7.8;      // ~Oct 2026
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  // On narrow screens the timeline scrolls sideways; keep the playhead in
  // view until the visitor swipes the strip themselves.
  var nleScroll = nle ? nle.querySelector('.nle-scroll') : null;
  var nleBody = nle ? nle.querySelector('.nle-body') : null;
  var userPanned = false;
  if (nleScroll) {
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
      nleScroll.addEventListener(ev, function () { userPanned = true; }, { passive: true });
    });
  }

  // ---- REC timecode in the top bar ----
  var tc = document.getElementById('tc');
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ---- Active nav link ----
  var navLinks = {};
  document.querySelectorAll('.topbar nav a[href^="#"]').forEach(function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  var navSections = Object.keys(navLinks).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  var ticking = false;
  var lastWords = -1;

  function update() {
    ticking = false;
    var vh = window.innerHeight;

    if (tc) {
      var f = Math.max(0, Math.round(window.scrollY / 3));
      tc.textContent = pad(Math.floor(f / 86400)) + ':' + pad(Math.floor(f / 1440) % 60) + ':' +
        pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
    }

    if (words.length) {
      var rb = big.getBoundingClientRect();
      var pw = reduce ? 1 : clamp((vh * 0.85 - rb.top) / (rb.height + vh * 0.3));
      var n = Math.round(pw * words.length);
      if (n !== lastWords) {
        lastWords = n;
        for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
      }
    }

    if (nle) {
      var rn = nle.getBoundingClientRect();
      var p = reduce ? 1 : clamp((vh * 0.88 - rn.top) / (vh * 0.6));
      var pos = p * NOW;
      nle.style.setProperty('--p', (pos / YEARS).toFixed(4));
      for (var j = 0; j < scrubbed.length; j++) {
        scrubbed[j].classList.toggle('lit', pos >= parseFloat(scrubbed[j].getAttribute('data-s')) - 0.02);
      }
      nle.classList.toggle('done', p >= 1);
      if (nleScroll && !userPanned && nleScroll.scrollWidth > nleScroll.clientWidth + 1) {
        var label = 52;
        var headX = label + (pos / YEARS) * (nleBody.offsetWidth - label);
        nleScroll.scrollLeft = Math.max(0, headX - nleScroll.clientWidth * 0.65);
      }
      if (nleTc) {
        nleTc.textContent = p >= 1 ? 'NOW'
          : MONTHS[Math.min(11, Math.floor((pos % 1) * 12))] + ' ' + (2019 + Math.floor(pos));
      }
    }

    var current = null;
    navSections.forEach(function (s) {
      if (s.getBoundingClientRect().top < vh * 0.4) current = s.id;
    });
    Object.keys(navLinks).forEach(function (id) {
      if (id === current) navLinks[id].setAttribute('aria-current', 'true');
      else navLinks[id].removeAttribute('aria-current');
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();

  // ---- Draggable stickers ----
  document.querySelectorAll('.sticker').forEach(function (el) {
    var id = null, sx = 0, sy = 0, x = 0, y = 0;

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      id = e.pointerId;
      el.setPointerCapture(id);
      sx = e.clientX - x;
      sy = e.clientY - y;
      el.classList.add('dragging');
    });

    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      x = e.clientX - sx;
      y = e.clientY - sy;
      el.style.setProperty('--dx', x + 'px');
      el.style.setProperty('--dy', y + 'px');
    });

    function end(e) {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('dragging');
      if (navigator.vibrate) navigator.vibrate(10);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });
})();

// ==========================================================
// Gallery + blog sections on the homepage.
// - Gallery: polaroids fade in as they load; photo viewer shows the full
//   photo (data-full) instead of the thumbnail.
// - Blog: a post opens inline under the cards (#blog/<post> deep links).
//   Posts are read from blog/<post>.html; if that fails, the link works
//   as a normal link.
// ==========================================================

(function () {
  'use strict';

  var root = document.documentElement;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- gallery ----------

  var grid = document.getElementById('gGrid');
  var shots = grid ? Array.prototype.slice.call(grid.querySelectorAll('.polaroid')) : [];

  shots.forEach(function (b, i) {
    var img = b.querySelector('img');
    if (!img) return;
    function ok() { b.classList.add('ok'); }
    if (img.complete) ok();
    else {
      img.addEventListener('load', ok);
      img.addEventListener('error', ok);
    }
    b.addEventListener('click', function () { openViewer(i, b); });
  });

  // ---------- photo viewer ----------

  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var lbCount = document.getElementById('lbCount');
  var lbClose = document.getElementById('lbClose');
  var lbIndex = 0;
  var lbOpener = null;

  function showPhoto(i) {
    lbIndex = (i + shots.length) % shots.length;
    var img = shots[lbIndex].querySelector('img');
    lbImg.src = shots[lbIndex].getAttribute('data-full') || img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt;
    lbCount.textContent = (lbIndex + 1) + ' / ' + shots.length;
  }

  function openViewer(i, from) {
    if (!lb || !shots.length) return;
    lbOpener = from;
    showPhoto(i);
    lb.hidden = false;
    root.classList.add('lb-open');
    lbClose.focus({ preventScroll: true });
  }

  function closeViewer() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    root.classList.remove('lb-open');
    lbImg.removeAttribute('src');
    if (lbOpener) lbOpener.focus({ preventScroll: true });
    lbOpener = null;
  }

  if (lb) {
    lbClose.addEventListener('click', closeViewer);
    document.getElementById('lbPrev').addEventListener('click', function () { showPhoto(lbIndex - 1); });
    document.getElementById('lbNext').addEventListener('click', function () { showPhoto(lbIndex + 1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb-stage')) closeViewer();
    });

    var swipeX = null;
    lb.addEventListener('touchstart', function (e) { swipeX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (swipeX === null) return;
      var dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) > 50) showPhoto(lbIndex + (dx < 0 ? 1 : -1));
      swipeX = null;
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      else if (e.key === 'ArrowLeft') showPhoto(lbIndex - 1);
      else if (e.key === 'ArrowRight') showPhoto(lbIndex + 1);
      else if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(lb.querySelectorAll('button'), function (n) { return n.offsetParent !== null; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // ---------- blog: read posts inline ----------

  var reader = document.getElementById('reader');
  var blogSec = document.getElementById('blog');
  if (!reader || !window.fetch || !window.DOMParser || !window.URL) return;

  var BLOG = new URL('blog/', location.href);
  var cache = {};
  var current = null;
  var currentLink = null;

  var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
  var DONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';

  function load(url) {
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (t) { return new DOMParser().parseFromString(t, 'text/html'); });
      cache[url].catch(function () { delete cache[url]; });
    }
    return cache[url];
  }

  function slugOf(p) { return p.replace(/^.*\//, '').replace(/\.html$/, ''); }

  function addCopyButtons(scope) {
    scope.querySelectorAll('pre').forEach(function (pre) {
      var w = el('div', 'code-wrapper');
      pre.parentNode.insertBefore(w, pre);
      w.appendChild(pre);
      var b = el('button', 'copy-button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Copy code');
      b.innerHTML = COPY_ICON;
      b.addEventListener('click', function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(pre.textContent).then(function () {
          b.innerHTML = DONE_ICON;
          b.classList.add('copied');
          setTimeout(function () { b.innerHTML = COPY_ICON; b.classList.remove('copied'); }, 2000);
        });
      });
      w.appendChild(b);
    });
  }

  function cleanContent(content, url) {
    content.querySelectorAll('script, style, link, iframe, object, embed').forEach(function (n) { n.remove(); });
    content.querySelectorAll('*').forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (at) {
        if (/^on/i.test(at.name)) n.removeAttribute(at.name);
      });
    });
    content.querySelectorAll('[src]').forEach(function (n) {
      n.setAttribute('src', new URL(n.getAttribute('src'), url).href);
    });
    content.querySelectorAll('a[href]').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (/^(#|mailto:|tel:)/.test(raw)) return;
      var u = new URL(raw, url);
      var internal = u.origin === location.origin && u.pathname.indexOf(BLOG.pathname) === 0 && /\.html$/.test(u.pathname);
      if (internal) {
        var s = slugOf(u.pathname);
        a.removeAttribute('target');
        if (s === 'index') { a.setAttribute('href', '#blog'); }
        else { a.setAttribute('href', u.href); a.setAttribute('data-post', s); }
      } else {
        a.setAttribute('href', u.href);
        if (u.origin !== location.origin) a.setAttribute('rel', 'noopener');
      }
    });
    addCopyButtons(content);
  }

  function setActive(link) {
    document.querySelectorAll('.post-card.active').forEach(function (c) { c.classList.remove('active'); });
    var card = link && link.closest('.post-card');
    if (card) card.classList.add('active');
  }

  function openPost(slug, link, fromHash) {
    var url = new URL(slug + '.html', BLOG);
    current = slug;
    currentLink = link || document.querySelector('.post-link[data-post="' + slug + '"]');
    setActive(currentLink);
    reader.hidden = false;
    reader.textContent = '';
    var wait = el('p', 'win-loading', 'loading post');
    wait.appendChild(el('span', 'bar'));
    reader.appendChild(wait);
    if (!fromHash) history.replaceState(null, '', '#blog/' + slug);

    load(url.href).then(function (doc) {
      if (current !== slug) return;
      var content = doc.querySelector('.blog-content');
      if (!content) throw new Error('no content');
      content = document.importNode(content, true);
      cleanContent(content, url);
      var t = doc.querySelector('.blog-title');
      var meta = doc.querySelector('.blog-meta');

      reader.textContent = '';
      var bar = el('div', 'reader-bar');
      bar.appendChild(el('span', 'reader-path', '~/blog/' + slug + '.html'));
      var x = el('button', 'reader-close', 'close ✕');
      x.type = 'button';
      x.addEventListener('click', closePost);
      bar.appendChild(x);
      reader.appendChild(bar);

      var inner = el('div', 'article');
      var hd = el('header', 'article-head');
      if (meta) hd.appendChild(el('p', 'post-date', meta.textContent.trim()));
      var h = el('h3', null, t ? t.textContent.trim() : slug);
      h.id = 'readerTitle';
      hd.appendChild(h);
      inner.appendChild(hd);
      inner.appendChild(content);
      var end = el('button', 'back-btn end', '↑ close post');
      end.type = 'button';
      end.addEventListener('click', closePost);
      inner.appendChild(end);
      reader.appendChild(inner);
      reader.setAttribute('aria-labelledby', 'readerTitle');
      reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      x.focus({ preventScroll: true });
    }).catch(function () {
      if (current !== slug) return;
      // Couldn't load it here (e.g. opened from disk): use the post page.
      location.href = url.href;
    });
  }

  function closePost() {
    reader.querySelectorAll('video').forEach(function (v) { v.pause(); });
    reader.hidden = true;
    reader.textContent = '';
    current = null;
    setActive(null);
    history.replaceState(null, '', '#blog');
    var back = currentLink;
    currentLink = null;
    if (back) {
      back.closest('.post-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
      back.focus({ preventScroll: true });
    } else if (blogSec) {
      blogSec.scrollIntoView({ behavior: 'smooth' });
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-post]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var slug = a.getAttribute('data-post');
    if (slug === current) { reader.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    openPost(slug, a.closest('.reader') ? null : a);
  });

  function fromHash() {
    var m = location.hash.match(/^#blog\/([\w.-]+)$/);
    if (m && m[1] !== current) openPost(m[1].replace(/\.html$/, ''), null, true);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
