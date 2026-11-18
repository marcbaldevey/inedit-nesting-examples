// The smallest useful integration: fixed settings from config.js, images from ./assets,
// and a page where the user only sets how many copies of each image to print.

const { NestingEditor } = window.IneditNesting;
const config = window.NESTING_CONFIG;
const $ = selector => document.querySelector(selector);

/** Copies chosen by the user, by image file. */
const copies = new Map(config.images.map(image => [image.file, image.copies ?? 1]));

/** The nest being computed after the last change; exports wait for it. */
let nesting = Promise.resolve();

function updateNest() {
  nesting = editor.setItems(items());
}

/** Images with at least one copy, as editor items. The file name is the item's ref. */
function items() {
  return config.images
    .filter(image => copies.get(image.file) > 0)
    .map(image => ({
      ref: image.file,
      name: image.name,
      image: `assets/${image.file}`,
      width: image.width,
      length: image.length,
      units: image.units,
      copies: copies.get(image.file),
    }));
}

const editor = new NestingEditor("#nesting", {
  page: config.page,
  options: config.options,
  items: items(),
  // View only: no panel, no dragging or rotating pieces. Zoom and scroll still work.
  locale: config.locale,
  ui: { panel: false, editable: false },
  render: { baseUrl: config.connect.url, getToken: () => config.connect.token },
});

function setStatus(text, isError = false) {
  $("#status").textContent = text;
  $("#status").classList.toggle("error", isError);
}

editor.on("change", ({ document }) => {
  $("#export-json").disabled = !document;
  $("#export-pdf").disabled = !document;
  if (document) setStatus(`${document.placements.length} pieces · ${document.stats.usedLength.toFixed(3)} ${document.page.units} long`);
});
editor.on("error", ({ message }) => setStatus(message, true));
editor.on("pdf-status", ({ status }) => {
  const labels = { uploading: "Uploading images…", queued: "Waiting for Inèdit Connect…", generating: "Generating the PDF…" };
  if (labels[status]) setStatus(labels[status]);
});

// --- The copies list ---

for (const image of config.images) {
  const row = document.createElement("li");
  row.innerHTML = `
    <img alt="" />
    <span class="info"><span class="name"></span><small></small></span>
    <input type="number" min="0" step="1" />`;
  row.querySelector("img").src = `assets/${image.file}`;
  row.querySelector("img").addEventListener("error", event => (event.target.style.visibility = "hidden"));
  row.querySelector(".name").textContent = image.name;
  row.querySelector("small").textContent = `${image.width} × ${image.length} ${image.units}`;
  const input = row.querySelector("input");
  input.value = copies.get(image.file);
  input.setAttribute("aria-label", `Copies of ${image.name}`);
  input.addEventListener("change", () => {
    const value = Math.max(0, Math.floor(Number(input.value) || 0));
    input.value = value;
    // "change" also fires when the field loses focus; nest again only when the number really changed.
    if (value === copies.get(image.file)) return;
    copies.set(image.file, value);
    updateNest();
  });
  $("#images").append(row);
}

// --- Export ---

function fileName(extension) {
  return `${config.name.replace(/[^\w-]+/g, "-").toLowerCase()}.${extension}`;
}

$("#export-json").addEventListener("click", async () => {
  await nesting;
  const nestingDocument = editor.getDocument();
  if (!nestingDocument) return;
  const blob = new Blob([JSON.stringify(nestingDocument, null, 2)], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName("json") });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
});

$("#export-pdf").addEventListener("click", async () => {
  // Open the tab now, while the click still counts as a user action; it gets the PDF once it is ready.
  const tab = window.open("", "_blank");
  $("#export-pdf").disabled = true;
  try {
    await nesting;
    const { downloadUrl } = await editor.generatePdf({ name: config.name });
    if (tab) tab.location.href = downloadUrl;
    else window.location.assign(downloadUrl);
    setStatus("PDF ready.");
  } catch (error) {
    tab?.close();
    setStatus(error.message, true);
  } finally {
    $("#export-pdf").disabled = !editor.getDocument();
  }
});

// Exposed for the browser console and the automated test.
window.example = { editor };
