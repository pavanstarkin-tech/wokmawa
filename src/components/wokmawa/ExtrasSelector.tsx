import React from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';
import { EXTRAS_OPTIONS, ExtraOption } from '../../lib/wokmawa-menu';
import { VegBadge } from './WokBadge';

interface ExtrasSelectorProps {
  selectedExtras: ExtraOption[];
  onToggleExtra: (extra: ExtraOption) => void;
}

export const ExtrasSelector: React.FC<ExtrasSelectorProps> = ({
  selectedExtras,
  onToggleExtra,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-display font-bold text-base text-white">
            Make It Yours (Add Extras)
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#A1A1AA]">
          Optional
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {EXTRAS_OPTIONS.map((extra) => {
          const isSelected = selectedExtras.some((e) => e.id === extra.id);

          return (
            <button
              key={extra.id}
              type="button"
              onClick={() => onToggleExtra(extra)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'bg-gradient-to-r from-[#242012] to-[#171510] border-[#D4AF37] ring-1 ring-[#D4AF37]/50 shadow-gold-glow'
                  : 'bg-[#141414] border-[#27272A] hover:border-[#3F3F46] hover:bg-[#1A1A1A]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <VegBadge isVeg={extra.isVeg} size="sm" />
                <span className={`text-sm font-semibold ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}>
                  {extra.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white">
                  +₹{extra.price}
                </span>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#D4AF37] text-black font-bold'
                      : 'border border-[#3F3F46] text-[#A1A1AA]'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
