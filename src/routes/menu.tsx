import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/paakashala/AppShell";
import { MiniCategoryCard } from "@/components/paakashala/MiniCategoryCard";
import { CATEGORIES, CATEGORY_IMAGE, type Category } from "@/lib/paakashala-menu";
import { KEYS, useMenu } from "@/lib/paakashala-store";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

const SMART_COLLECTIONS: Record<string, { title: string; subtitle: string; emoji: string; bgClass: string }> = {
  bogo: {
    title: "Buy 1 Get 1 Free",
    subtitle: "Double the taste, half the price",
    emoji: "🔥",
    bgClass: "from-orange-500 to-amber-600"
  },
  under199: {
    title: "Budget Bites Under ₹199",
    subtitle: "Budget friendly options just for you",
    emoji: "💸",
    bgClass: "from-teal-600 to-emerald-600"
  },
  under299: {
    title: "Premium Feasts Under ₹299",
    subtitle: "Amazing main courses and combos",
    emoji: "🍲",
    bgClass: "from-indigo-600 to-blue-600"
  },
  combo: {
    title: "Value Combos & Thalis",
    subtitle: "Handpicked plates and full family packs",
    emoji: "🍱",
    bgClass: "from-purple-600 to-pink-600"
  },
  starters199: {
    title: "Starters Under ₹199",
    subtitle: "Delicious appetizers at great prices",
    emoji: "🌶️",
    bgClass: "from-rose-600 to-red-600"
  },
  biryani299: {
    title: "Biryanis Under ₹299",
    subtitle: "Delicious aromatic biryanis under budget",
    emoji: "🍗",
    bgClass: "from-yellow-600 to-amber-700"
  },
  offers: {
    title: "Special Offers & Discounts",
    subtitle: "Best deals and discounts catalog",
    emoji: "🎉",
    bgClass: "from-amber-500 to-amber-700"
  }
};

export const Route = createFileRoute("/menu")({
  validateSearch: (s) => searchSchema.parse(s),
  component: MenuPage,
});

function MenuPage() {
  const { category: initialCat, q: initialQ } = Route.useSearch();
  const navigate = useNavigate();
  const [smartCollection, setSmartCollection] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "veg" | "non-veg">("all");

  // Synchronize state when URL query search parameters change
  useEffect(() => {
    const normQ = initialQ?.trim().toLowerCase() ?? "";
    if (["bogo", "under199", "under299", "combo", "starters199", "biryani299", "offers"].includes(normQ)) {
      setSmartCollection(normQ);
      setQ("");
    } else {
      setSmartCollection(null);
      setQ(initialQ ?? "");
    }
  }, [initialQ]);
  const [active, setActive] = useState<Category>(() => {
    if (initialCat && (CATEGORIES as readonly string[]).includes(initialCat)) return initialCat as Category;
    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem(KEYS.lastCategory);
      if (last && (CATEGORIES as readonly string[]).includes(last)) return last as Category;
    }
    return CATEGORIES[0];
  });

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEYS.lastCategory, active);
  }, [active]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const goCategory = (c: string) => {
    setActive(c as Category);
    const el = sectionRefs.current[c];
    if (el) {
      const offset = 100;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (initialCat) goCategory(initialCat as Category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullMenu = useMenu();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return fullMenu.filter((m) => {
      if (!m || !m.name) return false; // skip malformed items
      if (filter !== "all" && m.type !== filter) return false;

      // 1. Filter by Smart Collection first if active
      if (smartCollection) {
        let matchesCollection = false;
        if (smartCollection === "bogo") {
          matchesCollection = m.name.toLowerCase().includes("bogo") || m.name.toLowerCase().includes("buy 1 get 1") || m.name.toLowerCase().includes("free");
        } else if (smartCollection === "under199") {
          matchesCollection = m.price !== null && m.price < 199;
        } else if (smartCollection === "under299") {
          matchesCollection = m.price !== null && m.price < 299;
        } else if (smartCollection === "combo") {
          matchesCollection = m.category === "Thali" || m.name.toLowerCase().includes("combo") || m.name.toLowerCase().includes("pack") || m.name.toLowerCase().includes("deal");
        } else if (smartCollection === "starters199") {
          matchesCollection = (m.category ?? "").toLowerCase().includes("starter") && m.price !== null && m.price < 199;
        } else if (smartCollection === "biryani299") {
          matchesCollection = (m.category ?? "").toLowerCase().includes("biryani") && m.price !== null && m.price < 299;
        } else if (smartCollection === "offers") {
          matchesCollection = (m.mrp !== undefined && m.mrp !== null && m.mrp > (m.price ?? 0)) || m.name.toLowerCase().includes("bogo") || m.name.toLowerCase().includes("free");
        }
        
        if (!matchesCollection) return false;
      }

      // 2. Filter by search text query
      if (!query) return true;
      return (
        (m.name ?? "").toLowerCase().includes(query) ||
        (m.category ?? "").toLowerCase().includes(query)
      );
    });
  }, [q, smartCollection, filter, fullMenu]);

  // Build grouped map dynamically from actual data (not just static CATEGORIES)
  // Guard against items with no category
  const grouped = useMemo(() => {
    const by = new Map<string, typeof fullMenu>();
    filtered.forEach((m) => {
      const cat = m.category || "Other";
      if (!by.has(cat)) by.set(cat, []);
      by.get(cat)!.push(m);
    });
    return by;
  }, [filtered]);

  // When searching: show all matched categories sorted by relevance
  // When not searching: respect the CATEGORIES order + append any extras
  const orderedCategories = useMemo(() => {
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      return Array.from(grouped.keys()).sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStart = b.toLowerCase().startsWith(query) ? 0 : 1;
        return aStart - bStart;
      });
    }
    const known = CATEGORIES.filter((c) => grouped.has(c));
    const extra = Array.from(grouped.keys()).filter(
      (c) => !(CATEGORIES as readonly string[]).includes(c)
    );
    return [...known, ...extra];
  }, [q, grouped]);

  const isSearching = q.trim().length > 0 || smartCollection !== null;

  return (
    <AppShell>

      {/* Search + Veg toggle */}
      <div className="relative z-10 -mx-4 md:-mx-8 lg:-mx-12 mt-4 px-4 md:px-8 lg:px-12 pb-3 pt-2 mb-2">
        <div className="flex items-center gap-3 max-w-2xl mx-auto w-full">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-luxe focus-within:border-gold transition-colors">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search biryani, paneer, chicken…"
              className="flex-1 bg-transparent text-xs text-brown-deep outline-none placeholder:text-muted-foreground/70"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear" className="text-muted-foreground hover:text-brown-deep transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-center gap-1.5 bg-card border border-border/80 px-2 py-2 rounded-xl shadow-sm">
            <span className={`text-[9px] font-bold transition-colors ${filter === 'veg' ? 'text-green-700' : 'text-muted-foreground/50'}`}>VEG</span>
            <button
              onClick={() => {
                if (filter === 'all') setFilter('veg');
                else if (filter === 'veg') setFilter('non-veg');
                else setFilter('all');
              }}
              className={`relative flex h-4 w-10 items-center rounded-full transition-colors ${
                filter === 'all' ? 'bg-muted-foreground/20' : filter === 'veg' ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
            >
              <div
                className={`absolute h-3.5 w-3.5 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                  filter === 'all'
                    ? 'translate-x-[13px] bg-muted-foreground'
                    : filter === 'veg'
                    ? 'translate-x-[2px] bg-green-500'
                    : 'translate-x-[24px] bg-red-500'
                }`}
              >
                <div className="h-1 w-1 rounded-full bg-white" />
              </div>
            </button>
            <span className={`text-[9px] font-bold transition-colors ${filter === 'non-veg' ? 'text-red-700' : 'text-muted-foreground/50'}`}>NON-VEG</span>
          </div>
        </div>

        {/* Live result count while searching */}
        {isSearching && (
          <p className="text-[11px] text-muted-foreground mt-2 px-1 max-w-2xl mx-auto">
            {filtered.length === 0
              ? "No dishes found"
              : `${filtered.length} dish${filtered.length !== 1 ? "es" : ""} found for "${q.trim()}"`}
          </p>
        )}
      </div>

      {/* Category pill bar — hidden while actively searching */}
      {!isSearching && (
        <div className="sticky top-0 z-20 -mx-4 md:-mx-8 lg:-mx-12 bg-background/85 backdrop-blur-md border-b border-border/60">
          <div className="overflow-x-auto no-scrollbar py-3">
            <div className="flex gap-4 px-4 md:px-8 lg:px-12">
              {CATEGORIES.map((c) => {
                const on = active === c;
                return (
                  <button
                    key={c}
                    onClick={() => goCategory(c)}
                    className={`group relative flex w-[72px] shrink-0 flex-col items-center gap-2 transition active:scale-95 ${on ? 'scale-105' : ''}`}
                  >
                    <div className={`h-[72px] w-[72px] overflow-hidden rounded-full shadow-luxe p-0.5 bg-card transition-colors ${on ? 'border-2 border-gold' : 'border border-gold/30'}`}>
                      <img src={CATEGORY_IMAGE[c]} alt={c} loading="lazy" className="h-full w-full rounded-full object-cover transition duration-500 group-hover:scale-110" />
                    </div>
                    <div className={`w-full text-center text-[10px] font-semibold leading-tight line-clamp-2 ${on ? 'text-gold' : 'text-brown-deep'}`}>
                      {c}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {smartCollection && (
        <div className={`mt-2 p-5 rounded-2xl bg-gradient-to-r ${
          smartCollection === "bogo" ? "from-orange-500 to-amber-600" :
          smartCollection === "under199" ? "from-teal-600 to-emerald-600" :
          smartCollection === "under299" ? "from-indigo-600 to-blue-600" :
          smartCollection === "combo" ? "from-purple-600 to-pink-600" :
          smartCollection === "starters199" ? "from-rose-600 to-red-600" :
          smartCollection === "biryani299" ? "from-yellow-600 to-amber-700" :
          "from-amber-500 to-amber-700"
        } text-white shadow-md relative overflow-hidden flex items-center justify-between`}>
          <div className="space-y-0.5 z-10">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80 block">⚡ Smart Collection</span>
            <h1 className="text-base font-extrabold tracking-tight">
              {SMART_COLLECTIONS[smartCollection]?.title || "Special Offers & Discounts"}
            </h1>
            <p className="text-[10px] text-white/85 font-medium">
              {SMART_COLLECTIONS[smartCollection]?.subtitle || "Best deals and discounts catalog"}
            </p>
          </div>
          <button 
            onClick={() => {
              setSmartCollection(null);
              navigate({ to: "/menu", search: (prev) => ({ ...prev, q: undefined }) });
            }}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all z-10 cursor-pointer active:scale-95 flex items-center justify-center shrink-0 ml-4"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute right-0 bottom-0 opacity-15 text-7xl font-bold translate-y-3 translate-x-3 pointer-events-none select-none">
            {SMART_COLLECTIONS[smartCollection]?.emoji || "🎉"}
          </div>
        </div>
      )}

      {/* Menu sections */}
      <div className="mt-5 space-y-8">
        {orderedCategories.map((c) => {
          const items = grouped.get(c) ?? [];
          if (items.length === 0) return null;
          return (
            <section
              key={c}
              ref={(el) => {
                sectionRefs.current[c] = el;
              }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-gold-gradient opacity-40" />
                <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-brown-deep">{c}</h2>
                <div className="h-px flex-1 bg-gold-gradient opacity-40" />
              </div>
              <div className="grid grid-cols-2 min-[400px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {items.map((m) => (
                  <MiniCategoryCard key={m.id} item={m} />
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center border border-border/60 shadow-luxe">
            <div className="text-2xl mb-2">🍽️</div>
            <div className="text-sm font-semibold text-brown-deep">No dishes match your search.</div>
            <div className="mt-1 text-xs text-muted-foreground">Try clearing filters or a different keyword.</div>
            <button
              onClick={() => {
                setQ("");
                setSmartCollection(null);
                setFilter("all");
                navigate({ to: "/menu", search: (prev) => ({ ...prev, q: undefined }) });
              }}
              className="mt-4 text-xs font-bold text-gold underline underline-offset-2"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
