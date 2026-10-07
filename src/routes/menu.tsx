import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { CATEGORIES, MENU_ITEMS } from "@/lib/wokmawa-menu";
import { useWokStore } from "@/lib/wokmawa-store";
import { WokHeader } from "@/components/wokmawa/WokHeader";
import { VegBadge, MawaHotBadge } from "@/components/wokmawa/WokBadge";
import { CartSummaryBar } from "@/components/wokmawa/CartSummaryBar";
import { WokItemModal } from "@/components/wokmawa/WokItemModal";
import { WokAddButton } from "@/components/wokmawa/WokAddButton";

export const Route = createFileRoute("/menu")({
  component: WokMenuPage,
});

function WokMenuPage() {
  const navigate = useNavigate();
  const { searchQuery } = useWokStore();
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]?.slug || 'wok-noodles');
  const [selectedModalItem, setSelectedModalItem] = useState<any>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to top when category is selected or changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [selectedCategory]);

  const filteredItems = MENU_ITEMS.filter((item) => {
    if (selectedCategory && item.categorySlug !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCategoryObj = CATEGORIES.find((c) => c.slug === selectedCategory);

  return (
    <div className="min-h-screen bg-transparent text-white pb-28">
      <WokHeader title="Menu" showBack backTo="/" />

      <main className="max-w-xl mx-auto px-4 space-y-5 pt-3">
        {/* Top Story Category Circles (Sticky on scroll to top, blurred only when stuck) */}
        <section
          className={`sticky top-0 z-40 -mx-4 px-4 py-2.5 flex gap-3.5 overflow-x-auto no-scrollbar snap-x transition-all duration-300 ${
            isSticky
              ? 'bg-[#080808]/80 backdrop-blur-md border-b border-white/10 rounded-b-[25px] shadow-[0_8px_25px_rgba(0,0,0,0.6)]'
              : 'bg-transparent border-transparent rounded-none shadow-none'
          }`}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className="flex flex-col items-center gap-1 shrink-0 snap-start group cursor-pointer"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden p-0.5 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[#E8C547] to-[#D4AF37] shadow-gold-glow scale-105 ring-2 ring-[#D4AF37]/50'
                      : 'bg-[#27272A] hover:bg-[#3F3F46]'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#141414]">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </div>
                {/* Single-line truncated label */}
                <span
                  className={`text-[10px] font-bold text-center max-w-[68px] truncate whitespace-nowrap leading-tight transition-colors ${
                    isSelected ? 'text-[#D4AF37]' : 'text-[#A1A1AA] group-hover:text-white'
                  }`}
                  title={cat.name}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </section>

        {/* Item Cards (2 Cards Per Row) */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedModalItem(item)}
              className="bg-[#121212] border border-[#27272A] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all cursor-pointer shadow-card-luxe group relative active:scale-[0.98]"
            >
              {/* Image */}
              <div className="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-[#1A1A1A] mb-2">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2">
                  <VegBadge isVeg={item.isVeg} size="sm" />
                </div>
                {item.isMawaHot && (
                  <div className="absolute top-0 right-0 z-10">
                    <MawaHotBadge text="HOT 🔥" variant="corner" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1 flex-1">
                <h4 className="font-display font-extrabold text-xs sm:text-sm text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                  {item.name}
                </h4>
                <p className="text-[10px] text-[#A1A1AA] line-clamp-2 leading-tight">
                  {item.description}
                </p>
              </div>

              {/* Price & Button */}
              <div className="pt-2 mt-2 border-t border-[#27272A]/70 flex items-center justify-between gap-1">
                <span className="font-display font-black text-sm sm:text-base text-white">
                  ₹{item.price}
                </span>
                <WokAddButton
                  item={item}
                  onOpenModal={() => setSelectedModalItem(item)}
                />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      <CartSummaryBar />

      {/* 2-Step Item Customizer Bottom Sheet */}
      <WokItemModal
        item={selectedModalItem}
        isOpen={!!selectedModalItem}
        onClose={() => setSelectedModalItem(null)}
      />
    </div>
  );
}
