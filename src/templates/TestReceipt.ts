import { EscPosEncoder } from "@/modules/printer/services/EscPosEncoder";

export function TestReceiptTemplate(paperWidth: "58mm" | "80mm" = "80mm"): EscPosEncoder {
  const encoder = new EscPosEncoder();
  const widthChars = paperWidth === "58mm" ? 32 : 48;
  const separator = "=".repeat(widthChars);

  encoder.align("center");
  encoder.bold(true);
  encoder.size(2, 1);
  encoder.line("PRINTER TEST PAGE");
  encoder.size(1, 1);
  encoder.bold(false);
  encoder.line(separator);

  encoder.align("left");
  encoder.line(`Width Model: ${paperWidth}`);
  encoder.line(`Total Columns: ${widthChars} Characters`);
  encoder.line(`System Link: TCP Socket Port 9100`);
  encoder.line(`Time: ${new Date().toLocaleString()}`);
  encoder.line(separator);

  // Test character layout alignment grids
  encoder.line("12345678901234567890123456789012");
  if (paperWidth === "80mm") {
    encoder.line("123456789012345678901234567890123456789012345678");
  }

  encoder.line(separator);
  encoder.align("center");
  encoder.bold(true);
  encoder.line("ESC/POS DRIVER OK");
  encoder.bold(false);
  encoder.feed(3);
  encoder.cut();

  return encoder;
}
