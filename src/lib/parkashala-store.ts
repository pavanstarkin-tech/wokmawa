import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type { MenuItem } from "./parkashala-menu";

export const KEYS = {
  mobile: "parkashala_mobile",
  cart: "parkashala_cart",
  orders: "parkashala_orders",
  lastCategory: "parkashala_last_category",
} as const;

export type CartItem = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  quantity: number;
  image: string;
  type: "veg" | "non-veg";
};

export type Order = {
  id: string;
  mobile: string;
  createdAt: string;
  items: CartItem[];
  total: number;
  status: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = () => l();
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emit();
}
function writeString(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
  emit();
}

/* ---------- Mobile ---------- */
export function useMobile() {
  const get = () => (typeof window === "undefined" ? "" : window.localStorage.getItem(KEYS.mobile) ?? "");
  const value = useSyncExternalStore(subscribe, get, () => "");
  const set = useCallback((m: string) => writeString(KEYS.mobile, m), []);
  const clear = useCallback(() => {
    window.localStorage.removeItem(KEYS.mobile);
    emit();
  }, []);
  return { mobile: value, setMobile: set, clearMobile: clear };
}

/* ---------- Cart ---------- */
export function useCart() {
  const getSnap = () => {
    if (typeof window === "undefined") return "[]";
    return window.localStorage.getItem(KEYS.cart) ?? "[]";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "[]");
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(raw));
    } catch {
      setItems([]);
    }
  }, [raw]);

  const write = (next: CartItem[]) => writeJSON(KEYS.cart, next);

  const add = (item: MenuItem) => {
    const current = readJSON<CartItem[]>(KEYS.cart, []);
    const existing = current.find((c) => c.id === item.id);
    let next: CartItem[];
    if (existing) {
      next = current.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      next = [
        ...current,
        {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: 1,
          image: item.image,
          type: item.type,
        },
      ];
    }
    write(next);
  };
  const setQty = (id: string, q: number) => {
    const current = readJSON<CartItem[]>(KEYS.cart, []);
    let next = current.map((c) => (c.id === id ? { ...c, quantity: q } : c));
    next = next.filter((c) => c.quantity > 0);
    write(next);
  };
  const remove = (id: string) => {
    const current = readJSON<CartItem[]>(KEYS.cart, []);
    write(current.filter((c) => c.id !== id));
  };
  const clear = () => write([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);

  return { items, add, setQty, remove, clear, count, total };
}

/* ---------- Orders ---------- */
export function useOrders() {
  const getSnap = () => {
    if (typeof window === "undefined") return "[]";
    return window.localStorage.getItem(KEYS.orders) ?? "[]";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "[]");
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    try {
      setOrders(JSON.parse(raw));
    } catch {
      setOrders([]);
    }
  }, [raw]);
  const push = (o: Order) => {
    const current = readJSON<Order[]>(KEYS.orders, []);
    writeJSON(KEYS.orders, [o, ...current]);
  };
  return { orders, push };
}

/* ---------- Client mount guard ---------- */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
