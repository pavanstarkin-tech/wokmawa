import React, { useState } from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';
import { MENU_ITEMS, MenuItem } from '../../lib/wokmawa-menu';
import { useWokStore } from '../../lib/wokmawa-store';
import { VegBadge } from './WokBadge';

export const UpsellCarousel: React.FC = () => {
  const { cart, actions } = useWokStore();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // 1. Get the category slugs of all items in the cart
  const inCartItemIds = new Set(cart.map((c) => c.menuItemId));

  const cartCategorySlugs = Array.from(
    new Set(
      cart.map((c) => {
        const found = MENU_ITEMS.find((m) => m.id === c.menuItemId || m.slug === c.menuItemId);
        return found?.categorySlug || 'wok-noodles';
      })
    )
  );

  // 2. Filter products strictly belonging to the selected products' categories
  let relatedProducts = MENU_ITEMS.filter(
    (item) => cartCategorySlugs.includes(item.categorySlug) && !inCartItemIds.has(item.id)
  );

  // If all items in those categories are already in cart, show other dishes from the active categories
  if (relatedProducts.length === 0) {
    const primaryCat = cartCategorySlugs[0] || 'wok-noodles';
    relatedProducts = MENU_ITEMS.filter((item) => item.categorySlug === primaryCat);
  }

  if (relatedProducts.length === 0) return null;

  const handleAdd = (item: MenuItem) => {
    actions.addUpsellToCart({
      id: item.id,
      name: item.name,
      category: item.categoryName,
      price: item.price,
      image: item.image,
      isVeg: item.isVeg,
    });
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 1800);
  };

  return (
    <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 space-y-3 shadow-card-luxe">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="font-display font-extrabold text-sm sm:text-base text-white">
          Complete Your Wok (Pairs Best)
        </h3>
      </div>

      {/* Image Cards with Proper Spacing & Padding */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {relatedProducts.map((item) => {
          const isAdded = addedIds[item.id];

          return (
            <div
              key={item.id}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-[#181818] border border-[#2A2A2E] hover:border-[#D4AF37] shrink-0 shadow-md group transition-all"
            >
              {/* Image */}
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Top-Left: Veg Tag */}
              <div className="absolute top-2 left-2 z-10">
                <VegBadge isVeg={item.isVeg} size="sm" />
              </div>

              {/* Bottom-Left: Price Pill */}
              <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-white font-display font-black text-xs shadow-md">
                ₹{item.price}
              </div>

              {/* Bottom-Right Corner: + Button */}
              <button
                type="button"
                onClick={() => handleAdd(item)}
                aria-label={`Add ${item.name}`}
                className={`absolute bottom-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${
                  isAdded
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black hover:brightness-110 shadow-[0_2px_10px_rgba(212,175,55,0.4)]'
                }`}
              >
                {isAdded ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Plus className="w-4 h-4 stroke-[3]" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};


