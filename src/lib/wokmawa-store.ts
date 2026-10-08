import { useState, useEffect } from 'react';
import { MenuItem, SpiceLevel, ExtraOption, SPICE_LEVELS } from './wokmawa-menu';

export interface CartItem {
  id: string; // unique cart line item id
  menuItemId: string;
  name: string;
  categoryName: string;
  image: string;
  isVeg: boolean;
  portionName?: string;
  portionPrice?: number;
  spiceLevel?: SpiceLevel;
  extras?: ExtraOption[];
  quantity: number;
  instructions?: string;
  unitPrice: number; // base + extras
  totalPrice: number; // unitPrice * quantity
  status?: 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled';
  isCompleted?: boolean;
  isCancelled?: boolean;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  isGuest: boolean;
}

export interface LiveOrder {
  orderId: string;
  restocareId?: number | string;
  tableNumber: string;
  items: CartItem[];
  itemTotal: number;
  taxGst: number;
  packagingCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: 'upi' | 'card' | 'counter';
  status: 'received' | 'cooking' | 'plated' | 'ready' | 'served' | 'cancelled';
  cancelReason?: string;
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
  tableNumber: '',
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

export function getClientSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('wokmawa_client_session_id');
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('wokmawa_client_session_id', id);
  }
  return id;
}

async function syncOrderToRestocare(order: LiveOrder) {
  try {
    const payload = {
      orderId: order.orderId,
      orderType: 'dine-in',
      tableNumber: order.tableNumber,
      tableId: order.tableNumber,
      sessionId: getClientSessionId(),
      customerName: order.customer?.name || 'Guest Diner',
      customerPhone: order.customer?.phone || '',
      paymentMethod: order.paymentMethod,
      status: 'preparing',
      couponCode: globalState.appliedCoupon || undefined,
      discountAmount: order.discount || 0,
      items: order.items.map((i) => {
        const details = [
          i.portionName ? `Portion: ${i.portionName}` : null,
          i.spiceLevel?.name ? `Spice: ${i.spiceLevel.name}` : null,
          i.extras && i.extras.length > 0 ? `Addons: ${i.extras.map((e) => e.name).join(', ')}` : null,
          i.instructions ? `Note: ${i.instructions}` : null,
        ].filter(Boolean).join(' | ');

        const numId = Number(i.menuItemId);
        const hasValidNumId = !isNaN(numId) && numId > 0;

        return {
          menuItemId: hasValidNumId ? numId : undefined,
          name: i.name,
          price: i.portionPrice || i.unitPrice,
          quantity: i.quantity,
          isOpenItem: !hasValidNumId,
          notes: details || i.instructions || '',
          portion: i.portionName,
          spiceLevel: i.spiceLevel?.name,
          extras: i.extras?.map((e) => e.name).join(', ') || '',
          instructions: i.instructions || '',
        };
      }),
      subtotal: order.itemTotal,
      tax: order.taxGst,
      totalAmount: order.grandTotal,
    };

    const endpoint = typeof window !== 'undefined' && window.location.port === '8081'
      ? '/api/orders'
      : 'http://localhost:5001/api/orders';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json();
      if (data.success && data.order && data.order.id) {
        order.restocareId = data.order.id;
        if (globalState.activeOrder?.orderId === order.orderId) {
          globalState.activeOrder.restocareId = data.order.id;
        }
        globalState.orderHistory = globalState.orderHistory.map((o) =>
          o.orderId === order.orderId ? { ...o, restocareId: data.order.id } : o
        );
        notify();
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }
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

  async applyCoupon(code: string): Promise<{ success: boolean; discount: number; message: string }> {
    const clean = code.trim().toUpperCase();
    const subtotal = globalState.cart.reduce((s, i) => s + i.totalPrice, 0);

    if (!clean) {
      return { success: false, discount: 0, message: 'Please enter a coupon code.' };
    }

    try {
      const endpoint = typeof window !== 'undefined' && window.location.port === '8081'
        ? '/api/coupons/validate'
        : 'http://localhost:5001/api/coupons/validate';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: clean,
          orderAmount: subtotal,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data.success && data.valid) {
          const discount = Math.round(Number(data.discount) || 0);
          globalState = {
            ...globalState,
            appliedCoupon: clean,
            discountAmount: discount,
          };
          notify();
          return { success: true, discount, message: data.message || `Coupon ${clean} applied! You saved ₹${discount}` };
        } else if (data.message) {
          return { success: false, discount: 0, message: data.message };
        }
      }
    } catch (e) {
      // Fallback to local codes
    }

    // Local standard fallback codes
    if (clean === 'MAWA10' || clean === 'WOKFLAME' || clean === 'FLAME10' || clean === 'WELCOME10') {
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
      orderHistory: [order, ...globalState.orderHistory.filter((o) => o.orderId !== order.orderId)],
      cart: [],
      appliedCoupon: null,
      discountAmount: 0,
    };
    notify();
    syncOrderToRestocare(order);
    return order;
  },

  setActiveOrder(order: LiveOrder) {
    const prevHistory = Array.isArray(globalState.orderHistory) ? globalState.orderHistory : [];
    globalState = {
      ...globalState,
      activeOrder: order,
      orderHistory: [order, ...prevHistory.filter((o) => o.orderId !== order.orderId)],
    };
    notify();
    syncOrderToRestocare(order);
  },

  updateOrderStatus(status: LiveOrder['status']) {
    if (!globalState.activeOrder) return;
    globalState = {
      ...globalState,
      activeOrder: { ...globalState.activeOrder, status },
    };
    notify();
  },

  selectOrder(orderId: string) {
    const found = (globalState.orderHistory || []).find((o) => o.orderId === orderId);
    if (found) {
      globalState = {
        ...globalState,
        activeOrder: found,
      };
      notify();
    }
  },

  async syncAllOrdersStatus() {
    if (typeof window === 'undefined') return;
    const history = globalState.orderHistory || [];
    let hasChanges = false;
    const updatedHistory = [...history];

    for (let i = 0; i < updatedHistory.length; i++) {
      const ord = updatedHistory[i];
      const targetId = ord.restocareId;
      if (!targetId) continue;

      try {
        const endpoint = window.location.port === '8081'
          ? `/api/orders/${targetId}/status`
          : `http://localhost:5001/api/orders/${targetId}/status`;

        const res = await fetch(endpoint).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.success && data.status) {
            const rawStatus = String(data.status).toLowerCase();
            const mappedStatus: LiveOrder['status'] =
              rawStatus === 'cancelled' || rawStatus === 'rejected'
                ? 'cancelled'
                : rawStatus === 'ready'
                ? 'ready'
                : rawStatus === 'completed' || rawStatus === 'served'
                ? 'served'
                : rawStatus === 'preparing' || rawStatus === 'cooking'
                ? 'cooking'
                : 'received';

            let updatedItems = [...ord.items];
            const rawItems = Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.order?.items)
              ? data.order.items
              : null;

            if (rawItems && rawItems.length > 0) {
              updatedItems = ord.items.map((item, idx) => {
                const match = rawItems.find((r: any) => r.name === item.name || String(r.menuItemId) === String(item.menuItemId)) || rawItems[idx];
                if (!match) return item;

                const isCancelled = Boolean(match.cancelled || match.status === 'cancelled');
                const isCompleted = Boolean(
                  match.prepared || match.isCompleted || match.status === 'ready' || match.status === 'served' || match.status === 'completed' || mappedStatus === 'ready' || mappedStatus === 'served'
                );
                const itemStatus: CartItem['status'] = isCancelled
                  ? 'cancelled'
                  : isCompleted
                  ? 'ready'
                  : (match.status === 'cooking' || match.status === 'preparing' || mappedStatus === 'cooking')
                  ? 'cooking'
                  : 'pending';

                return {
                  ...item,
                  status: itemStatus,
                  isCompleted,
                  isCancelled,
                  quantity: match.quantity !== undefined ? Number(match.quantity) : item.quantity,
                  totalPrice: match.price !== undefined ? Number(match.price) * (match.quantity || item.quantity) : item.totalPrice,
                };
              });
            }

            const updatedGrandTotal = data.order?.grandTotal || data.order?.totalAmount || ord.grandTotal;

            if (
              ord.status !== mappedStatus ||
              ord.grandTotal !== updatedGrandTotal ||
              JSON.stringify(ord.items) !== JSON.stringify(updatedItems)
            ) {
              updatedHistory[i] = {
                ...ord,
                status: mappedStatus,
                items: updatedItems,
                grandTotal: Number(updatedGrandTotal) || ord.grandTotal,
              };
              hasChanges = true;
            }
          }
        }
      } catch (e) {}
    }

    if (hasChanges) {
      const currentActiveId = globalState.activeOrder?.orderId;
      const newActive = updatedHistory.find((o) => o.orderId === currentActiveId) || updatedHistory[0] || null;
      globalState = {
        ...globalState,
        orderHistory: updatedHistory,
        activeOrder: newActive,
      };
      notify();
    }
  },

  async checkTableActiveOrder(tableNumber: string): Promise<{ hasActiveOrder: boolean; isOccupiedByOther?: boolean; canOrder?: boolean; activeOrder: LiveOrder | null; message?: string }> {
    const cleanNum = tableNumber.trim().toUpperCase();
    if (!cleanNum) return { hasActiveOrder: false, activeOrder: null };

    try {
      const sessId = getClientSessionId();
      const endpoint = typeof window !== 'undefined' && window.location.port === '8081'
        ? `/api/tables/active/${encodeURIComponent(cleanNum)}?sessionId=${encodeURIComponent(sessId)}`
        : `http://localhost:5001/api/tables/active/${encodeURIComponent(cleanNum)}?sessionId=${encodeURIComponent(sessId)}`;

      const res = await fetch(endpoint).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();

        // If the table is currently occupied by a different customer session
        if (data.isOccupiedByOther) {
          return {
            hasActiveOrder: true,
            isOccupiedByOther: true,
            isSameUser: false,
            canOrder: false,
            activeOrder: null,
            message: data.message || `Table #${cleanNum} is currently occupied / reserved by another seated party.`,
          };
        }

        // If the table is occupied by the same user session within 60min window
        if (data.isSameUser) {
          return {
            hasActiveOrder: !!data.hasActiveOrder,
            isOccupiedByOther: false,
            isSameUser: true,
            canOrder: true,
            activeOrder: null,
          };
        }

        if (data.success && data.hasActiveOrder && data.activeOrder) {
          const rawOrd = data.activeOrder;
          const rawStatus = String(rawOrd.status).toLowerCase();
          const mappedStatus: LiveOrder['status'] =
            rawStatus === 'cancelled' || rawStatus === 'rejected'
              ? 'cancelled'
              : rawStatus === 'ready'
              ? 'ready'
              : rawStatus === 'completed' || rawStatus === 'served'
              ? 'served'
              : rawStatus === 'preparing' || rawStatus === 'cooking'
              ? 'cooking'
              : 'received';

          // If active in-progress order exists (not yet served/completed)
          if (mappedStatus !== 'served' && mappedStatus !== 'cancelled') {
            const liveOrd: LiveOrder = {
              orderId: rawOrd.orderId || `WM-${rawOrd.id}`,
              restocareId: rawOrd.id,
              tableNumber: rawOrd.tableNumber || cleanNum,
              items: Array.isArray(rawOrd.items) ? rawOrd.items.map((it: any, idx: number) => {
                const isCancelled = Boolean(it.cancelled || it.status === 'cancelled');
                const isCompleted = Boolean(
                  it.prepared || it.isCompleted || it.status === 'ready' || it.status === 'served' || it.status === 'completed' || mappedStatus === 'ready' || mappedStatus === 'served'
                );
                const itemStatus: CartItem['status'] = isCancelled
                  ? 'cancelled'
                  : isCompleted
                  ? 'ready'
                  : (it.status === 'cooking' || it.status === 'preparing' || mappedStatus === 'cooking')
                  ? 'cooking'
                  : 'pending';

                return {
                  id: `item-${idx}`,
                  menuItemId: String(it.menuItemId || it.id || idx),
                  name: it.name || 'Dish',
                  categoryName: it.categoryName || 'Main Dishes',
                  image: it.imageUrl ? (it.imageUrl.startsWith('http') ? it.imageUrl : `/uploads/${it.imageUrl}`) : '/assets/categories/vej.png',
                  isVeg: Boolean(it.isVeg),
                  portionName: it.portion || 'Standard',
                  portionPrice: Number(it.price) || 0,
                  spiceLevel: { id: 'medium', name: it.spiceLevel || 'Medium', subtitle: '', chillies: 2, color: '#F59E0B' },
                  extras: [],
                  quantity: it.quantity || 1,
                  instructions: it.notes || it.instructions || '',
                  unitPrice: Number(it.price) || 0,
                  totalPrice: (Number(it.price) || 0) * (it.quantity || 1),
                  status: itemStatus,
                  isCompleted,
                  isCancelled,
                };
              }) : [],
              itemTotal: Number(rawOrd.subtotal || rawOrd.totalAmount) || 0,
              taxGst: Math.round((Number(rawOrd.subtotal || rawOrd.totalAmount) || 0) * 0.05),
              packagingCharge: 25,
              discount: Number(rawOrd.discountAmount) || 0,
              grandTotal: Number(rawOrd.totalAmount || rawOrd.grandTotal) || 0,
              paymentMethod: rawOrd.paymentMethod === 'upi' ? 'upi' : rawOrd.paymentMethod === 'card' ? 'card' : 'counter',
              status: mappedStatus,
              createdAt: rawOrd.createdAt || new Date().toISOString(),
              prepTimeMinutes: rawOrd.prepMinutes || 14,
              customer: {
                name: rawOrd.customerName || 'Diner',
                phone: rawOrd.customerPhone || '',
                email: '',
                isGuest: !rawOrd.customerName,
              },
            };

            globalState = {
              ...globalState,
              tableNumber: cleanNum,
              activeOrder: liveOrd,
              orderHistory: [liveOrd, ...globalState.orderHistory.filter((o) => o.orderId !== liveOrd.orderId && o.restocareId !== liveOrd.restocareId)],
            };
            notify();

            return {
              hasActiveOrder: true,
              activeOrder: liveOrd,
              message: `Table #${cleanNum} has an active order in progress (#${liveOrd.orderId}).`,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Failed to check active table order:', err);
    }

    return { hasActiveOrder: false, activeOrder: null };
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

  // Poll order status periodically from Restocare backend if active order exists
  useEffect(() => {
    if (!state.activeOrder || state.activeOrder.status === 'served') return;

    const interval = setInterval(() => {
      wokStore.syncAllOrdersStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, [state.activeOrder?.orderId, state.activeOrder?.status]);

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
