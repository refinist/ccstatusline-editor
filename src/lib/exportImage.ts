import { toSvg } from 'html-to-image';

// The card is laid out at a fixed, realistic terminal width before capture, so
// every contributor's screenshot comes out identical — same width, same line
// wrapping — regardless of their browser window size.
const EXPORT_WIDTH = 750;
// Rasterized at 2x for a crisp 1500px-wide PNG.
const EXPORT_SCALE = 2;

// Upscaling has to happen INSIDE the SVG's HTML content, not around it:
//  - html-to-image's `pixelRatio` enlarges the canvas and scales drawImage,
//    which WebKit/Safari ignores for SVG sources — content stays at 1x in the
//    top-left corner of the image, rest blank.
//  - Bumping the root <svg> width/height against its original viewBox (standard
//    SVG vector scaling) hits the same wall: WebKit doesn't apply viewBox
//    scaling to <foreignObject> HTML content (WebKit bug #23113).
// So instead the cloned HTML node itself gets a CSS `transform: scale(...)` —
// plain CSS that every engine honors inside foreignObject — while the svg,
// foreignObject and canvas all use the final pixel size outright. Nothing is
// ever drawn scaled, so there's no scaling path for Safari to get wrong, and
// the text is still rendered (not resampled) at 2x, staying crisp.
async function svgToScaledPngBlob(
  svgDataUrl: string,
  scale: number
): Promise<Blob> {
  const svgText = decodeURIComponent(
    svgDataUrl.slice(svgDataUrl.indexOf(',') + 1)
  );
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const width = Math.round(parseFloat(svg.getAttribute('width') ?? '') * scale);
  const height = Math.round(
    parseFloat(svg.getAttribute('height') ?? '') * scale
  );
  const content = doc.querySelector('foreignObject > *');
  if (!width || !height || !content)
    throw new Error('Unexpected SVG structure');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Appended last so it overrides the `transform`/`transform-origin` values
  // html-to-image already inlined from the live node's computed style.
  content.setAttribute(
    'style',
    `${content.getAttribute('style') ?? ''}; transform: scale(${scale}); transform-origin: 0 0;`
  );
  const scaledUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(svg)
  )}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Same load ritual html-to-image uses internally: decode() then wait a
      // frame, or Safari can paint the foreignObject before it's laid out.
      // decode() itself rejects on some Safari versions for SVG — ignore that.
      image
        .decode()
        .catch(() => undefined)
        .then(() => requestAnimationFrame(() => resolve(image)));
    };
    image.onerror = () => reject(new Error('Failed to load the rendered SVG'));
    image.src = scaledUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob ? resolve(blob) : reject(new Error('Failed to encode the PNG')),
      'image/png'
    );
  });
}

/** Rasterizes `el` to a fixed-width (750px CSS → 1500px PNG), high-DPI PNG blob.
 *
 *  Width is forced by mutating `el.style` around the capture rather than via
 *  html-to-image's `width` option, so the library measures a node that really
 *  is 750px wide instead of patching the clone afterwards. `el` is the
 *  offscreen, zero-clipped capture target (see LineEditor.vue), so the brief
 *  resize is never visible on screen. */
export async function exportElementPngBlob(el: HTMLElement): Promise<Blob> {
  const prevWidth = el.style.width;
  const prevMaxWidth = el.style.maxWidth;
  el.style.width = `${EXPORT_WIDTH}px`;
  el.style.maxWidth = `${EXPORT_WIDTH}px`;
  let svgDataUrl: string;
  try {
    svgDataUrl = await toSvg(el);
  } finally {
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
  }
  return await svgToScaledPngBlob(svgDataUrl, EXPORT_SCALE);
}

/** Download filename: `ccstatusline-editor-2026-07-03_16-24-45.png` — local
 *  wall-clock time, second precision, no characters a filesystem would balk at. */
export function exportFilename(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const time = `${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}`;
  return `ccstatusline-editor-${date}_${time}.png`;
}

/** Triggers a browser download of `blob`. Uses a Blob object URL rather than
 *  handing a `data:` URI straight to `<a href>` — Safari in particular can
 *  save a truncated/corrupt file for a `data:` URI this size, whereas a Blob
 *  URL downloads reliably everywhere. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Best-effort copy of a PNG to the clipboard; resolves to whether it worked
 *  (unsupported API, denied permission and insecure contexts all land on
 *  `false` — the caller degrades to download-only, never an error).
 *
 *  Accepts a pending Promise<Blob> on purpose: Safari only allows
 *  `clipboard.write` while the user-gesture context is live, so the caller
 *  must invoke this synchronously from the click handler and let the still-
 *  rendering blob resolve later — exactly the case ClipboardItem's promise
 *  form exists for. */
export async function copyPngToClipboard(
  blob: Blob | Promise<Blob>
): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write)
      return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
