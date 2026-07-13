import localDb from "@/services/database/localDb";

export class BillNumberGenerator {
  public static generate(branchId = "MAIN_BRANCH"): string {
    const bills = localDb.getTable("bills") || [];

    // Get prefix like PK-MAIN-YYYYMMDD-
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;
    
    const branchPrefix = branchId.substring(0, 4).toUpperCase();
    const matchPrefix = `PK-${branchPrefix}-${datePrefix}-`;

    // Filter bills matching today's branch prefix
    const todayBills = bills.filter((b: any) => b.billNumber && b.billNumber.startsWith(matchPrefix));
    
    // Increment sequence number
    const sequenceNumber = todayBills.length + 1;
    const paddedSequence = String(sequenceNumber).padStart(3, "0");

    return `${matchPrefix}${paddedSequence}`;
  }
}

export default BillNumberGenerator;
