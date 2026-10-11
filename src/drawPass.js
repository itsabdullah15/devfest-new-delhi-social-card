// Draws the DevFest New Delhi 2026 card onto a canvas in one of four social formats.
// The card is the "ATTENDING" neon marquee frame artwork (public/assets/frame-attending.webp) with the
// person's photo showing through its clear centre, and their name and day along the bottom.
// Pure drawing: no DOM or React state.

export const FORMATS = [
  { id: "linkedin", label: "LinkedIn Post", ratio: "1:1", width: 1200, height: 1200 },
  { id: "instagram", label: "Instagram Post", ratio: "4:5", width: 1080, height: 1350 },
  { id: "x", label: "X Post", ratio: "16:9", width: 1600, height: 900 },
  { id: "story", label: "Instagram Story", ratio: "9:16", width: 1080, height: 1920 },
];

const NEON_FONT = '"Anton", Impact, sans-serif';
const SANS = '"Google Sans Flex", system-ui, sans-serif';
const MONO = '"Google Sans Code", ui-monospace, monospace';
const WHITE = "#FFFFFF";
const SOFT = "#D3E2EC";
const NEON = "#2F7BFF";
const NEON_LIGHT = "#8FB6FF";

// GDG bracket mark "< >", as [colour, from, to] strokes in a 160×100 box. Drawn in this order
// so red overlaps blue and green overlaps yellow at the points, as in the GDG logo.
export const GDG_MARK = {
  width: 160,
  height: 100,
  stroke: 30,
  bars: [
    ["#4285F4", [17, 50], [62, 80]],
    ["#EA4335", [17, 50], [62, 20]],
    ["#F9AB00", [143, 50], [98, 80]],
    ["#34A853", [143, 50], [98, 20]],
  ],
};

// The frame artwork is 1080×1350. Its clear centre is a rounded rectangle tilted by about 2.4°,
// measured from the artwork; the photo is clipped to it (a few px larger, so it tucks under the frame).
const BOARD = { w: 1080, h: 1350 };
const WINDOW = { cx: 540, cy: 701, w: 846, h: 1023, r: 34, angle: -Math.atan(0.0413) };

// Where the 1080×1350 board goes in each format (k = scale). X adds a details column on the right.
const PLACEMENT = {
  instagram: { x: 0, y: 0, k: 1 },
  linkedin: { x: 120, y: 0, k: 1200 / 1350 },
  story: { x: 0, y: 285, k: 1 }, // story apps cover ~250px at the top and bottom
  x: { x: 30, y: 0, k: 900 / 1350 },
};

export async function loadPassFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`400 100px ${NEON_FONT}`),
    document.fonts.load(`600 26px ${SANS}`),
    document.fonts.load(`400 32px ${SANS}`),
    document.fonts.load(`500 24px ${MONO}`),
  ]).catch(() => {});
}

// Turns a dark-on-light wordmark (like the Commudle logo) light, keeping its coloured parts, for the dark card.
export function lightenLogo(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  try {
    const data = g.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const hi = Math.max(px[i], px[i + 1], px[i + 2]);
      const lo = Math.min(px[i], px[i + 1], px[i + 2]);
      if (hi - lo < 40 && hi < 140) px[i] = px[i + 1] = px[i + 2] = 255;
    }
    g.putImageData(data, 0, 0);
  } catch {
    // Cross-origin images can't be read; fall back to the original.
  }
  return c;
}

/**
 * @param data { name, role, org, day, photo, cutout, zoom, frame, commudle, format, passType }
 *   `cutout` (optional) is the person cut out of `photo` (see cutout.js), for the pop-out in front of "ATTENDING";
 *   `frame` is the loaded frame artwork; `day` is the chosen day (or null before one is picked);
 *   `passType` is attendee / volunteer / speaker from the config.
 */
export function drawPass(ctx, data, config) {
  const format = FORMATS.find((f) => f.id === data.format) || FORMATS[0];
  const place = PLACEMENT[format.id];
  ctx.save();
  ctx.clearRect(0, 0, format.width, format.height);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  drawBackdrop(ctx, format.width, format.height, data.frame, place);
  if (data.frame) extendEdges(ctx, format.width, format.height, data.frame, place);

  ctx.save();
  ctx.translate(place.x, place.y);
  ctx.scale(place.k, place.k);
  drawBoard(ctx, data, config, { footer: format.id !== "x" });
  ctx.restore();

  if (format.id === "x") drawXDetails(ctx, data, config);
  ctx.restore();
}

// ── board ────────────────────────────────────────────────────────────────

function drawBoard(ctx, data, config, { footer }) {
  drawWindow(ctx, data);
  if (data.frame) ctx.drawImage(data.frame, 0, 0, BOARD.w, BOARD.h);
  if (data.photo && data.cutout) drawPopOut(ctx, data);
  drawNameBlock(ctx, data, config);
  if (footer) drawBoardFooter(ctx, data, config);
}

// Matches the artwork's own background (dark teal fading to black) so the board blends into wider formats.
const backdropCache = new WeakMap();
// The gradient runs over the board's own span, so above/below it the fill continues the artwork's edge colours.
function drawBackdrop(ctx, W, H, frame, place) {
  let stops = frame && backdropCache.get(frame);
  if (frame && !stops) {
    stops = sampleEdgeColours(frame);
    backdropCache.set(frame, stops);
  }
  const g = ctx.createLinearGradient(0, place.y, 0, place.y + BOARD.h * place.k);
  (stops || [[0, "#011A19"], [1, "#000000"]]).forEach(([t, c]) => g.addColorStop(t, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Faint vertical stripes, like the artwork's texture.
  ctx.fillStyle = "rgba(120, 200, 190, 0.03)";
  for (let x = 0; x < W; x += 6) ctx.fillRect(x, 0, 2, H);
}

// Fills the space around the board by stretching the artwork's outermost row/column outward, so wider or
// taller formats continue the background seamlessly (its texture is vertical stripes, so this matches exactly).
function extendEdges(ctx, W, H, frame, place) {
  const k = place.k;
  const bw = BOARD.w * k;
  const bh = BOARD.h * k;
  const fw = frame.width / BOARD.w; // the image may not be exactly 1080 wide
  const fh = frame.height / BOARD.h;
  if (place.y > 0) ctx.drawImage(frame, 0, 0, frame.width, fh, place.x, 0, bw, place.y);
  if (place.y + bh < H) ctx.drawImage(frame, 0, frame.height - fh, frame.width, fh, place.x, place.y + bh, bw, H - place.y - bh);
  if (place.x > 0) ctx.drawImage(frame, 0, 0, fw, frame.height, 0, place.y, place.x, bh);
  if (place.x + bw < W) ctx.drawImage(frame, frame.width - fw, 0, fw, frame.height, place.x + bw, place.y, W - place.x - bw, bh);
}

function sampleEdgeColours(frame) {
  try {
    const c = document.createElement("canvas");
    c.width = 12;
    c.height = BOARD.h;
    const g = c.getContext("2d");
    g.drawImage(frame, 0, 0, 12, BOARD.h, 0, 0, 12, BOARD.h);
    const stops = [];
    for (let i = 0; i <= 8; i++) {
      const y = Math.min(BOARD.h - 1, Math.round((BOARD.h - 1) * (i / 8)));
      const d = g.getImageData(0, y, 12, 1).data;
      let r = 0, gr = 0, b = 0;
      for (let k = 0; k < d.length; k += 4) [r, gr, b] = [r + d[k], gr + d[k + 1], b + d[k + 2]];
      const n = d.length / 4;
      stops.push([i / 8, `rgb(${Math.round(r / n)}, ${Math.round(gr / n)}, ${Math.round(b / n)})`]);
    }
    return stops;
  } catch {
    return null;
  }
}

// Photo placement, in window-centred upright coordinates, shared by the photo and its cut-out so they line up.
// With a cut-out, the photo is moved (and zoomed in up to 1.8×, if needed) so the top of the person's head lands
// across the bottom of the "ATTENDING" lettering; that overlap is what makes the pop-out read.
const WINDOW_PAD = 40;
const HEAD_TOP_Y = 222; // board y for the top of the head (the lettering ends at ~315)
const POP_OUT_BOTTOM_Y = 660; // below this the person stays behind the name fade

function photoRect(photo, cutout, zoom) {
  const box = { x: -WINDOW.w / 2 - WINDOW_PAD, y: -WINDOW.h / 2 - WINDOW_PAD, w: WINDOW.w + WINDOW_PAD * 2, h: WINDOW.h + WINDOW_PAD * 2 };
  const cover = Math.max(box.w / photo.width, box.h / photo.height);
  if (!cutout) {
    const scale = cover * zoom;
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    const dy = Math.min(box.y, Math.max(box.y + box.h - dh, box.y + box.h * 0.38 - dh * 0.38));
    return { x: box.x + (box.w - dw) / 2, y: dy, w: dw, h: dh };
  }
  const target = HEAD_TOP_Y - WINDOW.cy;
  const needed = (box.y + box.h - target) / ((1 - cutout.top) * photo.height); // scale that lets the head reach target
  const scale = Math.min(Math.max(cover, needed), cover * 1.8) * zoom;
  const dw = photo.width * scale;
  const dh = photo.height * scale;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const y = clamp(target - cutout.top * dh, box.y + box.h - dh, box.y);
  const x = clamp(-cutout.centerX * dw, box.x + box.w - dw, box.x);
  return { x, y, w: dw, h: dh };
}

// The cut-out person drawn again over the frame, so their head sits in front of "ATTENDING".
// Clipped to the window's columns (extended upward over the lettering) and to its upper part,
// so the lower body stays under the dark fade behind the name.
function drawPopOut(ctx, { photo, cutout, zoom }) {
  ctx.save();
  ctx.translate(WINDOW.cx, WINDOW.cy);
  ctx.rotate(WINDOW.angle);
  const top = -WINDOW.h / 2 - 160;
  ctx.beginPath();
  ctx.rect(-WINDOW.w / 2, top, WINDOW.w, POP_OUT_BOTTOM_Y - WINDOW.cy - top);
  ctx.clip();
  ctx.rotate(-WINDOW.angle);
  const r = photoRect(photo, cutout, zoom);
  // Fade the cut-out out towards its bottom edge so it blends into the photo underneath.
  const layer = document.createElement("canvas");
  layer.width = Math.ceil(r.w);
  layer.height = Math.ceil(POP_OUT_BOTTOM_Y - WINDOW.cy - r.y + 2);
  const lctx = layer.getContext("2d");
  lctx.drawImage(cutout.canvas, 0, 0, r.w, r.h);
  lctx.globalCompositeOperation = "destination-in";
  const fade = lctx.createLinearGradient(0, 0, 0, layer.height);
  // If the head touches the top of the original photo, its cut-out has a flat top; soften that edge too.
  const topFade = cutout.top < 0.03 ? Math.min(0.2, 60 / layer.height) : 0;
  fade.addColorStop(0, topFade ? "rgba(0,0,0,0)" : "rgba(0,0,0,1)");
  if (topFade) fade.addColorStop(topFade, "rgba(0,0,0,1)");
  fade.addColorStop(Math.max(topFade, 1 - 120 / layer.height), "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  lctx.fillStyle = fade;
  lctx.fillRect(0, 0, layer.width, layer.height);
  ctx.drawImage(layer, r.x, r.y);
  ctx.restore();
}

// The photo (or initials) inside the frame's clear centre, with a dark fade at the bottom for the name.
function drawWindow(ctx, { name, photo, cutout, zoom }) {
  ctx.save();
  ctx.translate(WINDOW.cx, WINDOW.cy);
  ctx.rotate(WINDOW.angle);
  roundRect(ctx, -WINDOW.w / 2, -WINDOW.h / 2, WINDOW.w, WINDOW.h, WINDOW.r);
  ctx.clip();
  ctx.rotate(-WINDOW.angle); // keep the photo itself upright; only its edges follow the tilt
  const pad = 40;
  const box = { x: -WINDOW.w / 2 - pad, y: -WINDOW.h / 2 - pad, w: WINDOW.w + pad * 2, h: WINDOW.h + pad * 2 };
  if (photo) {
    const r = photoRect(photo, cutout, zoom);
    ctx.drawImage(photo, r.x, r.y, r.w, r.h);
  } else {
    const g = ctx.createRadialGradient(0, -80, 40, 0, -80, WINDOW.h * 0.75);
    g.addColorStop(0, "#0E3A44");
    g.addColorStop(1, "#02181A");
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.save();
    ctx.font = `400 300px ${NEON_FONT}`;
    ctx.textAlign = "center";
    ctx.shadowColor = NEON;
    ctx.shadowBlur = 40;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(initials(name), 0, 20);
    ctx.restore();
  }
  const scrim = ctx.createLinearGradient(0, WINDOW.h * 0.02, 0, WINDOW.h / 2 + pad);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(0.5, "rgba(0,0,0,0.6)");
  scrim.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = scrim;
  ctx.fillRect(box.x, 0, box.w, box.h / 2 + pad);
  ctx.restore();
}

function drawNameBlock(ctx, { name, role, org, day, passType }, config) {
  const cx = WINDOW.cx;
  const maxW = WINDOW.w - 120;
  ctx.save();
  ctx.textAlign = "center";

  // Venue and time, just inside the frame's bottom edge.
  let y = 1176;
  ctx.fillStyle = SOFT;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(`${config.time} · ${config.venue}`, cx, y);

  // Day pill. Volunteers and speakers also get their role in it, since the frame itself says "ATTENDING".
  y -= 62;
  const parts = [];
  if (passType.id !== "attendee") parts.push(passType.label);
  parts.push(day ? `${day.name} · ${day.date}` : "Pick your day");
  const pillText = parts.join(" · ").toUpperCase();
  ctx.font = `600 26px ${SANS}`;
  const pillW = Math.min(measureSpaced(ctx, pillText, 2) + 60, maxW);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  roundRect(ctx, cx - pillW / 2, y - 27, pillW, 54, 27);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = NEON;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = NEON;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = day ? WHITE : "rgba(255,255,255,0.55)";
  fillSpaced(ctx, pillText, cx, y + 9, 2);

  // Role · company, then the name above it (up to two lines, shrinking to fit).
  y -= 60;
  const detail = [role.trim(), org.trim()].filter(Boolean).join(" · ");
  if (detail) {
    ctx.fillStyle = SOFT;
    ctx.font = `400 34px ${SANS}`;
    ctx.fillText(clampLines(ctx, [detail], 1, maxW)[0], cx, y);
    y -= 54;
  }
  const displayName = (name.trim() || "Your Name").toUpperCase();
  // Prefer one line (shrinking down to 84px) so the name covers less of the photo; wrap only long names.
  const { size, lines } = fitLines(ctx, displayName, maxW, [
    { from: 112, to: 84, maxLines: 1 },
    { from: 96, to: 64, maxLines: 2 },
  ]);
  ctx.font = `400 ${size}px ${NEON_FONT}`;
  ctx.fillStyle = name.trim() ? WHITE : "rgba(255,255,255,0.45)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 18;
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], cx, y);
    y -= size * 1.02;
  }
  ctx.restore();
}

// Strip under the frame: GDG New Delhi on the left, the hashtag in the middle, Commudle on the right.
function drawBoardFooter(ctx, { commudle }, config) {
  const mid = 1314;
  ctx.save();
  const h = 26;
  drawGdgMark(ctx, 52, mid - h / 2, h);
  ctx.fillStyle = WHITE;
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText(config.community, 52 + (h * GDG_MARK.width) / GDG_MARK.height + 12, mid + 8);
  ctx.fillStyle = NEON_LIGHT;
  ctx.font = `500 24px ${MONO}`;
  ctx.textAlign = "center";
  ctx.fillText(config.hashtag, BOARD.w / 2 + 40, mid + 8);
  ctx.textAlign = "left";
  if (commudle) {
    const ch = 36;
    const cw = (commudle.width / commudle.height) * ch;
    ctx.drawImage(commudle, BOARD.w - 52 - cw, mid - ch / 2, cw, ch);
  }
  ctx.restore();
}

// X (16:9): the board on the left, event details in a column on the right.
function drawXDetails(ctx, { day, commudle, passType }, config) {
  const x0 = 810;
  const maxW = 750;
  ctx.save();
  const h = 40;
  drawGdgMark(ctx, x0, 150, h);
  ctx.fillStyle = WHITE;
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(config.community, x0 + (h * GDG_MARK.width) / GDG_MARK.height + 16, 182);

  const headline = fitLines(ctx, `${passType.verb.toUpperCase()} DEVFEST NEW DELHI 2026`, maxW, [{ from: 96, to: 56, maxLines: 2 }]);
  let y = 340;
  ctx.font = `400 ${headline.size}px ${NEON_FONT}`;
  ctx.shadowColor = NEON;
  ctx.shadowBlur = 30;
  for (const line of headline.lines) {
    ctx.fillText(line, x0, y);
    y += headline.size * 1.04;
  }
  ctx.shadowBlur = 0;
  y += 6;
  ctx.fillStyle = NEON_LIGHT;
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(day ? `${day.name} · ${day.date}` : "Pick your day", x0, y);
  y += 50;
  ctx.fillStyle = SOFT;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(`${config.time} · ${config.venue}`, x0, y);
  y += 48;
  ctx.fillStyle = NEON_LIGHT;
  ctx.font = `500 28px ${MONO}`;
  ctx.fillText(config.hashtag, x0, y);
  if (commudle) {
    const ch = 46;
    const cw = (commudle.width / commudle.height) * ch;
    ctx.drawImage(commudle, x0, 790, cw, ch);
  }
  ctx.restore();
}

// ── helpers ──────────────────────────────────────────────────────────────

// Finds the largest Anton size that fits `text` within maxLines, trying each { from, to, maxLines } step in order.
// Falls back to the last step's smallest size, with "…" if it still doesn't fit.
function fitLines(ctx, text, maxW, steps) {
  for (const { from, to, maxLines } of steps) {
    for (let size = from; size >= to; size -= 2) {
      ctx.font = `400 ${size}px ${NEON_FONT}`;
      const lines = wrap(ctx, text, maxW);
      if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { size, lines };
    }
  }
  const last = steps[steps.length - 1];
  ctx.font = `400 ${last.to}px ${NEON_FONT}`;
  return { size: last.to, lines: clampLines(ctx, wrap(ctx, text, maxW), last.maxLines, maxW) };
}

function drawGdgMark(ctx, x, top, h) {
  const k = h / GDG_MARK.height;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = GDG_MARK.stroke * k;
  for (const [color, [ax, ay], [bx, by]] of GDG_MARK.bars) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + ax * k, top + ay * k);
    ctx.lineTo(x + bx * k, top + by * k);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function measureSpaced(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
}

// Letter-spaced text. Respects ctx.textAlign "left" | "center" | "right".
function fillSpaced(ctx, text, x, y, spacing) {
  const align = ctx.textAlign;
  const total = measureSpaced(ctx, text, spacing);
  let cx = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  ctx.textAlign = "left";
  for (const c of text) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = align;
}

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function clampLines(ctx, lines, max, maxW) {
  const out = lines.slice(0, max).map((l) => truncate(ctx, l, maxW));
  if (lines.length > max) out[max - 1] = truncate(ctx, `${out[max - 1]}…`, maxW, true);
  return out;
}

function truncate(ctx, text, maxW, forceEllipsis = false) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text.replace(/…$/, "");
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return forceEllipsis || t !== text ? `${t.trimEnd()}…` : t;
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DF";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
