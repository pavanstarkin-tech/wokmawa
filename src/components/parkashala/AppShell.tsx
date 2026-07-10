import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, UtensilsCrossed, ShoppingBag, Receipt } from "lucide-react";
import { Logo } from "./Logo";
import { SplashScreen } from "./SplashScreen";
import { PhoneEntry } from "./PhoneEntry";
import { useCart, useMobile, useHydrated, KEYS } from "@/lib/parkashala-store";

const TABS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: Receipt },
] as const;

function Header() {
  const { count } = useCart();
  const { mobile } = useMobile();
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <Logo size={44} />
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] text-gold uppercase leading-none">Parkashala</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {mobile ? `Namaste · +91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : "Heritage kitchen"}
            </div>
          </div>
        </Link>
        <div className="ml-auto shrink-0">
          <Link
            to="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-card shadow-luxe border border-border/70 transition active:scale-95"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5 text-brown-deep" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-gradient px-1 text-[10px] font-bold text-brown-deep shadow-luxe">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const { count } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      <div className="mx-auto max-w-xl px-3">
        <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-luxe">
          <ul className="flex items-stretch justify-between">
            {TABS.map((tab) => {
              const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <li key={tab.to} className="flex-1">
                  <Link
                    to={tab.to}
                    className="relative flex flex-col items-center justify-center gap-1 py-2.5 transition"
                  >
                    <div
                      className={`relative grid h-9 w-9 place-items-center rounded-xl transition ${
                        active ? "bg-gold-gradient shadow-luxe" : ""
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-brown-deep" : "text-primary/70"}`} />
                      {tab.to === "/cart" && count > 0 && (
                        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-brown-deep px-1 text-[9px] font-bold text-cream">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] tracking-wider uppercase ${active ? "text-brown-deep font-semibold" : "text-muted-foreground"}`}>
                      {tab.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { mobile } = useMobile();
  const [splashDone, setSplashDone] = useState(false);
  const [phoneDone, setPhoneDone] = useState(false);

  // Once mobile exists in storage, mark phone step as done.
  useEffect(() => {
    if (mobile) setPhoneDone(true);
  }, [mobile]);

  // Also short-circuit splash if user already onboarded before.
  useEffect(() => {
    if (!hydrated) return;
    const seen = window.sessionStorage.getItem("parkashala_splash_seen");
    if (seen) setSplashDone(true);
  }, [hydrated]);

  useEffect(() => {
    if (splashDone && typeof window !== "undefined") {
      window.sessionStorage.setItem("parkashala_splash_seen", "1");
    }
  }, [splashDone]);

  if (!hydrated) {
    return <div className="min-h-screen bg-luxe-gradient" />;
  }

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;
  if (!phoneDone && !mobile) return <PhoneEntry onDone={() => setPhoneDone(true)} />;

  // Suppress KEYS unused warning
  void KEYS;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-xl px-4 pb-32 pt-4 animate-fade-in">{children}</main>
      <BottomNav />
    </div>
  );
}
