import React from 'react';
import { SPICE_LEVELS, SpiceLevel, WOKMAWA_ASSETS } from '../../lib/wokmawa-menu';

interface SpiceSelectorProps {
  selectedSpice: SpiceLevel;
  onSelectSpice: (spice: SpiceLevel) => void;
}

// Crisp Vector Red Chilli SVG Icon
export const ChilliPepperIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    className={`${className} inline-block shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Chilli Green Stem */}
    <path
      d="M14.5 3C15 2 16.5 1.5 17.5 1.5C18 1.5 18.2 2 17.8 2.5C16.8 3.5 15.8 4 14.8 4.8"
      stroke="#22C55E"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M13 4.5C14 4.2 15.5 4.5 16 5.2C15.2 5.8 14 6 13 6"
      stroke="#16A34A"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Red Curved Chilli Body */}
    <path
      d="M15.5 5.5C14.5 4.5 12.8 4.2 11.2 4.8C8.8 5.7 7.2 8.2 6.8 10.8C6.2 14.5 8.2 18.2 11.8 21.2C12.3 21.6 13 21.2 13.2 20.6C14.8 16.2 17.8 11.8 17.5 8C17.4 6.8 16.6 5.8 15.5 5.5Z"
      fill="url(#chilliGradientReal)"
    />
    <defs>
      <linearGradient
        id="chilliGradientReal"
        x1="7"
        y1="5"
        x2="17"
        y2="21"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF4D4D" />
        <stop offset="0.6" stopColor="#E50914" />
        <stop offset="1" stopColor="#B30000" />
      </linearGradient>
    </defs>
  </svg>
);

export const SpiceSelector: React.FC<SpiceSelectorProps> = ({
  selectedSpice,
  onSelectSpice,
}) => {
  return (
    <div className="space-y-4 select-none">
      {/* Spicy Banner Header */}
      <div className="text-center space-y-1 pt-1 pb-2">
        <h3 className="font-display font-black text-lg sm:text-xl tracking-wide uppercase text-center">
          <span className="text-white">HOW </span>
          <span className="text-[#FF3B3B] italic">HOT </span>
          <span className="text-white">CAN YOU HANDLE?</span>
        </h3>
        <p className="font-display font-extrabold text-[10px] sm:text-[11px] text-[#D4AF37] tracking-[0.2em] uppercase text-center">
          CHOOSE YOUR SPICE LEVEL
        </p>
      </div>

      {/* 4 Interactive Spice Cards */}
      <div className="space-y-2.5">
        {SPICE_LEVELS.map((level) => {
          const isSelected = selectedSpice.id === level.id;
          const isMawaHot = level.id === 'mawa-hot';

          return (
            <div
              key={level.id}
              onClick={() => onSelectSpice(level)}
              className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                isSelected
                  ? 'bg-[#18150D] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.22)]'
                  : 'bg-[#101010] border-[#27272A] hover:border-[#D4AF37]/50 hover:bg-[#151515]'
              }`}
            >
              {/* Fiery Frame Image Overlay on Selected Card (Larger & Wider with Overflowing Flame Effects) */}
              {isSelected && (
                <img
                  src={WOKMAWA_ASSETS.FIERY_FRAME}
                  alt="Fiery Frame"
                  className="absolute -top-[21px] -bottom-[15px] -left-3.5 -right-3.5 w-[calc(100%+28px)] h-[calc(100%+36px)] max-w-none object-fill pointer-events-none z-30 drop-shadow-[0_0_22px_rgba(255,140,0,0.85)] scale-[1.03]"
                />
              )}
              {/* Card Details */}
              <div className="space-y-1 pr-2 flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-display font-black text-sm sm:text-base italic uppercase tracking-wide whitespace-nowrap ${
                      isMawaHot
                        ? 'text-[#FF2222] drop-shadow-[0_0_8px_rgba(255,34,34,0.6)]'
                        : level.id === 'hot'
                        ? 'text-[#FF4D4D]'
                        : 'text-[#E8C547]'
                    }`}
                  >
                    {level.name}
                  </span>
                </div>

                {/* Subtitle */}
                <p className="text-[11px] sm:text-xs text-[#A1A1AA] leading-snug truncate">
                  {level.subtitle}
                </p>
              </div>

              {/* Right Side: Badge & Radio Circle */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                {/* MOST POPULAR Pill Badge for MAWA HOT */}
                {level.badge && (
                  <span className="px-2 py-0.5 rounded-md bg-[#E50914] text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-flame-glow whitespace-nowrap">
                    {level.badge}
                  </span>
                )}

                {/* Radio Button */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isSelected
                      ? isMawaHot
                        ? 'border-2 border-[#FF3B3B] bg-black ring-2 ring-[#FF3B3B]/40 shadow-flame-glow'
                        : 'border-2 border-[#D4AF37] bg-black ring-2 ring-[#D4AF37]/40 shadow-gold-glow'
                      : 'border-2 border-[#3F3F46] bg-transparent group-hover:border-white/50'
                  }`}
                >
                  {isSelected && (
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isMawaHot ? 'bg-[#FF3B3B]' : 'bg-[#D4AF37]'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
