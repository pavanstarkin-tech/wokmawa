import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Leaf, Drumstick, X } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/paakashala/AppShell";
import { MiniCategoryCard } from "@/components/paakashala/MiniCategoryCard";
import { CATEGORIES, CATEGORY_IMAGE, type Category } from "@/lib/paakashala-menu";
import { KEYS, useMenu } from "@/lib/paakashala-store";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/menu")({
  validateSearch: (s) => searchSchema.parse(s),
  component: MenuPage,
});

function MenuPage() {
  const { category: initialCat, q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [filter, setFilter] = useState<"all" | "veg" | "non-veg">("all");
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
      const offset = 100; // Account for sticky category bar height
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Jump to initial category once
    if (initialCat) goCategory(initialCat as Category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullMenu = useMenu();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return fullMenu.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (query && !m.name.toLowerCase().includes(query) && !m.category.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [q, filter, fullMenu]);

  const grouped = useMemo(() => {
    const by = new Map<Category, typeof fullMenu>();
    CATEGORIES.forEach((c) => by.set(c, []));
    filtered.forEach((m) => by.get(m.category as Category)?.push(m));
    return by;
  }, [filtered]);

  return (
    <AppShell>

      <div className="relative z-10 -mx-4 md:-mx-8 lg:-mx-12 mt-4 px-4 md:px-8 lg:px-12 pb-3 pt-2 mb-2">
        <div className="flex items-center gap-3 max-w-2xl mx-auto w-full">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-luxe focus-within:border-gold">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search biryani…"
              className="flex-1 bg-transparent text-xs text-brown-deep outline-none placeholder:text-muted-foreground/70"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear" className="text-muted-foreground">
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
      </div>

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

      <div className="mt-5 space-y-8">
        {CATEGORIES.map((c) => {
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
          <div className="rounded-2xl bg-card p-6 text-center border border-border/60 shadow-luxe">
            <div className="text-sm font-semibold text-brown-deep">No dishes match your search.</div>
            <div className="mt-1 text-xs text-muted-foreground">Try clearing filters or another keyword.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
