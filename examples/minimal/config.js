// Everything this example needs, in one place. The page itself has nothing to configure.
//
// The token is written here for a demo or an internal tool only: anyone who opens the page can read it.
// On a public website keep it on your server (see docs/GUIDE.md, "Where the token should live").
window.NESTING_CONFIG = {
  connect: {
    // Inèdit Connect API URL: it ends in /api.
    url: "https://nreservice.inedit.com/api",
    token: "PASTE-YOUR-INEDIT-CONNECT-TOKEN-HERE",
  },

  // Language of the editor: "en", "ca" or "es" (see docs/GUIDE.md to add others).
  locale: "en",

  // Roll width. The length grows as needed.
  page: { width: 0.6, units: "m" },

  // Fixed nesting parameters: the user cannot change them.
  options: {
    mode: "trueShape",
    allowRotation: true,
    allowOrthogonalRotation: true,
    padding: 5,
    paddingUnits: "mm",
    bleed: 2,
    bleedUnits: "mm",
    bleedFill: "auto",
    showCutLines: true,
  },

  // Images in ./assets. Width across the roll and length along it, before rotation.
  // `copies` is the starting number; the user can change it.
  images: [
    { file: "image-1.png", name: "Image 1", width: 16.75, length: 21.4, units: "cm", copies: 4 },
    { file: "image-2.png", name: "Image 2", width: 20, length: 20, units: "cm", copies: 2 },
    { file: "image-3.png", name: "Image 3", width: 10, length: 10, units: "cm", copies: 8 },
  ],

  // Title of the PDF and name of the exported files.
  name: "Minimal example",
};
