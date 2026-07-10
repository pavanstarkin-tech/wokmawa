import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Search, Plus, Minus, Leaf, Drumstick } from "lucide-react";
import { useState } from "react";
import { useCart, useMenu } from "@/lib/paakashala-store";
import { AppShell } from "@/components/paakashala/AppShell";
import { HeroCarousel } from "@/components/paakashala/HeroCarousel";
import { FeaturedCard } from "@/components/paakashala/FeaturedCard";
import { MiniCategoryCard } from "@/components/paakashala/MiniCategoryCard";
import { CATEGORIES, CATEGORY_IMAGE, MENU, FEATURED_IDS, type Category } from "@/lib/paakashala-menu";

export const Route = createFileRoute("/")({
  component: Index,
});

function Section({ title, kicker, action }: { title: string; kicker?: string; action?: { to: "/menu"; label: string } }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div className="min-w-0">
        {kicker && <div className="text-[10px] tracking-[0.35em] uppercase text-gold">{kicker}</div>}
        <h2 className="mt-0.5 truncate text-xl font-semibold text-brown-deep">{title}</h2>
      </div>
      {action && (
        <Link to={action.to} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brown-deep hover:text-gold">
          {action.label} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [typeFilter, setTypeFilter] = useState<"veg" | "non-veg">("veg");

  const fullMenu = useMenu();

  const filteredMenu = fullMenu.filter(m => m.type === typeFilter);

  const featured = FEATURED_IDS.map((id) => filteredMenu.find((m) => m.id === id)).filter(Boolean) as typeof fullMenu;
  const chefPicks = filteredMenu.filter((m) => ["Chicken Lollipop", "Paneer Butter Masala", "Mutton Ghee Roast", "Chilli Prawns", "Kalmi Kebab (Half)"].includes(m.name));
  const bestBiryani = filteredMenu.filter((m) => m.category === "Biryani").slice(0, 6);
  const andhra = filteredMenu.filter((m) => m.category === "South Indian Starters").slice(0, 6);

  return (
    <AppShell>
      <section className="animate-fade-up">
        <HeroCarousel />
      </section>

      <section className="mt-8 animate-fade-up">
        <div className="mb-6 px-4">
          <div className="flex items-center gap-3">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate({ to: "/menu", search: { q: searchQuery.trim() } });
              }
            }} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search biryani…" 
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs shadow-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-all"
              />
            </form>

            <div className="flex items-center gap-1.5 shrink-0 bg-card border border-border/80 px-2.5 py-2 rounded-xl shadow-sm">
              <span className={`text-[9px] font-bold transition-colors ${typeFilter === 'veg' ? 'text-green-700' : 'text-muted-foreground/50'}`}>VEG</span>
              
              <button 
                onClick={() => setTypeFilter(typeFilter === 'veg' ? 'non-veg' : 'veg')}
                className={`relative flex h-4 w-8 items-center rounded-full transition-colors ${typeFilter === 'veg' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
              >
                <div 
                  className={`absolute h-3.5 w-3.5 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                    typeFilter === 'veg' 
                      ? 'translate-x-[2px] bg-green-500' 
                      : 'translate-x-[16px] bg-red-500'
                  }`}
                >
                   <div className="h-1 w-1 rounded-full bg-white" />
                </div>
              </button>
              
              <span className={`text-[9px] font-bold transition-colors ${typeFilter === 'non-veg' ? 'text-red-700' : 'text-muted-foreground/50'}`}>NON-VEG</span>
            </div>
          </div>
        </div>
        <Section kicker="Curated for you" title="Browse the Menu" action={{ to: "/menu", label: "View all" }} />
        <div className="-mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-4 pb-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                className={`group relative flex w-[72px] shrink-0 flex-col items-center gap-2 transition active:scale-95 ${activeCategory === c ? 'scale-105' : ''}`}
              >
                <div className={`h-[72px] w-[72px] overflow-hidden rounded-full shadow-luxe p-0.5 bg-card transition-colors ${activeCategory === c ? 'border-2 border-gold' : 'border border-gold/30'}`}>
                  <img src={CATEGORY_IMAGE[c]} alt={c} loading="lazy" className="h-full w-full rounded-full object-cover transition duration-500 group-hover:scale-110" />
                </div>
                <div className={`w-full text-center text-[10px] font-semibold leading-tight line-clamp-2 ${activeCategory === c ? 'text-gold' : 'text-brown-deep'}`}>
                  {c}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Category Products */}
        {activeCategory && (
          <div className="mt-4 animate-fade-up bg-luxe-gradient -mx-4 px-4 py-4 border-y border-gold/20 shadow-inner">
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-sm font-semibold text-brown-deep">
                {activeCategory}
              </h3>
              <Link to="/menu" search={{ category: activeCategory }} className="text-[10px] font-semibold uppercase tracking-widest text-gold hover:underline">
                View All
              </Link>
            </div>
            <div className="-mx-4 overflow-x-auto no-scrollbar">
              <div className="flex gap-2.5 px-4 pb-2">
                {filteredMenu.filter((m) => m.category === activeCategory).map((f) => (
                  <div key={f.id} className="w-[calc((100vw-52px)/3)] md:w-[110px] shrink-0">
                    <MiniCategoryCard item={f} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 animate-fade-up">
        <Section kicker="Today's Highlights" title="Freshly Curated" action={{ to: "/menu", label: "See menu" }} />
        <div className="-mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 pb-2">
            {featured.map((f) => <FeaturedCard key={f.id} item={f} />)}
          </div>
        </div>
      </section>

      <section className="mt-8 animate-fade-up">
        <div className="rounded-3xl bg-brown-gradient p-5 text-cream shadow-luxe border border-gold/30 relative overflow-hidden">
          <Sparkles className="absolute -right-4 -top-4 h-24 w-24 text-gold/20" />
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-soft">Chef's Table</div>
          <h3 className="mt-1 text-2xl font-semibold">A composed spread, poured with care.</h3>
          <p className="mt-1 max-w-[280px] text-sm text-cream/80">
            From Andhra classics to Mughlai biryanis — every plate is finished at our heritage kitchen.
          </p>
          <Link to="/menu" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brown-deep shadow-luxe active:scale-95 transition">
            Explore Signature Flavours
          </Link>
        </div>
      </section>

      <section className="mt-8 animate-fade-up">
        <Section kicker="Chef's Picks" title="House Favourites" />
        <div className="-mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 pb-2">
            {chefPicks.map((f) => <FeaturedCard key={f.id} item={f} />)}
          </div>
        </div>
      </section>

      <section className="mt-8 animate-fade-up">
        <Section kicker="Bestselling" title="Biryani Specials" action={{ to: "/menu", label: "All biryanis" }} />
        <div className="-mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 pb-2">
            {bestBiryani.map((f) => <FeaturedCard key={f.id} item={f} />)}
          </div>
        </div>
      </section>

      <section className="mt-8 mb-4 animate-fade-up">
        <Section kicker="Authentic Andhra" title="South Indian Starters" action={{ to: "/menu", label: "See more" }} />
        <div className="-mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 pb-2">
            {andhra.map((f) => <FeaturedCard key={f.id} item={f} />)}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
