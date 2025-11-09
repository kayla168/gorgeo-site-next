// scripts/generate-sitemap.js
import fs from "fs";
import path from "path";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修改为你的域名
const baseUrl = "https://www.gorgeofasteners.com";

// 递归扫描指定目录，返回所有 .html 文件路径
function scanHtmlFiles(dir, baseRoute = "") {
  const result = [];

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      result.push(...scanHtmlFiles(fullPath, path.join(baseRoute, file)));
    } else if (file.endsWith(".html") && file !== "thank-you.html") {
      const routePath = path.join(baseRoute, file).replace(/\\/g, "/");

      // 去掉 index.html 的文件名，只保留路径
      const finalPath = routePath.endsWith("/index.html")
        ? routePath.replace("/index.html", "/")
        : routePath;

      result.push(finalPath);
    }
  });

  return result;
}

async function generateSitemap() {
  // 静态页面 + 扫描生成的文章链接
  const staticPages = [
    "/",
    "/contact/",
    "/solutions/oem-conveyor-solutions/",
    "/process/"
  ];

  const blogDir = path.resolve(__dirname, "../public/blog");
  const caseStudyDir = path.resolve(__dirname, "../public/case-studies");

  const blogPages = scanHtmlFiles(blogDir, "/blog");
  const caseStudyPages = scanHtmlFiles(caseStudyDir, "/case-studies");

  const allPages = [...staticPages, ...blogPages, ...caseStudyPages];

  const links = allPages.map((url) => ({
    url,
    changefreq: "weekly",
    priority: url === "/" ? 1.0 : 0.7
  }));

  const stream = new SitemapStream({ hostname: baseUrl });
  const data = await streamToPromise(Readable.from(links).pipe(stream));

  const outputPath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outputPath, data.toString());
  console.log("✅ sitemap.xml 生成成功，页面数：", links.length);
}

generateSitemap().catch((err) => {
  console.error("❌ 生成 sitemap.xml 失败：", err);
});
