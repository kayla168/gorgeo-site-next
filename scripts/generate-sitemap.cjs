// scripts/generate-sitemap.js
const fs = require('fs');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

const BASE_URL = 'https://www.gorgeofasteners.com';

const STATIC_ROUTES = [
  { url: '/', priority: 1.0 },
  { url: '/case-studies/', priority: 0.9 },
  { url: '/process/', priority: 0.8 },
  { url: '/blog/', priority: 0.8 },
  { url: '/about/', priority: 0.7 },
  { url: '/contact/', priority: 0.7 },
];

const dynamicDirs = [
  { dir: 'case-studies', priority: 0.8 },
  { dir: 'blog', priority: 0.8 }
];

function getSubdirectoriesWithIndex(dirPath, baseWebPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(subDir => {
      const indexPath = path.join(dirPath, subDir.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        return {
          url: `/${baseWebPath}/${subDir.name}/`,
          lastmod: fs.statSync(indexPath).mtime.toISOString()
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function generateSitemap() {
  const sitemap = new SitemapStream({ hostname: BASE_URL });
  const writeStream = createWriteStream(path.resolve(__dirname, '../public/sitemap.xml'));

  sitemap.pipe(writeStream);

  // Static pages
  STATIC_ROUTES.forEach(route => sitemap.write(route));

  // Blog & Case Study subpages
  dynamicDirs.forEach(({ dir, priority }) => {
    const fullPath = path.resolve(__dirname, `../public/${dir}`);
    const pages = getSubdirectoriesWithIndex(fullPath, dir);
    pages.forEach(p => sitemap.write({ ...p, priority }));
  });

  sitemap.end();
  await streamToPromise(sitemap);
  console.log('✅ sitemap.xml generated from folder structure');
}

generateSitemap().catch(console.error);
