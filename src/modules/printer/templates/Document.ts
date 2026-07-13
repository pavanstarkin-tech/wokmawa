import { ReceiptModel } from "../types/ReceiptModel";

export interface DocumentBuilder {
  build(data: any, version?: number): ReceiptModel;
}
export default DocumentBuilder;
