// Event details shown on the pass. Edit these if anything changes.
export const PASS_CONFIG = {
  event: "DevFest",
  edition: "New Delhi · 2026",
  community: "GDG New Delhi",
  time: "9:00 AM IST onwards",
  venue: "Google Office, Gurgaon",
  hashtag: "#DevFestNewDelhi",
  hashtags: ["#DevFest", "#DevFestNewDelhi", "#GDGNewDelhi"],
  // Accounts named in the caption only when posting on that platform.
  // LinkedIn's share link can't create real @-tags, so it gets the page names as plain text.
  mentions: {
    x: ["@gdg_nd", "@gdgcloudnd", "@commudle"],
    instagram: ["@gdgnewdelhi", "@gdgcloudnd", "@commudle"],
    story: ["@gdgnewdelhi", "@gdgcloudnd", "@commudle"],
    linkedin: ["GDG New Delhi", "GDG Cloud New Delhi", "Commudle"],
  },
  mentionSeparator: { linkedin: " · " },

  // The card's "ATTENDING" neon marquee frame (1080×1350, with a clear centre for the photo).
  frame: "/assets/frame-attending.webp",

  // Commudle wordmark shown at the bottom of the card (made white automatically for the dark card).
  commudleLogo: "/assets/commudle-logo.png",

  // Pass types. `label` also appears in the card's day pill for volunteers and speakers; `verb` opens the caption.
  passTypes: [
    { id: "attendee", label: "Attendee", verb: "I'm attending", closer: "See you there!", dayLabel: "Day you're attending" },
    { id: "volunteer", label: "Volunteer", verb: "I'm volunteering at", closer: "Come say hi!", dayLabel: "Day you're volunteering" },
    { id: "speaker", label: "Speaker", verb: "I'm speaking at", closer: "Come catch my session!", dayLabel: "Day you're speaking" },
  ],

  days: [
    { id: "builder", name: "Builder Day", date: "Fri, Oct 16", color: "#4285F4" },
    { id: "storyteller", name: "Storyteller Day", date: "Sat, Oct 17", color: "#F9AB00" },
    { id: "leadership", name: "Leadership Day", date: "Sun, Oct 18", color: "#34A853" },
  ],
};
