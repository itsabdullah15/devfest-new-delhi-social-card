# DevFest New Delhi 2026 · Pass Generator

A small React (Vite) app where attendees, volunteers and speakers pick their pass type, add their name, role, company, photo and the day they're attending,
then download or share a pass image sized for LinkedIn (1200×1200), Instagram (1080×1350), X (1600×900)
or stories (1080×1920). Everything runs in the browser;
photos are never uploaded.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Posting to LinkedIn, X and Instagram

The "Post on" buttons use each platform's size (LinkedIn 1:1, X 16:9, Instagram 4:5, Story 9:16).
The Story button shares the 9:16 image on phones; on desktop it only downloads it, since stories are posted
from the apps.

- **Phones:** opens the system share sheet with the image and caption attached; the attendee picks the app.
- **Desktop:** websites can't attach images to these sites through a link. For LinkedIn and X the button
  copies the image to the clipboard, downloads it, and opens the composer with the caption pre-filled; the
  attendee pastes the image with ⌘V / Ctrl+V. Instagram has no web composer link, so it opens instagram.com
  with the caption copied and the image downloaded for upload.

## Edit event details

All event text lives in [src/config.js](src/config.js): pass types (attendee, volunteer, speaker), community name, day names and dates, start time,
venue, hashtags, logo paths and the pass colours.

## Use the official GDG New Delhi logo

Save the logo from the GDG New Delhi brand-assets folder as `public/assets/gdg-new-delhi-logo.png`
(a transparent PNG works best) to use an image instead. Without it, the pass draws the GDG bracket mark
with "GDG New Delhi" next to it.

The Commudle wordmark is at `public/assets/commudle-logo.png` and appears at the bottom of every pass.

## Deploy

It's a static site. On Vercel or Netlify, import the folder: build command `npm run build`,
output directory `dist`.

## Files

- `src/App.jsx` — the form, live preview, download/share and caption.
- `src/drawPass.js` — draws the pass on a canvas in the three sizes (layout, text fitting, photo crop).
- `src/platforms.jsx` — the LinkedIn / X / Instagram buttons (compose links, icons).
- `src/config.js` — event details.
- `src/styles.css` — page styles.
