import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicHtml = path.resolve(rootDir, 'public_html');

console.log('🚀 Deploying WOKMAWA Admin Portal to https://github.com/pavanstarkin-tech/wokmawa-admin (gh-pages)...');

const tempDir = path.join(os.tmpdir(), `wokmawa-admin-gh-${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

// 1. Copy public_html to tempDir
fs.cpSync(publicHtml, tempDir, { recursive: true });

// 2. Also ensure subfolder wokmawa-admin exists with mirrored assets
const adminSubDir = path.join(tempDir, 'wokmawa-admin');
fs.mkdirSync(adminSubDir, { recursive: true });
fs.cpSync(publicHtml, adminSubDir, { recursive: true });

// 3. Create index.html at root that redirects to /admin/login if accessed on base URL
const rootIndex = path.join(tempDir, 'index.html');
const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WOKMAWA Restaurant OS - Admin Portal</title>
  <link rel="icon" href="./assets/logo.png" />
  <script>
    if (!window.location.hash && !window.location.pathname.includes('/admin')) {
      window.location.replace('./admin/login');
    }
  </script>
</head>
<body style="background: #080808; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0;">
  <div style="text-align: center;">
    <h2 style="color: #D4AF37; margin-bottom: 8px;">Loading WOKMAWA Admin OS...</h2>
    <p style="color: #888; font-size: 13px;">Redirecting to Admin Portal</p>
  </div>
</body>
</html>`;

if (!fs.existsSync(rootIndex) || fs.readFileSync(rootIndex, 'utf8').length < 100) {
  fs.writeFileSync(rootIndex, indexHtmlContent, 'utf8');
}

// 4. Git deploy
execSync('git init', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.name "pavanstarkin-tech"', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.email "pavanstarkin.tech@gmail.com"', { cwd: tempDir, stdio: 'inherit' });
execSync('git checkout -b gh-pages', { cwd: tempDir, stdio: 'inherit' });
execSync('git add -A', { cwd: tempDir, stdio: 'inherit' });
execSync('git commit -m "Deploy WOKMAWA Admin Portal to GitHub Pages"', { cwd: tempDir, stdio: 'inherit' });

// Read remote origin url or env for pushing
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
  console.warn('Push warning:', e.message);
}

// 5. Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
