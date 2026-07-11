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
    
    // Server is ready, fetch the index.html
    setTimeout(() => {
      http.get('http://localhost:3000/', (res) => {
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          // Ensure it's not empty
          if (html.length > 500) {
            fs.writeFileSync(path.resolve('public_html', 'index.html'), html);
            console.log('✅ Successfully extracted index.html to public_html!');
          } else {
            console.error('❌ Extracted HTML was too short, something went wrong.');
          }
          // Kill the server
          server.kill();
          process.exit(0);
        });
      }).on('error', (err) => {
        console.error('Error fetching HTML:', err);
        server.kill();
        process.exit(1);
      });
    }, 1000); // give it a second to boot completely
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
