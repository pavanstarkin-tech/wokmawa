import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicHtml = path.resolve(__dirname, '../public_html');

const REPO_NAME = 'wokmawa';
const BASE_PATH = `/${REPO_NAME}/`;

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (/\.(html|js|css|json)$/i.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // 1. Normalize any existing double prefixes first
      content = content.replace(/\/wokmawa\/assets\/wokmawa\//g, '/wokmawa/');
      content = content.replace(/\/wokmawa\/wokmawa\//g, '/wokmawa/');

      // 2. Exact match replacements
      content = content.replace(/(?<!\/wokmawa)\/assets\//g, '/wokmawa/assets/');
      content = content.replace(/(?<!\/wokmawa)\/sitbg\.png/g, '/wokmawa/sitbg.png');
      content = content.replace(/(?<!\/wokmawa)\/splash\.mp4/g, '/wokmawa/assets/splash.mp4');
      content = content.replace(/(?<!\/wokmawa)\/sql-wasm/g, '/wokmawa/sql-wasm');
      content = content.replace(/(?<!\/wokmawa)\/favicon\.ico/g, '/wokmawa/favicon.ico');

      // 3. Clean up any accidental doubles
      content = content.replace(/\/wokmawa\/assets\/wokmawa\//g, '/wokmawa/');
      content = content.replace(/\/wokmawa\/wokmawa\//g, '/wokmawa/');

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

// 1. Copy all assets from public/ into public_html to ensure 100% asset completeness
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, publicHtml, { recursive: true, force: true });
}

// 2. Mirror all assets to /wokmawa/ and /assets/ inside public_html
const wokmawaSubdir = path.join(publicHtml, 'wokmawa');
fs.mkdirSync(wokmawaSubdir, { recursive: true });
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, wokmawaSubdir, { recursive: true, force: true });
}
const assetsDir = path.join(publicHtml, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(wokmawaSubdir, 'assets'), { recursive: true, force: true });
}

// 3. Process all files for GitHub Pages subpath replacement
processDir(publicHtml);

// 4. Ensure WASM files are copied to public_html
const sqlJsDist = path.resolve(__dirname, '../node_modules/sql.js/dist');
if (fs.existsSync(sqlJsDist)) {
  const wasmFiles = fs.readdirSync(sqlJsDist).filter(f => f.endsWith('.wasm'));
  for (const wf of wasmFiles) {
    try {
      const src = path.join(sqlJsDist, wf);
      const dst = path.join(publicHtml, wf);
      if (src !== dst) fs.copyFileSync(src, dst);
      const dstSub = path.join(wokmawaSubdir, wf);
      if (src !== dstSub) fs.copyFileSync(src, dstSub);
    } catch (e) {}
  }
}

// 5. Ensure .nojekyll exists
fs.writeFileSync(path.join(publicHtml, '.nojekyll'), '', 'utf8');

// 7. Generate static route fallback folders with index.html for zero 404s
const staticRoutes = [
  'admin',
  'admin/login',
  'admin/dashboard',
  'admin/orders',
  'admin/kds',
  'admin/pos-billing',
  'admin/tables',
  'admin/menu',
  'admin/offers',
  'admin/analysis',
  'admin/printers',
  'admin/staff',
  'admin/settings',
  'orders',
  'cart',
  'menu',
  'wokmawa/admin',
  'wokmawa/admin/login',
  'wokmawa/admin/dashboard',
  'wokmawa/admin/orders',
  'wokmawa/admin/kds',
  'wokmawa/admin/pos-billing',
  'wokmawa/orders',
  'wokmawa/cart',
  'wokmawa/menu',
];

if (fs.existsSync(path.join(publicHtml, 'index.html'))) {
  const indexHtml = fs.readFileSync(path.join(publicHtml, 'index.html'), 'utf8');
  for (const route of staticRoutes) {
    const routeDir = path.join(publicHtml, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml, 'utf8');
  }
}

// 8. Place sitbg.png and splash.mp4 in root, assets, wokmawa, and wokmawa/assets
const mediaFiles = ['sitbg.png', 'splash.mp4', 'splash.png', 'logo.png', 'favicon.ico'];
for (const mf of mediaFiles) {
  const src = path.join(publicDir, mf);
  const srcAssets = path.join(publicDir, 'assets', mf);
  const sourceFile = fs.existsSync(src) ? src : (fs.existsSync(srcAssets) ? srcAssets : null);
  if (sourceFile) {
    [
      path.join(publicHtml, mf),
      path.join(publicHtml, 'assets', mf),
      path.join(publicHtml, 'wokmawa', mf),
      path.join(publicHtml, 'wokmawa', 'assets', mf),
    ].forEach(dest => {
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(sourceFile, dest);
      } catch (e) {}
    });
  }
}

console.log('✅ Successfully prepared public_html for GitHub Pages subpath /wokmawa/!');
