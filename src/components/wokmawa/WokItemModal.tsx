import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { MenuItem, PortionSize, SPICE_LEVELS, SpiceLevel, ExtraOption, EXTRAS_OPTIONS, MENU_ITEMS, WOKMAWA_ASSETS } from '../../lib/wokmawa-menu';
import { useWokStore } from '../../lib/wokmawa-store';
import { VegBadge } from './WokBadge';

interface WokItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToCart?: () => void;
}

interface ExtraWithImage {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'toppings' | 'proteins' | 'sauces';
  isVeg: boolean;
}

const EXTRAS_3_ROWS: ExtraWithImage[] = [
  {
    id: 'ex-fried-egg',
    name: 'Egg / Omelet',
    description: 'A classic rich topping for extra flavour.',
    price: 20,
    image: WOKMAWA_ASSETS.ADDON_EGG,
    category: 'proteins',
    isVeg: false,
  },
  {
    id: 'ex-extra-chicken',
    name: 'Extra Chicken',
    description: 'Juicy tossed chicken pieces to make it heartier.',
    price: 40,
    image: WOKMAWA_ASSETS.ADDON_CHICKEN,
    category: 'proteins',
    isVeg: false,
  },
  {
    id: 'ex-extra-sauce',
    name: 'Extra Sauce',
    description: 'More of our signature Asian wok sauce.',
    price: 20,
    image: WOKMAWA_ASSETS.ADDON_SAUCE,
    category: 'sauces',
    isVeg: true,
  },
];

// Crisp Red Vector Chilli Icon
const RedChilliIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4 sm:w-5 sm:h-5',
}) => (
  <svg
    className={`${className} inline-block shrink-0 drop-shadow-[0_0_6px_rgba(255,40,40,0.65)]`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Tiny green top stem */}
    <path
      d="M14.5 3.5C15.2 2.5 16.5 2 17.5 2C17.8 2 18 2.3 17.7 2.7C16.8 3.8 15.8 4.4 14.8 5"
      stroke="#4ADE80"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Hot Red Chilli Body */}
    <path
      d="M15.5 5.5C14.5 4.5 12.8 4.2 11.2 4.8C8.8 5.7 7.2 8.2 6.8 10.8C6.2 14.5 8.2 18.2 11.8 21.2C12.3 21.6 13 21.2 13.2 20.6C14.8 16.2 17.8 11.8 17.5 8C17.4 6.8 16.6 5.8 15.5 5.5Z"
      fill="#FF2626"
    />
  </svg>
);

export const WokItemModal: React.FC<WokItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onProceedToCart,
}) => {
  const { actions } = useWokStore();

  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel>(SPICE_LEVELS[1]);
  const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [addedToast, setAddedToast] = useState(false);

  // Synchronize internal state whenever a new item is opened
  useEffect(() => {
    if (item && isOpen) {
      setSelectedSpice(
        SPICE_LEVELS.find((s) => s.id === item.defaultSpice) || SPICE_LEVELS[1]
      );
      setExtraQuantities({});
      setQuantity(1);
      setInstructions('');
      setAddedToast(false);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const basePrice = item.price || 0;
  const extrasTotal = Object.entries(extraQuantities).reduce((sum, [id, qty]) => {
    const extra = EXTRAS_3_ROWS.find((e) => e.id === id);
    return sum + (extra ? extra.price * qty : 0);
  }, 0);
  const unitPrice = basePrice + extrasTotal;
  const currentTotal = unitPrice * quantity;

  const handleToggleExtra = (id: string) => {
    setExtraQuantities((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    actions.startDraft(item);
    actions.updateDraftPortion({ name: 'Standard', price: basePrice });
    actions.updateDraftSpice(selectedSpice);
    
    // Add selected extras to draft
    Object.entries(extraQuantities).forEach(([id, qty]) => {
      const extra = EXTRAS_3_ROWS.find((e) => e.id === id);
      if (extra && qty > 0) {
        for (let i = 0; i < qty; i++) {
          actions.toggleDraftExtra(extra);
        }
      }
    });

    actions.updateDraftQuantity(quantity);
    actions.updateDraftInstructions(instructions);
    actions.commitDraftToCart();

    setAddedToast(true);
    setTimeout(() => {
      onClose();
      if (onProceedToCart) {
        onProceedToCart();
      }
    }, 300);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 select-none animate-backdrop-fade"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-[#0C0C0C] border-t sm:border border-[#27272A] rounded-t-[28px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-sheet-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Large Hero Product Banner */}
        <div className="relative w-full h-56 sm:h-64 bg-[#141414] overflow-hidden flex-shrink-0">
          {/* Main Product Image */}
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover scale-[1.02] hover:scale-105 transition-transform duration-500"
          />

          {/* Luxury Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C] via-[#0C0C0C]/35 to-black/40 pointer-events-none" />

          {/* Mobile Drag Indicator */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="w-12 h-1 bg-white/40 rounded-full shadow-sm" />
          </div>

          {/* Floating Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/65 backdrop-blur-md text-white/90 hover:text-white flex items-center justify-center border border-white/20 transition-all active:scale-95 shadow-lg cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Dish Details on Bottom of Image */}
          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <VegBadge isVeg={item.isVeg} size="sm" />
                <span className="text-[11px] text-[#D4AF37] font-extrabold uppercase tracking-wider">
                  {item.categoryName || 'Wok Special'}
                </span>
              </div>
              <h3 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-xs text-white/80 line-clamp-1 mt-0.5 font-medium drop-shadow-sm">
                  {item.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="font-display font-black text-xl sm:text-2xl text-[#F3D362] drop-shadow-md">
                ₹{basePrice}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Customization Content Body */}
        <div className="overflow-y-auto no-scrollbar flex-1 p-4 space-y-5">
          {/* Hotness / Spice Level Section (4 Rows) */}
          <div className="space-y-2.5">
            <div>
              <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                How Hot Can You Handle?
              </h4>
              <p className="text-xs text-[#71717A] mt-0.5">
                Select the wok flame intensity for your dish
              </p>
            </div>

            {/* 4 Single-Line Full-Width Rows with Chilli Emojis */}
            <div className="space-y-2.5">
              {SPICE_LEVELS.map((spice) => {
                const isSelected = selectedSpice.id === spice.id;
                return (
                  <div
                    key={spice.id}
                    onClick={() => setSelectedSpice(spice)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center justify-between gap-3 select-none ${
                      isSelected
                        ? 'bg-[#18150D] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.22)]'
                        : 'bg-[#121212] border-[#242424] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 z-10">
                      {/* Radio Selector */}
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]'
                            : 'border-[#555555] bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>

                      {/* Spice Name & Description */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-sm text-white">
                            {spice.name}
                          </span>
                          {spice.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#D4AF37] text-black shadow-sm">
                              {spice.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] truncate leading-tight">
                          {spice.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Right Side: Red Chilli Vector Icons */}
                    <div className="flex items-center gap-1 shrink-0 select-none pl-2 z-10">
                      {Array.from({ length: spice.chillies }).map((_, i) => (
                        <RedChilliIcon key={i} className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform hover:scale-125" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Related Items & Add-ons Section */}
          <div className="space-y-3 pt-1">
            <div className="text-center">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#FF2D2D] to-transparent rounded-full mx-auto mb-1" />
              <h4 className="font-display font-black text-xs sm:text-sm text-[#E5A93C] uppercase tracking-widest">
                ADD EXTRAS FOR MORE FLAVOUR
              </h4>
            </div>

            {/* 3 Addon Cards in Same Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {EXTRAS_3_ROWS.map((addon) => {
                const isAdded = (extraQuantities[addon.id] || 0) > 0;
                return (
                  <div
                    key={addon.id}
                    onClick={() => handleToggleExtra(addon.id)}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col items-center justify-between text-center relative cursor-pointer select-none min-h-[136px] sm:min-h-[148px] ${
                      isAdded
                        ? 'bg-[#18140B] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                        : 'bg-[#101010] border-[#222222] hover:border-[#383838]'
                    }`}
                  >
                    {/* Top-Right Corner: Toggle Badge */}
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                      {isAdded ? (
                        <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-bold shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center shadow-sm">
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Center: Cutout Image */}
                    <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] flex items-center justify-center mt-1 mb-1">
                      <img
                        src={addon.image}
                        alt={addon.name}
                        className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.75)] hover:scale-105 transition-transform"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const currentSrc = target.src;
                          if (currentSrc.includes('/addons/')) {
                            target.src = currentSrc.replace('/addons/', '/ADDONS/');
                          } else if (currentSrc.includes('/ADDONS/')) {
                            target.src = currentSrc.replace('/assets/ADDONS/', '/addons/');
                          } else if (addon.id === 'ex-fried-egg') {
                            target.src = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=150&auto=format&fit=crop&q=80';
                          } else if (addon.id === 'ex-extra-chicken') {
                            target.src = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=150&auto=format&fit=crop&q=80';
                          } else {
                            target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80';
                          }
                        }}
                      />
                    </div>

                    {/* Bottom: Name & Price */}
                    <div className="w-full flex items-center justify-between gap-1 px-0.5 mt-auto">
                      <span className="font-display font-bold text-[10px] sm:text-xs text-white truncate text-left" title={addon.name}>
                        {addon.name}
                      </span>
                      <span className="font-display font-black text-[10px] sm:text-xs text-[#E5A93C] shrink-0 whitespace-nowrap text-right">
                        +₹{addon.price}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity Picker & Special Instructions */}
          <div className="space-y-3 pt-1">
            <div className="bg-[#121212] border border-[#222222] rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="font-display font-bold text-xs uppercase tracking-wider text-white">
                  Quantity
                </span>
                <p className="text-[11px] text-[#71717A]">
                  Number of servings
                </p>
              </div>

              <div className="flex items-center gap-3 bg-[#0A0A0A] border border-[#27272A] rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-7 h-7 rounded-lg bg-[#181818] text-[#A1A1AA] hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="font-display font-extrabold text-sm text-white w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-7 h-7 rounded-lg bg-[#D4AF37] text-black hover:bg-[#F3D362] flex items-center justify-center transition-colors font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Cooking Instructions Note (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Special Instructions <span className="text-[10px] text-[#666666] lowercase font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., Less oil, extra crispy, no spring onions"
                className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Footer Bar */}
        <div className="p-4 bg-[#0A0A0A] border-t border-[#222222]">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-[0_2px_15px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
          >
            <span>ADD TO CART</span>
            <span className="font-extrabold bg-black/20 px-3 py-0.5 rounded-full text-black">
              ₹{currentTotal}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
