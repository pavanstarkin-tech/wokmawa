import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const SLIDES = [
  {
    tag: "House Signature",
    title: "Hyderabadi Dum Biryani",
    subtitle: "Slow-cooked in sealed handi, sealed in tradition.",
    image:
      "https://images.unsplash.com/photo-1633945274309-2c16c96eb2c8?auto=format&fit=crop&w=1200&q=75",
  },
  {
    tag: "Andhra Legacy",
    title: "Tandoor & Pepper Classics",
    subtitle: "Miryala kodi, kalmi kebab & Andhra fire.",
    image:
      "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1200&q=75",
  },
  {
    tag: "Curated Table",
    title: "Thali, Curries & Soups",
    subtitle: "A composed spread from our heritage kitchen.",
    image:
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=75",
  },
];

export function HeroCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const slide = SLIDES[i];

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-3xl border border-gold/40 shadow-luxe">
      {SLIDES.map((s, idx) => (
        <div
          key={s.title}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: idx === i ? 1 : 0 }}
        >
          <img
            src={s.image}
            alt={s.title}
            className="h-full w-full object-cover animate-slow-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-gold-soft">{slide.tag}</div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-cream drop-shadow-lg">
          {slide.title}
        </h2>
        <p className="mt-1 max-w-[260px] text-sm text-cream/85">{slide.subtitle}</p>
        <Link
          to="/menu"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brown-deep shadow-luxe transition active:scale-95"
        >
          Explore Menu <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-1.5">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Slide ${idx + 1}`}
            onClick={() => setI(idx)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: idx === i ? 22 : 8,
              background: idx === i ? "linear-gradient(90deg,#B8862A,#E4C579)" : "rgba(255,249,242,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
