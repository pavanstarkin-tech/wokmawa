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

// 1. Process all files
processDir(publicHtml);

// 2. Ensure WASM files are copied to public_html
const sqlJsDist = path.resolve(__dirname, '../node_modules/sql.js/dist');
if (fs.existsSync(sqlJsDist)) {
  const wasmFiles = fs.readdirSync(sqlJsDist).filter(f => f.endsWith('.wasm'));
  for (const wf of wasmFiles) {
    try {
      const src = path.join(sqlJsDist, wf);
      const dst = path.join(publicHtml, wf);
      if (src !== dst) fs.copyFileSync(src, dst);
    } catch (e) {}
  }
}
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  const publicWasm = fs.readdirSync(publicDir).filter(f => f.endsWith('.wasm'));
  for (const pw of publicWasm) {
    try {
      const src = path.join(publicDir, pw);
      const dst = path.join(publicHtml, pw);
      if (src !== dst) fs.copyFileSync(src, dst);
    } catch (e) {}
  }
}

// 3. Ensure .nojekyll exists
fs.writeFileSync(path.join(publicHtml, '.nojekyll'), '', 'utf8');

// 3. Ensure 404.html matches updated index.html for SPA routing
if (fs.existsSync(path.join(publicHtml, 'index.html'))) {
  const indexHtml = fs.readFileSync(path.join(publicHtml, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(publicHtml, '404.html'), indexHtml, 'utf8');
}

console.log('✅ Successfully prepared public_html for GitHub Pages subpath /wokmawa/!');
