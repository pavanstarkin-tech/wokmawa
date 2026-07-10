import { useEffect, useState } from "react";
import { Logo } from "./Logo";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1800);
    const t2 = setTimeout(onDone, 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-luxe-gradient transition-opacity duration-500"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 40%, rgba(200,155,60,0.25) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center animate-fade-up">
        <div className="mb-6 text-[10px] tracking-[0.4em] text-gold uppercase">Est. Heritage Kitchen</div>
        <Logo size={140} glow />
        <div className="mt-6 h-px w-24 bg-gold-gradient opacity-70" />
        <h1 className="mt-6 text-3xl font-semibold text-brown-deep">
          <span className="text-gold-gradient">Parkashala</span>
        </h1>
        <p className="mt-3 max-w-[280px] text-center text-sm text-primary/80">
          A premium dining experience rooted in flavor.
        </p>
      </div>
    </div>
  );
}
