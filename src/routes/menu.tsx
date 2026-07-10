import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Leaf, Drumstick, X } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/parkashala/AppShell";
import { MenuCard } from "@/components/parkashala/MenuCard";
import { CATEGORIES, MENU, type Category } from "@/lib/parkashala-menu";
import { KEYS } from "@/lib/parkashala-store";

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

  const goCategory = (c: Category) => {
    setActive(c);
    const el = sectionRefs.current[c];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Jump to initial category once
    if (initialCat) goCategory(initialCat as Category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MENU.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (query && !m.name.toLowerCase().includes(query) && !m.category.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [q, filter]);

  const grouped = useMemo(() => {
    const by = new Map<Category, typeof MENU>();
    CATEGORIES.forEach((c) => by.set(c, []));
    filtered.forEach((m) => by.get(m.category as Category)?.push(m));
    return by;
  }, [filtered]);

  return (
    <AppShell>
      <div className="animate-fade-up">
        <div className="text-[10px] tracking-[0.4em] uppercase text-gold">Our Kitchen</div>
        <h1 className="mt-1 text-3xl font-semibold text-brown-deep">The Menu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Freshly curated for your table.</p>
      </div>

      <div className="sticky top-[68px] z-20 -mx-4 mt-4 bg-background/85 backdrop-blur-md px-4 pb-3 pt-2 border-b border-border/60">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-luxe focus-within:border-gold">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search biryani, tandoori, gongura…"
            className="flex-1 bg-transparent text-sm text-brown-deep outline-none placeholder:text-muted-foreground/70"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {[
            { k: "all", label: "All" },
            { k: "veg", label: "Veg", icon: Leaf },
            { k: "non-veg", label: "Non-Veg", icon: Drumstick },
          ].map((f) => {
            const on = filter === f.k;
            const Icon = f.icon;
            return (
              <button
                key={f.k}
                onClick={() => setFilter(f.k as typeof filter)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition ${
                  on
                    ? "bg-brown-gradient text-cream shadow-luxe"
                    : "bg-card text-brown-deep border border-border"
                }`}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 -mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4">
            {CATEGORIES.map((c) => {
              const on = active === c;
              return (
                <button
                  key={c}
                  onClick={() => goCategory(c)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition ${
                    on ? "bg-gold-gradient text-brown-deep shadow-luxe" : "bg-card text-brown-deep border border-border"
                  }`}
                >
                  {c}
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
              <div className="grid grid-cols-1 gap-3">
                {items.map((m) => (
                  <MenuCard key={m.id} item={m} />
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
