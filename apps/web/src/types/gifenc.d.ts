// 🎬 تعريفات TypeScript لمكتبة gifenc (لا ترفق أنواعاً مدمجة)
// مرجع التواقيع: التوثيق الرسمي لمكتبة gifenc v1
declare module 'gifenc' {
  export interface GIFEncoderOptions {
    auto?: boolean;
  }

  export interface WriteFrameOptions {
    palette?: number[][];
    first?: boolean;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    dispose?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;

  export function quantize(
    data: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    opts?: { format?: string; oneBitAlpha?: boolean | number; clearAlphaThreshold?: number },
  ): number[][];

  export function applyPalette(
    data: Uint8ClampedArray | Uint8Array,
    palette: number[][],
    format?: string,
  ): Uint8Array;
}
