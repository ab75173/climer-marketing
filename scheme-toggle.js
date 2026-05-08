/* Climer marketing — color scheme picker.
 *
 * Persists choice in localStorage (key: 'climer-scheme'). The pre-paint
 * inline script in each page <head> sets the data-scheme attribute
 * before render to avoid a flash; this script handles the picker UI
 * (button group injected into the footer of each page).
 *
 * Schemes:
 *   forest-lime — Climer original. Deep forest surfaces, lime accent.
 *   indigo      — Indigo + Warm White. Indigo wordmark, amber accent.
 *
 * App side (app.climer.ai) ships the same two schemes with a richer
 * UI (theme axis added). This file is the marketing-site equivalent.
 */
(function () {
  var SCHEMES = ['forest-lime', 'indigo']
  var LABELS  = { 'forest-lime': 'Forest', 'indigo': 'Indigo' }
  var KEY = 'climer-scheme'

  function read() {
    try {
      var v = localStorage.getItem(KEY)
      if (SCHEMES.indexOf(v) !== -1) return v
    } catch (e) { /* localStorage may be blocked */ }
    return 'forest-lime'
  }

  function apply(scheme) {
    document.documentElement.setAttribute('data-scheme', scheme)
    try { localStorage.setItem(KEY, scheme) } catch (e) { /* noop */ }
    document.querySelectorAll('[data-scheme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-scheme-set') === scheme)
    })
  }

  function injectPicker() {
    // Find each footer's links group and insert a picker before them
    document.querySelectorAll('.footer-inner').forEach(function (footer) {
      if (footer.querySelector('.scheme-toggle')) return // idempotent
      var current = read()
      var wrap = document.createElement('div')
      wrap.style.display = 'flex'
      wrap.style.alignItems = 'center'
      wrap.style.gap = '12px'
      wrap.innerHTML =
        '<span class="scheme-toggle-label">Theme</span>' +
        '<div class="scheme-toggle" role="group" aria-label="Color scheme">' +
          SCHEMES.map(function (s) {
            return (
              '<button type="button" data-scheme-set="' + s + '" ' +
                'aria-pressed="' + (s === current ? 'true' : 'false') + '">' +
                LABELS[s] +
              '</button>'
            )
          }).join('') +
        '</div>'
      footer.insertBefore(wrap, footer.querySelector('.footer-links'))
    })

    document.querySelectorAll('[data-scheme-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        apply(b.getAttribute('data-scheme-set'))
      })
    })
  }

  // Initial paint already happened via the inline pre-paint script in
  // each page's <head>; this just wires up the picker.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPicker)
  } else {
    injectPicker()
  }
})()
