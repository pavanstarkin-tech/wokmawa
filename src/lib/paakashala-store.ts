import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { ref, onValue, set, push } from "firebase/database";
import { db } from "./firebase";
import type { MenuItem } from "./paakashala-menu";

export const KEYS = {
  mobile: "paakashala_mobile",
  cart: "paakashala_cart",
  orders: "paakashala_orders",
  lastCategory: "paakashala_last_category",
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

/* ---------- Firebase Menu Sync ---------- */
export function useMenu() {
  const getSnap = () => {
    if (typeof window === "undefined") return "[]";
    return window.localStorage.getItem("paakashala_menu_cache") ?? "[]";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "[]");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  
  useEffect(() => {
    try {
      setMenu(JSON.parse(raw));
    } catch {
      setMenu([]);
    }
  }, [raw]);

  useEffect(() => {
    const menuRef = ref(db, 'restaurant/menu');
    const unsub = onValue(menuRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      
      const parsedMenu: MenuItem[] = [];
      for (const type of ['veg', 'nonVeg']) {
        if (data[type]) {
          for (const category of Object.keys(data[type])) {
            const productsStr = data[type][category]?.productsJson;
            if (productsStr) {
              try {
                const products = JSON.parse(productsStr);
                parsedMenu.push(...products);
              } catch (e) {
                console.error("Failed to parse category", category, e);
              }
            }
          }
        }
      }
      writeJSON("paakashala_menu_cache", parsedMenu);
    });
    
    return () => unsub();
  }, []);

  return menu;
}

/* ---------- Updates (Videos) Sync ---------- */
export type UpdateEntry = {
  id: string;
  videoUrl: string;
  createdAt: number;
};

export function useUpdates() {
  const getSnap = () => {
    if (typeof window === "undefined") return "[]";
    return window.localStorage.getItem("paakashala_updates_cache") ?? "[]";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "[]");
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  
  useEffect(() => {
    try { setUpdates(JSON.parse(raw)); } 
    catch { setUpdates([]); }
  }, [raw]);

  useEffect(() => {
    const updatesRef = ref(db, 'restaurant/updates');
    const unsub = onValue(updatesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        writeJSON("paakashala_updates_cache", []);
        return;
      }
      
      const parsedUpdates: UpdateEntry[] = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      // Sort newest first
      parsedUpdates.sort((a, b) => b.createdAt - a.createdAt);
      writeJSON("paakashala_updates_cache", parsedUpdates);
    });
    
    return () => unsub();
  }, []);

  return updates;
}

export type RestaurantSettings = {
  upiId?: string;
  qrImage?: string;
};

export function useSettings() {
  const getSnap = () => {
    if (typeof window === "undefined") return "{}";
    return window.localStorage.getItem("paakashala_settings") ?? "{}";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "{}");
  const [settings, setSettings] = useState<RestaurantSettings>({});

  useEffect(() => {
    try {
      setSettings(JSON.parse(raw));
    } catch {
      setSettings({});
    }
  }, [raw]);

  useEffect(() => {
    const settingsRef = ref(db, "restaurant/settings");
    const unsub = onValue(settingsRef, (snap) => {
      const data = snap.val() || {};
      writeJSON("paakashala_settings", data);
    });
    return () => unsub();
  }, []);

  return settings;
}

/* ---------- Table Guard ---------- */
export function useTable() {
  const get = () => (typeof window === "undefined" ? "" : window.localStorage.getItem("paakashala_table") ?? "");
  const value = useSyncExternalStore(subscribe, get, () => "");
  const set = useCallback((t: string) => writeString("paakashala_table", t), []);
  const clear = useCallback(() => {
    window.localStorage.removeItem("paakashala_table");
    emit();
  }, []);
  return { table: value, setTable: set, clearTable: clear };
}

/* ---------- Customer Session ---------- */
export type CustomerSession = { phone: string; name: string; uid: string };
export function useCustomer() {
  const getSnap = () => {
    if (typeof window === "undefined") return "null";
    return window.localStorage.getItem("paakashala_customer") ?? "null";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "null");
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  
  useEffect(() => {
    try { setCustomer(JSON.parse(raw)); } 
    catch { setCustomer(null); }
  }, [raw]);

  const set = useCallback((c: CustomerSession) => writeJSON("paakashala_customer", c), []);
  const clear = useCallback(() => {
    window.localStorage.removeItem("paakashala_customer");
    emit();
  }, []);
  
  return { customer, setCustomer: set, clearCustomer: clear };
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

/* ---------- Firebase Orders Sync ---------- */
export function useOrders() {
  const getSnap = () => {
    if (typeof window === "undefined") return "[]";
    return window.localStorage.getItem(KEYS.orders) ?? "[]";
  };
  const raw = useSyncExternalStore(subscribe, getSnap, () => "[]");
  const [localOrderIds, setLocalOrderIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(raw);
      // Ensure backwards compatibility with old local storage objects
      if (parsed.length > 0 && typeof parsed[0] === 'object') {
        setLocalOrderIds(parsed.map((o: any) => o.id));
      } else {
        setLocalOrderIds(parsed);
      }
    } catch {
      setLocalOrderIds([]);
    }
  }, [raw]);

  useEffect(() => {
    if (localOrderIds.length === 0) {
      setOrders([]);
      return;
    }

    const unsubscribes = localOrderIds.map(id => {
      const orderRef = ref(db, `restaurant/orders/${id}`);
      return onValue(orderRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setOrders(prev => {
            const next = prev.filter(o => o.id !== id);
            return [data, ...next].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      });
    });

    return () => unsubscribes.forEach(u => u());
  }, [localOrderIds]);

  const push = async (o: Order) => {
    try {
      await set(ref(db, `restaurant/orders/${o.id}`), o);
      const current = readJSON<any[]>(KEYS.orders, []);
      // Save just the ID
      writeJSON(KEYS.orders, [o.id, ...current.map(c => typeof c === 'string' ? c : c.id)]);
    } catch (e) {
      console.error("Failed to push order to Firebase", e);
    }
  };
  
  return { orders, push };
}

/* ---------- Client mount guard ---------- */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
