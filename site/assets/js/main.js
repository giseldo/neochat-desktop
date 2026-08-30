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
    var setNavOpen = function (isOpen) {
      navMobile.classList.toggle('open', isOpen);
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
      navMobile.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      document.body.classList.toggle('no-scroll', isOpen);
    };
    navToggle.addEventListener('click', function () {
      setNavOpen(!navMobile.classList.contains('open'));
    });
    navMobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setNavOpen(false); });
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && navMobile.classList.contains('open')) {
        setNavOpen(false);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMobile.classList.contains('open')) {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }

  /* ----- Back to Top ----- */
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    var toggleBackToTop = function () {
      backToTop.classList.toggle('visible', window.scrollY > 480);
    };
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ----- Keyboard accessibility for image triggers (gallery, showcase, hero) ----- */
  document.querySelectorAll('[onclick^="openLightbox("]').forEach(function (el) {
    if (el.tagName === 'BUTTON' || el.tagName === 'A') return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('aria-label')) {
      var labelEl = el.querySelector('.gallery-item__label');
      var imgEl = el.querySelector('img');
      var label = labelEl ? labelEl.textContent : (imgEl ? imgEl.alt : 'Ampliar imagem');
      el.setAttribute('aria-label', 'Ampliar imagem: ' + label);
    }
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        el.click();
      }
    });
  });

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
    }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });
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
    var platform = (window.navigator.platform || '').toLowerCase();
    if (ua.indexOf('win') !== -1 || platform.indexOf('win') !== -1) return 'win';
    if (ua.indexOf('mac') !== -1 || platform.indexOf('mac') !== -1) return 'mac';
    if (ua.indexOf('linux') !== -1 || platform.indexOf('linux') !== -1) return 'linux';
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

  if (heroDownloadText) {
    if (userOS === 'win') heroDownloadText.textContent = 'Baixar para Windows';
    else if (userOS === 'mac') heroDownloadText.textContent = 'Baixar para macOS';
    else if (userOS === 'linux') heroDownloadText.textContent = 'Baixar para Linux';
  }

  /* ----- Helpers: cache with TTL ----- */
  var CACHE_TTL_MS = 60 * 60 * 1000; // 1h
  var cacheGet = function (key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.t || !obj.v) return null;
      if (Date.now() - obj.t > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return obj.v;
    } catch (e) { return null; }
  };
  var cacheSet = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); } catch (e) {}
  };
  var formatBytes = function (bytes) {
    if (!bytes || bytes <= 0) return '';
    var mb = bytes / (1024 * 1024);
    if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
    return mb.toFixed(0) + ' MB';
  };
  var formatDate = function (iso) {
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (e) { return iso; }
  };

  /* ----- Code Copy Buttons ----- */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = this.getAttribute('data-code');
      if (!code) return;

      var that = this;
      var done = function () {
        var oldText = that.textContent;
        that.textContent = 'Copiado!';
        that.classList.add('copied');
        setTimeout(function () {
          that.textContent = oldText;
          that.classList.remove('copied');
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(function () {
          var textarea = document.createElement('textarea');
          textarea.value = code;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          done();
        });
      } else {
        var textarea2 = document.createElement('textarea');
        textarea2.value = code;
        document.body.appendChild(textarea2);
        textarea2.select();
        document.execCommand('copy');
        document.body.removeChild(textarea2);
        done();
      }
    });
  });

  /* ----- Current Year in Footer ----- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----- Latest GitHub Release Assets Linking (cached + smart match) ----- */
  var findAsset = function (assets, predicate) {
    for (var i = 0; i < assets.length; i++) {
      if (predicate(assets[i])) return assets[i];
    }
    return null;
  };

  var applyRelease = function (release) {
    if (!release || !release.assets || !release.assets.length) return;
    var tag = release.tag_name || release.name || '';
    var publishedAt = release.published_at || '';
    var versionLabel = tag ? tag + (publishedAt ? ' • ' + formatDate(publishedAt) : '') : '';

    // Meta lines per OS
    var setMeta = function (id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    if (versionLabel) {
      setMeta('meta-win', versionLabel);
      setMeta('meta-mac', versionLabel);
      setMeta('meta-linux', versionLabel);
    }

    // Windows: distinguish installer vs portable
    var assets = release.assets;
    var dlWin = document.getElementById('dl-win');
    if (dlWin) {
      // Installer: .exe without "portable" in name (usually setup)
      var winSetup = findAsset(assets, function (a) {
        var n = a.name.toLowerCase();
        return n.endsWith('.exe') && n.indexOf('portable') === -1;
      }) || findAsset(assets, function (a) { return a.name.toLowerCase().endsWith('.exe'); });
      var winPortable = findAsset(assets, function (a) {
        var n = a.name.toLowerCase();
        return n.endsWith('.exe') && n.indexOf('portable') !== -1;
      });
      // If only one exe exists, use same for both
      if (winSetup && dlWin.children[0]) {
        var a0 = dlWin.children[0].querySelector('a');
        if (a0) {
          a0.href = winSetup.browser_download_url;
          var sz = formatBytes(winSetup.size);
          a0.textContent = '.exe (Instalador NSIS)' + (sz ? ' — ' + sz : '');
        }
        var btnWin = document.getElementById('btn-win');
        if (btnWin) btnWin.href = winSetup.browser_download_url;
        if (userOS === 'win' && heroPrimaryDownload) heroPrimaryDownload.href = winSetup.browser_download_url;
      }
      if (winPortable && dlWin.children[1]) {
        var a1 = dlWin.children[1].querySelector('a');
        if (a1) {
          a1.href = winPortable.browser_download_url;
          var sz1 = formatBytes(winPortable.size);
          a1.textContent = '.exe (Versão Portátil)' + (sz1 ? ' — ' + sz1 : '');
        }
      } else if (!winPortable && winSetup && dlWin.children[1]) {
        // fallback: point portable line to same file if no distinct portable
        var a1b = dlWin.children[1].querySelector('a');
        if (a1b) a1b.href = winSetup.browser_download_url;
      }
    }

    // macOS
    var dlMac = document.getElementById('dl-mac');
    if (dlMac) {
      var macDmg = findAsset(assets, function (a) { return a.name.toLowerCase().endsWith('.dmg'); });
      var macZip = findAsset(assets, function (a) { return a.name.toLowerCase().endsWith('.zip'); });
      if (macDmg && dlMac.children[0]) {
        var am0 = dlMac.children[0].querySelector('a');
        if (am0) {
          am0.href = macDmg.browser_download_url;
          var szm = formatBytes(macDmg.size);
          am0.textContent = '.dmg (Universal)' + (szm ? ' — ' + szm : '');
        }
        var btnMac = document.getElementById('btn-mac');
        if (btnMac) btnMac.href = macDmg.browser_download_url;
        if (userOS === 'mac' && heroPrimaryDownload) heroPrimaryDownload.href = macDmg.browser_download_url;
      }
      if (macZip && dlMac.children[1]) {
        var am1 = dlMac.children[1].querySelector('a');
        if (am1) {
          am1.href = macZip.browser_download_url;
          var szm2 = formatBytes(macZip.size);
          am1.textContent = '.zip (Arquivo compactado)' + (szm2 ? ' — ' + szm2 : '');
        }
      }
    }

    // Linux
    var dlLinux = document.getElementById('dl-linux');
    if (dlLinux) {
      var linuxAppImage = findAsset(assets, function (a) { return a.name.toLowerCase().endsWith('.appimage'); });
      var linuxDeb = findAsset(assets, function (a) { return a.name.toLowerCase().endsWith('.deb'); });
      var linuxRpm = findAsset(assets, function (a) { return a.name.toLowerCase().endsWith('.rpm'); });
      if (linuxAppImage) {
        var btnLinux = document.getElementById('btn-linux');
        if (btnLinux) btnLinux.href = linuxAppImage.browser_download_url;
        if (userOS === 'linux' && heroPrimaryDownload) heroPrimaryDownload.href = linuxAppImage.browser_download_url;
      }
      if (dlLinux.children[0]) {
        var al0 = dlLinux.children[0].querySelector('a');
        if (al0 && linuxAppImage) {
          al0.href = linuxAppImage.browser_download_url;
          var szl = formatBytes(linuxAppImage.size);
          al0.textContent = '.AppImage (Universal)' + (szl ? ' — ' + szl : '');
        }
      }
      if (dlLinux.children[1]) {
        var al1Links = dlLinux.children[1].querySelectorAll('a');
        if (al1Links[0] && linuxDeb) {
          al1Links[0].href = linuxDeb.browser_download_url;
          var szd = formatBytes(linuxDeb.size);
          al1Links[0].textContent = '.deb (Debian/Ubuntu)' + (szd ? ' — ' + szd : '');
        }
        if (al1Links[1] && linuxRpm) {
          al1Links[1].href = linuxRpm.browser_download_url;
          var szr = formatBytes(linuxRpm.size);
          al1Links[1].textContent = '.rpm (Fedora/RHEL)' + (szr ? ' — ' + szr : '');
        } else if (al1Links[1] && linuxDeb && !linuxRpm) {
          // if only deb exists, keep link as deb
          al1Links[1].href = linuxDeb.browser_download_url;
        }
      }
    }
  };

  var cachedRelease = cacheGet('neochat:release');
  if (cachedRelease) {
    try { applyRelease(cachedRelease); } catch (e) {}
  }

  fetch('https://api.github.com/repos/giseldo/neochat-releases/releases/latest', { headers: { 'Accept': 'application/vnd.github.v3+json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('release ' + r.status)); })
    .then(function (release) {
      cacheSet('neochat:release', release);
      applyRelease(release);
    })
    .catch(function () {
      // keep fallback links; update meta to indicate fallback
      ['meta-win','meta-mac','meta-linux'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.textContent.indexOf('Buscando') !== -1) {
          el.textContent = 'Ver releases no GitHub';
        }
      });
    });

})();
