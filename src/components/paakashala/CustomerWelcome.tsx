import { useState } from "react";
import { ArrowRight, Utensils } from "lucide-react";
import { LOGO_URL } from "@/lib/paakashala-menu";
import { useCustomer } from "@/lib/paakashala-store";

export function CustomerWelcome({ tableId }: { tableId: string }) {
  const { setCustomer } = useCustomer();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 10) return;
    setCustomer({
      phone: phone.trim(),
      name: name.trim() || "Guest",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-deep/95 p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-muted/50 border border-border">
          <img src={LOGO_URL} alt="Paakashala" className="h-20 w-20 object-contain mix-blend-multiply" />
        </div>

        <h1 className="mb-2 text-2xl font-black text-brown-deep">Welcome to<br/>Paakashala!</h1>
        <p className="mb-8 text-sm font-semibold text-muted-foreground">
          You are seated at Table <span className="text-gold font-bold">{tableId}</span>. Please enter your details to view the menu and place your order.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-widest text-brown-deep/80 ml-1">
              Mobile Number *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brown-deep/60">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-border bg-transparent pl-12 pr-4 py-3.5 text-sm font-bold text-brown-deep outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-widest text-brown-deep/80 ml-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3.5 text-sm font-bold text-brown-deep outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={phone.length < 10}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brown-gradient px-4 py-4 text-sm font-bold text-cream shadow-luxe transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Start Ordering
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

      </div>
    </div>
  );
}
