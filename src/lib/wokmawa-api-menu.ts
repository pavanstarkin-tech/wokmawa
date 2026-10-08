import { useState, useEffect } from 'react';
import { MenuItem, Category, CATEGORIES as DEFAULT_CATEGORIES, MENU_ITEMS as DEFAULT_MENU_ITEMS } from './wokmawa-menu';

export interface LiveMenuData {
  categories: Category[];
  items: MenuItem[];
  isLoading: boolean;
  error: string | null;
}

// Memory cache to avoid flash of content
let cachedCategories: Category[] = DEFAULT_CATEGORIES;
let cachedItems: MenuItem[] = DEFAULT_MENU_ITEMS;
let hasFetchedOnce = false;

// Helper to format image URL from database
export function formatImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  }
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  if (rawUrl.startsWith('/uploads/')) {
    return rawUrl;
  }
  return `/uploads/${rawUrl}`;
}

export function formatCategoryImageUrl(name: string, rawUrl?: string | null): string {
  if (rawUrl) {
    return formatImageUrl(rawUrl);
  }
  const lower = name.toLowerCase();
  if (lower.includes('noodl') || lower.includes('nudel')) return '/assets/categories/nudels.png';
  if (lower.includes('rice') || lower.includes('biryani')) return '/assets/categories/rice-bowls.png';
  if (lower.includes('starter') || lower.includes('dry') || lower.includes('tikka') || lower.includes('65')) return '/assets/categories/statres.png';
  if (lower.includes('momo') || lower.includes('dimsum')) return '/assets/categories/momo.png';
  if (lower.includes('curry') || lower.includes('gravy') || lower.includes('bowl')) return '/assets/categories/vej.png';
  return '/assets/categories/vej.png';
}

// Convert Restocare DB Category to frontend Category
export function transformDbCategory(dbCat: any, itemCount = 0): Category {
  const name = (dbCat.name || 'Dishes').trim();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${dbCat.id}`;
  
  return {
    id: String(dbCat.id),
    slug,
    name,
    tagline: dbCat.description || 'Delicious freshly prepared specialties',
    icon: '🍜',
    image: formatCategoryImageUrl(name, dbCat.imageUrl),
    itemCount,
  };
}

// Convert Restocare DB MenuItem to frontend MenuItem
export function transformDbMenuItem(dbItem: any): MenuItem {
  const name = (dbItem.name || 'Dish').trim();
  const categoryName = (dbItem.category?.name || 'Main Dishes').trim();
  const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'main';
  const categoryImage = formatCategoryImageUrl(categoryName, dbItem.category?.imageUrl);
  const price = parseFloat(dbItem.price) || 0;
  const originalPrice = dbItem.acPrice ? parseFloat(dbItem.acPrice) : undefined;
  
  const spiciness = (dbItem.spiciness || 'medium').toLowerCase();
  let defaultSpice: 'mild' | 'medium' | 'hot' | 'mawa-hot' = 'medium';
  if (spiciness.includes('extra') || spiciness.includes('fire') || spiciness.includes('volcano')) {
    defaultSpice = 'mawa-hot';
  } else if (spiciness.includes('hot') || spiciness.includes('spicy')) {
    defaultSpice = 'hot';
  } else if (spiciness.includes('mild') || spiciness.includes('none')) {
    defaultSpice = 'mild';
  }

  // If item image is not available, use the category image as fallback
  const image = dbItem.imageUrl && String(dbItem.imageUrl).trim() !== ''
    ? formatImageUrl(dbItem.imageUrl)
    : categoryImage;

  return {
    id: String(dbItem.id),
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${dbItem.id}`,
    name,
    categorySlug,
    categoryName,
    price,
    originalPrice,
    isVeg: Boolean(dbItem.isVeg),
    isPopular: Boolean(dbItem.isPopular || (dbItem.avgRating && dbItem.avgRating >= 4.5)),
    isMawaHot: defaultSpice === 'mawa-hot',
    rating: dbItem.avgRating ? Number(dbItem.avgRating) : 4.8,
    ratingCount: dbItem.totalRatings ? Number(dbItem.totalRatings) : 54,
    description: dbItem.description || `Freshly cooked ${name} seasoned with authentic spices and chef special sauces.`,
    image,
    availableSizes: [
      { name: 'Standard Portion', price: price, serves: '1 Serving' },
    ],
    recommendedExtras: ['ex-fried-egg', 'ex-extra-chicken', 'ex-extra-sauce'],
  };
}

/**
 * Fetch live menu data directly from the Restocare Admin backend API
 */
export async function fetchLiveMenuFromApi(): Promise<{ categories: Category[]; items: MenuItem[] }> {
  try {
    const endpoint = typeof window !== 'undefined' && window.location.port === '8081'
      ? '/api/menu'
      : 'http://localhost:5001/api/menu';

    const res = await fetch(endpoint, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }
    const data = await res.json();
    
    const dbItems = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.menuItems)
      ? data.menuItems
      : Array.isArray(data)
      ? data
      : [];

    let dbCategories = Array.isArray(data?.categories) ? data.categories : [];

    // If categories array is not directly returned, extract unique categories from items
    if (dbCategories.length === 0 && dbItems.length > 0) {
      const catMap = new Map();
      dbItems.forEach((i: any) => {
        if (i.category && !catMap.has(i.category.id)) {
          catMap.set(i.category.id, {
            id: i.category.id,
            name: (i.category.name || '').trim(),
            description: i.category.description || '',
            imageUrl: i.category.imageUrl || '',
          });
        }
      });
      dbCategories = Array.from(catMap.values());
    }

    if (dbItems.length > 0) {
      const items = dbItems.map(transformDbMenuItem);
      
      // Calculate item count per category
      const countMap: Record<string, number> = {};
      items.forEach((item) => {
        countMap[item.categoryName] = (countMap[item.categoryName] || 0) + 1;
      });

      const categories = dbCategories.map((c) => transformDbCategory(c, countMap[c.name] || 0));

      // Cache results
      cachedCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
      cachedItems = items;
      hasFetchedOnce = true;

      return { categories: cachedCategories, items: cachedItems };
    }
  } catch (err) {
    console.warn('[LiveMenu] Fetching from Restocare API failed, using cached/fallback menu:', err);
  }

  return { categories: cachedCategories, items: cachedItems };
}

/**
 * React Hook to subscribe to live menu items and categories from Restocare
 */
export function useLiveMenu(): LiveMenuData {
  const [data, setData] = useState<LiveMenuData>({
    categories: cachedCategories,
    items: cachedItems,
    isLoading: !hasFetchedOnce,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    fetchLiveMenuFromApi().then(({ categories, items }) => {
      if (isMounted) {
        setData({
          categories,
          items,
          isLoading: false,
          error: null,
        });
      }
    }).catch((err) => {
      if (isMounted) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err?.message || 'Failed to load live menu',
        }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
}
