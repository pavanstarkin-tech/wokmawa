import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { MenuItem } from '../../lib/wokmawa-menu';
import { useWokStore } from '../../lib/wokmawa-store';

interface WokAddButtonProps {
  item: MenuItem;
  onOpenModal?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'full';
}

export const WokAddButton: React.FC<WokAddButtonProps> = ({
  item,
  onOpenModal,
  className = '',
  size = 'sm',
}) => {
  const { actions } = useWokStore();
  const quantity = actions.getItemQuantity(item.id);

  if (quantity > 0) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-xs shadow-[0_2px_10px_rgba(212,175,55,0.35)] select-none ${
          size === 'full' ? 'w-full justify-between' : ''
        } ${className}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            actions.decrementItem(item.id);
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/15 active:scale-75 transition-transform cursor-pointer"
          aria-label="Decrease quantity"
        >
          <Minus className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        <span className="min-w-[16px] text-center font-black text-xs">
          {quantity}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            actions.incrementItem(item);
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/15 active:scale-75 transition-transform cursor-pointer"
          aria-label="Increase quantity"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenModal) {
          onOpenModal();
        } else {
          actions.incrementItem(item);
        }
      }}
      className={`py-1 px-3 rounded-full border border-[#D4AF37] bg-transparent text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-display font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-0.5 shadow-sm cursor-pointer ${
        size === 'full' ? 'w-full py-1.5 text-xs gap-1' : ''
      } ${className}`}
    >
      <span>ADD</span>
      <Plus className="w-3 h-3 stroke-[3]" />
    </button>
  );
};
