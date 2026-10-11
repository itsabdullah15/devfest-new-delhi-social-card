// Draws the DevFest New Delhi 2026 card onto a canvas in one of four social formats.
// The card is an "ATTENDING" (or "VOLUNTEERING") marquee: a gunmetal frame lined with warm bulbs, with the person's photo
// showing through its centre, and their name and day along the bottom.
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

// The board is 1080×1350. The photo shows through the frame's window, a rounded rectangle the frame
// (BEZEL px wide) is drawn around; the photo is clipped to it and the bezel covers its edges.
const BOARD = { w: 1080, h: 1350 };
const WINDOW = { cx: 540, cy: 716, w: 846, h: 1000, r: 30, angle: 0 };
const BEZEL = 50;
const BULB_GAP = 66; // target distance between bulb centres along the bezel

// Where the 1080×1350 board goes in each format (k = scale). X adds a details column on the right.
const PLACEMENT = {
  instagram: { x: 0, y: 0, k: 1 },
  linkedin: { x: 168, y: 106, k: 0.8 }, // the event header sits above the board and the footer runs full width below
  story: { x: 54, y: 430, k: 0.9 }, // story apps cover ~250px at the top and bottom; the header sits above the board
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
 * @param data { name, role, org, day, photo, cutout, zoom, commudle, format, passType, frameColour }
 *   `cutout` (optional) is the person cut out of `photo` (see cutout.js), for the pop-out in front of "ATTENDING";
 *   `day` is the chosen day (or null before one is picked);
 *   `passType` is attendee / volunteer from the config; `frameColour` is one of config.frameColours.
 */
export function drawPass(ctx, data, config) {
  const format = FORMATS.find((f) => f.id === data.format) || FORMATS[0];
  const place = PLACEMENT[format.id];
  data = { ...data, frameColour: data.frameColour || config.frameColours[0] };
  ctx.save();
  ctx.clearRect(0, 0, format.width, format.height);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  drawBackdrop(ctx, format.width, format.height, place, data.frameColour);
  if (STAGED[format.id]) drawStageLights(ctx, format.width, place, data.frameColour);

  ctx.save();
  ctx.translate(place.x, place.y);
  ctx.scale(place.k, place.k);
  drawBoard(ctx, data, config, { footer: format.id !== "x" && format.id !== "linkedin" });
  ctx.restore();

  if (format.id === "x") drawXDetails(ctx, data, config);
  if (STAGED[format.id]) drawEventHeader(ctx, data, config, format.width, STAGED[format.id]);
  if (format.id === "linkedin") {
    // The board's footer strip, stretched to the full card width under the frame.
    const s = format.width / BOARD.w;
    ctx.save();
    ctx.translate(0, 1158 - 1314 * s);
    ctx.scale(s, s);
    drawBoardFooter(ctx, data, config);
    ctx.restore();
  }
  ctx.restore();
}

// ── board ────────────────────────────────────────────────────────────────

function drawBoard(ctx, data, config, { footer }) {
  drawWindow(ctx, data);
  const headline = fitHeadline(ctx, data.passType.headline);
  drawFrame(ctx, headline, data.frameColour);
  drawHeadline(ctx, headline, data.frameColour);
  if (data.photo && data.cutout) drawPopOut(ctx, data);
  drawNameBlock(ctx, data, config);
  if (footer) drawBoardFooter(ctx, data, config);
}

// Near-black with a spotlight in the frame colour falling on the board from above, and a soft vignette.
function drawBackdrop(ctx, W, H, place, colour) {
  ctx.fillStyle = "#060607";
  ctx.fillRect(0, 0, W, H);
  const cx = place.x + BOARD.w * place.k * 0.5;
  const cy = place.y + BOARD.h * place.k * 0.28;
  const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, BOARD.h * place.k * 0.85);
  spot.addColorStop(0, `rgba(${colour.glow}, 0.14)`);
  spot.addColorStop(0.45, `rgba(${colour.glow}, 0.04)`);
  spot.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, H);
}

// Photo placement, in window-centred upright coordinates, shared by the photo and its cut-out so they line up.
// With a cut-out, the photo is moved (and zoomed in up to 1.8×, if needed) so the top of the person's head lands
// across the bottom of the "ATTENDING" lettering; that overlap is what makes the pop-out read.
const WINDOW_PAD = 40;
const HEAD_TOP_Y = 236; // board y for the top of the head (the lettering ends at about 300–318)
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

// The cut-out person drawn again over the frame, so their head sits in front of the headline.
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

// The photo (or an empty spotlit panel) inside the frame's clear centre, with a dark fade at the bottom for the name.
function drawWindow(ctx, { photo, cutout, zoom, frameColour }) {
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
    g.addColorStop(0, `rgba(${frameColour.glow}, 0.12)`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = "#0E0E10";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  const scrim = ctx.createLinearGradient(0, WINDOW.h * 0.02, 0, WINDOW.h / 2 + pad);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(0.5, "rgba(0,0,0,0.6)");
  scrim.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = scrim;
  ctx.fillRect(box.x, 0, box.w, box.h / 2 + pad);
  ctx.restore();
}

// ── frame ────────────────────────────────────────────────────────────────

// The marquee: a brushed gunmetal bezel around the window, a hairline in the frame colour on its inner edge, and
// bulbs evenly spaced along its centre line, all lit.
// `gap` is the headline's horizontal span; top-edge bulbs behind it are left out so the letters read cleanly.
function drawFrame(ctx, gap, colour) {
  const { cx, cy, w, h, r } = WINDOW;
  const outer = { x: cx - w / 2 - BEZEL, y: cy - h / 2 - BEZEL, w: w + BEZEL * 2, h: h + BEZEL * 2, r: r + BEZEL };
  ctx.save();

  // Warm light spilling from the bulbs onto the backdrop.
  ctx.save();
  ctx.shadowColor = `rgba(${colour.glow}, 0.45)`;
  ctx.shadowBlur = 90;
  roundRect(ctx, outer.x, outer.y, outer.w, outer.h, outer.r);
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r, true);
  ctx.fillStyle = "#000";
  ctx.fill("evenodd");
  ctx.restore();

  // Bezel: metal ring between the outer edge and the window.
  const metal = ctx.createLinearGradient(outer.x, outer.y, outer.x + outer.w, outer.y + outer.h);
  metal.addColorStop(0, "#3A3C42");
  metal.addColorStop(0.3, "#1B1C20");
  metal.addColorStop(0.55, "#2E3036");
  metal.addColorStop(0.8, "#17181B");
  metal.addColorStop(1, "#34363C");
  roundRect(ctx, outer.x, outer.y, outer.w, outer.h, outer.r);
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r, true);
  ctx.fillStyle = metal;
  ctx.fill("evenodd");

  // Bevel highlights: a light outer rim, a coloured inner rim, and a shadow cast onto the photo.
  ctx.lineWidth = 2;
  roundRect(ctx, outer.x + 1, outer.y + 1, outer.w - 2, outer.h - 2, outer.r - 1);
  const rim = ctx.createLinearGradient(0, outer.y, 0, outer.y + outer.h);
  rim.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  rim.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
  ctx.clip();
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 30;
  ctx.lineWidth = 12;
  roundRect(ctx, cx - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 12, r + 6);
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = 2.5;
  roundRect(ctx, cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2, r + 1);
  const line = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  colour.line.forEach((c, i) => line.addColorStop(i / (colour.line.length - 1), c));
  ctx.strokeStyle = line;
  ctx.stroke();

  const topY = WINDOW.cy - WINDOW.h / 2 - BEZEL / 2;
  for (const [x, y] of bulbPositions()) {
    if (y < topY + WINDOW.r && x > gap.left - 24 && x < gap.right + 24) continue;
    drawBulb(ctx, x, y, colour);
  }
  ctx.restore();
}

// Bulb centres along the bezel's centre line: one in each corner, the rest evenly spaced on each side.
function bulbPositions() {
  const { cx, cy, w, h } = WINDOW;
  const half = BEZEL / 2;
  const x0 = cx - w / 2 - half;
  const x1 = cx + w / 2 + half;
  const y0 = cy - h / 2 - half;
  const y1 = cy + h / 2 + half;
  const inset = WINDOW.r * 0.45; // corner bulbs sit on the curve, a little in from the square corner
  const corners = [[x0 + inset, y0 + inset], [x1 - inset, y0 + inset], [x1 - inset, y1 - inset], [x0 + inset, y1 - inset]];
  const points = [];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(len / BULB_GAP));
    for (let j = 0; j < n; j++) points.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  return points;
}

function drawBulb(ctx, x, y, colour) {
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 30);
  glow.addColorStop(0, `rgba(${colour.glow}, 0.55)`);
  glow.addColorStop(0.4, `rgba(${colour.glow}, 0.16)`);
  glow.addColorStop(1, `rgba(${colour.glow}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  // Socket.
  const socket = ctx.createLinearGradient(x, y - 13, x, y + 13);
  socket.addColorStop(0, "#0C0C0E");
  socket.addColorStop(1, "#4A4B50");
  ctx.fillStyle = socket;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  // Bulb, hottest just above centre.
  const bulb = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10);
  bulb.addColorStop(0, "#FFFFFF");
  bulb.addColorStop(0.45, colour.bulb);
  bulb.addColorStop(1, colour.bulbEdge);
  ctx.fillStyle = bulb;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
}

// The big word across the top of the frame, in warm white with a soft glow and a dark edge so it stands
// clear of the bulbs behind it. Every word is centred on the line that puts "ATTENDING"'s baseline at
// HEADLINE_BASE, so a shorter one like "VOLUNTEERING" sits in the middle of the frame's top edge too.
const HEADLINE_BASE = 318;
function fitHeadline(ctx, text) {
  const maxW = WINDOW.w - 110;
  const maxH = 226;
  ctx.save();
  const mid = HEADLINE_BASE - headlineSize(ctx, "ATTENDING", maxW, maxH).ascent / 2;
  const { size, fitted, ascent } = headlineSize(ctx, text, maxW, maxH);
  ctx.restore();
  const base = Math.round(mid + ascent / 2);
  return { text, size, base, top: base - ascent, left: WINDOW.cx - fitted.width / 2, right: WINDOW.cx + fitted.width / 2 };
}

// The largest Anton size at which `text` fits maxW × maxH, with its measurements.
function headlineSize(ctx, text, maxW, maxH) {
  ctx.font = `400 300px ${NEON_FONT}`;
  const m = ctx.measureText(text);
  const size = Math.floor(300 * Math.min(maxW / m.width, maxH / (m.actualBoundingBoxAscent || 258)));
  ctx.font = `400 ${size}px ${NEON_FONT}`;
  const fitted = ctx.measureText(text);
  return { size, fitted, ascent: fitted.actualBoundingBoxAscent || size * 0.86 };
}

function drawHeadline(ctx, { text, size, base, top }, colour) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `400 ${size}px ${NEON_FONT}`;
  const fill = ctx.createLinearGradient(0, top, 0, base);
  fill.addColorStop(0, "#FFFFFF");
  fill.addColorStop(0.55, "#FFFFFF");
  fill.addColorStop(1, colour.tint);

  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#000";
  ctx.fillText(text, WINDOW.cx, base);
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = `rgba(${colour.glow}, 0.55)`;
  ctx.shadowBlur = 48;
  ctx.fillStyle = fill;
  ctx.fillText(text, WINDOW.cx, base);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(20, 14, 6, 0.9)";
  ctx.strokeText(text, WINDOW.cx, base);
  ctx.fillText(text, WINDOW.cx, base);
  ctx.restore();
}

function drawNameBlock(ctx, { name, role, org, day, frameColour }, config) {
  const cx = WINDOW.cx;
  const maxW = WINDOW.w - 120;
  ctx.save();
  ctx.textAlign = "center";

  // Venue and time, just inside the frame's bottom edge.
  let y = 1176;
  ctx.fillStyle = SOFT;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(`${config.time} · ${config.venue}`, cx, y);

  // Day pill.
  y -= 62;
  const pillText = (day ? `${day.name} · ${day.date}` : "Pick your day").toUpperCase();
  ctx.font = `600 26px ${SANS}`;
  const pillW = Math.min(measureSpaced(ctx, pillText, 2) + 60, maxW);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  roundRect(ctx, cx - pillW / 2, y - 27, pillW, 54, 27);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = frameColour.accent;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = frameColour.accent;
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
function drawBoardFooter(ctx, { commudle, frameColour }, config) {
  const mid = 1314;
  ctx.save();
  const h = 26;
  drawGdgMark(ctx, 52, mid - h / 2, h);
  ctx.fillStyle = WHITE;
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText(config.community, 52 + (h * GDG_MARK.width) / GDG_MARK.height + 12, mid + 8);
  ctx.fillStyle = frameColour.accentLight;
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

// Formats with a stage: an event header above the board (`kicker` and `title` are baselines, `size` the
// largest title size) and a spotlight on the frame.
const STAGED = {
  story: { kicker: 318, title: 418, size: 92 }, // just below where the story app's top bar sits
  linkedin: { kicker: 60, title: 132, size: 66 },
};

// A spotlight cone from the top edge falling onto the frame, and the glow it casts on the floor.
// The cone is stacked from a few widening layers so its edges come out soft.
function drawStageLights(ctx, W, place, colour) {
  const board = { x: place.x, y: place.y, w: BOARD.w * place.k, h: BOARD.h * place.k };
  const bottom = board.y + board.h * 0.6;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const top = 90 + 160 * t; // half-width at the top edge
    const base = board.w * (0.32 + 0.3 * t); // half-width where the cone fades out
    const cone = ctx.createLinearGradient(0, 0, 0, bottom);
    cone.addColorStop(0, `rgba(${colour.glow}, 0.05)`);
    cone.addColorStop(0.5, `rgba(${colour.glow}, 0.03)`);
    cone.addColorStop(1, `rgba(${colour.glow}, 0)`);
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(W / 2 - top, 0);
    ctx.lineTo(W / 2 + top, 0);
    ctx.lineTo(W / 2 + base, bottom);
    ctx.lineTo(W / 2 - base, bottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.translate(W / 2, board.y + (WINDOW.cy + WINDOW.h / 2 + BEZEL) * place.k);
  ctx.scale(1, 0.16);
  const floor = ctx.createRadialGradient(0, 0, 0, 0, 0, 560);
  floor.addColorStop(0, `rgba(${colour.glow}, 0.4)`);
  floor.addColorStop(1, `rgba(${colour.glow}, 0)`);
  ctx.fillStyle = floor;
  ctx.fillRect(-560, -560, 1120, 1120);
  ctx.restore();
}

// The event name above the board: a small "GDG New Delhi presents" line between two short rules, then the title.
function drawEventHeader(ctx, { frameColour }, config, W, at) {
  const cx = W / 2;
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = frameColour.accentLight;
  ctx.font = `600 24px ${SANS}`;
  fillSpaced(ctx, `${config.community} presents`.toUpperCase(), cx, at.kicker, 6);

  const title = `${config.event} ${config.edition.replace(" · ", " ")}`.toUpperCase();
  const { size, lines } = fitLines(ctx, title, 900, [{ from: at.size, to: 48, maxLines: 1 }]);
  ctx.font = `400 ${size}px ${NEON_FONT}`;
  ctx.shadowColor = `rgba(${frameColour.glow}, 0.6)`;
  ctx.shadowBlur = 36;
  ctx.fillStyle = WHITE;
  ctx.fillText(lines[0], cx, at.title);

  // Short accent rules either side of the small line.
  ctx.shadowBlur = 0;
  ctx.font = `600 24px ${SANS}`;
  const half = measureSpaced(ctx, `${config.community} presents`.toUpperCase(), 6) / 2;
  ctx.strokeStyle = frameColour.accent;
  ctx.lineWidth = 2;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * (half + 20), at.kicker - 8);
    ctx.lineTo(cx + dir * (half + 80), at.kicker - 8);
    ctx.stroke();
  }
  ctx.restore();
}

// X (16:9): the board on the left, event details in a column on the right.
function drawXDetails(ctx, { day, commudle, passType, frameColour }, config) {
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
  ctx.shadowColor = frameColour.accent;
  ctx.shadowBlur = 30;
  for (const line of headline.lines) {
    ctx.fillText(line, x0, y);
    y += headline.size * 1.04;
  }
  ctx.shadowBlur = 0;
  y += 6;
  ctx.fillStyle = frameColour.accentLight;
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(day ? `${day.name} · ${day.date}` : "Pick your day", x0, y);
  y += 50;
  ctx.fillStyle = SOFT;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(`${config.time} · ${config.venue}`, x0, y);
  y += 48;
  ctx.fillStyle = frameColour.accentLight;
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

// `append` adds the shape to the current path (for cut-outs filled with "evenodd") instead of starting a new one.
function roundRect(ctx, x, y, w, h, r, append = false) {
  if (!append) ctx.beginPath();
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
