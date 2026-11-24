import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { applyLogoWatermark, shareContent } from '../share';

vi.mock('../offlineCache', () => ({
  getCachedImageBlob: vi.fn().mockResolvedValue(null),
  isOffline: vi.fn().mockReturnValue(false),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('share.ts - marca de agua y shareContent', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalImage = globalThis.Image;
  const originalFetch = globalThis.fetch;
  const originalShare = (navigator as any).share;
  const originalCanShare = (navigator as any).canShare;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.Image = originalImage;
    globalThis.fetch = originalFetch;

    if (originalShare === undefined) {
      delete (navigator as any).share;
    } else {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: originalShare,
      });
    }

    if (originalCanShare === undefined) {
      delete (navigator as any).canShare;
    } else {
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: originalCanShare,
      });
    }

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('applyLogoWatermark devuelve el Blob original como fallback si falla la carga de imagen o falta canvas', async () => {
    const originalBlob = new Blob(['raw-image-bytes'], { type: 'image/jpeg' });
    const revokeSpy = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:mock-product-image');
    URL.revokeObjectURL = revokeSpy;

    class FailingImage {
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }
    globalThis.Image = FailingImage as unknown as typeof Image;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await applyLogoWatermark(originalBlob);

    expect(result).toBe(originalBlob);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-product-image');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('applyLogoWatermark estampa el logo y texto Nazaar sobre el canvas y genera un nuevo Blob', async () => {
    const originalBlob = new Blob(['raw-image-bytes'], { type: 'image/jpeg' });
    const watermarkedBlob = new Blob(['watermarked-image-bytes'], { type: 'image/jpeg' });

    URL.createObjectURL = vi.fn(() => 'blob:mock-product-image');
    URL.revokeObjectURL = vi.fn();

    class MockImage {
      crossOrigin = '';
      naturalWidth = 0;
      naturalHeight = 0;
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        if (value === '/icon.png') {
          this.naturalWidth = 512;
          this.naturalHeight = 512;
        } else {
          this.naturalWidth = 1000;
          this.naturalHeight = 800;
        }
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    const drawImageSpy = vi.fn();
    const fillTextSpy = vi.fn();
    const mockCtx = {
      drawImage: drawImageSpy,
      measureText: vi.fn(() => ({ width: 80 })),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: fillTextSpy,
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
      textBaseline: 'alphabetic',
    };

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockCtx,
          toBlob: (cb: (b: Blob | null) => void, type?: string) => {
            expect(type).toBe('image/jpeg');
            cb(watermarkedBlob);
          },
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const result = await applyLogoWatermark(originalBlob);

    expect(result).toBe(watermarkedBlob);
    expect(drawImageSpy).toHaveBeenCalledTimes(2);
    expect(fillTextSpy).toHaveBeenCalledWith('Nazaar', expect.any(Number), expect.any(Number));
    expect(fillTextSpy).toHaveBeenCalledWith('nazaar.shop', expect.any(Number), expect.any(Number));

    const brandCall = fillTextSpy.mock.calls.find((call) => call[0] === 'Nazaar');
    const domainCall = fillTextSpy.mock.calls.find((call) => call[0] === 'nazaar.shop');
    expect(brandCall?.[1]).toBe(domainCall?.[1]);
    expect(domainCall?.[2]).toBeGreaterThan(brandCall?.[2]);
  });

  it('shareContent en modo web procesa la imagen con marca de agua y llama a navigator.share con files', async () => {
    const rawBlob = new Blob(['product-photo'], { type: 'image/png' });
    const watermarkedBlob = new Blob(['product-photo-watermarked'], { type: 'image/png' });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(rawBlob),
    }) as unknown as typeof fetch;

    URL.createObjectURL = vi.fn(() => 'blob:mock-web-share');
    URL.revokeObjectURL = vi.fn();

    class MockImage {
      crossOrigin = '';
      naturalWidth = 800;
      naturalHeight = 800;
      onload: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    const mockCtx = {
      drawImage: vi.fn(),
      measureText: vi.fn(() => ({ width: 70 })),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
      textBaseline: 'alphabetic',
    };

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockCtx,
          toBlob: (cb: (b: Blob | null) => void, type?: string) => {
            expect(type).toBe('image/png');
            cb(watermarkedBlob);
          },
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const canShareMock = vi.fn().mockReturnValue(true);
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    await shareContent({
      title: 'Zapatillas Deportivas',
      text: 'Precio: 5000 CUP',
      url: 'https://nazaar.shop/tienda/p/123',
      imageUrl: 'https://cdn.example.com/product.png',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('https://cdn.example.com/product.png');
    expect(canShareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledTimes(1);

    const sharePayload = shareMock.mock.calls[0][0];
    expect(sharePayload.title).toBe('Zapatillas Deportivas');
    expect(sharePayload.url).toBe('https://nazaar.shop/tienda/p/123');
    expect(sharePayload.files).toHaveLength(1);
    expect(sharePayload.files[0]).toBeInstanceOf(File);
    expect(sharePayload.files[0].type).toBe('image/png');
    expect(sharePayload.files[0].size).toBe(watermarkedBlob.size);
  });

  it('shareContent respeta watermark: false sin crear canvas', async () => {
    const rawBlob = new Blob(['raw-photo-only'], { type: 'image/jpeg' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(rawBlob),
    }) as unknown as typeof fetch;

    const createElementSpy = vi.spyOn(document, 'createElement');
    const canShareMock = vi.fn().mockReturnValue(true);
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    await shareContent({
      title: 'Producto sin marca',
      text: 'Detalle',
      imageUrl: 'https://cdn.example.com/raw.jpg',
      watermark: false,
    });

    expect(createElementSpy).not.toHaveBeenCalledWith('canvas');
    expect(shareMock).toHaveBeenCalledTimes(1);
    const sharePayload = shareMock.mock.calls[0][0];
    expect(sharePayload.files).toHaveLength(1);
    expect(sharePayload.files[0].size).toBe(rawBlob.size);
  });

  it('shareContent reintenta con CORS sin caché si fetch inicial devuelve respuesta opaque', async () => {
    const rawBlob = new Blob(['cors-fresh-photo'], { type: 'image/jpeg' });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        type: 'opaque',
      })
      .mockResolvedValueOnce({
        ok: true,
        type: 'cors',
        blob: vi.fn().mockResolvedValue(rawBlob),
      }) as unknown as typeof fetch;

    const canShareMock = vi.fn().mockReturnValue(true);
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    await shareContent({
      title: 'Camisa',
      text: 'Ver producto: https://nazaar.shop/tienda/p/1',
      url: 'https://nazaar.shop/tienda/p/1',
      imageUrl: 'https://cdn.example.com/camisa.jpg',
      watermark: false,
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(shareMock).toHaveBeenCalledTimes(1);
    const sharePayload = shareMock.mock.calls[0][0];
    expect(sharePayload.files).toHaveLength(1);
    expect(sharePayload.files[0].size).toBe(rawBlob.size);
  });

  it('shareContent prioriza enviar files con la URL en text si canShare rechaza url + files juntos', async () => {
    const rawBlob = new Blob(['photo-bytes'], { type: 'image/jpeg' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(rawBlob),
    }) as unknown as typeof fetch;

    const canShareMock = vi.fn((data: any) => !(data?.url && data?.files));
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    await shareContent({
      title: 'Camisa',
      text: 'Precio: 1000 CUP',
      url: 'https://nazaar.shop/tienda/p/1',
      imageUrl: 'https://cdn.example.com/camisa.jpg',
      watermark: false,
    });

    expect(shareMock).toHaveBeenCalledTimes(1);
    const sharePayload = shareMock.mock.calls[0][0];
    expect(sharePayload.files).toHaveLength(1);
    expect(sharePayload.url).toBeUndefined();
    expect(sharePayload.text).toContain('https://nazaar.shop/tienda/p/1');
  });

  it('shareContent reintenta con files sin url separado antes de descartar la imagen si navigator.share falla', async () => {
    const rawBlob = new Blob(['photo-bytes'], { type: 'image/jpeg' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(rawBlob),
    }) as unknown as typeof fetch;

    const canShareMock = vi.fn().mockReturnValue(true);
    const shareMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    await shareContent({
      title: 'Camisa',
      text: 'Precio: 1000 CUP',
      url: 'https://nazaar.shop/tienda/p/1',
      imageUrl: 'https://cdn.example.com/camisa.jpg',
      watermark: false,
    });

    expect(shareMock).toHaveBeenCalledTimes(2);
    const retryPayload = shareMock.mock.calls[1][0];
    expect(retryPayload.files).toHaveLength(1);
    expect(retryPayload.url).toBeUndefined();
    expect(retryPayload.text).toContain('https://nazaar.shop/tienda/p/1');
  });

  it('en modo nativo no agrega ningún enlace cuando no se pasa url y no lo duplica si text ya lo incluye', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    // Caso 1: sin url -> Share.share solo recibe el texto del usuario sin inyectar enlace
    await shareContent({
      title: 'Zapatilla Pro',
      text: '*Zapatilla Pro*\n\nPrecio: 2500 CUP',
    });

    expect(Share.share).toHaveBeenCalledTimes(1);
    const firstCall = vi.mocked(Share.share).mock.calls[0][0];
    expect(firstCall.text).toBe('*Zapatilla Pro*\n\nPrecio: 2500 CUP');
    expect(firstCall.text).not.toContain('http');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('*Zapatilla Pro*\n\nPrecio: 2500 CUP');

    // Caso 2: text ya contiene url -> no debe duplicarse en Share.share ni en el portapapeles
    await shareContent({
      title: 'Mi Tienda',
      text: 'Lo mejor\n\nhttps://nazaar.shop/mi-tienda',
      url: 'https://nazaar.shop/mi-tienda',
    });

    expect(Share.share).toHaveBeenCalledTimes(2);
    const secondCall = vi.mocked(Share.share).mock.calls[1][0];
    expect(secondCall.text).toBe('Lo mejor\n\nhttps://nazaar.shop/mi-tienda');
    expect(secondCall.text?.match(/https:\/\/nazaar\.shop\/mi-tienda/g)).toHaveLength(1);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      'Lo mejor\n\nhttps://nazaar.shop/mi-tienda'
    );
  });
});
