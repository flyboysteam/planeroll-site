// Metadata shared by generated legal pages. Keep it in the generator so a
// future import from the app cannot erase canonical or social tags.
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
export const legalDescriptions = {
  'privacy-policy': 'Learn how Planeroll collects, uses, stores, and protects your information, and how to exercise your privacy rights.',
  'terms-of-use': 'Read the terms for using Planeroll, including accounts, aircraft identification, subscriptions, and acceptable use.',
};
export function legalMetadata(slug, title) {
  const url = `https://planeroll.app/${slug}/`;
  const description = legalDescriptions[slug];
  const pageTitle = `${title} · Planeroll`;
  return `    <meta name="robots" content="index, follow">
    <meta name="description" content="${escape(description)}">
    <title>${escape(pageTitle)}</title>
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Planeroll">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${escape(pageTitle)}">
    <meta property="og:description" content="${escape(description)}">
    <meta property="og:image" content="https://planeroll.app/assets/previews/square-brand.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:image:alt" content="Planeroll logo on a black background">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@planeroll">
    <meta name="twitter:title" content="${escape(pageTitle)}">
    <meta name="twitter:description" content="${escape(description)}">
    <meta name="twitter:image" content="https://planeroll.app/assets/previews/square-brand.png">
    <meta name="twitter:image:alt" content="Planeroll logo on a black background">`;
}
