import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { useWokStore } from '../../lib/wokmawa-store';

export const CartSummaryBar: React.FC = () => {
  const { totals, isDrawerOpen } = useWokStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || totals.totalItemCount === 0) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-x border-[#D4AF37]/35 rounded-t-[26px] sm:rounded-t-[30px] shadow-[0_-8px_30px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 ease-in-out ${
        isDrawerOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Left: Gold Cart Icon with Red Notification Badge & Item/Price info */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center text-[#E5A93C]">
            <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF2D2D] text-white text-[10px] font-black flex items-center justify-center border-2 border-black shadow-md">
              {totals.totalItemCount}
            </span>
          </div>

          <div className="text-left font-display font-bold text-sm sm:text-base text-white tracking-wide flex items-center">
            <span>{totals.totalItemCount} {totals.totalItemCount === 1 ? 'Item' : 'Items'}</span>
            <span className="text-[#666666] mx-2.5 font-light">|</span>
            <span className="text-white font-extrabold">₹{totals.grandTotal}</span>
          </div>
        </div>

        {/* Right: Golden Pill Button */}
        <Link
          to="/cart"
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_2px_12px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 transition-all"
        >
          <span>VIEW CART</span>
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </Link>
      </div>
    </div>
  );
};

