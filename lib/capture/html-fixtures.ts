/**
 * Fixtures HTML pour tests unitaires de l'extracteur visuel Tier 1.
 * Snippets anonymisés — pas de données réelles de membres.
 */

/** Site type SaaS : og:image + favicon + logo header. */
export const FIXTURE_SAAS = `<!doctype html>
<html>
<head>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/static/apple-touch-icon.png" sizes="180x180">
  <meta property="og:image" content="https://cdn.example.com/og/hero-wide.jpg">
</head>
<body>
  <header>
    <img class="site-logo" src="/assets/logo-mark.svg" alt="Example SaaS logo">
  </header>
  <main>
    <img src="/images/team-photo.jpg" width="80" height="80" alt="Team">
    <img class="hero-banner" src="/images/banner-fallback.jpg" width="1200" height="600" alt="Product hero">
  </main>
</body>
</html>`;

/** Site sans og — hero via twitter card. */
export const FIXTURE_BLOG = `<!doctype html>
<html>
<head>
  <link rel="shortcut icon" href="https://blog.example/favicon.png">
  <meta name="twitter:image" content="https://blog.example/cards/article-cover.png">
</head>
<body>
  <img src="/avatar.png" width="40" height="40" alt="Author avatar">
  <article>
    <img src="/uploads/wide-photo.jpg" width="960" height="540" alt="Article illustration">
  </article>
</body>
</html>`;

/** SPA minimal — uniquement favicon, pas d'hero. */
export const FIXTURE_MINIMAL = `<!doctype html>
<html><head><link rel="icon" href="/favicon.ico"></head><body><p>Hello</p></body></html>`;

/** Base URL associée aux fixtures ci-dessus. */
export const FIXTURE_BASE = "https://example.com/page";

export const FIXTURE_BLOG_BASE = "https://blog.example/post";
