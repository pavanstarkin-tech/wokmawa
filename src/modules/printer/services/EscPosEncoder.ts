export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  public initialize(): this {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize)
    return this;
  }

  public text(content: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    bytes.forEach((b) => this.buffer.push(b));
    return this;
  }

  public line(content = ""): this {
    this.text(content + "\n");
    return this;
  }

  public align(direction: "left" | "center" | "right"): this {
    const alignMap = { left: 0x00, center: 0x01, right: 0x02 };
    this.buffer.push(0x1b, 0x61, alignMap[direction]); // ESC a n
    return this;
  }

  public bold(enable: boolean): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  public underline(type: 0 | 1 | 2): this {
    this.buffer.push(0x1b, 0x2d, type); // ESC - n (0: off, 1: 1-dot, 2: 2-dot)
    return this;
  }

  public reverse(enable: boolean): this {
    this.buffer.push(0x1d, 0x42, enable ? 0x01 : 0x00); // GS B n (Reverse video)
    return this;
  }

  public size(width: 1 | 2 | 3 | 4, height: 1 | 2 | 3 | 4): this {
    const wVal = (width - 1) << 4;
    const hVal = height - 1;
    this.buffer.push(0x1d, 0x21, wVal | hVal); // GS ! n
    return this;
  }

  public font(type: "A" | "B"): this {
    this.buffer.push(0x1b, 0x4d, type === "A" ? 0x00 : 0x01); // ESC M n (Select font)
    return this;
  }

  public feed(lines = 1): this {
    this.buffer.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  public cut(): this {
    this.buffer.push(0x1d, 0x56, 0x41, 0x03); // GS V A 3 (Feed and Cut)
    return this;
  }

  public pulseDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p m t1 t2 (Pulse drawer pin 2)
    return this;
  }

  public barcode(content: string, type: "CODE39" | "CODE128" = "CODE39"): this {
    // Set barcode height
    this.buffer.push(0x1d, 0x68, 0x50); // 80 dots high (GS h n)
    // Set barcode width
    this.buffer.push(0x1d, 0x77, 0x02); // Multiplier 2 (GS w n)
    // Set HRI characters printing position
    this.buffer.push(0x1d, 0x48, 0x02); // Print below barcode (GS H n)

    if (type === "CODE39") {
      this.buffer.push(0x1d, 0x6b, 0x04); // CODE39 format (GS k m)
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      bytes.forEach((b) => this.buffer.push(b));
      this.buffer.push(0x00); // NUL terminator
    } else {
      this.buffer.push(0x1d, 0x6b, 0x49); // CODE128 format (GS k m n)
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      this.buffer.push(bytes.length); // String length
      bytes.forEach((b) => this.buffer.push(b));
    }
    return this;
  }

  public qrCode(data: string, size = 6): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    const len = bytes.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;

    // 1. Select QR Model (Model 2)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // 2. Set QR Dot size
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);
    // 3. Set Error Correction Level (L = 48)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30);
    // 4. Store QR Data in internal buffer
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    bytes.forEach((b) => this.buffer.push(b));
    // 5. Print the stored QR data
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  public bitmap(width: number, height: number, data: Uint8Array): this {
    const bytesWidth = Math.ceil(width / 8);
    const xL = bytesWidth & 0xff;
    const xH = (bytesWidth >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    // GS v 0 m xL xH yL yH (Print raster bitmap)
    this.buffer.push(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH);
    data.forEach((b) => this.buffer.push(b));
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export default EscPosEncoder;
