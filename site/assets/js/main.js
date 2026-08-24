/* ============================================================
   NeoChat Desktop — Landing Page Scripts
   ============================================================ */
(function () {
  'use strict';

  /* ----- Navbar scroll state ----- */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----- Mobile menu toggle ----- */
  var navToggle = document.getElementById('navToggle');
  var navMobile = document.getElementById('navMobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', function () {
      var isOpen = navMobile.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Close menu when a link is clicked
    navMobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navMobile.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ----- Reveal on scroll ----- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = el.getAttribute('data-delay');
          if (delay) {
            el.style.transitionDelay = delay + 'ms';
          }
          el.classList.add('visible');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ----- Current year in footer ----- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----- GitHub star count (best-effort, no hard dependency) ----- */
  var starCount = document.getElementById('starCount');
  if (starCount) {
    fetch('https://api.github.com/repos/giseldo/neochat-desktop')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        if (data && typeof data.stargazers_count === 'number' && data.stargazers_count > 0) {
          starCount.textContent = '★ ' + data.stargazers_count;
        } else {
          starCount.textContent = '★ Star';
        }
      })
      .catch(function () {
        starCount.textContent = '★ Star';
      });
  }

  /* ----- Latest release download links (best-effort) ----- */
  // Tries to point platform file links to specific release assets;
  // gracefully falls back to the releases page.
  var fileLinkMaps = {
    'dl-win': ['.exe'],
    'dl-mac': ['.dmg'],
    'dl-linux': ['.AppImage', '.deb', '.rpm']
  };

  fetch('https://api.github.com/repos/giseldo/neochat-desktop/releases/latest')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (release) {
      if (!release || !release.assets || !release.assets.length) return;
      Object.keys(fileLinkMaps).forEach(function (listId) {
        var exts = fileLinkMaps[listId];
        var list = document.getElementById(listId);
        if (!list) return;
        exts.forEach(function (ext, i) {
          var asset = release.assets.find(function (a) {
            return a.name.toLowerCase().endsWith(ext.toLowerCase());
          });
          if (asset) {
            var li = list.children[i];
            if (li) {
              var a = li.querySelector('a');
              if (a) {
                a.href = asset.browser_download_url;
                // Show the actual filename
                a.textContent = asset.name;
              }
            }
          }
        });
      });
    })
    .catch(function () {
      /* keep fallback links to releases page */
    });

  /* ----- Smooth anchor links with offset (for older browsers) ----- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
})();
