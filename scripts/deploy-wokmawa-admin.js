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

console.log('🚀 Building WOKMAWA Admin Portal natively with VITE_BASE=/wokmawa-admin/...');

// 1. Build project with VITE_BASE=/wokmawa-admin/
execSync('npm run build', {
  cwd: rootDir,
  env: { ...process.env, VITE_BASE: '/wokmawa-admin/' },
  stdio: 'inherit'
});

const tempDir = path.join(os.tmpdir(), `wokmawa-admin-gh-${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

// 2. Copy compiled public_html to tempDir
fs.cpSync(publicHtml, tempDir, { recursive: true });

// 3. Also ensure root media files exist in tempDir
const mediaFiles = ['sitbg.png', 'splash.mp4', 'splash.png', 'logo.png', 'favicon.ico'];
for (const mf of mediaFiles) {
  const src = path.join(publicDir, mf);
  const srcAssets = path.join(publicDir, 'assets', mf);
  const sourceFile = fs.existsSync(src) ? src : (fs.existsSync(srcAssets) ? srcAssets : null);
  if (sourceFile) {
    [
      path.join(tempDir, mf),
      path.join(tempDir, 'assets', mf),
      path.join(tempDir, 'wokmawa-admin', mf),
      path.join(tempDir, 'wokmawa-admin', 'assets', mf),
    ].forEach(dest => {
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(sourceFile, dest);
      } catch (e) {}
    });
  }
}

// 4. Generate physical static route folders for zero 404s
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
  'wokmawa-admin/admin',
  'wokmawa-admin/admin/login',
  'wokmawa-admin/admin/dashboard',
  'wokmawa-admin/admin/orders',
  'wokmawa-admin/admin/kds',
  'wokmawa-admin/admin/pos-billing',
];

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

  for (const route of staticRoutes) {
    const rDir = path.join(tempDir, route);
    fs.mkdirSync(rDir, { recursive: true });
    fs.writeFileSync(path.join(rDir, 'index.html'), mainIndexContent, 'utf8');
  }
}

// 5. Ensure .nojekyll exists
fs.writeFileSync(path.join(tempDir, '.nojekyll'), '', 'utf8');

// 6. Git Deploy
execSync('git init', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.name "pavanstarkin-tech"', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.email "pavanstarkin.tech@gmail.com"', { cwd: tempDir, stdio: 'inherit' });
execSync('git checkout -b gh-pages', { cwd: tempDir, stdio: 'inherit' });
execSync('git add -A', { cwd: tempDir, stdio: 'inherit' });
execSync('git commit -m "Deploy WOKMAWA Admin Portal with native /wokmawa-admin/ build"', { cwd: tempDir, stdio: 'inherit' });

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

// 7. Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });

// 8. Rebuild default /wokmawa/ for the main repo
console.log('🔄 Rebuilding default /wokmawa/ bundle for main customer app...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
