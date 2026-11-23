// Everything this example needs to know, in one place.
//
// The token is written here for a demo or an internal tool only: anyone who opens the page can read it.
// On a public website keep it on your server (see docs/GUIDE.md, "Where the token should live").
export const config = {
  connect: {
    // Inèdit Connect API URL: it ends in /api.
    url: "https://nreservice.inedit.com/api",
    token: "PASTE-YOUR-INEDIT-CONNECT-TOKEN-HERE",
  },

  // Starting values. The page lets the user change the width, spacing, rotation and language.
  locale: "en",
  page: { width: 0.6, units: "m" },
  options: {
    mode: "trueShape",
    allowRotation: true,
    allowOrthogonalRotation: true,
    padding: 5,
    paddingUnits: "mm",
    bleed: 2,
    bleedUnits: "mm",
    showCutLines: true,
  },

  // Images in public/assets. Width across the roll and length along it, before rotation.
  images: [
    { file: "image-1.png", name: "Image 1", width: 16.75, length: 21.4, units: "cm", copies: 4 },
    { file: "image-2.png", name: "Image 2", width: 20, length: 20, units: "cm", copies: 2 },
    { file: "image-3.png", name: "Image 3", width: 10, length: 10, units: "cm", copies: 8 },
  ],

  // Images added by the user are sized from their pixels at this resolution.
  uploadDpi: 150,

  // Title of the PDF and name of the exported files.
  name: "Vue example",
};
