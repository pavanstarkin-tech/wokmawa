import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Menu, X, ChevronLeft, LogOut, Utensils, Receipt, Bell, RefreshCw } from 'lucide-react';
import { useWokStore } from '../../lib/wokmawa-store';
import { WOKMAWA_ASSETS } from '../../lib/wokmawa-menu';

interface WokHeaderProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  showSearch?: boolean;
  showCart?: boolean;
  onLogout?: () => void;
}

export const WokHeader: React.FC<WokHeaderProps> = ({
  showBack = false,
  backTo,
  showCart,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { tableNumber, totals, actions, isDrawerOpen } = useWokStore();
  const [mounted, setMounted] = useState(false);

  // Check if currently on cart page
  const isCartPage = typeof window !== 'undefined' && window.location.pathname.includes('/cart');
  const shouldShowCart = showCart !== undefined ? showCart : !isCartPage;

  useEffect(() => {
    setMounted(true);
    return () => {
      actions.setDrawerOpen(false);
    };
  }, []);

  const handleBack = () => {
    actions.setDrawerOpen(false);
    if (backTo) {
      navigate({ to: backTo });
    } else {
      window.history.back();
    }
  };

  const handleLogout = () => {
    actions.setDrawerOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      if (window.confirm("Exit table session and return to scanner?")) {
        actions.clearCart();
        window.location.href = '/';
      }
    }
  };

  return (
    <>
      <header className="relative w-full bg-transparent px-3.5 py-3.5 sm:py-4 select-none">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2.5">
          {/* Left Side: Interactive Hamburger Menu OR Back Button (10px Top Gap) */}
          <div className="flex items-center shrink-0 mt-[10px]">
            {showBack ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-90 text-white hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 shadow-sm transition-all duration-200 cursor-pointer group"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform duration-200" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => actions.setDrawerOpen(true)}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-90 text-white hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 shadow-sm transition-all duration-200 cursor-pointer group"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.4] group-hover:scale-110 transition-transform duration-200" />
              </button>
            )}
          </div>

          {/* Center: WOKMAWA Logo (Unchanged top position) */}
          <div className="flex-1 flex items-center justify-center pl-[6px]">
            <Link to="/" onClick={() => actions.setDrawerOpen(false)} className="flex items-center justify-center overflow-hidden">
              <img
                src={WOKMAWA_ASSETS.LOGO}
                alt="WOKMAWA Logo"
                className="h-12 sm:h-14 w-auto max-w-[170px] sm:max-w-[210px] object-contain transition-all scale-[1.1] origin-bottom"
                style={{ clipPath: 'inset(10% 0 0 0)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/wokmawa/logo.png';
                }}
              />
            </Link>
          </div>

          {/* Right Side: TABLE Badge (View Only) & Optional Shopping Cart (10px Top Gap) */}
          <div className="flex items-center gap-2.5 shrink-0 mt-[10px]">
            {/* Gold-outlined TABLE Pill */}
            <button
              type="button"
              onClick={() => {
                const newTable = window.prompt("Enter your Table number:", tableNumber);
                if (newTable && newTable.trim()) {
                  actions.setTableNumber(newTable.trim().toUpperCase());
                }
              }}
              className="flex items-center justify-center px-3.5 sm:px-4 py-2 rounded-full border border-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/10 active:scale-95 transition-all shadow-sm select-none cursor-pointer"
              title="Click to change Table number"
            >
              <span className="font-display font-black text-xs sm:text-sm text-white tracking-wider uppercase">
                TABLE {tableNumber.padStart(2, '0')}
              </span>
            </button>

            {/* Shopping Cart Icon with Corner Red Bubble (Hidden on Cart Page) */}
            {shouldShowCart && (
              <Link
                to="/cart"
                onClick={() => actions.setDrawerOpen(false)}
                className="relative w-11 h-11 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-90 text-white hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 shadow-sm transition-all duration-200 cursor-pointer group"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5 stroke-[2.2] group-hover:scale-110 transition-transform duration-200" />
                {mounted && totals.totalItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF3B3B] text-white text-[10px] font-black flex items-center justify-center shadow-flame-glow border-2 border-[#080808] animate-pulse">
                    {totals.totalItemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Slide-over Side Drawer Menu */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => actions.setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] bg-[#0E0E0E] border-r border-[#27272A] rounded-r-[25px] overflow-hidden p-5 flex flex-col justify-between z-10 shadow-2xl animate-slide-right">
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <img
                  src={WOKMAWA_ASSETS.LOGO}
                  alt="WOKMAWA"
                  className="h-9 w-auto object-contain"
                />
                <button
                  onClick={() => actions.setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Table Info Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-[#1A1A1A] to-[#121212] border border-[#D4AF37]/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Current Table</span>
                  <div className="font-display font-black text-lg text-[#D4AF37]">
                    TABLE #{tableNumber}
                  </div>
                </div>
                <button
                  onClick={() => {
                    actions.setDrawerOpen(false);
                    const newTable = window.prompt("Enter new table number:", tableNumber);
                    if (newTable && newTable.trim()) {
                      actions.setTableNumber(newTable.trim());
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold"
                >
                  Change
                </button>
              </div>

              {/* Nav Links */}
              <nav className="space-y-1">
                <Link
                  to="/"
                  onClick={() => actions.setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-[#1A1A1A] hover:text-[#D4AF37] transition-all"
                >
                  <Utensils className="w-4 h-4 text-[#D4AF37]" />
                  <span>Full Menu & Dishes</span>
                </Link>

                <Link
                  to="/cart"
                  onClick={() => actions.setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-[#1A1A1A] hover:text-[#D4AF37] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
                    <span>My Cart</span>
                  </div>
                  {totals.totalItemCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E53E3E] text-white text-[11px] font-black">
                      {totals.totalItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/orders"
                  onClick={() => actions.setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-[#1A1A1A] hover:text-[#D4AF37] transition-all"
                >
                  <Receipt className="w-4 h-4 text-[#D4AF37]" />
                  <span>Live Orders & Receipts</span>
                </Link>

                <button
                  onClick={() => {
                    actions.setDrawerOpen(false);
                    alert("Captain has been notified for Table #" + tableNumber + "!");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-[#1A1A1A] hover:text-[#22C55E] transition-all text-left"
                >
                  <Bell className="w-4 h-4 text-[#22C55E]" />
                  <span>Call Waiter / Service</span>
                </button>
              </nav>
            </div>

            {/* Bottom: Exit Session Button */}
            <div className="pt-4 border-t border-[#27272A] space-y-2">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1A1A1A] border border-[#FF3B3B]/40 hover:bg-[#FF3B3B]/10 text-[#FF3B3B] text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Session / Change Table</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

