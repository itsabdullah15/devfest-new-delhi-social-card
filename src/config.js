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

  // Commudle wordmark shown at the bottom of the card (made white automatically for the dark card).
  commudleLogo: "/assets/commudle-logo.png",

  // Pass types. `headline` is the big word across the top of the frame; `verb` opens the caption.
  passTypes: [
    { id: "attendee", label: "Attendee", headline: "ATTENDING", verb: "I'm attending", closer: "See you there!", dayLabel: "Day you're attending" },
    { id: "volunteer", label: "Volunteer", headline: "VOLUNTEERING", verb: "I'm volunteering at", closer: "Come say hi!", dayLabel: "Day you're volunteering" },
  ],

  // Frame colours the person can pick from (the first is the default). `swatch` is shown in the picker;
  // `bulb` / `bulbEdge` colour the bulbs, `glow` ("r, g, b") their light, `line` the hairline around the photo
  // (top, middle, bottom), `tint` the bottom of the headline, and `accent` / `accentLight` the pill and hashtag.
  frameColours: [
    { id: "gold", label: "Gold", swatch: "#E9B866", bulb: "#FFEFC8", bulbEdge: "#E8A84E", glow: "255, 190, 110", line: ["#F6DCA4", "#B8873E", "#E9C27A"], tint: "#F2D7A2", accent: "#E9B866", accentLight: "#F4D9A6" },
    { id: "blue", label: "Blue", swatch: "#4285F4", bulb: "#DCE8FF", bulbEdge: "#4285F4", glow: "90, 150, 255", line: ["#BFD4FF", "#3B6FD8", "#8FB2FF"], tint: "#C9DBFF", accent: "#5E97F6", accentLight: "#A8C7FA" },
    { id: "red", label: "Red", swatch: "#EA4335", bulb: "#FFE0DC", bulbEdge: "#EA4335", glow: "255, 100, 85", line: ["#FFC2BB", "#C5352A", "#F28B82"], tint: "#FFD3CE", accent: "#F06A5E", accentLight: "#F6AEA9" },
    { id: "yellow", label: "Yellow", swatch: "#FBBC04", bulb: "#FFF4CC", bulbEdge: "#FBBC04", glow: "255, 200, 60", line: ["#FFE7A0", "#D69E00", "#FDD663"], tint: "#FFE9A8", accent: "#FBBC04", accentLight: "#FDE293" },
    { id: "green", label: "Green", swatch: "#34A853", bulb: "#DDF5E3", bulbEdge: "#34A853", glow: "80, 200, 120", line: ["#B7E8C4", "#2B8A45", "#81C995"], tint: "#C8EED3", accent: "#4CB86A", accentLight: "#A8DAB5" },
    { id: "silver", label: "Silver", swatch: "#C9D1DC", bulb: "#FFFFFF", bulbEdge: "#B8C0CC", glow: "210, 225, 255", line: ["#FFFFFF", "#8A93A0", "#D5DAE1"], tint: "#E6EBF2", accent: "#C9D1DC", accentLight: "#E3E8EE" },
  ],

  days: [
    { id: "builder", name: "Builder Day", date: "Fri, Oct 16", color: "#4285F4" },
    { id: "storyteller", name: "Storyteller Day", date: "Sat, Oct 17", color: "#F9AB00" },
    { id: "leadership", name: "Leadership Day", date: "Sun, Oct 18", color: "#34A853" },
  ],
};
