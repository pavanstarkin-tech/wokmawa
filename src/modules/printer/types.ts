export type ConnectionType = "lan" | "usb" | "bluetooth" | "mock";
export type PrinterRole = "billing" | "kitchen" | "bar";
export type PaperWidth = "58mm" | "80mm";

export interface PrinterConfig {
  id: string;
  name: string;
  type: ConnectionType;
  ip?: string;
  port?: number;
  role: PrinterRole;
  paperWidth: PaperWidth;
  autoCut: boolean;
  branchId: string;
}

export interface PrintJob {
  printerId: string;
  printerRole: PrinterRole;
  payload: Uint8Array;
}
