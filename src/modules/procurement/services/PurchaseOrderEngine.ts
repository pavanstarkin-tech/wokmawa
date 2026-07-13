import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  phone: string;
  email: string;
  gst: string;
  pan: string;
  address: string;
  paymentTerms: number;
  status: "active" | "inactive";
  branchId: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName?: string;
  status: "draft" | "pending_approval" | "approved" | "ordered" | "partially_received" | "completed" | "cancelled";
  orderDate: number;
  expectedDate: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  discount: number;
  grandTotal: number;
  notes: string;
  invoiceNumber?: string;
  invoiceDate?: number;
  invoiceImage?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  tax: number;
  total: number;
}

export class PurchaseOrderEngine {
  private get db() {
    return dbService.getAdapter();
  }

  // --- Vendor Actions ---
  public async getVendors(): Promise<Vendor[]> {
    return this.db.query("SELECT * FROM vendors ORDER BY name ASC");
  }

  public async createVendor(vendor: Omit<Vendor, "id">): Promise<string> {
    const id = `vend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      `INSERT INTO vendors (id, vendorCode, name, phone, email, gst, pan, address, paymentTerms, status, branchId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, vendor.vendorCode, vendor.name, vendor.phone, vendor.email, vendor.gst, vendor.pan,
        vendor.address, vendor.paymentTerms, vendor.status, vendor.branchId || "MAIN_BRANCH", Date.now(), Date.now()
      ]
    );
    dbEventBus.emit("vendor.created", { id, name: vendor.name });
    return id;
  }

  // --- Purchase Order Actions ---
  public async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const rows = await this.db.query(`
      SELECT po.*, v.name as vendorName
      FROM purchase_orders po
      JOIN vendors v ON po.vendorId = v.id
      ORDER BY po.orderDate DESC
    `);
    return rows.map(r => ({
      id: r.id,
      poNumber: r.poNumber,
      vendorId: r.vendorId,
      vendorName: r.vendorName,
      status: r.status as any,
      orderDate: r.orderDate,
      expectedDate: r.expectedDate,
      subtotal: r.subtotal,
      cgst: r.cgst || 0,
      sgst: r.sgst || 0,
      igst: r.igst || 0,
      cess: r.cess || 0,
      discount: r.discount || 0,
      grandTotal: r.grandTotal,
      notes: r.notes || "",
      invoiceNumber: r.invoiceNumber || undefined,
      invoiceDate: r.invoiceDate || undefined,
      invoiceImage: r.invoiceImage || undefined
    }));
  }

  public async getPOItems(poId: string): Promise<PurchaseOrderItem[]> {
    const rows = await this.db.query(`
      SELECT poi.*, i.name as ingredientName
      FROM purchase_order_items poi
      JOIN ingredients i ON poi.ingredientId = i.id
      WHERE poi.purchaseOrderId = ?
    `, [poId]);

    return rows.map(r => ({
      id: r.id,
      purchaseOrderId: r.purchaseOrderId,
      ingredientId: r.ingredientId,
      ingredientName: r.ingredientName,
      quantity: r.quantity,
      receivedQty: r.receivedQty || 0,
      unitPrice: r.unitPrice,
      tax: r.tax || 0,
      total: r.total
    }));
  }

  public async createPurchaseOrder(po: Omit<PurchaseOrder, "id" | "poNumber">, items: Array<Omit<PurchaseOrderItem, "id" | "purchaseOrderId">>): Promise<string> {
    if (items.length === 0) {
      throw new Error("Cannot save an empty Purchase Order.");
    }

    const id = `po_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    await unitOfWork.transaction(async () => {
      // 1. Insert header
      await this.db.execute(
        `INSERT INTO purchase_orders (
          id, poNumber, vendorId, status, orderDate, expectedDate, subtotal,
          cgst, sgst, igst, cess, discount, grandTotal, notes, branchId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, poNumber, po.vendorId, "draft", Date.now(), po.expectedDate, po.subtotal,
          po.cgst, po.sgst, po.igst, po.cess, po.discount, po.grandTotal, po.notes || "", "MAIN_BRANCH"
        ]
      );

      // 2. Insert items
      for (const item of items) {
        const itemId = `poi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await this.db.execute(
          `INSERT INTO purchase_order_items (id, purchaseOrderId, ingredientId, quantity, receivedQty, unitPrice, tax, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.ingredientId, item.quantity, 0, item.unitPrice, item.tax, item.total]
        );
      }
    });

    dbEventBus.emit("purchase.created", { id, poNumber });
    return id;
  }

  public async approvePurchaseOrder(id: string): Promise<void> {
    await this.db.execute("UPDATE purchase_orders SET status = 'approved' WHERE id = ?", [id]);
    dbEventBus.emit("purchase.approved", { id });
  }

  public async cancelPurchaseOrder(id: string): Promise<void> {
    await this.db.execute("UPDATE purchase_orders SET status = 'cancelled' WHERE id = ?", [id]);
    dbEventBus.emit("purchase.cancelled", { id });
  }
}

export const purchaseOrderEngine = new PurchaseOrderEngine();
export default purchaseOrderEngine;
