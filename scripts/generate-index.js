import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Start the nitro server in the background
const server = spawn('node', ['.output/server/index.mjs'], { 
  env: { ...process.env, PORT: '3000' }
});

let extracted = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Listening on') || output.includes('http://')) {
    if (extracted) return;
    extracted = true;
    
    const targetBase = process.env.VITE_BASE || '/wokmawa/';
    const fetchHtml = (urlPath = targetBase) => {
      http.get(`http://localhost:3000${urlPath}`, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchHtml(res.headers.location);
          return;
        }
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          if (html.length > 500) {
            fs.writeFileSync(path.resolve('public_html', 'index.html'), html);
            console.log('✅ Successfully extracted index.html to public_html!');
          } else if (urlPath !== '/') {
            fetchHtml('/');
            return;
          } else {
            console.error('❌ Extracted HTML was too short, length:', html.length);
          }
          server.kill();
          process.exit(0);
        });
      }).on('error', (err) => {
        console.error('Error fetching HTML:', err);
        server.kill();
        process.exit(1);
      });
    };

    setTimeout(() => {
      fetchHtml(targetBase);
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  console.error(`Server Error: ${data}`);
});

setTimeout(() => {
  if (!extracted) {
    console.error('Timeout waiting for server to start.');
    server.kill();
    process.exit(1);
  }
}, 10000);
