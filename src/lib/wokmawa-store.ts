import { useState, useEffect } from 'react';
import { MenuItem, SpiceLevel, ExtraOption, SPICE_LEVELS } from './wokmawa-menu';

export interface CartItem {
  id: string; // unique cart line item id
  menuItemId: string;
  name: string;
  categoryName: string;
  image: string;
  isVeg: boolean;
  portionName: string;
  portionPrice: number;
  spiceLevel: SpiceLevel;
  extras: ExtraOption[];
  quantity: number;
  instructions?: string;
  unitPrice: number; // base + extras
  totalPrice: number; // unitPrice * quantity
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  isGuest: boolean;
}

export interface LiveOrder {
  orderId: string;
  tableNumber: string;
  items: CartItem[];
  itemTotal: number;
  taxGst: number;
  packagingCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: 'upi' | 'card' | 'counter';
  status: 'received' | 'cooking' | 'plated' | 'ready' | 'served';
  createdAt: string;
  prepTimeMinutes: number;
  customer?: CustomerDetails;
}

export interface CustomizationDraft {
  menuItem: MenuItem | null;
  selectedPortion: { name: string; price: number; serves?: string };
  selectedSpice: SpiceLevel;
  selectedExtras: ExtraOption[];
  quantity: number;
  instructions: string;
}

interface WokMawaState {
  tableNumber: string;
  cart: CartItem[];
  draft: CustomizationDraft | null;
  customer: CustomerDetails;
  activeOrder: LiveOrder | null;
  orderHistory: LiveOrder[];
  searchQuery: string;
  appliedCoupon: string | null;
  discountAmount: number;
  isDrawerOpen: boolean;
}

const STORAGE_KEY = 'wokmawa_state_v1';

const defaultState: WokMawaState = {
  tableNumber: '04',
  cart: [],
  draft: null,
  customer: {
    name: '',
    phone: '',
    email: '',
    isGuest: false,
  },
  activeOrder: null,
  orderHistory: [],
  searchQuery: '',
  appliedCoupon: null,
  discountAmount: 0,
  isDrawerOpen: false,
};

let isLoadedFromStorage = false;
let globalState: WokMawaState = defaultState;
const listeners = new Set<() => void>();

function initClientStorage() {
  if (typeof window === 'undefined' || isLoadedFromStorage) return;
  isLoadedFromStorage = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      globalState = { ...defaultState, ...JSON.parse(raw), isDrawerOpen: false };
      notify();
    }
  } catch (err) {
    console.error('Failed to parse WokMawa stored state:', err);
  }
}

function notify() {
  if (typeof window !== 'undefined' && isLoadedFromStorage) {
    try {
      const stateToPersist = { ...globalState, isDrawerOpen: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch (e) {}
  }
  listeners.forEach((l) => l());
}

export const wokStore = {
  getState() {
    return globalState;
  },

  setDrawerOpen(isOpen: boolean) {
    globalState = { ...globalState, isDrawerOpen: isOpen };
    notify();
  },

  setTableNumber(table: string) {
    globalState = { ...globalState, tableNumber: table };
    notify();
  },

  setSearchQuery(q: string) {
    globalState = { ...globalState, searchQuery: q };
    notify();
  },

  // Customization Draft Actions
  startDraft(item: MenuItem) {
    const defaultPortion = item.availableSizes?.[0] || {
      name: 'Regular Box',
      price: item.price,
      serves: 'Serves 1-2',
    };
    const defaultSpice = SPICE_LEVELS.find((s) => s.id === item.defaultSpice) || SPICE_LEVELS[1];

    globalState = {
      ...globalState,
      draft: {
        menuItem: item,
        selectedPortion: defaultPortion,
        selectedSpice: defaultSpice,
        selectedExtras: [],
        quantity: 1,
        instructions: '',
      },
    };
    notify();
  },

  updateDraftSpice(spice: SpiceLevel) {
    if (!globalState.draft) return;
    globalState = {
      ...globalState,
      draft: { ...globalState.draft, selectedSpice: spice },
    };
    notify();
  },

  updateDraftPortion(portion: { name: string; price: number; serves?: string }) {
    if (!globalState.draft) return;
    globalState = {
      ...globalState,
      draft: { ...globalState.draft, selectedPortion: portion },
    };
    notify();
  },

  toggleDraftExtra(extra: ExtraOption) {
    if (!globalState.draft) return;
    const exists = globalState.draft.selectedExtras.some((e) => e.id === extra.id);
    const updatedExtras = exists
      ? globalState.draft.selectedExtras.filter((e) => e.id !== extra.id)
      : [...globalState.draft.selectedExtras, extra];

    globalState = {
      ...globalState,
      draft: { ...globalState.draft, selectedExtras: updatedExtras },
    };
    notify();
  },

  updateDraftQuantity(qty: number) {
    if (!globalState.draft || qty < 1) return;
    globalState = {
      ...globalState,
      draft: { ...globalState.draft, quantity: qty },
    };
    notify();
  },

  updateDraftInstructions(inst: string) {
    if (!globalState.draft) return;
    globalState = {
      ...globalState,
      draft: { ...globalState.draft, instructions: inst },
    };
    notify();
  },

  // Add draft to Cart
  commitDraftToCart(): CartItem | null {
    if (!globalState.draft || !globalState.draft.menuItem) return null;
    const { menuItem, selectedPortion, selectedSpice, selectedExtras, quantity, instructions } =
      globalState.draft;

    const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
    const unitPrice = selectedPortion.price + extrasTotal;
    const totalPrice = unitPrice * quantity;

    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: menuItem.id,
      name: menuItem.name,
      categoryName: menuItem.categoryName,
      image: menuItem.image,
      isVeg: menuItem.isVeg,
      portionName: selectedPortion.name,
      portionPrice: selectedPortion.price,
      spiceLevel: selectedSpice,
      extras: selectedExtras,
      quantity,
      instructions,
      unitPrice,
      totalPrice,
    };

    globalState = {
      ...globalState,
      cart: [...globalState.cart, newItem],
    };
    notify();
    return newItem;
  },

  // Quick add upsell side item to Cart directly
  addUpsellToCart(upsell: { id: string; name: string; category: string; price: number; image: string; isVeg: boolean }) {
    const newItem: CartItem = {
      id: `upsell-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: upsell.id,
      name: upsell.name,
      categoryName: upsell.category,
      image: upsell.image,
      isVeg: upsell.isVeg,
      portionName: 'Standard',
      portionPrice: upsell.price,
      spiceLevel: SPICE_LEVELS[0],
      extras: [],
      quantity: 1,
      unitPrice: upsell.price,
      totalPrice: upsell.price,
    };

    globalState = {
      ...globalState,
      cart: [...globalState.cart, newItem],
    };
    notify();
  },

  getItemQuantity(menuItemId: string): number {
    return globalState.cart
      .filter((item) => item.menuItemId === menuItemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  },

  incrementItem(menuItem: MenuItem) {
    const existingIndex = globalState.cart.findIndex(
      (item) => item.menuItemId === menuItem.id
    );

    if (existingIndex >= 0) {
      const existing = globalState.cart[existingIndex];
      wokStore.updateCartQuantity(existing.id, 1);
    } else {
      const defaultPortion = menuItem.availableSizes?.[0] || {
        name: 'Regular Box',
        price: menuItem.price,
        serves: 'Serves 1-2',
      };
      const defaultSpice = SPICE_LEVELS.find((s) => s.id === menuItem.defaultSpice) || SPICE_LEVELS[1];
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        categoryName: menuItem.categoryName,
        image: menuItem.image,
        isVeg: menuItem.isVeg,
        portionName: defaultPortion.name,
        portionPrice: defaultPortion.price,
        spiceLevel: defaultSpice,
        extras: [],
        quantity: 1,
        instructions: '',
        unitPrice: defaultPortion.price,
        totalPrice: defaultPortion.price,
      };

      globalState = {
        ...globalState,
        cart: [...globalState.cart, newItem],
      };
      notify();
    }
  },

  decrementItem(menuItemId: string) {
    const existingIndex = globalState.cart.findIndex(
      (item) => item.menuItemId === menuItemId
    );
    if (existingIndex >= 0) {
      const existing = globalState.cart[existingIndex];
      wokStore.updateCartQuantity(existing.id, -1);
    }
  },

  updateCartQuantity(cartItemId: string, delta: number) {
    const updated = globalState.cart
      .map((item) => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty,
          };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    globalState = { ...globalState, cart: updated };
    notify();
  },

  removeCartItem(cartItemId: string) {
    globalState = {
      ...globalState,
      cart: globalState.cart.filter((item) => item.id !== cartItemId),
    };
    notify();
  },

  clearCart() {
    globalState = { ...globalState, cart: [], appliedCoupon: null, discountAmount: 0 };
    notify();
  },

  applyCoupon(code: string) {
    const clean = code.trim().toUpperCase();
    if (clean === 'MAWA10' || clean === 'WOKFLAME') {
      const subtotal = globalState.cart.reduce((s, i) => s + i.totalPrice, 0);
      const discount = Math.round(subtotal * 0.1);
      globalState = {
        ...globalState,
        appliedCoupon: clean,
        discountAmount: discount,
      };
      notify();
      return { success: true, discount, message: '10% Flame Discount Applied!' };
    }
    return { success: false, discount: 0, message: 'Invalid coupon code. Try MAWA10' };
  },

  removeCoupon() {
    globalState = { ...globalState, appliedCoupon: null, discountAmount: 0 };
    notify();
  },

  setCustomer(customer: Partial<CustomerDetails>) {
    globalState = {
      ...globalState,
      customer: { ...globalState.customer, ...customer },
    };
    notify();
  },

  createOrder(paymentMethod: 'upi' | 'card' | 'counter'): LiveOrder {
    const itemTotal = globalState.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxGst = Math.round(itemTotal * 0.05); // 5% GST
    const packagingCharge = itemTotal > 0 ? 25 : 0;
    const discount = globalState.discountAmount;
    const grandTotal = Math.max(0, itemTotal + taxGst + packagingCharge - discount);

    const order: LiveOrder = {
      orderId: `WM-${Math.floor(1000 + Math.random() * 9000)}`,
      tableNumber: globalState.tableNumber,
      items: [...globalState.cart],
      itemTotal,
      taxGst,
      packagingCharge,
      discount,
      grandTotal,
      paymentMethod,
      status: 'received',
      createdAt: new Date().toISOString(),
      prepTimeMinutes: 14,
      customer: { ...globalState.customer },
    };

    globalState = {
      ...globalState,
      activeOrder: order,
      orderHistory: [order, ...globalState.orderHistory.filter(o => o.orderId !== order.orderId)],
      cart: [],
      appliedCoupon: null,
      discountAmount: 0,
    };
    notify();
    return order;
  },

  setActiveOrder(order: LiveOrder) {
    const prevHistory = Array.isArray(globalState.orderHistory) ? globalState.orderHistory : [];
    globalState = {
      ...globalState,
      activeOrder: order,
      orderHistory: [order, ...prevHistory.filter(o => o.orderId !== order.orderId)],
    };
    notify();
  },

  updateOrderStatus(status: LiveOrder['status']) {
    if (!globalState.activeOrder) return;
    globalState = {
      ...globalState,
      activeOrder: { ...globalState.activeOrder, status },
    };
    notify();
  },
};

export function useWokStore() {
  const [state, setState] = useState<WokMawaState>(wokStore.getState());

  useEffect(() => {
    initClientStorage();
    setState(wokStore.getState());
    const listener = () => setState(wokStore.getState());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const itemTotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxGst = Math.round(itemTotal * 0.05);
  const packagingCharge = itemTotal > 0 ? 25 : 0;
  const grandTotal = Math.max(0, itemTotal + taxGst + packagingCharge - state.discountAmount);
  const totalItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    ...state,
    totals: {
      itemTotal,
      taxGst,
      packagingCharge,
      discount: state.discountAmount,
      grandTotal,
      totalItemCount,
    },
    actions: wokStore,
  };
}
