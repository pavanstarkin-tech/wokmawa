type EventCallback<T = any> = (payload: T) => void | Promise<void>;

export interface BillingCompletedPayload {
  order: any;
  paymentType: "cash" | "card" | "upi" | "razorpay";
  amountPaid: number;
  changeGiven: number;
}

export interface KOTPrintPayload {
  order: any;
  items: any[];
}

export interface Events {
  "billing.completed": BillingCompletedPayload;
  "kot.print": KOTPrintPayload;
  "order.synced": { orderId: string; firebaseId: string };
  "drawer.changed": { type: "open" | "close" | "payout" | "payin"; amount: number };
  "network.status": { online: boolean };
  "log.added": { level: "info" | "warn" | "error"; message: string };
}

class EventBus {
  private listeners: { [K in keyof Events]?: Set<EventCallback<Events[K]>> } = {};

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  public on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(callback);

    return () => {
      this.listeners[event]?.delete(callback);
    };
  }

  /**
   * Emit an event asynchronously to all subscribers.
   */
  public async emit<K extends keyof Events>(event: K, payload: Events[K]): Promise<void> {
    const list = this.listeners[event];
    if (!list) return;

    const promises = Array.from(list).map(async (cb) => {
      try {
        await cb(payload);
      } catch (err) {
        console.error(`Error in event handler for "${event}":`, err);
      }
    });

    await Promise.all(promises);
  }
}

export const eventBus = new EventBus();
export default eventBus;
