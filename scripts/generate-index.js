import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Start the nitro server in the background
const server = spawn('node', ['.output/server/index.mjs'], { 
  env: { ...process.env, PORT: '3000', HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let extracted = false;

const tryExtract = () => {
  if (extracted) return;
  const targetBase = process.env.VITE_BASE || '/wokmawa/';
  
  const req = http.get(`http://127.0.0.1:3000${targetBase}`, (res) => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
      if (html.length > 300 && !extracted) {
        extracted = true;
        fs.writeFileSync(path.resolve('public_html', 'index.html'), html);
        console.log('✅ Successfully extracted index.html to public_html!');
        server.kill();
        process.exit(0);
      }
    });
  });

  req.on('error', () => {
    // Retry shortly
  });
};

const interval = setInterval(tryExtract, 800);

setTimeout(() => {
  if (!extracted) {
    clearInterval(interval);
    // If extraction timed out, ensure public_html/index.html exists as fallback
    const fallbackPath = path.resolve('public_html', 'index.html');
    if (!fs.existsSync(fallbackPath)) {
      const template = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>WokMawa</title></head><body><div id="root"></div></body></html>`;
      fs.writeFileSync(fallbackPath, template);
    }
    server.kill();
    process.exit(0);
  }
}, 12000);
