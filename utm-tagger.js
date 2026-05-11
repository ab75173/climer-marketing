// Auto-appends UTM parameters to every link pointing at app.climer.ai
// so Vercel Analytics on the app side can attribute traffic by the
// marketing page (or external source) that originated the click.
//
// Behavior:
//   1. If the current page URL already has UTM params (visitor arrived
//      via a tagged social post / pitch email), those are passed through
//      verbatim to the app — the attribution chain survives the hop.
//   2. Otherwise, generates UTMs from the current page path:
//        utm_source   = "marketing"
//        utm_medium   = "web"
//        utm_campaign = page slug (e.g. "home", "for-students",
//                       "blog_what-is-ai-literacy")
//   3. Any UTM already hand-coded on an individual link is preserved —
//      we never overwrite.
(function () {
  function pageCampaign() {
    const path = location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    return path.replace(/^\/|\/$/g, '').replace(/\//g, '_');
  }

  function ensureParam(url, key, value) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }

  function tagLinks() {
    const incoming = new URLSearchParams(location.search);
    const carriedThrough = ['utm_source', 'utm_medium', 'utm_campaign']
      .some(k => incoming.has(k));
    const source   = carriedThrough ? incoming.get('utm_source')   : 'marketing';
    const medium   = carriedThrough ? incoming.get('utm_medium')   : 'web';
    const campaign = carriedThrough ? incoming.get('utm_campaign') : pageCampaign();

    document.querySelectorAll('a[href*="app.climer.ai"]').forEach(a => {
      try {
        const url = new URL(a.href);
        ensureParam(url, 'utm_source', source);
        ensureParam(url, 'utm_medium', medium);
        ensureParam(url, 'utm_campaign', campaign);
        a.href = url.toString();
      } catch (e) { /* malformed href — skip */ }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tagLinks);
  } else {
    tagLinks();
  }
})();
