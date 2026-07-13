import dbService from "../../../core/database/DatabaseService";

export interface PrinterRegistry {
  id: string;
  name: string;
  printerType: "counter" | "kitchen";
  connectionType: "usb" | "lan" | "bluetooth";
  ipAddress?: string;
  port?: number;
  usbDevice?: string;
  paperWidth?: number;
  isDefault?: number;
  status?: string;
}

export class PrinterRepository {
  private get db() {
    return dbService.getAdapter();
  }

  public async savePrinter(printer: PrinterRegistry): Promise<void> {
    await this.db.execute(
      `INSERT INTO printers (id, name, printerType, connectionType, ipAddress, port, usbDevice, paperWidth, isDefault, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) 
       DO UPDATE SET name = ?, printerType = ?, connectionType = ?, ipAddress = ?, port = ?, usbDevice = ?, paperWidth = ?, isDefault = ?, updatedAt = ?`,
      [
        printer.id, printer.name, printer.printerType, printer.connectionType,
        printer.ipAddress || null, printer.port || null, printer.usbDevice || null,
        printer.paperWidth || 80, printer.isDefault || 0, printer.status || "online", Date.now(),
        printer.name, printer.printerType, printer.connectionType,
        printer.ipAddress || null, printer.port || null, printer.usbDevice || null,
        printer.paperWidth || 80, printer.isDefault || 0, Date.now()
      ]
    );
  }

  public async getPrinters(): Promise<PrinterRegistry[]> {
    return this.db.query("SELECT * FROM printers ORDER BY createdAt ASC");
  }

  public async deletePrinter(id: string): Promise<void> {
    await this.db.execute("DELETE FROM printers WHERE id = ?", [id]);
  }
}

export const printerRepository = new PrinterRepository();
export default printerRepository;
