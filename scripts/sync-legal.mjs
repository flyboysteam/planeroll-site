// Copy the app's canonical documents and reuse its Markdown parser so headings,
// emphasis, lists, hard breaks, and link destinations retain their meaning.
// Run: node scripts/sync-legal.mjs [path/to/planeroll]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { legalMetadata } from './page-metadata.mjs';

const site = fileURLToPath(new URL('../', import.meta.url));
const app = resolve(process.argv[2] ?? resolve(site, '../planeroll'));
const { legalDocuments } = await import(pathToFileURL(resolve(app, 'constants/legalDocuments.ts')));
const { parseLegalMarkdown, parseLegalMarkdownInline } = await import(pathToFileURL(resolve(app, 'lib/legalMarkdown.ts')));
const home = await readFile(resolve(site, 'index.html'), 'utf8');
const footerCss = '/' + home.match(/href="([^"]*assets\/site-footer\.css[^"]*)"/)[1].replace(/^\//, '');
const footerScript = '/' + home.match(/src="([^"]*assets\/site-footer\.js[^"]*)"/)[1].replace(/^\//, '');
const footer = home.match(/    <footer\b[\s\S]*?<\/footer>/)?.[0];
if (!footer) throw new Error('The site footer could not be found.');

const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
function inline(text) {
  return parseLegalMarkdownInline(text).map(part => {
    let content = escape(part.text).replaceAll('\n', '<br>');
    if (part.strong) content = `<strong>${content}</strong>`;
    if (part.url) content = `<a href="${escape(part.url)}">${content}</a>`;
    return content;
  }).join('');
}
function blockMarkup(block) {
  if (block.kind === 'heading') {
    const level = Math.min(block.level, 3);
    return `<h${level}${level === 1 ? ' id="legal-title"' : ''}>${inline(block.text)}</h${level}>`;
  }
  if (block.kind === 'list') return `<ul>\n${block.items.map(item => `          <li>${inline(item)}</li>`).join('\n')}\n        </ul>`;
  return `<p>${inline(block.text)}</p>`;
}

// Omit editorial placeholders from the website without changing the app's drafts.
// Keep real Markdown links and any populated effective date intact.
function withoutDraftPlaceholders(markdown) {
  const note = /^\s*(?:-\s+)?(?:\*\*)?\[(?:(?:LEGAL REVIEW|IMPLEMENTATION GAP|VERIFY|OWNER):[^\]]*|WEBSITE EMAIL\/NEWSLETTER PROVIDERS)\](?:\*\*)?\s*$/;
  const missingDate = /^\s*\*\*Effective Date:\*\*\s*\[TO BE ADDED AT PUBLICATION\]\s*$/;
  const draftStatus = /^\s*\*\*Status:\*\*\s*Working Draft\s*[—–-]\s*Not for Publication\s*$/i;
  return markdown.split(/\r?\n/).filter(line => !note.test(line) && !missingDate.test(line) && !draftStatus.test(line)).join('\n');
}

for (const [key, slug, title] of [['privacy', 'privacy-policy', 'Privacy Policy'], ['terms', 'terms-of-use', 'Terms of Use']]) {
  const blocks = parseLegalMarkdown(withoutDraftPlaceholders(legalDocuments[key].body));
  const pageFooter = footer.replace(`href="/${slug}/"`, `href="/${slug}/" aria-current="page"`);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${legalMetadata(slug, title)}
    <link rel="icon" href="/assets/favicon.svg?v=2" type="image/svg+xml">
    <link rel="stylesheet" href="${footerCss}">
    <link rel="stylesheet" href="/legal/legal.css?v=5">
    <script>document.documentElement.classList.add('js');</script>
    <script defer src="/assets/platform.js?v=1"></script>
    <script type="module" src="${footerScript}"></script>
    <script type="module" src="/legal/legal.js?v=1"></script>
  </head>
  <body>
    <!-- Copied from planeroll/constants/legalDocuments.ts; regenerate with scripts/sync-legal.mjs. -->
    <main class="legal-page">
      <article class="legal-document" aria-labelledby="legal-title">
        ${blocks.map(blockMarkup).join('\n        ')}
      </article>
    </main>
${pageFooter}
  </body>
</html>
`;
  await mkdir(resolve(site, slug), { recursive: true });
  await writeFile(resolve(site, slug, 'index.html'), html);
  console.log(`${slug}/index.html: copied ${blocks.length} blocks from the app`);
}
