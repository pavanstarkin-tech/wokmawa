import localDb from "@/services/database/localDb";

export interface TaxResult {
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  totalTaxes: number;
}

export class TaxCalculator {
  public static calculate(taxableAmount: number): TaxResult {
    const settings = localDb.getSettings();
    const gstRate = settings?.taxes?.gstRate ?? 5; // Default 5% GST
    const serviceChargeRate = settings?.taxes?.serviceCharge ?? 0; // Default 0% service charge

    const gstAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
    const serviceChargeAmount = Math.round(taxableAmount * (serviceChargeRate / 100) * 100) / 100;
    const totalTaxes = Math.round((gstAmount + serviceChargeAmount) * 100) / 100;

    return {
      taxableAmount,
      gstRate,
      gstAmount,
      serviceChargeRate,
      serviceChargeAmount,
      totalTaxes
    };
  }
}

export default TaxCalculator;
