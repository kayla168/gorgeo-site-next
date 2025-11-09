const fs = require('fs');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

const hostname = 'https://www.gorgeofasteners.com';

const publicDir = path.join(__dirname, '..', 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

// 页面优先级定义
const priorityMap = {
  '/': 1.0,
  '/case-studies/': 0.9,
  '/process/': 0.8,
  '/blog/': 0.8,
  '/about/': 0.7,
  '/contact/': 0.7,
};

// 递归扫描所有 index.html 页面
function findPages(baseUrl, dir) {
  let pages = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      pages = pages.concat(findPages(baseUrl, fullPath));
    } else if (item.name === 'index.html') {
      const relative = path.relative(publicDir, dir).replace(/\\/g, '/');
      const url = '/' + relative + (relative ? '/' : '');
      pages.push(url);
    }
  }

  return pages;
}

(async () => {
  const sitemap = new SitemapStream({ hostname });

  const staticPaths = Object.keys(priorityMap);
  const blogAndCasePages = findPages('/blog/', path.join(publicDir, 'blog'))
    .concat(findPages('/case-studies/', path.join(publicDir, 'case-studies')));

  const urls = [...staticPaths, ...blogAndCasePages];

  for (const url of urls) {
    sitemap.write({
      url,
      priority: priorityMap[url] || 0.6,
      lastmod: new Date().toISOString(),
    });
  }

  sitemap.end();

  const sitemapXml = await streamToPromise(sitemap);
  fs.writeFileSync(sitemapPath, sitemapXml);

  console.log('✅ sitemap.xml generated from folder structure');
})();
