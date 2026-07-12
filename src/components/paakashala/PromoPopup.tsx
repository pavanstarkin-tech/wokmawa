import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { PopupCampaign } from "@/lib/promotions";

interface PromoPopupProps {
  campaign: PopupCampaign;
  onClose: () => void;
  onCtaClick?: () => void;
}

export function PromoPopup({ campaign, onClose, onCtaClick }: PromoPopupProps) {
  const navigate = useNavigate();
  const [dontShowToday, setDontShowToday] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entry animation
    setMounted(true);
  }, []);

  const handleDismiss = () => {
    if (dontShowToday) {
      const todayStr = new Date().toDateString();
      localStorage.setItem(`paakashala_hide_popup_${campaign.id}`, todayStr);
    }
    onClose();
  };

  const handleCta = () => {
    // Record click analytics
    if (onCtaClick) onCtaClick();

    // Perform navigation based on ctaType
    if (campaign.ctaType === "category" && campaign.ctaLink) {
      navigate({ to: "/menu", search: { category: campaign.ctaLink } });
    } else if (campaign.ctaType === "product" && campaign.ctaLink) {
      navigate({ to: "/menu", search: { q: campaign.ctaLink } });
    } else if (campaign.ctaType === "coupon") {
      if (campaign.ctaLink) {
        localStorage.setItem("paakashala_applied_coupon", campaign.ctaLink.trim().toUpperCase());
      }
      navigate({ to: "/menu", search: { q: "offers" } });
    } else if (campaign.ctaType === "offer_collection") {
      navigate({ to: "/menu", search: { q: "offers" } });
    } else if (campaign.ctaType === "external" && campaign.ctaLink) {
      window.open(campaign.ctaLink, "_blank", "noopener,noreferrer");
    } else {
      navigate({ to: "/menu" });
    }
    
    // Save dismiss if checked before navigating
    if (dontShowToday) {
      const todayStr = new Date().toDateString();
      localStorage.setItem(`paakashala_hide_popup_${campaign.id}`, todayStr);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className={`relative w-full max-w-[340px] aspect-[9/16] bg-card rounded-3xl overflow-hidden shadow-2xl border border-gold/20 flex flex-col justify-between transition-all duration-300 transform ${
          mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-90 opacity-0"
        }`}
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={campaign.image} 
            alt={campaign.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
        </div>

        {/* Top bar with Close button */}
        <div className="relative z-10 p-4 flex justify-end">
          <button 
            onClick={handleDismiss}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 border border-white/10 backdrop-blur-sm active:scale-90 transition-transform"
            aria-label="Close promotion"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom Details Content */}
        <div className="relative z-10 p-5 mt-auto flex flex-col gap-3">
          {/* Header info */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gold-gradient bg-gold/15 border border-gold/30 px-2 py-0.5 rounded w-fit block">
              Special Campaign
            </span>
            <h2 className="text-xl font-extrabold text-cream leading-tight drop-shadow-md">
              {campaign.title}
            </h2>
            <p className="text-xs text-cream/80 leading-relaxed font-medium line-clamp-3">
              {campaign.description}
            </p>
          </div>

          {/* CTA Trigger */}
          {campaign.ctaText && (
            <button
              onClick={handleCta}
              className="w-full py-3 rounded-xl bg-gold-gradient text-brown-deep font-extrabold text-xs uppercase tracking-widest shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              {campaign.ctaText}
            </button>
          )}

          {/* Don't show again today check */}
          <label className="flex items-center gap-2 cursor-pointer text-[10px] text-cream/70 hover:text-cream/90 transition-colors py-1 select-none">
            <input 
              type="checkbox" 
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="rounded border-white/20 bg-black/20 text-gold focus:ring-gold"
            />
            Don't show this campaign again today
          </label>
        </div>
      </div>
    </div>
  );
}
