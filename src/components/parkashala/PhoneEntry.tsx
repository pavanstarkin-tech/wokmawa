import { useState } from "react";
import { Logo } from "./Logo";
import { useMobile } from "@/lib/parkashala-store";

export function PhoneEntry({ onDone }: { onDone: () => void }) {
  const { setMobile } = useMobile();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = value.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    setMobile(digits);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-luxe-gradient px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 20%, rgba(200,155,60,0.2) 0%, transparent 55%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center">
          <Logo size={90} glow />
          <div className="mt-4 text-[10px] tracking-[0.35em] text-gold uppercase">Welcome to</div>
          <h1 className="mt-1 text-3xl font-semibold text-brown-deep">
            <span className="text-gold-gradient">Parkashala</span>
          </h1>
          <p className="mt-2 text-center text-sm text-primary/75">
            A premium dining experience awaits. Enter your mobile to continue.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 rounded-2xl bg-card p-5 shadow-luxe">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Mobile Number
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-cream px-3 py-3 focus-within:border-gold focus-within:shadow-gold-glow transition">
            <span className="text-sm font-semibold text-brown-deep">+91</span>
            <div className="h-6 w-px bg-border" />
            <input
              inputMode="numeric"
              autoFocus
              maxLength={10}
              placeholder="98765 43210"
              value={value}
              onChange={(e) => {
                setError(null);
                setValue(e.target.value.replace(/\D/g, "").slice(0, 10));
              }}
              className="flex-1 bg-transparent text-base tracking-wide text-brown-deep outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          {error && <div className="mt-2 text-xs text-destructive">{error}</div>}

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-brown-gradient py-3 text-sm font-semibold uppercase tracking-widest text-cream transition-transform active:scale-[0.98] shadow-luxe"
          >
            Continue to Parkashala
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            We use your number only for order confirmations.
          </p>
        </form>
      </div>
    </div>
  );
}
