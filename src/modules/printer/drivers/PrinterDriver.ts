export interface PrinterDriver {
  send(payload: Uint8Array): Promise<{ success: boolean; error?: string }>;
}
