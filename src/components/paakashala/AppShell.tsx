import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Receipt, Sparkles, ChevronLeft, Search, LogOut, ArrowUp } from "lucide-react";
import { SplashScreen } from "./SplashScreen";
import { TableScannerPrompt } from "./TableScannerPrompt";
import { CustomerWelcome } from "./CustomerWelcome";
import { useCart, useTable, useCustomer, useHydrated, KEYS } from "@/lib/paakashala-store";

function Header({ title, table }: { title?: string; table?: string }) {
  const { setTable } = useTable();
  const { clear } = useCart();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out and clear your table?")) {
      setTable("");
      clear();
      window.location.href = "/";
    }
  };

  if (title) {
    return (
      <header className="relative z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 md:px-8 lg:px-12 backdrop-blur-md rounded-b-[35px] shadow-sm max-w-7xl mx-auto w-full">
        <div className="flex items-center">
          <button onClick={() => window.history.back()} className="mr-3 p-1">
            <ChevronLeft className="h-6 w-6 text-brown-deep" />
          </button>
          <h1 className="text-lg font-bold text-brown-deep">{title}</h1>
        </div>
      </header>
    );
  }
  return (
    <header className="relative z-40 flex h-[68px] items-center justify-between border-b border-border/60 bg-background/85 px-4 md:px-8 lg:px-12 backdrop-blur-md rounded-b-[35px] shadow-sm max-w-7xl mx-auto w-full">
      
      {/* Left Table Indicator */}
      <div className="flex flex-col items-start relative z-10 w-20">
        <p className="text-[10px] font-black tracking-wider text-gold uppercase bg-gold/10 px-2 py-1 rounded-md border border-gold/20">
          TBL {table}
        </p>
      </div>

      {/* Centered Image */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <img 
          src="https://i.ibb.co/Gv2MmGxS/erasebg-transformed-18.png" 
          alt="Paakashala Center Logo" 
          className="h-14 w-auto object-contain mix-blend-multiply" 
        />
      </div>

      {/* Right Logout Button */}
      <div className="flex flex-col items-end relative z-10 w-20">
        <button 
          onClick={handleLogout}
          className="p-2 text-brown-deep/70 hover:text-brown-deep transition-colors bg-gold/5 rounded-full"
        >
          <LogOut className="h-5 w-5" />
        </button>
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
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border/60 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.2)] pb-[max(env(safe-area-inset-bottom),0px)] rounded-t-[35px]">
      <div className="mx-auto max-w-md px-10 h-[64px] flex items-center justify-between">
        
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
  const { customer } = useCustomer();
  const [splashDone, setSplashDone] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Short-circuit splash if user already onboarded before.
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

  // Monitor scroll for Scroll to Top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!hydrated) return null;

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (!table) {
    return <TableScannerPrompt />;
  }

  // Derive title from current route if not index
  const pathname = window.location.pathname;
  let title = undefined;
  if (pathname.startsWith("/cart")) title = "Your Cart";
  if (pathname.startsWith("/orders")) title = "Your Orders";
  if (pathname.startsWith("/menu")) title = "Full Menu";
  if (pathname.startsWith("/image-picker")) title = "Image Picker";

  return (
    <div className="min-h-screen bg-background selection:bg-gold/20">
      <Header title={title} table={table} />
      
      <main className="pb-24 px-[15px] md:px-8 lg:px-12 pt-4 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed right-4 bottom-[84px] z-50 flex h-10 w-10 items-center justify-center rounded-full bg-brown-deep text-gold shadow-luxe border border-gold/30 hover:opacity-90 active:scale-90 transition animate-fade-in"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <BottomNav />
    </div>
  );
}
