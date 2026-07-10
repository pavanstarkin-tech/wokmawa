import fs from "fs/promises";
import path from "path";
import google from "googlethis";
import { MENU } from "../src/lib/paakashala-menu";

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Found ${MENU.length} items to scrape images for...`);
  
  const results: Record<string, string[]> = {};
  
  const outPath = path.join(process.cwd(), "public", "scraped-images.json");
  try {
    const existing = await fs.readFile(outPath, "utf-8");
    Object.assign(results, JSON.parse(existing));
    console.log(`Loaded existing progress: ${Object.keys(results).length} items already fetched.`);
  } catch (e) {
    console.log("No existing scraped-images.json found. Starting fresh.");
  }

  for (let i = 0; i < MENU.length; i++) {
    const item = MENU[i];
    if (results[item.id] && results[item.id].length > 0) {
      continue;
    }
    
    console.log(`[${i + 1}/${MENU.length}] Fetching images for: ${item.name} (Category: ${item.category})`);
    try {
      const query = `Indian food ${item.name} restaurant high quality`;
      const searchResults = await google.image(query, { safe: false });
      
      const images = searchResults.slice(0, 5).map((res: any) => res.url);
      results[item.id] = images;
      
      await fs.writeFile(outPath, JSON.stringify(results, null, 2));
      
      await delay(1500); // Wait 1.5 seconds to prevent rate limiting
    } catch (err: any) {
      console.error(`Failed to fetch images for ${item.name}: ${err.message}`);
    }
  }
  
  console.log("Finished scraping images!");
}

main().catch(console.error);
