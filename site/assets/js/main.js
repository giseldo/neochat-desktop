/* ============================================================
   NeoChat Desktop (NEO) — Main Interactive Scripts
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
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ----- Interactive Mode Switcher (User vs Power User) ----- */
  var modeTabs = document.querySelectorAll('.mode-tab');
  var modePanels = document.querySelectorAll('.mode-panel');

  modeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var targetId = this.getAttribute('data-target');
      if (!targetId) return;

      modeTabs.forEach(function (t) { t.classList.remove('active'); });
      modePanels.forEach(function (p) { p.classList.remove('active'); });

      this.classList.add('active');
      var targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  /* ----- OS Detection & Hero Download Action ----- */
  var detectOS = function () {
    var ua = window.navigator.userAgent.toLowerCase();
    if (ua.indexOf('win') !== -1) return 'win';
    if (ua.indexOf('mac') !== -1) return 'mac';
    if (ua.indexOf('linux') !== -1) return 'linux';
    return 'win';
  };

  var userOS = detectOS();
  var heroDownloadText = document.getElementById('heroDownloadText');
  var heroPrimaryDownload = document.getElementById('heroPrimaryDownload');

  // Highlight platform tag
  document.querySelectorAll('.platform-tag').forEach(function (tag) {
    if (tag.getAttribute('data-os') === userOS) {
      tag.classList.add('active-os');
    }
  });

  if (heroDownloadText && heroPrimaryDownload) {
    if (userOS === 'win') {
      heroDownloadText.textContent = 'Baixar para Windows';
      heroPrimaryDownload.setAttribute('href', '#download');
    } else if (userOS === 'mac') {
      heroDownloadText.textContent = 'Baixar para macOS';
      heroPrimaryDownload.setAttribute('href', '#download');
    } else if (userOS === 'linux') {
      heroDownloadText.textContent = 'Baixar para Linux';
      heroPrimaryDownload.setAttribute('href', '#download');
    }
  }

  /* ----- Code Copy Buttons ----- */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = this.getAttribute('data-code');
      if (!code) return;

      var that = this;
      navigator.clipboard.writeText(code).then(function () {
        var oldText = that.textContent;
        that.textContent = 'Copiado!';
        that.classList.add('copied');
        setTimeout(function () {
          that.textContent = oldText;
          that.classList.remove('copied');
        }, 2000);
      }).catch(function () {
        // Fallback
        var textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        that.textContent = 'Copiado!';
        setTimeout(function () {
          that.textContent = 'Copiar';
        }, 2000);
      });
    });
  });

  /* ----- Current Year in Footer ----- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----- GitHub Stars Counter ----- */
  var starCount = document.getElementById('starCount');
  if (starCount) {
    fetch('https://api.github.com/repos/giseldo/neochat-desktop')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        if (data && typeof data.stargazers_count === 'number' && data.stargazers_count > 0) {
          starCount.textContent = '★ ' + data.stargazers_count;
        } else {
          starCount.textContent = '★ GitHub';
        }
      })
      .catch(function () {
        starCount.textContent = '★ GitHub';
      });
  }

  /* ----- Latest GitHub Release Assets Linking ----- */
  var fileLinkMaps = {
    'dl-win': ['.exe'],
    'dl-mac': ['.dmg', '.zip'],
    'dl-linux': ['.appimage', '.deb', '.rpm']
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
          if (asset && list.children[i]) {
            var a = list.children[i].querySelector('a');
            if (a) {
              a.href = asset.browser_download_url;
            }
          }
        });
      });
    })
    .catch(function () {
      // Graceful fallback to github releases list
    });

})();
