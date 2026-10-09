// Where attendees can post their pass. Web pages can't attach an image to these sites' composers,
// so on desktop we pre-fill the text where the site allows it and the attendee attaches the downloaded image.
// On phones the native share sheet attaches the image directly.

const enc = encodeURIComponent;

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5" strokeDasharray="4.2 2.6" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export const PLATFORMS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    formatId: "linkedin",
    Icon: LinkedInIcon,
    composeUrl: (text) => `https://www.linkedin.com/feed/?shareActive=true&text=${enc(text)}`,
    prefillsText: true,
    attachHint: "Attach it to the post that just opened.",
    // LinkedIn shows the page names as plain text; real tags need @ typed in the post.
    tagHint: "To tag GDG New Delhi, GDG Cloud New Delhi and Commudle, type @ and pick each page.",
  },
  {
    id: "x",
    label: "X",
    formatId: "x",
    Icon: XIcon,
    composeUrl: (text) => `https://x.com/intent/post?text=${enc(text)}`,
    prefillsText: true,
    attachHint: "Attach it to the post that just opened.",
  },
  {
    id: "instagram",
    label: "Instagram",
    formatId: "instagram",
    Icon: InstagramIcon,
    // Instagram has no web compose link; this opens the site, where "Create" uploads a post.
    composeUrl: () => "https://www.instagram.com/",
    prefillsText: false,
    attachHint: "In the Instagram tab, click Create and upload it.",
  },
  {
    id: "story",
    label: "Story",
    formatId: "story",
    Icon: StoryIcon,
    // Stories can only be posted from the apps, so desktop just downloads the image.
    composeUrl: null,
    prefillsText: false,
    attachHint: "Stories are posted from the Instagram, WhatsApp or LinkedIn app, so send it to your phone and add it to your story, or open this page on your phone.",
  },
];

// Phones and tablets get the native share sheet (image attached); desktops get download + compose tab.
export function prefersShareSheet() {
  try {
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    const canShare = navigator.canShare?.({ files: [new File([""], "pass.png", { type: "image/png" })] });
    return Boolean(touch && canShare);
  } catch {
    return false;
  }
}
