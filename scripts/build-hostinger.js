import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../.output/public');
const dest = path.resolve(__dirname, '../public_html');

try {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  
  if (fs.existsSync(source)) {
    fs.cpSync(source, dest, { recursive: true });
    console.log('\x1b[32m%s\x1b[0m', '✅ Successfully created public_html folder for Hostinger deployment!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '❌ Could not find .output/public. Did the build fail?');
  }
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error moving build files:', error);
}
