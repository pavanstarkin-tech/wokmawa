import { Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/paakashala-store";
import type { MenuItem } from "@/lib/paakashala-menu";

export function MiniCategoryCard({ item }: { item: MenuItem }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((c) => c.id === item.id);

  return (
    <div className="w-full aspect-[3/4.3] shrink-0 overflow-hidden rounded-xl bg-card border border-border/60 shadow-sm relative flex flex-col">
      <div className="flex-1 w-full overflow-hidden relative shrink-0">
        <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute top-1.5 left-1.5 bg-cream/90 rounded-sm p-0.5 shadow-sm">
          <div className={`h-2 w-2 rounded-full ${item.type === "veg" ? "bg-green-500" : "bg-red-500"}`} />
        </div>
      </div>
      <div className="h-[54px] shrink-0 w-full px-2 py-1.5 flex flex-col justify-between">
        <h4 className="line-clamp-2 text-[10px] font-bold text-brown-deep leading-[1.1]">{item.name}</h4>
        <div className="flex items-center justify-between">
          <div className={`text-[11px] font-bold ${item.price == null ? "text-muted-foreground" : "text-brown-deep"}`}>
            {item.price == null ? "—" : `₹${item.price}`}
          </div>
          {item.price != null && (
            inCart ? (
              <div className="flex items-center gap-1 rounded-full border border-gold/50 bg-cream px-0.5 py-0.5 shadow-sm">
                <button onClick={() => setQty(item.id, inCart.quantity - 1)} className="grid h-4 w-4 place-items-center rounded-full text-brown-deep active:scale-90 transition">
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="text-[10px] font-bold text-brown-deep leading-none min-w-[12px] text-center">{inCart.quantity}</span>
                <button onClick={() => setQty(item.id, inCart.quantity + 1)} className="grid h-4 w-4 place-items-center rounded-full bg-gold-gradient text-brown-deep active:scale-90 transition">
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => add(item)}
                className="grid h-5 w-5 place-items-center rounded-full bg-gold-gradient text-brown-deep shadow-sm active:scale-90 transition"
                aria-label={`Add`}
              >
                <Plus className="h-3 w-3" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
