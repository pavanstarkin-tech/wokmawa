import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Receipt, Sparkles, ChevronLeft, Search } from "lucide-react";
import { SplashScreen } from "./SplashScreen";
import { TableScannerPrompt } from "./TableScannerPrompt";
import { useCart, useTable, useHydrated, KEYS } from "@/lib/paakashala-store";

function Header({ title, table }: { title?: string; table?: string }) {
  if (title) {
    return (
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border/60 bg-background/90 px-4 backdrop-blur-md">
        <button onClick={() => window.history.back()} className="mr-3 p-1">
          <ChevronLeft className="h-6 w-6 text-brown-deep" />
        </button>
        <h1 className="text-lg font-bold text-brown-deep">{title}</h1>
      </header>
    );
  }
  return (
    <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-md">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-brown-deep">
          Paakashala <Sparkles className="inline-block h-4 w-4 text-gold" />
        </h1>
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Table {table}
        </p>
      </div>
    </header>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const { count } = useCart();
  
  const isHome = pathname === "/";
  const isCart = pathname.startsWith("/cart");
  const isOrders = pathname.startsWith("/orders");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-background border-t border-border/60 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.2)] pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="mx-auto max-w-xl px-10 h-[64px] flex items-center justify-between">
        
        {/* Home */}
        <Link to="/" className="h-full flex flex-col items-center justify-end pb-[10px] gap-[6px] w-16 transition-colors">
          <Home className={`h-[22px] w-[22px] transition-colors ${isHome ? "text-brown-deep" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider leading-none transition-colors ${isHome ? "text-brown-deep" : "text-muted-foreground"}`}>Home</span>
        </Link>

        {/* Cart (Protruding) */}
        <Link to="/cart" className="relative h-full flex flex-col items-center justify-end pb-[10px] w-16">
          <div className="absolute -top-7 flex flex-col items-center">
            <div className={`grid h-[60px] w-[60px] place-items-center rounded-full border-[6px] border-background shadow-sm transition-transform active:scale-95 ${isCart ? "bg-brown-deep" : "bg-gold-gradient"}`}>
              <ShoppingBag className={`h-6 w-6 ${isCart ? "text-gold" : "text-brown-deep"}`} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive text-destructive-foreground px-1 text-[9px] font-bold border-2 border-background">
                  {count}
                </span>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider leading-none transition-colors ${isCart ? "text-brown-deep" : "text-muted-foreground"}`}>Cart</span>
        </Link>

        {/* Orders */}
        <Link to="/orders" className="h-full flex flex-col items-center justify-end pb-[10px] gap-[6px] w-16 transition-colors">
          <Receipt className={`h-[22px] w-[22px] transition-colors ${isOrders ? "text-brown-deep" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider leading-none transition-colors ${isOrders ? "text-brown-deep" : "text-muted-foreground"}`}>Orders</span>
        </Link>
        
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { table } = useTable();
  const [splashDone, setSplashDone] = useState(false);
  const [phoneDone, setPhoneDone] = useState(false); // Can be removed later, kept for minimal diff

  // Once table exists in storage, mark phone step as done.
  useEffect(() => {
    if (table) setPhoneDone(true);
  }, [table]);

  // Also short-circuit splash if user already onboarded before.
  useEffect(() => {
    if (!hydrated) return;
    const seen = window.sessionStorage.getItem("paakashala_splash_seen");
    if (seen) setSplashDone(true);
  }, [hydrated]);

  useEffect(() => {
    if (splashDone && typeof window !== "undefined") {
      window.sessionStorage.setItem("paakashala_splash_seen", "1");
    }
  }, [splashDone]);

  if (!hydrated) {
    return <div className="min-h-screen bg-luxe-gradient" />;
  }

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;
  if (!table) return <TableScannerPrompt />;

  // Suppress KEYS unused warning
  void KEYS;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background selection:bg-gold/20 pb-16">
      <Header table={table} />
      <main className="flex-1 pb-4">{children}</main>
      <BottomNav />
    </div>
  );
}
