import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/parkashala/AppShell";
import { HeroCarousel } from "@/components/parkashala/HeroCarousel";
import { FeaturedCard } from "@/components/parkashala/FeaturedCard";
import { CATEGORIES, CATEGORY_IMAGE, MENU, FEATURED_IDS } from "@/lib/parkashala-menu";

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
  const featured = FEATURED_IDS.map((id) => MENU.find((m) => m.id === id)).filter(Boolean) as typeof MENU;
  const chefPicks = MENU.filter((m) => ["Chicken Lollipop", "Paneer Butter Masala", "Mutton Ghee Roast", "Chilli Prawns", "Kalmi Kebab (Half)"].includes(m.name));
  const bestBiryani = MENU.filter((m) => m.category === "Biryani").slice(0, 6);
  const andhra = MENU.filter((m) => m.category === "South Indian Starters").slice(0, 6);

  return (
    <AppShell>
      <section className="animate-fade-up">
        <HeroCarousel />
      </section>

      <section className="mt-8 animate-fade-up">
        <Section kicker="Curated for you" title="Browse the Menu" action={{ to: "/menu", label: "View all" }} />
        <div className="-mx-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 pb-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to="/menu"
                search={{ category: c }}
                className="group relative flex w-24 shrink-0 flex-col items-center overflow-hidden rounded-2xl bg-card border border-border/60 shadow-luxe transition active:scale-95"
              >
                <div className="h-20 w-full overflow-hidden">
                  <img src={CATEGORY_IMAGE[c]} alt={c} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                </div>
                <div className="w-full px-1.5 py-2 text-center text-[10px] font-semibold leading-tight text-brown-deep">
                  {c}
                </div>
              </Link>
            ))}
          </div>
        </div>
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
