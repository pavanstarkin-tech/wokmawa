import React from 'react';

interface VegBadgeProps {
  isVeg: boolean;
  size?: 'sm' | 'md';
}

export const VegBadge: React.FC<VegBadgeProps> = ({ isVeg, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const dotDim = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  if (isVeg) {
    return (
      <div
        className={`${dim} border border-[#22C55E] rounded-sm flex items-center justify-center p-0.5 shrink-0 bg-[#22C55E]/10`}
        title="Vegetarian"
      >
        <div className={`${dotDim} rounded-full bg-[#22C55E]`} />
      </div>
    );
  }

  return (
    <div
      className={`${dim} border border-[#FF3B3B] rounded-sm flex items-center justify-center p-0.5 shrink-0 bg-[#FF3B3B]/10`}
      title="Non-Vegetarian"
    >
      <div className={`${dotDim} rounded-full bg-[#FF3B3B]`} />
    </div>
  );
};

export const MawaHotBadge: React.FC<{ text?: string; variant?: 'corner' | 'pill' }> = ({
  text = 'HOT 🔥',
  variant = 'corner',
}) => {
  if (variant === 'corner') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-bl-lg text-[9px] font-black tracking-wider uppercase bg-gradient-to-r from-[#FF3B3B] to-[#F97316] text-white shadow-flame-glow border-b border-l border-black/40">
        <span>🔥</span>
        <span>{text.replace('🔥', '').trim() || 'HOT'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-[#FF3B3B] to-[#F97316] text-white shadow-flame-glow animate-pulse">
      <span>🔥</span>
      <span>{text}</span>
    </span>
  );
};

export const PopularBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#F97316] text-white shadow-orange-glow">
      <span>★</span>
      <span>POPULAR</span>
    </span>
  );
};
