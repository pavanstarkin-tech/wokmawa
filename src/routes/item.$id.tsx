import { createFileRoute, useNavigate, useParams, Link } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { Minus, Plus, ChevronRight, Check } from 'lucide-react';
import { MENU_ITEMS, SPICE_LEVELS, SpiceLevel, PortionSize, ExtraOption, EXTRAS_OPTIONS } from '@/lib/wokmawa-menu';
import { useWokStore } from '@/lib/wokmawa-store';
import { WokHeader } from '@/components/wokmawa/WokHeader';
import { VegBadge } from '@/components/wokmawa/WokBadge';
import { SpiceSelector, ChilliPepperIcon } from '@/components/wokmawa/SpiceSelector';

export const Route = createFileRoute('/item/$id')({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = useParams({ from: '/item/$id' });
  const navigate = useNavigate();
  const { actions, totals } = useWokStore();

  const item = MENU_ITEMS.find((m) => m.id === id || m.slug === id) || MENU_ITEMS[0];

  const [selectedPortion, setSelectedPortion] = useState<PortionSize>(
    item.availableSizes?.[0] || { name: 'Regular Box', price: item.price, serves: 'Serves 1-2' }
  );
  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel>(
    SPICE_LEVELS.find((s) => s.id === item.defaultSpice) || SPICE_LEVELS[1]
  );
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [showExtrasSection, setShowExtrasSection] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    if (item) {
      setSelectedPortion(
        item.availableSizes?.[0] || { name: 'Regular Box', price: item.price, serves: 'Serves 1-2' }
      );
      setSelectedSpice(
        SPICE_LEVELS.find((s) => s.id === item.defaultSpice) || SPICE_LEVELS[1]
      );
      setSelectedExtras([]);
      setQuantity(1);
    }
  }, [item]);

  // Calculate pricing
  const portionToUse = selectedPortion.price > 0 ? selectedPortion : (item.availableSizes?.[0] || { name: 'Regular Box', price: item.price, serves: 'Serves 1-2' });
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const unitPrice = portionToUse.price + extrasTotal;
  const currentTotal = unitPrice * quantity;

  const handleToggleExtra = (extra: ExtraOption) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleAddToCart = () => {
    actions.startDraft(item);
    actions.updateDraftPortion(portionToUse);
    actions.updateDraftSpice(selectedSpice);
    selectedExtras.forEach((extra) => actions.toggleDraftExtra(extra));
    actions.updateDraftQuantity(quantity);
    actions.updateDraftInstructions(instructions);
    actions.commitDraftToCart();

    setAddedToast(true);
    setTimeout(() => {
      navigate({ to: '/cart' });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col select-none">
      {/* Top App Header with Table Badge and Red Cart Bubble */}
      <WokHeader showBack={true} />

      {/* Main Product Container */}
      <main className="max-w-xl mx-auto w-full px-4 pt-3 pb-32 space-y-5 flex-1">
        {/* Product Photo Banner (Clean, no text covering the photo) */}
        <div className="relative h-56 sm:h-72 w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-[#27272A] bg-[#121212] shadow-card-luxe">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Title & Details Block (Placed cleanly below the image) */}
        <div className="bg-[#101010] border border-[#27272A] rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm">
          {/* 1st Line: Dish Name (Clean font size, max 2 lines) */}
          <h1 className="font-display font-black text-lg sm:text-xl text-white tracking-tight uppercase leading-snug">
            {item.name}
          </h1>

          {/* 2nd Line: Category Badge */}
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              {item.categoryName}
            </span>
          </div>

          {/* Price, Veg Tag, and Spice Level Indicator */}
          <div className="flex items-center gap-3 pt-1">
            <span className="font-display font-black text-2xl text-white">
              ₹{portionToUse.price}
            </span>

            <div className="flex items-center gap-1.5 bg-[#181818] px-2.5 py-1 rounded-lg border border-[#27272A]">
              <VegBadge isVeg={item.isVeg} size="sm" />
              <span className="text-[11px] font-extrabold tracking-wider text-[#22C55E] uppercase">
                {item.isVeg ? 'VEG' : 'NON-VEG'}
              </span>
            </div>

            {item.isMawaHot && (
              <div className="flex items-center bg-[#181818] px-2.5 py-1 rounded-lg border border-[#FF3B3B]/30">
                <span className="text-[11px] font-black text-[#FF3B3B] uppercase tracking-wider">
                  MAWA HOT
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed pt-2 border-t border-[#27272A]/70">
            {item.description}
          </p>
        </div>

        {/* Portion Selector (if multiple sizes exist) */}
        {item.availableSizes && item.availableSizes.length > 1 && (
          <div className="bg-[#101010] border border-[#27272A] rounded-2xl p-4 space-y-2.5">
            <span className="font-display font-extrabold text-xs text-[#A1A1AA] uppercase tracking-wider">
              SELECT PORTION SIZE
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {item.availableSizes.map((portion) => {
                const isSelected = selectedPortion.name === portion.name;
                return (
                  <button
                    key={portion.name}
                    type="button"
                    onClick={() => setSelectedPortion(portion)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C180C] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-gold-glow'
                        : 'bg-[#141414] border-[#27272A] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div>
                      <div className={`font-bold text-xs ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}>
                        {portion.name}
                      </div>
                      <div className="text-[10px] text-[#A1A1AA]">{portion.serves}</div>
                    </div>
                    <div className="text-xs font-black text-white">
                      ₹{portion.price}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Spice Level Selection (HOW HOT CAN YOU HANDLE?) */}
        <div className="bg-[#101010] border border-[#27272A] rounded-2xl p-4 sm:p-5">
          <SpiceSelector
            selectedSpice={selectedSpice}
            onSelectSpice={(spice) => setSelectedSpice(spice)}
          />
        </div>

        {/* Optional Add-on Extras Accordion */}
        <div className="bg-[#101010] border border-[#27272A] rounded-2xl p-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowExtrasSection(!showExtrasSection)}
            className="w-full flex items-center justify-between text-left text-white hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            <span className="font-display font-bold text-sm tracking-wide">
              Customize & Add Extras (Optional)
            </span>
            <span className="text-xs text-[#D4AF37] font-extrabold">
              {showExtrasSection ? 'Hide ▲' : 'Add +'}
            </span>
          </button>

          {showExtrasSection && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-fade-in">
              {EXTRAS_OPTIONS.slice(0, 6).map((extra) => {
                const isAdded = selectedExtras.some((e) => e.id === extra.id);
                return (
                  <div
                    key={extra.id}
                    onClick={() => handleToggleExtra(extra)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isAdded
                        ? 'bg-[#1C180C] border-[#D4AF37] text-white'
                        : 'bg-[#141414] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isAdded
                            ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                            : 'border-[#3F3F46]'
                        }`}
                      >
                        {isAdded && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-medium">{extra.name}</span>
                    </div>
                    <span className="text-xs font-bold text-[#D4AF37] shrink-0 ml-2">
                      +₹{extra.price}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cooking Request */}
          <div className="pt-2">
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Special cooking request (e.g. less oil, extra crispy garlic)..."
              className="w-full bg-[#141414] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#A1A1AA]/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Quantity Controls Row */}
        <div className="bg-[#101010] border border-[#27272A] rounded-2xl p-4 flex items-center justify-between">
          <span className="font-display font-black text-sm tracking-wider text-white uppercase">
            QUANTITY
          </span>

          <div className="flex items-center gap-3">
            {/* Minus Button */}
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full border-2 border-[#D4AF37] bg-transparent text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold text-lg active:scale-90 transition-all cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4 stroke-[3]" />
            </button>

            {/* Count */}
            <span className="font-display font-black text-xl text-white w-8 text-center">
              {quantity}
            </span>

            {/* Plus Button */}
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 rounded-full border-2 border-[#D4AF37] bg-transparent text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold text-lg active:scale-90 transition-all cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Sticky Action Bar with Radiant Gold Gradient Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/95 backdrop-blur-md border-t border-[#27272A] p-4 shadow-2xl">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#F3D362] via-[#D4AF37] to-[#C9A227] hover:brightness-110 active:scale-[0.98] text-black font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between shadow-gold-glow-lg transition-all cursor-pointer"
          >
            <span className="font-black tracking-wide">ADD TO CART</span>
            <div className="flex items-center gap-2">
              <span className="text-black/40 font-normal">|</span>
              <span className="font-black">₹{currentTotal}</span>
              <ChevronRight className="w-5 h-5 stroke-[3]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
