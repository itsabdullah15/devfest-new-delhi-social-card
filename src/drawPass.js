// Draws the attendee pass onto a canvas in one of three social formats. Pure drawing: no DOM or React state.

export const FORMATS = [
  { id: "linkedin", label: "LinkedIn Post", ratio: "1:1", width: 1200, height: 1200 },
  { id: "instagram", label: "Instagram Post", ratio: "4:5", width: 1080, height: 1350 },
  { id: "x", label: "X Post", ratio: "16:9", width: 1600, height: 900 },
  { id: "story", label: "Instagram Story", ratio: "9:16", width: 1080, height: 1920 },
];

const SANS = '"Google Sans Flex", system-ui, sans-serif';
const MONO = '"Google Sans Code", ui-monospace, monospace';
const INK = "#202124";
const MUTED = "#5F6368";
const FAINT = "#80868B";
const HAIRLINE = "#E8EAED";
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

// Vertical layouts share one design, scaled by `s`. Numbers are canvas pixels.
const LAYOUTS = {
  instagram: {
    kind: "vertical", s: 1, card: { x: 64, y: 64, w: 952, h: 1222 }, pad: 72,
    headerY: 186, titleY: 372, editionY: 446, ruleY: 504, photoR: 128, photoCy: 676, daysTop: 876, perfY: 1128,
  },
  linkedin: {
    kind: "vertical", s: 0.9, card: { x: 64, y: 64, w: 1072, h: 1072 }, pad: 72,
    headerY: 176, titleY: 338, editionY: 404, ruleY: 452, photoR: 112, photoCy: 600, daysTop: 760, perfY: 1000,
  },
  // Stories: the card sits inside the safe area that story apps leave clear of their top bar and reply box.
  story: {
    kind: "vertical", s: 1, card: { x: 64, y: 250, w: 952, h: 1420 }, pad: 72,
    headerY: 372, titleY: 560, editionY: 634, ruleY: 712, photoR: 140, photoCy: 900, daysTop: 1150, perfY: 1490,
  },
  x: {
    kind: "landscape", s: 0.9, card: { x: 56, y: 56, w: 1488, h: 788 }, pad: 72, stubX: 1108,
    headerY: 160, titleY: 310, editionY: 374, ruleY: 418, photoR: 104, photoCy: 562, footRuleY: 716, timeY: 778,
  },
};

export async function loadPassFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`700 150px ${SANS}`),
    document.fonts.load(`600 40px ${SANS}`),
    document.fonts.load(`500 40px ${SANS}`),
    document.fonts.load(`400 32px ${SANS}`),
    document.fonts.load(`500 24px ${MONO}`),
  ]).catch(() => {});
}

/**
 * @param data { name, role, org, day, theme, photo, zoom, logo, commudle, format, passType }
 *   `role` is the person's job title; `passType` is attendee / volunteer / speaker from the config.
 *   `day` is the chosen day object, or null before one is picked.
 */
export function drawPass(ctx, data, config) {
  const format = FORMATS.find((f) => f.id === data.format) || FORMATS[0];
  const L = LAYOUTS[format.id];
  ctx.save();
  ctx.clearRect(0, 0, format.width, format.height);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  drawBackground(ctx, format, data.theme.bg);
  if (L.kind === "landscape") drawLandscape(ctx, data, config, L);
  else drawVertical(ctx, data, config, L, format);
  ctx.restore();
}

function drawVertical(ctx, data, config, L, format) {
  const { card, s } = L;
  const x0 = card.x + L.pad;
  const x1 = card.x + card.w - L.pad;
  const bottom = card.y + card.h;

  drawCardShape(ctx, card);
  // Lanyard slot.
  ctx.fillStyle = data.theme.bg;
  roundRect(ctx, format.width / 2 - 80 * s, card.y + 34 * s, 160 * s, 22 * s, 11 * s);
  ctx.fill();
  drawPerforation(ctx, data.theme.bg, { orientation: "h", at: L.perfY, from: card.x, to: card.x + card.w });

  drawHeader(ctx, config, data, x0, x1, L.headerY, s);
  drawTitle(ctx, config, x0, L.titleY, L.editionY, s);
  hairline(ctx, x0, x1, L.ruleY, s);
  drawAttendee(ctx, data, x0, x1, L.photoCy, L.photoR, s);
  drawDay(ctx, data.day, config, { x0, x1, top: L.daysTop, s });

  // Footer under the perforation: venue and hashtag on the left, Commudle on the right.
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${28 * s}px ${SANS}`;
  ctx.fillText(config.venue, x0, L.perfY + 62 * s);
  ctx.fillStyle = data.theme.ink;
  ctx.font = `500 ${26 * s}px ${MONO}`;
  ctx.fillText(config.hashtag, x0, L.perfY + 104 * s);
  drawCommudle(ctx, data.commudle, x1, (L.perfY + bottom) / 2, 40 * s);
}

function drawLandscape(ctx, data, config, L) {
  const { card, s } = L;
  const x0 = card.x + L.pad;
  const x1 = L.stubX - 64;
  const sx0 = L.stubX + 56;
  const sx1 = card.x + card.w - 64;

  drawCardShape(ctx, card);
  drawPerforation(ctx, data.theme.bg, { orientation: "v", at: L.stubX, from: card.y, to: card.y + card.h });

  // Main panel.
  drawHeader(ctx, config, data, x0, x1, L.headerY, s);
  drawTitle(ctx, config, x0, L.titleY, L.editionY, s);
  hairline(ctx, x0, x1, L.ruleY, s);
  drawAttendee(ctx, data, x0, x1, L.photoCy, L.photoR, s);
  hairline(ctx, x0, x1, L.footRuleY, s);
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${28 * s}px ${SANS}`;
  ctx.fillText(config.venue, x0, L.timeY);

  // Stub: the day, then hashtag and Commudle at the bottom.
  drawDay(ctx, data.day, config, { x0: sx0, x1: sx1, top: L.headerY - 10, s, narrow: true });
  ctx.fillStyle = data.theme.ink;
  ctx.font = `500 ${26 * s}px ${MONO}`;
  ctx.fillText(config.hashtag, sx0, L.footRuleY - 2);
  drawCommudle(ctx, data.commudle, sx1, L.timeY - 12, 38 * s);
}

// ── sections ─────────────────────────────────────────────────────────────

function drawBackground(ctx, format, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, format.width, format.height);
  // Faint grid, like graph paper.
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= format.width; x += 54) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, format.height);
  }
  for (let y = 0; y <= format.height; y += 54) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(format.width, y + 0.5);
  }
  ctx.stroke();
}

function drawCardShape(ctx, card) {
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, card.x, card.y, card.w, card.h, 44);
  ctx.fill();
}

// Dashed tear line with half-circle notches "cut" from the card edges in the background colour.
function drawPerforation(ctx, bg, { orientation, at, from, to }) {
  ctx.fillStyle = bg;
  for (const edge of [from, to]) {
    ctx.beginPath();
    if (orientation === "h") ctx.arc(edge, at, 24, 0, Math.PI * 2);
    else ctx.arc(at, edge, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#DADCE0";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  if (orientation === "h") {
    ctx.moveTo(from + 40, at);
    ctx.lineTo(to - 40, at);
  } else {
    ctx.moveTo(at, from + 40);
    ctx.lineTo(at, to - 40);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHeader(ctx, config, { theme, logo, passType }, x0, x1, baseline, s) {
  if (logo) {
    const h = 56 * s;
    const w = Math.min((logo.width / logo.height) * h, 420 * s);
    ctx.drawImage(logo, x0, baseline - 42 * s, w, (w / logo.width) * logo.height);
  } else {
    const h = 40 * s;
    drawGdgMark(ctx, x0, baseline - 32 * s, h);
    ctx.fillStyle = INK;
    ctx.font = `600 ${32 * s}px ${SANS}`;
    ctx.fillText(config.community, x0 + (h * GDG_MARK.width) / GDG_MARK.height + 16 * s, baseline);
  }

  ctx.fillStyle = theme.ink;
  ctx.font = `500 ${24 * s}px ${MONO}`;
  ctx.textAlign = "right";
  fillSpaced(ctx, passType.badge, x1, baseline - 2 * s, 4 * s);
  ctx.textAlign = "left";
}

function drawTitle(ctx, config, x0, titleY, editionY, s) {
  ctx.fillStyle = INK;
  ctx.font = `700 ${156 * s}px ${SANS}`;
  fillSpaced(ctx, config.event, x0 - 6 * s, titleY, -4 * s);
  ctx.fillStyle = MUTED;
  ctx.font = `500 ${56 * s}px ${SANS}`;
  ctx.fillText(config.edition, x0, editionY);
}

function drawAttendee(ctx, { name, role, org, theme, photo, zoom, passType }, x0, x1, cy, r, s) {
  const cx = x0 + r;

  // Photo, or initials when there is none.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (photo) {
    drawCover(ctx, photo, cx - r, cy - r, r * 2, r * 2, zoom);
  } else {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = theme.id === "yellow" ? INK : "#FFFFFF";
    ctx.font = `600 ${r * 0.75}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText(initials(name), cx, cy + r * 0.27);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const tx = cx + r + 44 * s;
  const maxW = x1 - tx;
  const labelY = cy - 78 * s;

  ctx.fillStyle = theme.ink;
  ctx.font = `500 ${24 * s}px ${MONO}`;
  fillSpaced(ctx, passType.line, tx, labelY, 3 * s);

  // Name: largest size that fits in at most two lines.
  const displayName = name.trim() || "Your Name";
  let size = 64 * s;
  let lines;
  for (; size >= 44 * s; size -= 2) {
    ctx.font = `600 ${size}px ${SANS}`;
    lines = wrap(ctx, displayName, maxW);
    if (lines.length <= 2) break;
  }
  lines = clampLines(ctx, lines, 2, maxW);
  ctx.fillStyle = name.trim() ? INK : "#BDC1C6";
  let y = labelY + 22 * s + size;
  lines.forEach((line, i) => ctx.fillText(line, tx, y + i * size * 1.1));
  y += (lines.length - 1) * size * 1.1;

  const detail = [role.trim(), org.trim()].filter(Boolean).join(" · ");
  if (detail) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 ${32 * s}px ${SANS}`;
    // Two lines of role/company only when the name fits on one, so the block stays compact.
    const detailLines = clampLines(ctx, wrap(ctx, detail, maxW), lines.length > 1 ? 1 : 2, maxW);
    detailLines.forEach((line, i) => ctx.fillText(line, tx, y + 54 * s + i * 42 * s));
  }
}

// The chosen day as the pass's feature line: big day name, then date and start time.
// `narrow` (the X stub) lets the name wrap and puts date and time on separate lines.
function drawDay(ctx, day, config, { x0, x1, top, s, narrow = false }) {
  const labelY = top + 10 * s;
  ctx.fillStyle = day ? day.color : HAIRLINE;
  ctx.beginPath();
  ctx.arc(x0 + 8 * s, labelY - 8 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FAINT;
  ctx.font = `500 ${22 * s}px ${MONO}`;
  fillSpaced(ctx, "DAY", x0 + 28 * s, labelY, 3 * s);

  const size = (narrow ? 58 : 66) * s;
  ctx.font = `700 ${size}px ${SANS}`;
  ctx.fillStyle = day ? INK : "#BDC1C6";
  const nameLines = clampLines(ctx, wrap(ctx, day ? day.name : "Pick your day", x1 - x0), 2, x1 - x0);
  let y = labelY + 18 * s + size;
  nameLines.forEach((line, i) => fillSpaced(ctx, line, x0 - 2 * s, y + i * size * 1.05, -1 * s));
  y += (nameLines.length - 1) * size * 1.05;
  if (!day) return;

  ctx.fillStyle = MUTED;
  ctx.font = `400 ${34 * s}px ${SANS}`;
  if (narrow) {
    ctx.fillText(day.date, x0, y + 52 * s);
    ctx.fillText(config.time, x0, y + 96 * s);
  } else {
    ctx.fillText(`${day.date} · ${config.time}`, x0, y + 54 * s);
  }
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

// Commudle wordmark, right-aligned at x1 and vertically centred on cy.
function drawCommudle(ctx, img, x1, cy, h) {
  if (!img) return;
  const w = (img.width / img.height) * h;
  ctx.drawImage(img, x1 - w, cy - h / 2, w, h);
}

// ── helpers ──────────────────────────────────────────────────────────────

function hairline(ctx, x0, x1, y, s = 1) {
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(x0, y, x1 - x0, Math.max(1, 2 * s));
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

// Draws an image to fill the box (like CSS object-fit: cover), zoomed around its centre.
function drawCover(ctx, img, x, y, w, h, zoom = 1) {
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// Letter-spaced text. Respects ctx.textAlign "left" | "right".
function fillSpaced(ctx, text, x, y, spacing) {
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x, y);
    ctx.letterSpacing = "0px";
    return;
  }
  const chars = [...text];
  const total = chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  const align = ctx.textAlign;
  let cx = align === "right" ? x - total : x;
  ctx.textAlign = "left";
  for (const c of chars) {
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
