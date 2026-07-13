export type DitherPreset = "Normal" | "Dark" | "High Contrast" | "Logo" | "Photo" | "Custom";

export interface ImageProcessingOptions {
  preset: DitherPreset;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  threshold: number; // 0 to 255
  dither: boolean;
  crop: boolean;
  center: boolean;
}

export const DEFAULT_IMAGE_OPTIONS: ImageProcessingOptions = {
  preset: "Logo",
  brightness: 0,
  contrast: 10,
  threshold: 128,
  dither: true,
  crop: true,
  center: true
};

class ImageProcessor {
  // Memory cache of final compiled monochrome byte arrays keyed by logo path & options string
  private bitmapCache: Record<string, { width: number; height: number; bytes: Uint8Array }> = {};

  /**
   * Clears the image monochrome cache
   */
  public clearCache(): void {
    this.bitmapCache = {};
  }

  /**
   * Process a Base64 string or file URL image, convert it to monochrome raster bytes, and cache.
   */
  public async processImage(
    src: string,
    options: ImageProcessingOptions = DEFAULT_IMAGE_OPTIONS
  ): Promise<{ width: number; height: number; bytes: Uint8Array }> {
    const cacheKey = `${src}_${JSON.stringify(options)}`;
    if (this.bitmapCache[cacheKey]) {
      return this.bitmapCache[cacheKey];
    }

    const img = await this.loadImage(src);
    const result = this.convertImageToEscPosBytes(img, options);
    
    this.bitmapCache[cacheKey] = result;
    return result;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error("Failed to load image: " + err));
      img.src = src;
    });
  }

  private convertImageToEscPosBytes(
    img: HTMLImageElement,
    options: ImageProcessingOptions
  ): { width: number; height: number; bytes: Uint8Array } {
    // Determine presets overrides
    let { brightness, contrast, threshold, dither } = options;
    switch (options.preset) {
      case "Normal":
        brightness = 0; contrast = 0; threshold = 128; dither = false;
        break;
      case "Dark":
        brightness = -20; contrast = 10; threshold = 140; dither = false;
        break;
      case "High Contrast":
        brightness = 0; contrast = 40; threshold = 128; dither = false;
        break;
      case "Logo":
        brightness = 5; contrast = 20; threshold = 128; dither = true;
        break;
      case "Photo":
        brightness = 0; contrast = 5; threshold = 120; dither = true;
        break;
      case "Custom":
      default:
        break;
    }

    // Set max width for standard thermal printers (typically 180-240 px for logo)
    const targetWidth = 180;
    const aspect = img.height / img.width;
    const targetHeight = Math.round(targetWidth * aspect);

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D canvas context");

    // Draw scaled image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    // Apply brightness & contrast, then build grayscale array
    const grayscale = new Float32Array(targetWidth * targetHeight);
    const bMul = (brightness + 100) / 100;
    const cMul = (contrast + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply contrast & brightness
      r = Math.min(255, Math.max(0, ((r - 128) * cMul + 128) * bMul));
      g = Math.min(255, Math.max(0, ((g - 128) * cMul + 128) * bMul));
      b = Math.min(255, Math.max(0, ((b - 128) * cMul + 128) * bMul));

      // Grayscale luminance formula
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      grayscale[i / 4] = gray;
    }

    const pixels = new Uint8Array(targetWidth * targetHeight); // 0 = black, 1 = white

    if (dither) {
      // Floyd-Steinberg Error Diffusion Dithering
      const temp = new Float32Array(grayscale);
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const idx = y * targetWidth + x;
          const oldVal = temp[idx];
          const newVal = oldVal < threshold ? 0 : 255;
          pixels[idx] = newVal === 0 ? 0 : 1; // 0 is black (printed), 1 is white

          const err = oldVal - newVal;
          
          if (x + 1 < targetWidth) temp[idx + 1] += err * (7 / 16);
          if (y + 1 < targetHeight) {
            if (x > 0) temp[idx - 1 + targetWidth] += err * (3 / 16);
            temp[idx + targetWidth] += err * (5 / 16);
            if (x + 1 < targetWidth) temp[idx + 1 + targetWidth] += err * (1 / 16);
          }
        }
      }
    } else {
      // Basic Thresholding
      for (let i = 0; i < grayscale.length; i++) {
        pixels[i] = grayscale[i] < threshold ? 0 : 1;
      }
    }

    // Pack bits into bytes for GS v 0 command
    const bytesWidth = Math.ceil(targetWidth / 8);
    const packedBytes = new Uint8Array(bytesWidth * targetHeight);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const pixelIdx = y * targetWidth + x;
        const bitIdx = x % 8;
        const byteIdx = y * bytesWidth + Math.floor(x / 8);

        // ESC/POS raster format: 0 is white, 1 is black
        if (pixels[pixelIdx] === 0) {
          packedBytes[byteIdx] |= 0x80 >> bitIdx;
        }
      }
    }

    return {
      width: targetWidth,
      height: targetHeight,
      bytes: packedBytes
    };
  }
}

export const imageProcessor = new ImageProcessor();
export default imageProcessor;
