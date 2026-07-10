import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  to,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  to?: "/" | "/menu" | "/cart" | "/orders";
}) {
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-card p-8 text-center border border-border/60 shadow-luxe">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-gradient shadow-luxe text-brown-deep">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-brown-deep">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actionLabel && to && (
        <Link
          to={to}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-brown-gradient px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cream shadow-luxe active:scale-95 transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
