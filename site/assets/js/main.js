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

  /* ----- OS Detection (highlights the visitor's platform tag) ----- */
  var detectOS = function () {
    var ua = window.navigator.userAgent.toLowerCase();
    var platform = (window.navigator.platform || '').toLowerCase();
    if (ua.indexOf('win') !== -1 || platform.indexOf('win') !== -1) return 'win';
    if (ua.indexOf('mac') !== -1 || platform.indexOf('mac') !== -1) return 'mac';
    if (ua.indexOf('linux') !== -1 || platform.indexOf('linux') !== -1) return 'linux';
    return 'win';
  };

  var userOS = detectOS();

  // Highlight platform tag
  document.querySelectorAll('.platform-tag').forEach(function (tag) {
    if (tag.getAttribute('data-os') === userOS) {
      tag.classList.add('active-os');
    }
  });

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

})();
