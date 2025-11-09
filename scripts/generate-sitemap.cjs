const fs = require('fs');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');

const rootDir = path.join(__dirname, '..');
const sitemapPath = path.join(rootDir, 'sitemap.xml');

const baseUrl = 'https://www.gorgeofasteners.com';

// 默认固定页面
const staticPages = [
  { url: '/', priority: 1.0 },
  { url: '/case-studies/', priority: 0.9 },
  { url: '/process/', priority: 0.8 },
  { url: '/blog/', priority: 0.8 },
  { url: '/about/', priority: 0.7 },
  { url: '/contact/', priority: 0.7 },
];

function findPages(prefixUrl, dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(dirPath, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        pages.push({
          url: `${prefixUrl}${entry.name}/`,
          lastmod: new Date().toISOString(),
        });
      }
    }
  }

  return pages;
}

async function run() {
  const sitemap = new SitemapStream({ hostname: baseUrl });

  const blogPages = findPages('/blog/', path.join(rootDir, 'blog'));
  const casePages = findPages('/case-studies/', path.join(rootDir, 'case-studies'));

  const allPages = staticPages.concat(blogPages).concat(casePages);

  for (const page of allPages) {
    sitemap.write(page);
  }

  sitemap.end();

  const sitemapData = await streamToPromise(sitemap);
  fs.writeFileSync(sitemapPath, sitemapData.toString());

  console.log('✅ sitemap.xml generated from folder structure');
}

run().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
});
