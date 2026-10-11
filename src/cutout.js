// Cuts the person out of their photo, in the browser, so the card can place them in front of the "ATTENDING" lettering.
// Uses Google's MediaPipe selfie segmentation. The photo never leaves the device; only the engine (~3.5 MB) and
// model (~250 KB) are downloaded, once, the first time someone adds a photo.

const VERSION = "1.1.0"; // keep in step with @mediapipe/tasks-vision in package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const MAX_SIDE = 1600; // large photos are scaled down first; the card never needs more

let segmenterPromise;

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const options = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      try {
        return await ImageSegmenter.createFromOptions(fileset, options("GPU"));
      } catch {
        return ImageSegmenter.createFromOptions(fileset, options("CPU"));
      }
    })().catch((error) => {
      segmenterPromise = null; // allow a retry on the next photo
      throw error;
    });
  }
  return segmenterPromise;
}

/**
 * Returns { canvas, top, centerX } for the person in `img`, or null if no person is found:
 *   canvas  — the photo with everything but the person transparent (same aspect as the photo)
 *   top     — where the top of their head is, as a fraction of the photo's height (0 = top)
 *   centerX — the horizontal middle of the person, as a fraction of the photo's width
 */
export async function cutOutPerson(img) {
  const segmenter = await getSegmenter();
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  source.getContext("2d").drawImage(img, 0, 0, w, h);

  const result = segmenter.segment(source);
  const mask = result.confidenceMasks?.[0];
  if (!mask) return null;
  const mw = mask.width;
  const mh = mask.height;
  const conf = mask.getAsFloat32Array();
  mask.close?.();

  // Person probability → alpha, with a gentle contrast curve so edges are clean but not jagged.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = mw;
  maskCanvas.height = mh;
  const mctx = maskCanvas.getContext("2d");
  const data = mctx.createImageData(mw, mh);
  let top = -1;
  let left = mw;
  let right = -1;
  let personPixels = 0;
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const c = conf[y * mw + x];
      const a = Math.min(1, Math.max(0, (c - 0.35) / 0.3));
      data.data[(y * mw + x) * 4 + 3] = Math.round(a * 255);
      if (c > 0.6) {
        personPixels++;
        if (top < 0) top = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (personPixels < mw * mh * 0.02) return null; // no clear person (e.g. a logo or landscape)
  mctx.putImageData(data, 0, 0);

  // Photo × upscaled, slightly softened mask.
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  octx.drawImage(source, 0, 0);
  octx.globalCompositeOperation = "destination-in";
  octx.filter = `blur(${Math.max(1, Math.round(w / 600))}px)`;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(maskCanvas, 0, 0, w, h);
  octx.filter = "none";

  return { canvas: out, top: top / mh, centerX: (left + right) / 2 / mw };
}
