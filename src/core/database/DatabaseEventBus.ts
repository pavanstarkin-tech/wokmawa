type DatabaseEventCallback = (payload: any) => void;

class DatabaseEventBus {
  private listeners: Record<string, DatabaseEventCallback[]> = {};

  public on(event: string, callback: DatabaseEventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  public emit(event: string, payload: any): void {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error in DatabaseEventBus listener for ${event}:`, err);
      }
    });
  }
}

export const dbEventBus = new DatabaseEventBus();
export default dbEventBus;
