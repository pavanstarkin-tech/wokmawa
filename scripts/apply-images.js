const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, '../src/lib/paakashala-menu.ts');
const userImagesPath = path.join(__dirname, 'user-images.json');

let content = fs.readFileSync(menuPath, 'utf8');
const userImages = JSON.parse(fs.readFileSync(userImagesPath, 'utf8'));

let replacements = 0;

for (const item of userImages) {
  if (!item.image) continue;

  const safeName = item.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

  // Regex matches:
  // $1 = `make("Category", "Name", price, "veg/non-veg", `
  // $2 = `IMG.constant` (or existing image)
  // $3 = `, "description")` or `)`
  // Note: we use [^)]+ for the image so it stops at the comma or closing parenthesis.
  // Wait, if it has a description, there's a comma. If no description, there's a `)`.
  // So we match until the next comma or closing paren.
  const regex = new RegExp(`(make\\([^,]+,\\s*"${safeName}",\\s*[^,]+,\\s*[^,]+,\\s*)([^,\\)]+)(.*)`);
  
  if (regex.test(content)) {
    content = content.replace(regex, `$1"${item.image}"$3`);
    replacements++;
  } else {
    console.log(`Could not find or match line for: ${item.name}`);
  }
}

fs.writeFileSync(menuPath, content, 'utf8');
console.log(`Successfully applied ${replacements} images to the menu.`);
