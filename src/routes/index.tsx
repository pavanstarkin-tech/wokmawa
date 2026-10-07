import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";
import {
  Flame,
  Sparkles,
  ChevronRight,
  Search,
  Plus,
  ArrowRight,
  Star,
  Award,
  TrendingUp,
  Percent,
} from "lucide-react";
import { CATEGORIES, MENU_ITEMS, MenuItem, Category, WOKMAWA_ASSETS } from "@/lib/wokmawa-menu";
import { useWokStore } from "@/lib/wokmawa-store";
import { WokHeader } from "@/components/wokmawa/WokHeader";
import { VegBadge, MawaHotBadge, PopularBadge } from "@/components/wokmawa/WokBadge";
import { CartSummaryBar } from "@/components/wokmawa/CartSummaryBar";
import { WokCheckoutModal } from "@/components/wokmawa/WokCheckoutModal";
import { WokItemModal } from "@/components/wokmawa/WokItemModal";
import { WokAddButton } from "@/components/wokmawa/WokAddButton";

// Lazy load QR Scanner
const Scanner = lazy(() => import('@yudiel/react-qr-scanner').then((m) => ({ default: m.Scanner })));

export const Route = createFileRoute("/")({
  component: WokMawaApp,
});

function WokMawaApp() {
  const navigate = useNavigate();
  const { tableNumber, searchQuery, totals, actions } = useWokStore();

  // Screen State: 'splash' | 'scanner' | 'home'
  // Initial state is 'splash' to match SSR HTML; hydrated state is checked in useEffect
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'scanner' | 'home'>('splash');
  const [tempTableInput, setTempTableInput] = useState(tableNumber);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg' | 'mawa-hot' | 'popular'>('all');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedModalItem, setSelectedModalItem] = useState<MenuItem | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [isSticky, setIsSticky] = useState(false);

  // Restore screen session after hydration
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('wokmawa_seen_splash') === 'true') {
      setCurrentScreen('home');
    }
  }, []);

  // Track scroll position to blur category bar only when stuck at the top
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

  const handleOpenItem = (itemOrId: MenuItem | string) => {
    const foundItem = typeof itemOrId === 'string'
      ? MENU_ITEMS.find((m) => m.id === itemOrId || m.slug === itemOrId)
      : itemOrId;
    if (foundItem) {
      setSelectedModalItem(foundItem);
    }
  };

  // Auto rotate hero banner slides
  useEffect(() => {
    if (currentScreen !== 'home') return;
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 2);
    }, 4500);
    return () => clearInterval(timer);
  }, [currentScreen]);

  // Filter items
  const filteredItems = MENU_ITEMS.filter((item) => {
    // Category match
    if (selectedCategory !== 'all' && item.categorySlug !== selectedCategory) {
      return false;
    }
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.categoryName.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }
    // Dietary/Hot filter
    if (dietaryFilter === 'veg' && !item.isVeg) return false;
    if (dietaryFilter === 'non-veg' && item.isVeg) return false;
    if (dietaryFilter === 'mawa-hot' && !item.isMawaHot) return false;
    if (dietaryFilter === 'popular' && !item.isPopular) return false;

    return true;
  });

  const handleSelectTableAndProceed = (tableNum: string) => {
    const clean = tableNum.trim() || '04';
    actions.setTableNumber(clean);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wokmawa_seen_splash', 'true');
    }
    setCurrentScreen('home');
  };

  // 1. SPLASH / LANDING SCREEN (Plays /assets/splash.mp4 video)
  if (currentScreen === 'splash') {
    return (
      <div className="relative min-h-screen w-full bg-[#080808] flex flex-col items-center justify-end p-6 overflow-hidden text-center select-none">
        {/* Fullscreen Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={WOKMAWA_ASSETS.SPLASH_VIDEO}
        />

        {/* Dark gradient overlay for bottom button readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[1] pointer-events-none" />

        {/* Empty flexible space so tapping anywhere navigates to scanner */}
        <div
          className="flex-1 w-full cursor-pointer z-[2]"
          onClick={() => setCurrentScreen('scanner')}
        />

        {/* Bottom START ORDER Button & 3 Highlight Badges */}
        <div className="w-full max-w-sm pb-4 z-10 space-y-4 relative">
          <button
            type="button"
            onClick={() => setCurrentScreen('scanner')}
            className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-[#DF9B2B] via-[#FDE992] to-[#DF9B2B] text-black font-black text-lg sm:text-xl uppercase tracking-wider shadow-[0_8px_30px_rgba(223,155,43,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer border-t border-[#FFF5C0]/80"
          >
            <span className="font-black font-display tracking-wider">START ORDER</span>
            <ChevronRight className="w-6 h-6 stroke-[3.5] text-black" />
          </button>

          {/* 3 Step Features below START ORDER */}
          <div className="w-full flex items-center justify-between pt-1 px-1">
            {/* 1. BROWSE MENU */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-[#F5C249] mb-1.5" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="16" cy="8" r="1.5" strokeWidth="1.5" />
                <path d="M6 21C6 14.5 10.5 10 16 10C21.5 10 26 14.5 26 21" strokeWidth="1.8" />
                <path d="M4 23H28" strokeWidth="2" />
                <path d="M6 26H26" strokeWidth="1.5" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-extrabold text-white tracking-wider leading-tight uppercase">
                BROWSE<br />MENU
              </span>
            </div>

            {/* Divider 1 */}
            <div className="w-[1.5px] h-9 bg-gradient-to-b from-[#F5C249] to-[#C9A227] opacity-75 rounded-full mx-1" />

            {/* 2. ORDER YOUR FAVOURITES */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-[#F5C249] mb-1.5" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8H26L23 18H9L6 8Z" strokeWidth="1.8" />
                <path d="M6 8L4 4H2" strokeWidth="1.8" />
                <circle cx="11" cy="24" r="2" fill="currentColor" stroke="none" />
                <circle cx="21" cy="24" r="2" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-extrabold text-white tracking-wider leading-tight uppercase">
                ORDER<br />YOUR FAVOURITES
              </span>
            </div>

            {/* Divider 2 */}
            <div className="w-[1.5px] h-9 bg-gradient-to-b from-[#F5C249] to-[#C9A227] opacity-75 rounded-full mx-1" />

            {/* 3. FRESHLY SERVED */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-[#F5C249] mb-1.5" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {/* Fork */}
                <path d="M4 7V13C4 14.5 5 15.5 6 16V25" strokeWidth="1.5" />
                <path d="M8 7V13C8 14.5 7 15.5 6 16" strokeWidth="1.5" />
                <path d="M6 7V13" strokeWidth="1.5" />
                {/* Plate */}
                <circle cx="16" cy="16" r="6.5" strokeWidth="1.8" />
                <circle cx="16" cy="16" r="4.2" strokeWidth="1.2" />
                {/* Knife */}
                <path d="M26 7V16C26 17.5 25 18 25 25" strokeWidth="1.5" />
                <path d="M26 7C24.5 8.5 24 11 24 14C24 16.5 25 17.5 25 18" strokeWidth="1.5" />
              </svg>
              <span className="text-[10px] sm:text-[11px] font-extrabold text-white tracking-wider leading-tight uppercase">
                FRESHLY<br />SERVED
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. TABLE SCANNER PAGE (Exact classic design with centered camera & bottom curved container)
  if (currentScreen === 'scanner') {
    const isSecureContext =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#080808] select-none animate-fade-in overflow-hidden">
        {/* Centered Camera Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-[180px]">
          {/* The Scanning Box */}
          <div className="w-64 h-64 border-4 border-[#D4AF37] rounded-3xl relative overflow-hidden bg-zinc-900 shadow-gold-glow-lg">
            {isSecureContext ? (
              <Suspense
                fallback={
                  <div className="text-white text-xs font-bold flex items-center justify-center h-full bg-black">
                    Loading camera...
                  </div>
                }
              >
                <Scanner
                  onScan={(detectedCodes) => {
                    if (detectedCodes && detectedCodes.length > 0) {
                      const val = detectedCodes[0].rawValue;
                      if (val) {
                        const match = val.match(/\/t\/([^/]+)/i);
                        const table = match ? match[1] : val.replace(/[^A-Z0-9]/gi, '');
                        handleSelectTableAndProceed(table || '04');
                      }
                    }
                  }}
                  onError={(error) => console.log(error?.message)}
                  styles={{
                    container: { width: '100%', height: '100%' },
                    video: { objectFit: 'cover', width: '100%', height: '100%' },
                  }}
                />
              </Suspense>
            ) : (
              <div className="text-center p-4 flex flex-col items-center justify-center h-full bg-black/90 space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#1C1C1C] border border-[#D4AF37]/50 flex items-center justify-center text-2xl">
                  📷
                </div>
                <p className="text-white font-bold text-xs">Camera Unavailable</p>
                <p className="text-[#A1A1AA] text-[10px]">Enter table ID below</p>
              </div>
            )}
            {/* Animated Laser Line */}
            <div
              className="absolute top-0 left-0 w-full h-[3px] bg-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,1)] animate-ping pointer-events-none"
              style={{ animationDuration: '3s' }}
            />
          </div>
        </div>

        {/* Bottom Semi-Sphere Curved Overlay */}
        <div className="absolute bottom-0 left-0 w-full z-10">
          <div
            className="bg-gradient-to-b from-[#141414] to-[#0A0A0A] border-t border-[#D4AF37]/50 pt-10 pb-8 px-6 text-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center"
            style={{
              borderTopLeftRadius: '100% 120px',
              borderTopRightRadius: '0',
            }}
          >
            {/* WOKMAWA Gold Flame Logo */}
            <div className="h-16 w-[220px] mb-3 mt-1 flex items-center justify-center">
              <img
                src={WOKMAWA_ASSETS.LOGO}
                alt="WOKMAWA"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/logo.png';
                }}
              />
            </div>

            <p className="text-[#A1A1AA] leading-relaxed text-xs max-w-[280px] mx-auto relative z-10 font-medium mb-4">
              Scan the QR code on your table to view the menu and place your order.
            </p>

            {/* Manual Table Input with Go */}
            <div className="relative z-10 w-full max-w-[280px] mx-auto flex gap-2">
              <input
                type="text"
                placeholder="Or enter table ID..."
                value={tempTableInput}
                onChange={(e) => setTempTableInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectTableAndProceed(tempTableInput)}
                className="flex-1 rounded-xl border border-[#27272A] bg-[#1C1C1C] px-4 py-2.5 text-xs font-bold text-[#D4AF37] uppercase outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />
              <button
                type="button"
                onClick={() => handleSelectTableAndProceed(tempTableInput)}
                disabled={!tempTableInput.trim()}
                className="bg-gradient-to-r from-[#E8C547] to-[#D4AF37] px-5 py-2.5 rounded-xl text-black font-extrabold text-xs shadow-gold-glow active:scale-95 transition disabled:opacity-50"
              >
                Go
              </button>
            </div>

            {/* Skip Option */}
            <button
              type="button"
              onClick={() => handleSelectTableAndProceed(tableNumber)}
              className="mt-3 text-[11px] text-[#A1A1AA] hover:text-[#D4AF37] font-semibold underline transition-colors"
            >
              Skip & Continue as Table #{tableNumber} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. HOME SCREEN & CATEGORY MENU
  return (
    <div className="min-h-screen bg-transparent text-white pb-28">
      {/* Sticky Top Header */}
      <WokHeader
        onLogout={() => {
          actions.clearCart();
          setCurrentScreen('splash');
        }}
      />

      <main className="max-w-xl mx-auto px-4 space-y-6 pt-3">
        {/* Top Story Category Circles (Sticky on scroll to top, blurred only when stuck) */}
        <section
          className={`sticky top-0 z-40 -mx-4 px-5 sm:px-6 py-2.5 flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x scroll-pl-5 transition-all duration-300 ${
            isSticky
              ? 'bg-[#080808]/85 backdrop-blur-md border-b border-white/10 rounded-b-[25px] shadow-[0_8px_25px_rgba(0,0,0,0.6)]'
              : 'bg-transparent border-transparent rounded-none shadow-none'
          }`}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat.slug ? 'all' : cat.slug)}
                className="flex flex-col items-center gap-1 shrink-0 snap-start group"
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
                {/* Single-line truncated text */}
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

        {/* Hero Slider Carousel (Shown only when 'all' is active) */}
        {selectedCategory === 'all' && (
          <div className="relative rounded-3xl overflow-hidden border border-[#27272A] bg-[#0E0E0E] shadow-card-luxe my-1 animate-fade-in">
            <div className="relative h-44 sm:h-52 w-full overflow-hidden">
              {[WOKMAWA_ASSETS.HERO_1, WOKMAWA_ASSETS.HERO_2].map((imgSrc, idx) => (
                <img
                  key={idx}
                  src={imgSrc}
                  alt={`Hero Banner ${idx + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                    heroSlide === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
              ))}
            </div>

            {/* Slider Dots Indicator */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-10">
              {[WOKMAWA_ASSETS.HERO_1, WOKMAWA_ASSETS.HERO_2].map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setHeroSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    heroSlide === idx ? 'w-4 bg-[#D4AF37]' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}



        {/* SECTION 1: POPULAR RIGHT NOW (Shown when 'all' is active) */}
        {selectedCategory === 'all' && (
          <section className="space-y-3.5 pt-1 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="font-display font-black text-sm sm:text-base text-white uppercase tracking-wider">
                  POPULAR RIGHT NOW
                </h3>
              </div>
              <Link
                to="/menu"
                className="text-xs font-bold text-[#A1A1AA] hover:text-[#D4AF37] flex items-center gap-0.5 transition-colors"
              >
                <span>See All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3 Vertical Cards Side by Side (Horizontal Scroll) */}
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2 px-1 snap-x">
            {[
              {
                id: 'pop-01',
                name: 'Mawa Hot Noodles',
                desc: 'Our signature wok-tossed noodles with bold Asian spices.',
                price: 189,
                chillies: 3,
                image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                rawItem: MENU_ITEMS.find((i) => i.id === 'wn-01') || MENU_ITEMS[0],
              },
              {
                id: 'pop-02',
                name: 'Mawa Hot Rice',
                desc: 'Fiery wok rice with fresh veggies and house sauces.',
                price: 199,
                chillies: 3,
                image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                rawItem: MENU_ITEMS.find((i) => i.id === 'rb-01') || MENU_ITEMS[5],
              },
              {
                id: 'pop-03',
                name: 'Mawa Hot Bowl',
                desc: 'A complete Asian bowl with bold flavours.',
                price: 199,
                chillies: 3,
                image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                rawItem: MENU_ITEMS.find((i) => i.id === 'ba-01') || MENU_ITEMS[10],
              },
            ].map((card) => (
              <div
                key={card.id}
                onClick={() => handleOpenItem(card.rawItem?.id || card.id)}
                className="w-44 sm:w-48 shrink-0 snap-start bg-[#121212] border border-[#27272A] rounded-2xl p-3 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all cursor-pointer shadow-card-luxe group relative"
              >
                {/* Heart / Favorite Icon Top Right */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-[#FF3B3B] transition-colors"
                >
                  <span className="text-xs">♡</span>
                </button>

                {/* Dish Photo */}
                <div className="relative h-28 w-full rounded-xl overflow-hidden bg-[#1A1A1A] mb-2.5">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Tags: Veg + Spice Chillies */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <VegBadge isVeg={card.isVeg} size="sm" />
                    <div className="flex items-center text-[10px]">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < card.chillies ? 'text-[#FF3B3B]' : 'text-[#3F3F46] opacity-40'}
                        >
                          🌶️
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-display font-extrabold text-sm text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                    {card.name}
                  </h4>
                  <p className="text-[10px] text-[#A1A1AA] line-clamp-2 leading-snug">
                    {card.desc}
                  </p>
                </div>

                {/* Price & Full-width ADD Button */}
                <div className="pt-2.5 mt-2 border-t border-[#27272A]/70 space-y-2">
                  <div className="font-display font-black text-base text-white">
                    ₹{card.price}
                  </div>

                  <WokAddButton
                    item={card.rawItem || (MENU_ITEMS.find((m) => m.id === card.id) as MenuItem)}
                    size="full"
                    onOpenModal={() => handleOpenItem(card.rawItem?.id || card.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Category Items (When a specific category is selected) */}
        {selectedCategory !== 'all' && (
          <section className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item.id)}
                  className="bg-[#121212] border border-[#27272A] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all cursor-pointer shadow-card-luxe group relative active:scale-[0.98]"
                >
                  {/* Dish Photo */}
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

                  {/* Title & Description */}
                  <div className="space-y-1 flex-1">
                    <h4 className="font-display font-extrabold text-xs sm:text-sm text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-[#A1A1AA] line-clamp-2 leading-tight">
                      {item.description}
                    </p>
                  </div>

                  {/* Price & ADD Button */}
                  <div className="pt-2 mt-2 border-t border-[#27272A]/70 flex items-center justify-between gap-1">
                    <span className="font-display font-black text-sm sm:text-base text-white">
                      ₹{item.price}
                    </span>
                    <WokAddButton
                      item={item}
                      onOpenModal={() => handleOpenItem(item.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full Category Sections (Shown when 'all' is active) */}
        {selectedCategory === 'all' && (
          <>
            {/* SECTION 2: WOK NOODLES (2 Cards Per Row Grid) */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="font-display font-black text-sm sm:text-base text-white uppercase tracking-wider">
                    WOK NOODLES
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCategory('wok-noodles')}
                  className="text-xs font-bold text-[#A1A1AA] hover:text-[#D4AF37] flex items-center gap-0.5 transition-colors"
                >
                  <span>See All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MENU_ITEMS.filter((i) => i.categorySlug === 'wok-noodles').map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item.id)}
                    className="bg-[#121212] border border-[#27272A] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all cursor-pointer shadow-card-luxe group relative active:scale-[0.98]"
                  >
                    {/* Dish Photo */}
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

                    {/* Title & Description */}
                    <div className="space-y-1 flex-1">
                      <h4 className="font-display font-extrabold text-xs sm:text-sm text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-[#A1A1AA] line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </div>

                    {/* Price & ADD Button */}
                    <div className="pt-2 mt-2 border-t border-[#27272A]/70 flex items-center justify-between gap-1">
                      <span className="font-display font-black text-sm sm:text-base text-white">
                        ₹{item.price}
                      </span>
                      <WokAddButton
                        item={item}
                        onOpenModal={() => handleOpenItem(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 3: RICE & ASIAN BOWLS (2 Cards Per Row Grid) */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="font-display font-black text-sm sm:text-base text-white uppercase tracking-wider">
                    RICE & ASIAN BOWLS
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCategory('rice-bowls')}
                  className="text-xs font-bold text-[#A1A1AA] hover:text-[#D4AF37] flex items-center gap-0.5 transition-colors"
                >
                  <span>See All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MENU_ITEMS.filter((i) => i.categorySlug === 'rice-bowls' || i.categorySlug === 'bowls-of-asia').map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item.id)}
                    className="bg-[#121212] border border-[#27272A] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all cursor-pointer shadow-card-luxe group relative active:scale-[0.98]"
                  >
                    {/* Dish Photo */}
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

                    {/* Title & Description */}
                    <div className="space-y-1 flex-1">
                      <h4 className="font-display font-extrabold text-xs sm:text-sm text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-[#A1A1AA] line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </div>

                    {/* Price & ADD Button */}
                    <div className="pt-2 mt-2 border-t border-[#27272A]/70 flex items-center justify-between gap-1">
                      <span className="font-display font-black text-sm sm:text-base text-white">
                        ₹{item.price}
                      </span>
                      <WokAddButton
                        item={item}
                        onOpenModal={() => handleOpenItem(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 4: MOMOS & STARTERS (2 Cards Per Row Grid) */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="font-display font-black text-sm sm:text-base text-white uppercase tracking-wider">
                    MOMOS & STARTERS
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCategory('momos')}
                  className="text-xs font-bold text-[#A1A1AA] hover:text-[#D4AF37] flex items-center gap-0.5 transition-colors"
                >
                  <span>See All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MENU_ITEMS.filter((i) => i.categorySlug === 'momos' || i.categorySlug === 'starters').map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item.id)}
                    className="bg-[#121212] border border-[#27272A] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all cursor-pointer shadow-card-luxe group relative active:scale-[0.98]"
                  >
                    {/* Dish Photo */}
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

                    {/* Title & Description */}
                    <div className="space-y-1 flex-1">
                      <h4 className="font-display font-extrabold text-xs sm:text-sm text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-[#A1A1AA] line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </div>

                    {/* Price & ADD Button */}
                    <div className="pt-2 mt-2 border-t border-[#27272A]/70 flex items-center justify-between gap-1">
                      <span className="font-display font-black text-sm sm:text-base text-white">
                        ₹{item.price}
                      </span>
                      <WokAddButton
                        item={item}
                        onOpenModal={() => handleOpenItem(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <CartSummaryBar />

      {/* 2-Step Item Customizer Bottom Sheet */}
      <WokItemModal
        item={selectedModalItem}
        isOpen={!!selectedModalItem}
        onClose={() => setSelectedModalItem(null)}
      />

      {/* Checkout Modal */}
      <WokCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  );
}
