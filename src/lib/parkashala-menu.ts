export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  type: "veg" | "non-veg";
  image: string;
  description?: string;
};

export const LOGO_URL =
  "https://i.ibb.co/6JncbJsc/Screenshot-2026-07-10-13-42-55-71-1c337646f29875672b5a61192b9010f9.png";

export const WHATSAPP_NUMBER = "918639122823";

const IMG = {
  soupVeg: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=70",
  soupNV: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=70",
  vegStarter: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=70",
  paneer: "https://images.unsplash.com/photo-1601050690294-2f7f0f5a9e3e?auto=format&fit=crop&w=800&q=70",
  mushroom: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=70",
  chickenStarter: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=70",
  chickenLollipop: "https://images.unsplash.com/photo-1626500155657-f2b9ad4c76aa?auto=format&fit=crop&w=800&q=70",
  chilliChicken: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=800&q=70",
  mutton: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=70",
  prawns: "https://images.unsplash.com/photo-1625944525533-473f1b3d9684?auto=format&fit=crop&w=800&q=70",
  fish: "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&w=800&q=70",
  andhraChicken: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=70",
  gongura: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=70",
  tandooriChicken: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=70",
  tikka: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=70",
  kebab: "https://images.unsplash.com/photo-1633945274309-2c16c96eb2c8?auto=format&fit=crop&w=800&q=70",
  paneerTikka: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=70",
  naan: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=70",
  garlicNaan: "https://images.unsplash.com/photo-1600628421055-4d30de868b8f?auto=format&fit=crop&w=800&q=70",
  friedRiceVeg: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=70",
  friedRiceNV: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=70",
  gravyChicken: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=70",
  gravyMutton: "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=70",
  paneerGravy: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=70",
  vegCurry: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=70",
  biryaniChicken: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=70",
  biryaniMutton: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=70",
  biryaniVeg: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=70",
  biryaniPrawn: "https://images.unsplash.com/photo-1633945274309-2c16c96eb2c8?auto=format&fit=crop&w=800&q=70",
  rice: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=70",
  thali: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=70",
  beverage: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=70",
  lassi: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=70",
  water: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=70",
};

export const CATEGORIES = [
  "Soups",
  "Veg Starters",
  "Non Veg Starters",
  "South Indian Starters",
  "Tandoori Starters",
  "Tandoori Breads",
  "Fried Rice",
  "Main Course Gravies",
  "Biryani",
  "Rice",
  "Thali",
  "Beverages",
] as const;

export type Category = (typeof CATEGORIES)[number];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const make = (
  category: Category,
  name: string,
  price: number | null,
  type: "veg" | "non-veg",
  image: string,
  description?: string,
): MenuItem => ({
  id: slug(`${category}-${name}`),
  name,
  category,
  price,
  type,
  image,
  description,
});

export const MENU: MenuItem[] = [
  // Soups
  make("Soups", "Sweet Corn Soup", 159, "veg", IMG.soupVeg, "Silky sweet corn broth"),
  make("Soups", "Veg Hot & Sour Soup", 159, "veg", IMG.soupVeg, "Tangy peppered vegetables"),
  make("Soups", "Veg Manchow Soup", 159, "veg", IMG.soupVeg, "Rustic Indo-Chinese classic"),
  make("Soups", "Lemon Coriander Soup", 159, "veg", IMG.soupVeg, "Bright, fragrant, warming"),
  make("Soups", "Mushroom Clear Soup", 159, "veg", IMG.soupVeg, "Delicate mushroom essence"),
  make("Soups", "Chicken Corn Soup", 189, "non-veg", IMG.soupNV, "Silky chicken and sweet corn"),
  make("Soups", "Chicken Hot & Sour", 189, "non-veg", IMG.soupNV, "Fiery peppered chicken broth"),
  make("Soups", "Chicken Manchow Soup", 189, "non-veg", IMG.soupNV, "Crisp noodles & shredded chicken"),
  make("Soups", "Chicken Lemon Coriander", 189, "non-veg", IMG.soupNV, "Aromatic citrus chicken broth"),
  make("Soups", "Chicken Miryala Charu", 189, "non-veg", IMG.soupNV, "Andhra pepper chicken rasam"),
  make("Soups", "Mutton Charu", 189, "non-veg", IMG.soupNV, "Slow-simmered mutton rasam"),

  // Veg Starters
  make("Veg Starters", "Chilli Corn", 279, "veg", IMG.vegStarter),
  make("Veg Starters", "Chilli Paneer", 299, "veg", IMG.paneer),
  make("Veg Starters", "Chilli Mushroom", 299, "veg", IMG.mushroom),
  make("Veg Starters", "Crispy Corn", 249, "veg", IMG.vegStarter),
  make("Veg Starters", "Crispy Mushroom", 299, "veg", IMG.mushroom),
  make("Veg Starters", "Paneer 65", 299, "veg", IMG.paneer),
  make("Veg Starters", "Mushroom 65", 299, "veg", IMG.mushroom),
  make("Veg Starters", "Stuffed Cheese Mushroom", 349, "veg", IMG.mushroom),

  // Non Veg Starters
  make("Non Veg Starters", "Egg 65", 229, "non-veg", IMG.chickenStarter),
  make("Non Veg Starters", "Chilli Egg", 229, "non-veg", IMG.chickenStarter),
  make("Non Veg Starters", "Chicken Lollipop", 369, "non-veg", IMG.chickenLollipop, "Signature crispy drumettes"),
  make("Non Veg Starters", "Crunchy Chicken", 369, "non-veg", IMG.chickenStarter),
  make("Non Veg Starters", "Chilli Chicken (Dry/Wet)", 369, "non-veg", IMG.chilliChicken),
  make("Non Veg Starters", "Chilli Wings", 369, "non-veg", IMG.chickenLollipop),
  make("Non Veg Starters", "Lemon Chicken", 369, "non-veg", IMG.chilliChicken),
  make("Non Veg Starters", "Garlic Chicken", 369, "non-veg", IMG.chilliChicken),
  make("Non Veg Starters", "Mango Chicken", 369, "non-veg", IMG.chilliChicken),
  make("Non Veg Starters", "Chilli Mutton", 425, "non-veg", IMG.mutton),
  make("Non Veg Starters", "Mutton 65", 425, "non-veg", IMG.mutton),
  make("Non Veg Starters", "Chilli Prawns", 425, "non-veg", IMG.prawns),
  make("Non Veg Starters", "Loose Prawns", 425, "non-veg", IMG.prawns),
  make("Non Veg Starters", "Butter Garlic Prawns", 425, "non-veg", IMG.prawns),
  make("Non Veg Starters", "Chilli Fish", 389, "non-veg", IMG.fish),
  make("Non Veg Starters", "Apollo Fish", 389, "non-veg", IMG.fish),
  make("Non Veg Starters", "Fish Roast", 349, "non-veg", IMG.fish),

  // South Indian Starters
  make("South Indian Starters", "Chicken Cheese Baji", 369, "non-veg", IMG.andhraChicken),
  make("South Indian Starters", "Kaju Chicken Pakodi", 329, "non-veg", IMG.andhraChicken),
  make("South Indian Starters", "Miryala Kodi Vepudu", 329, "non-veg", IMG.andhraChicken, "Andhra pepper chicken fry"),
  make("South Indian Starters", "Pachi Mirchi Kodi Vepudu", 329, "non-veg", IMG.andhraChicken, "Green chilli chicken fry"),
  make("South Indian Starters", "Andhra Chicken Vepudu", 329, "non-veg", IMG.andhraChicken),
  make("South Indian Starters", "Karivepaku Kodi Vepudu", 329, "non-veg", IMG.andhraChicken, "Curry-leaf chicken fry"),
  make("South Indian Starters", "Pandu Mirchi Kodi Vepudu", 329, "non-veg", IMG.andhraChicken, "Red chilli chicken fry"),
  make("South Indian Starters", "Velluli Kaaram Kodi Wings", 329, "non-veg", IMG.chickenLollipop),
  make("South Indian Starters", "Velluli Kaaram Kodi Chips", 329, "non-veg", IMG.andhraChicken),
  make("South Indian Starters", "Gongura Chicken Vepudu", 349, "non-veg", IMG.gongura),
  make("South Indian Starters", "Gongura Mutton Vepudu", 449, "non-veg", IMG.gongura),
  make("South Indian Starters", "Gongura Royyala Vepudu", 399, "non-veg", IMG.prawns),
  make("South Indian Starters", "Pachi Mirchi Royyalu Vepudu", 399, "non-veg", IMG.prawns),
  make("South Indian Starters", "Mutton Ghee Roast", 449, "non-veg", IMG.mutton),
  make("South Indian Starters", "Chitti Royyala Vepudu", 399, "non-veg", IMG.prawns),
  make("South Indian Starters", "Goan Rava Fish Fry", 329, "non-veg", IMG.fish),
  make("South Indian Starters", "Tawa Fish Fry", 389, "non-veg", IMG.fish),

  // Tandoori Starters
  make("Tandoori Starters", "Chicken Tikka", 299, "non-veg", IMG.tikka),
  make("Tandoori Starters", "Chicken Malai Tikka", 299, "non-veg", IMG.tikka),
  make("Tandoori Starters", "Al-faham Chicken (Half)", 349, "non-veg", IMG.tandooriChicken),
  make("Tandoori Starters", "Al-faham Chicken (Full)", 549, "non-veg", IMG.tandooriChicken),
  make("Tandoori Starters", "Kalmi Kebab (Half)", 249, "non-veg", IMG.kebab),
  make("Tandoori Starters", "Kalmi Kebab (Full)", 399, "non-veg", IMG.kebab),
  make("Tandoori Starters", "Chicken Tangdi Kebab (Half)", 249, "non-veg", IMG.kebab),
  make("Tandoori Starters", "Chicken Tangdi Kebab (Full)", 399, "non-veg", IMG.kebab),
  make("Tandoori Starters", "Tandoori Chicken (Half)", 299, "non-veg", IMG.tandooriChicken),
  make("Tandoori Starters", "Tandoori Chicken (Full)", 549, "non-veg", IMG.tandooriChicken),
  make("Tandoori Starters", "Pomfret Tikka", 399, "non-veg", IMG.fish),
  make("Tandoori Starters", "Peri Peri Prawn Tikka", 399, "non-veg", IMG.prawns),
  make("Tandoori Starters", "Malai Paneer Tikka", 299, "veg", IMG.paneerTikka),
  make("Tandoori Starters", "Paneer Tikka", 299, "veg", IMG.paneerTikka),
  make("Tandoori Starters", "Mushroom Tikka", 299, "veg", IMG.mushroom),
  make("Tandoori Starters", "Hara Bhara Kebab", 329, "veg", IMG.paneerTikka),
  make("Tandoori Starters", "Pineapple BBQ", 219, "veg", IMG.paneerTikka),

  // Tandoori Breads
  make("Tandoori Breads", "Naan", 79, "veg", IMG.naan),
  make("Tandoori Breads", "Butter Naan", 89, "veg", IMG.naan),
  make("Tandoori Breads", "Garlic Naan", 99, "veg", IMG.garlicNaan),
  make("Tandoori Breads", "Pulka", 39, "veg", IMG.naan),

  // Fried Rice
  make("Fried Rice", "Veg Fried Rice", 259, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "Kaju Fried Rice", 299, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "Mushroom Fried Rice", 299, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "Paneer Fried Rice", 299, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "Mixed Vegetable Fried Rice", 349, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "Veg Schezwan Fried Rice", 299, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "SP Veg Fried Rice", 349, "veg", IMG.friedRiceVeg),
  make("Fried Rice", "Egg Fried Rice", 249, "non-veg", IMG.friedRiceNV),
  make("Fried Rice", "Chicken Fried Rice", 319, "non-veg", IMG.friedRiceNV),
  make("Fried Rice", "SP Chicken Fried Rice", 399, "non-veg", IMG.friedRiceNV),
  make("Fried Rice", "Chicken Fry Piece Fried Rice", 399, "non-veg", IMG.friedRiceNV),
  make("Fried Rice", "Mutton Fried Rice", 449, "non-veg", IMG.friedRiceNV),
  make("Fried Rice", "Prawns Fried Rice", 439, "non-veg", IMG.friedRiceNV),
  make("Fried Rice", "Mix Mughlai Fried Rice", 499, "non-veg", IMG.friedRiceNV),

  // Main Course Gravies
  make("Main Course Gravies", "Egg Masala", 269, "non-veg", IMG.gravyChicken),
  make("Main Course Gravies", "Murgh Masala", 369, "non-veg", IMG.gravyChicken),
  make("Main Course Gravies", "Kadai Chicken", 389, "non-veg", IMG.gravyChicken),
  make("Main Course Gravies", "Punjabi Murgh Butter Masala", 389, "non-veg", IMG.gravyChicken),
  make("Main Course Gravies", "Chicken Tikka Masala", 389, "non-veg", IMG.gravyChicken),
  make("Main Course Gravies", "Afghani Chicken Kebab Masala", 389, "non-veg", IMG.gravyChicken),
  make("Main Course Gravies", "Konaseema Kodi Curry", 389, "non-veg", IMG.andhraChicken),
  make("Main Course Gravies", "Mutton Masala Curry", 469, "non-veg", IMG.gravyMutton),
  make("Main Course Gravies", "Gongura Chicken Curry", 399, "non-veg", IMG.gongura),
  make("Main Course Gravies", "Gongura Mutton Curry", 489, "non-veg", IMG.gongura),
  make("Main Course Gravies", "Gongura Prawns Curry", 429, "non-veg", IMG.prawns),
  make("Main Course Gravies", "Kaju Paneer Curry", 329, "veg", IMG.paneerGravy),
  make("Main Course Gravies", "Kaju Tomato Curry", 349, "veg", IMG.paneerGravy),
  make("Main Course Gravies", "Kaju Mushroom Curry", 329, "veg", IMG.paneerGravy),
  make("Main Course Gravies", "Kadai Paneer Curry", 319, "veg", IMG.paneerGravy),
  make("Main Course Gravies", "Paneer Butter Masala", 329, "veg", IMG.paneerGravy),
  make("Main Course Gravies", "Paneer Tikka Masala", 369, "veg", IMG.paneerGravy),
  make("Main Course Gravies", "Mushroom Masala Curry", 299, "veg", IMG.mushroom),
  make("Main Course Gravies", "Mixed Vegetable Curry", 369, "veg", IMG.vegCurry),

  // Biryani
  make("Biryani", "Paneer Biryani", 349, "veg", IMG.biryaniVeg),
  make("Biryani", "Mushroom Biryani", 349, "veg", IMG.biryaniVeg),
  make("Biryani", "SP Veg Biryani", 349, "veg", IMG.biryaniVeg),
  make("Biryani", "Mix Veg Biryani", 349, "veg", IMG.biryaniVeg),
  make("Biryani", "Egg Biryani", 299, "non-veg", IMG.biryaniChicken),
  make("Biryani", "HYD Chicken Dum Biryani", 399, "non-veg", IMG.biryaniChicken, "House signature Hyderabadi dum"),
  make("Biryani", "Mutton Dum Biryani", 499, "non-veg", IMG.biryaniMutton, "Slow-cooked in sealed handi"),
  make("Biryani", "Chicken Fry Piece Biryani", 349, "non-veg", IMG.biryaniChicken),
  make("Biryani", "Mutton Fry Piece Biryani", 499, "non-veg", IMG.biryaniMutton),
  make("Biryani", "Prawn Fry Piece Biryani", 449, "non-veg", IMG.biryaniPrawn),
  make("Biryani", "Chicken Mughlai Biryani", 349, "non-veg", IMG.biryaniChicken),
  make("Biryani", "Mutton Mughlai Biryani", 499, "non-veg", IMG.biryaniMutton),
  make("Biryani", "Prawn Mughlai Biryani", 499, "non-veg", IMG.biryaniPrawn),
  make("Biryani", "Mix Mughlai Biryani", 499, "non-veg", IMG.biryaniMutton),
  make("Biryani", "Chicken Dilkush Biryani", 449, "non-veg", IMG.biryaniChicken),

  // Rice
  make("Rice", "Ghee Sambar Rice", null, "veg", IMG.rice),
  make("Rice", "Mudhapappu Avakai Annam", null, "veg", IMG.rice),
  make("Rice", "Curd Rice", null, "veg", IMG.rice),
  make("Rice", "White Rice", null, "veg", IMG.rice),
  make("Rice", "Chicken Sambar Rice", null, "non-veg", IMG.rice),

  // Thali
  make("Thali", "Veg Thali", null, "veg", IMG.thali),
  make("Thali", "Chicken Thali", null, "non-veg", IMG.thali),
  make("Thali", "Sea Food Thali", null, "non-veg", IMG.thali),

  // Beverages
  make("Beverages", "Packaged Drinking Water", null, "veg", IMG.water),
  make("Beverages", "Soft Drinks", null, "veg", IMG.beverage),
  make("Beverages", "Butter Milk", null, "veg", IMG.lassi),
  make("Beverages", "Lassi", null, "veg", IMG.lassi),
];

export const CATEGORY_IMAGE: Record<Category, string> = {
  Soups: IMG.soupNV,
  "Veg Starters": IMG.paneer,
  "Non Veg Starters": IMG.chickenLollipop,
  "South Indian Starters": IMG.andhraChicken,
  "Tandoori Starters": IMG.tandooriChicken,
  "Tandoori Breads": IMG.garlicNaan,
  "Fried Rice": IMG.friedRiceNV,
  "Main Course Gravies": IMG.gravyChicken,
  Biryani: IMG.biryaniChicken,
  Rice: IMG.rice,
  Thali: IMG.thali,
  Beverages: IMG.lassi,
};

export const FEATURED_IDS = [
  "biryani-hyd-chicken-dum-biryani",
  "non-veg-starters-chicken-lollipop",
  "tandoori-starters-tandoori-chicken-full",
  "biryani-mutton-dum-biryani",
  "south-indian-starters-gongura-chicken-vepudu",
  "main-course-gravies-paneer-butter-masala",
];
