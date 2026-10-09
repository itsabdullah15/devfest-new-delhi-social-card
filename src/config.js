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

  // Optional official logo: put the file at public/assets/gdg-new-delhi-logo.png
  // (transparent PNG works best). If it is missing, the pass draws the GDG bracket mark + community name.
  logo: "/assets/gdg-new-delhi-logo.png",

  // Commudle wordmark shown at the bottom of the pass.
  commudleLogo: "/assets/commudle-logo.png",

  // Pass types. `badge` is the top-right label, `line` sits above the name, `verb` opens the caption.
  passTypes: [
    { id: "attendee", label: "Attendee", badge: "ATTENDEE", line: "I'M ATTENDING", verb: "I'm attending", closer: "See you there!", dayLabel: "Day you're attending" },
    { id: "volunteer", label: "Volunteer", badge: "VOLUNTEER", line: "I'M VOLUNTEERING", verb: "I'm volunteering at", closer: "Come say hi!", dayLabel: "Day you're volunteering" },
    { id: "speaker", label: "Speaker", badge: "SPEAKER", line: "I'M SPEAKING", verb: "I'm speaking at", closer: "Come catch my session!", dayLabel: "Day you're speaking" },
  ],

  days: [
    { id: "builder", name: "Builder Day", date: "Fri, Oct 16", color: "#4285F4" },
    { id: "storyteller", name: "Storyteller Day", date: "Sat, Oct 17", color: "#F9AB00" },
    { id: "leadership", name: "Leadership Day", date: "Sun, Oct 18", color: "#34A853" },
  ],

  // Background colours the attendee can pick from. `ink` is used for text on the white card.
  themes: [
    { id: "blue", label: "Blue", bg: "#4285F4", ink: "#1A73E8" },
    { id: "red", label: "Red", bg: "#EA4335", ink: "#D93025" },
    { id: "yellow", label: "Yellow", bg: "#FBBC04", ink: "#B06000" },
    { id: "green", label: "Green", bg: "#34A853", ink: "#188038" },
    { id: "dark", label: "Dark", bg: "#202124", ink: "#202124" },
  ],
};
