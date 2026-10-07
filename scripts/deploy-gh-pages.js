import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicHtml = path.resolve(rootDir, 'public_html');

console.log('🚀 Deploying public_html to gh-pages...');

const tempDir = path.join(os.tmpdir(), `gh-pages-${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

// 1. Copy public_html to tempDir
fs.cpSync(publicHtml, tempDir, { recursive: true });

// 2. Initialize temporary git repo
execSync('git init', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.name "pavanstarkin-tech"', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.email "pavanstarkin.tech@gmail.com"', { cwd: tempDir, stdio: 'inherit' });
execSync('git checkout -b gh-pages', { cwd: tempDir, stdio: 'inherit' });
execSync('git add -A', { cwd: tempDir, stdio: 'inherit' });
execSync('git commit -m "Deploy to GitHub Pages"', { cwd: tempDir, stdio: 'inherit' });

// 3. Push to remote gh-pages
const remoteUrl = execSync('git config --get remote.origin.url', { cwd: rootDir }).toString().trim();
console.log(`Pushing to ${remoteUrl} (gh-pages)...`);
execSync(`git push --force "${remoteUrl}" gh-pages`, { cwd: tempDir, stdio: 'inherit' });

// 4. Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('✅ Successfully deployed to gh-pages!');
