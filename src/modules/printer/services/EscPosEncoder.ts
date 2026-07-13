export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  public initialize(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
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

  public size(width: 1 | 2 | 3 | 4, height: 1 | 2 | 3 | 4): this {
    const wVal = (width - 1) << 4;
    const hVal = height - 1;
    this.buffer.push(0x1d, 0x21, wVal | hVal); // GS ! n
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

  /**
   * Cash Drawer pulse to pin 2
   */
  public pulseDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}
