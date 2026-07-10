import fs from 'fs/promises';
import path from 'path';

async function main() {
  const menuPath = path.join(process.cwd(), 'src/lib/paakashala-menu.ts');
  const userImagesPath = path.join(process.cwd(), 'scripts/user-images.json');

  let content = await fs.readFile(menuPath, 'utf8');
  const userImages = JSON.parse(await fs.readFile(userImagesPath, 'utf8'));

  let replacements = 0;

  for (const item of userImages) {
    if (!item.image) continue;

    const safeName = item.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // Regex matches:
    // $1 = `make("Category", "Name", price, "veg/non-veg", `
    // $2 = `IMG.constant` (or existing image)
    // $3 = `, "description")` or `)`
    const regex = new RegExp(`(make\\([^,]+,\\s*"${safeName}",\\s*[^,]+,\\s*[^,]+,\\s*)([^,\\)]+)(.*)`);
    
    if (regex.test(content)) {
      content = content.replace(regex, `$1"${item.image}"$3`);
      replacements++;
    } else {
      console.log(`Could not find or match line for: ${item.name}`);
    }
  }

  await fs.writeFile(menuPath, content, 'utf8');
  console.log(`Successfully applied ${replacements} images to the menu.`);
}

main().catch(console.error);
