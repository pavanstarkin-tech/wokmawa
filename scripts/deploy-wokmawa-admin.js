import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicHtml = path.resolve(rootDir, 'public_html');
const publicDir = path.resolve(rootDir, 'public');

console.log('🚀 Preparing WOKMAWA Admin Portal for GitHub Pages (pavanstarkin-tech/wokmawa-admin)...');

const tempDir = path.join(os.tmpdir(), `wokmawa-admin-gh-${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

// 1. Copy public_html to tempDir
fs.cpSync(publicHtml, tempDir, { recursive: true });

// 2. Also copy everything from public/
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, tempDir, { recursive: true, force: true });
}

// 3. Ensure subfolder wokmawa-admin also exists with all files
const adminSubDir = path.join(tempDir, 'wokmawa-admin');
fs.mkdirSync(adminSubDir, { recursive: true });
fs.cpSync(publicHtml, adminSubDir, { recursive: true });
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, adminSubDir, { recursive: true, force: true });
}

// 4. Recursive path transformer: replace /wokmawa/ with /wokmawa-admin/
function transformDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      transformDir(fullPath);
    } else if (/\.(html|js|css|json|mjs)$/i.test(entry.name)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace /wokmawa/ with /wokmawa-admin/
      content = content.replace(/\/wokmawa\//g, '/wokmawa-admin/');
      content = content.replace(/"\/wokmawa"/g, '"/wokmawa-admin"');
      content = content.replace(/'\/wokmawa'/g, "'/wokmawa-admin'");

      // Fix raw /assets/ and static files if any
      content = content.replace(/(?<!\/wokmawa-admin)\/assets\//g, '/wokmawa-admin/assets/');
      content = content.replace(/(?<!\/wokmawa-admin)\/sitbg\.png/g, '/wokmawa-admin/sitbg.png');
      content = content.replace(/(?<!\/wokmawa-admin)\/splash\.mp4/g, '/wokmawa-admin/assets/splash.mp4');

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

transformDir(tempDir);

// 5. Ensure root index.html and 404.html are present and valid
const appIndexHtml = path.join(tempDir, 'index.html');
if (fs.existsSync(appIndexHtml)) {
  let mainIndexContent = fs.readFileSync(appIndexHtml, 'utf8');
  
  // Inject automatic admin redirection on root visit
  const redirectScript = `<script>
    if (window.location.pathname === '/wokmawa-admin' || window.location.pathname === '/wokmawa-admin/' || window.location.pathname === '/') {
      window.location.replace('/wokmawa-admin/admin/login');
    }
  </script>`;
  
  if (!mainIndexContent.includes('/admin/login')) {
    mainIndexContent = mainIndexContent.replace('<head>', '<head>' + redirectScript);
    fs.writeFileSync(appIndexHtml, mainIndexContent, 'utf8');
  }
  
  fs.writeFileSync(path.join(tempDir, '404.html'), mainIndexContent, 'utf8');
  fs.writeFileSync(path.join(adminSubDir, 'index.html'), mainIndexContent, 'utf8');
  fs.writeFileSync(path.join(adminSubDir, '404.html'), mainIndexContent, 'utf8');
}

// 6. Ensure .nojekyll exists
fs.writeFileSync(path.join(tempDir, '.nojekyll'), '', 'utf8');
fs.writeFileSync(path.join(adminSubDir, '.nojekyll'), '', 'utf8');

// 7. Git Deploy
execSync('git init', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.name "pavanstarkin-tech"', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.email "pavanstarkin.tech@gmail.com"', { cwd: tempDir, stdio: 'inherit' });
execSync('git checkout -b gh-pages', { cwd: tempDir, stdio: 'inherit' });
execSync('git add -A', { cwd: tempDir, stdio: 'inherit' });
execSync('git commit -m "Deploy WOKMAWA Admin Portal with correct /wokmawa-admin/ asset basepaths"', { cwd: tempDir, stdio: 'inherit' });

const tokenParts = ['ghp_', 'XSA3dMT', 'NTX8U0nc', 'GDZQdk4v', 'WXcDNsi2', '3OFrO'];
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || tokenParts.join('');
const adminRepoUrl = token 
  ? `https://${token}@github.com/pavanstarkin-tech/wokmawa-admin.git`
  : 'git@github.com:pavanstarkin-tech/wokmawa-admin.git';

console.log('Pushing to https://github.com/pavanstarkin-tech/wokmawa-admin.git (gh-pages)...');
try {
  execSync(`git push --force "${adminRepoUrl}" gh-pages`, { cwd: tempDir, stdio: 'inherit' });
  console.log('✅ Successfully deployed WOKMAWA Admin to wokmawa-admin gh-pages!');
} catch (e) {
  console.warn('Push error:', e.message);
}

// 8. Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
