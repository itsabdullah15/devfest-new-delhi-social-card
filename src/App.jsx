import { useEffect, useMemo, useRef, useState } from "react";
import { PASS_CONFIG } from "./config.js";
import { FORMATS, GDG_MARK, drawPass, lightenLogo, loadPassFonts } from "./drawPass.js";
import { PLATFORMS, prefersShareSheet } from "./platforms.jsx";
import { cutOutPerson } from "./cutout.js";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "attendee";
}

function buildCaption(passType, day, platformId) {
  const when = day ? ` on ${day.name} (${day.date})` : "";
  const handles = PASS_CONFIG.mentions[platformId];
  const mentions = handles?.length ? `${handles.join(PASS_CONFIG.mentionSeparator?.[platformId] ?? " ")}\n\n` : "";
  return `${passType.verb} DevFest New Delhi 2026 by ${PASS_CONFIG.community}${when}. ${passType.closer}\n\n${mentions}${PASS_CONFIG.hashtags.join(" ")}`;
}

const PASTE_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘V" : "Ctrl+V";

function copyText(text) {
  return navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false);
}

// Accepts a promise for the PNG so the write can start inside the click while the image renders.
function copyImage(blobPromise) {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return Promise.resolve(false);
    return navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

function loadImage(src, onLoad) {
  if (!src) return;
  const img = new Image();
  img.onload = () => onLoad(img);
  img.src = src;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}

function GdgMark() {
  return (
    <svg className="gdg-mark" viewBox={`0 0 ${GDG_MARK.width} ${GDG_MARK.height}`} aria-hidden="true">
      {GDG_MARK.bars.map(([color, [x1, y1], [x2, y2]]) => (
        <line key={color} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={GDG_MARK.stroke} strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default function App() {
  const [passTypeId, setPassTypeId] = useState(PASS_CONFIG.passTypes[0].id);
  const [frameColourId, setFrameColourId] = useState(PASS_CONFIG.frameColours[0].id);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [org, setOrg] = useState("");
  const [dayId, setDayId] = useState(null);
  const [formatId, setFormatId] = useState(FORMATS[0].id);
  const [photo, setPhoto] = useState(null); // { img, url }
  const [cutout, setCutout] = useState(null); // person cut out of the photo, for the pop-out effect
  const [cutoutState, setCutoutState] = useState("idle"); // "idle" | "working" | "done" | "failed"
  // The in-flight cut-out, so a download started meanwhile can wait for it instead of exporting without the pop-out.
  const cutoutJob = useRef(Promise.resolve(null));
  const [zoom, setZoom] = useState(1);
  const [photoError, setPhotoError] = useState("");
  const [commudle, setCommudle] = useState(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const canvasRef = useRef(null);
  const nameRef = useRef(null);
  const daysRef = useRef(null);
  const useShareSheet = useMemo(prefersShareSheet, []);
  const isTouch = useMemo(() => window.matchMedia?.("(pointer: coarse)").matches ?? false, []);
  const [notice, setNotice] = useState("");

  const format = FORMATS.find((f) => f.id === formatId);
  const day = PASS_CONFIG.days.find((d) => d.id === dayId) || null;
  const passType = PASS_CONFIG.passTypes.find((t) => t.id === passTypeId);
  const frameColour = PASS_CONFIG.frameColours.find((c) => c.id === frameColourId);
  const caption = buildCaption(passType, day);
  const nameError = attempted && !name.trim();
  const dayError = attempted && !day;

  useEffect(() => {
    loadPassFonts().then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    loadImage(PASS_CONFIG.commudleLogo, (img) => setCommudle(lightenLogo(img)));
  }, []);

  // Free the previous photo's object URL when it is replaced or the app unmounts.
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);

  // Cut the person out of each new photo for the pop-out. If it fails or finds no person, the card simply
  // shows the photo without the pop-out. A newer photo cancels an older run.
  useEffect(() => {
    setCutout(null);
    if (!photo) {
      setCutoutState("idle");
      return undefined;
    }
    let cancelled = false;
    setCutoutState("working");
    const job = cutOutPerson(photo.img).catch((error) => {
      console.warn("Pop-out unavailable:", error);
      return null;
    });
    cutoutJob.current = job;
    job.then((result) => {
      if (cancelled) return;
      setCutout(result);
      setCutoutState(result ? "done" : "failed");
    });
    return () => {
      cancelled = true;
    };
  }, [photo]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawPass(ctx, { name, role, org, day, photo: photo?.img, cutout, zoom, commudle, format: formatId, passType, frameColour }, PASS_CONFIG);
  }, [name, role, org, day, photo, cutout, zoom, commudle, formatId, passType, frameColour, fontsReady]);

  function loadPhoto(file) {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("That file isn't an image. Try a JPG or PNG.");
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError("That image is over 15 MB. Try a smaller one.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhoto({ img, url });
      setZoom(1);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setPhotoError("We couldn't read that image. Try a JPG or PNG.");
    };
    img.src = url;
  }

  function validate() {
    setAttempted(true);
    if (!name.trim()) {
      nameRef.current?.focus();
      return false;
    }
    if (!day) {
      daysRef.current?.querySelector("input")?.focus();
      return false;
    }
    return true;
  }

  // Renders the pass in any format on an offscreen canvas, independent of the preview's size.
  async function renderFile(formatId) {
    // If the photo is still being cut out, wait for it so the download includes the pop-out.
    const cut = photo ? await cutoutJob.current : null;
    const f = FORMATS.find((x) => x.id === formatId);
    const canvas = document.createElement("canvas");
    canvas.width = f.width;
    canvas.height = f.height;
    drawPass(canvas.getContext("2d"), { name, role, org, day, photo: photo?.img, cutout: cut, zoom, commudle, format: f.id, passType, frameColour }, PASS_CONFIG);
    const blob = await canvasToBlob(canvas);
    return new File([blob], `devfest-new-delhi-2026-${passType.id}-${slugify(name)}-${f.id}.png`, { type: "image/png" });
  }

  function saveFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function download(e) {
    e.preventDefault();
    if (!validate() || busy) return;
    setBusy(true);
    setNotice("");
    try {
      saveFile(await renderFile(formatId));
    } finally {
      setBusy(false);
    }
  }

  async function postTo(platform) {
    if (!validate() || busy) return;
    setBusy(true);
    setNotice("");
    const filePromise = renderFile(platform.formatId);
    const caption = buildCaption(passType, day, platform.id);

    if (useShareSheet) {
      // Phones: the share sheet attaches the image. Copy the caption too, as some apps drop shared text.
      const copied = copyText(caption);
      try {
        await navigator.share({ files: [await filePromise], text: caption });
        const tip = platform.tagHint ? ` ${platform.tagHint}` : "";
        setNotice((await copied) ? `Caption copied. If ${platform.label} doesn't add it, paste it into your post.${tip}` : tip.trim());
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(error);
          setNotice("Something went wrong preparing your card. Please try again.");
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    // Desktop: sites can't take an image through a link, so put it on the clipboard to paste into the post.
    // Where the site can't pre-fill the caption (Instagram), copy the caption instead. Both clipboard calls and
    // the new tab must start inside the click, before any await, or browsers block them.
    const copied = platform.prefillsText ? copyImage(filePromise) : platform.composeUrl ? copyText(caption) : Promise.resolve(false);
    const tab = platform.composeUrl ? window.open("", "_blank") : null;
    try {
      const file = await filePromise;
      saveFile(file);
      if (tab) {
        tab.opener = null;
        tab.location.href = platform.composeUrl(caption);
      }
      const ok = await copied;
      let message;
      if (!platform.composeUrl) message = `Your ${platform.label.toLowerCase()} card is downloaded. ${platform.attachHint}`;
      else if (!tab) message = `Your ${platform.label} card is downloaded. Your browser blocked the new tab, so open ${platform.label} and attach the image.`;
      else if (platform.prefillsText && ok) message = `Image copied. In the ${platform.label} post, click in the text box and press ${PASTE_KEY} to attach it. It's also downloaded, in case you'd rather upload it.`;
      else if (platform.prefillsText) message = `Your ${platform.label} card is downloaded. ${platform.attachHint}`;
      else message = `Your ${platform.label} card is downloaded. ${platform.attachHint}${ok ? " Your caption is copied, so paste it in too." : ""}`;
      setNotice(platform.tagHint && tab ? `${message} ${platform.tagHint}` : message);
    } catch (error) {
      tab?.close();
      console.error(error);
      setNotice("Something went wrong preparing your card. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const passLabel = `${format.label} ${passType.label.toLowerCase()} card for ${name.trim() || "you"}${day ? `, ${day.name}` : ""}`;

  return (
    <>
      <header className="top">
        <div className="wrap top-inner">
          <span className="brand">
            <GdgMark />
            {PASS_CONFIG.community}
          </span>
          <span className="top-event">DevFest New Delhi 2026 · October 16–18</span>
        </div>
      </header>

      <main className="wrap layout">
        <section className="intro">
          <h1>Get Your DevFest Social Card</h1>
          <p>
            Create your personalized DevFest New Delhi 2026 social card and share your excitement with the community. Choose your day,
            customize your card, and let everyone know you’ll be there!
          </p>
        </section>

        <form className="panel" onSubmit={download} noValidate>
          <fieldset className="field">
            <legend className="label">I'm a</legend>
            <div className="pass-types">
              {PASS_CONFIG.passTypes.map((t) => (
                <label className="pass-type" key={t.id}>
                  <input type="radio" name="passType" className="sr-only" checked={passTypeId === t.id} onChange={() => setPassTypeId(t.id)} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <span className="label" id="photo-label">
              Photo
            </span>
            <div className="photo-row">
              <label
                className={`photo-drop${dragging ? " drag" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  loadPhoto(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-labelledby="photo-label"
                  onChange={(e) => {
                    loadPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <span className="photo-thumb" aria-hidden="true" style={photo ? { backgroundImage: `url(${photo.url})` } : undefined} />
                <span className="photo-text">
                  <strong>{photo ? "Change photo" : "Upload a photo"}</strong>
                  <span>{photo ? (isTouch ? "Tap to choose a different one." : "Or drop a new one here.") : "JPG or PNG. A clear headshot works best."}</span>
                </span>
              </label>
              {photo && (
                <button type="button" className="link" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              )}
            </div>
            {photo && (
              <div className="zoom">
                <label htmlFor="zoom">Zoom</label>
                <input id="zoom" type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </div>
            )}
            {photo && cutoutState !== "done" && (
              <p className="photo-status" role="status">
                {cutoutState === "working"
                  ? "Placing you in front of the sign…"
                  : "Couldn’t find a person in this photo, so it sits behind the sign. A clear headshot works best."}
              </p>
            )}
            {photoError && (
              <p className="error" role="alert">
                {photoError}
              </p>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="name">
              Full name <span className="req">*</span>
            </label>
            <input
              ref={nameRef}
              id="name"
              type="text"
              maxLength={60}
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameError}
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <p className="error" id="name-error">
                Please enter your name.
              </p>
            )}
          </div>

          <div className="row-2">
            <div className="field">
              <label className="label" htmlFor="role">
                Role
              </label>
              <input id="role" type="text" maxLength={40} autoComplete="organization-title" placeholder="e.g. Android Developer" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="org">
                Company or college
              </label>
              <input id="org" type="text" maxLength={40} autoComplete="organization" placeholder="e.g. Delhi University" value={org} onChange={(e) => setOrg(e.target.value)} />
            </div>
          </div>

          <fieldset className="field" ref={daysRef} aria-describedby={dayError ? "day-error" : undefined}>
            <legend className="label">
              {passType.dayLabel} <span className="req">*</span>
            </legend>
            <div className="days">
              {PASS_CONFIG.days.map((d) => (
                <label className="day" key={d.id}>
                  <input type="radio" name="day" className="sr-only" checked={dayId === d.id} onChange={() => setDayId(d.id)} />
                  <span className="day-box" aria-hidden="true" />
                  <span className="day-dot" style={{ background: d.color }} aria-hidden="true" />
                  <span className="day-name">{d.name}</span>
                  <span className="day-date">{d.date}</span>
                </label>
              ))}
            </div>
            {dayError && (
              <p className="error" id="day-error">
                Pick the {passType.dayLabel.toLowerCase()}.
              </p>
            )}
          </fieldset>

          <fieldset className="field">
            <legend className="label">Choose Your Frame Colour</legend>
            <div className="swatches">
              {PASS_CONFIG.frameColours.map((c) => (
                <label className="swatch" key={c.id} title={c.label}>
                  <input type="radio" name="frame-colour" className="sr-only" checked={frameColourId === c.id} onChange={() => setFrameColourId(c.id)} aria-label={c.label} />
                  <span style={{ background: c.swatch }} />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="label">Choose Your Social Media Format</legend>
            <div className="formats">
              {FORMATS.map((f) => (
                <label className="format" key={f.id}>
                  <input type="radio" name="format" className="sr-only" checked={formatId === f.id} onChange={() => setFormatId(f.id)} />
                  <span className="format-name">
                    {f.label}
                    {f.labelExtra && <span className="format-extra"> {f.labelExtra}</span>}
                  </span>
                  <span className="format-meta">
                    {f.ratio}
                    <span className="format-dims">
                      {" "}
                      · {f.width}×{f.height}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Download My Card
            </button>
          </div>
          <div className="post-to">
            <span className="post-to-label">Post on</span>
            <div className="post-to-buttons">
              {PLATFORMS.map((p) => (
                <button type="button" key={p.id} className={`social social-${p.id}`} onClick={() => postTo(p)} disabled={busy}>
                  <p.Icon />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="notice" role="status" aria-live="polite">
            {notice}
          </p>
          <p className="note">Your photo stays on your device. Nothing is uploaded.</p>
        </form>

        <section className="preview" aria-label="Pass preview">
          <canvas
            ref={canvasRef}
            width={format.width}
            height={format.height}
            style={{ aspectRatio: `${format.width} / ${format.height}` }}
            role="img"
            aria-label={passLabel}
          />
          <div className="caption">
            <div className="caption-head">
              <span className="label">Suggested caption</span>
              <button type="button" className="link" onClick={copyCaption} aria-live="polite">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="caption-text">{caption}</p>
          </div>
        </section>
      </main>

    </>
  );
}
