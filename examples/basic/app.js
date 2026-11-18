// Example host page for the nesting editor. Plain JavaScript, no build step.
// Everything the editor needs comes from this page: the items, their images and sizes, the parameters,
// and (optionally) where Inèdit Connect is and which token to use for the PDF.

const { NestingEditor } = window.IneditNesting;

const $ = selector => document.querySelector(selector);

/** Items as the host keeps them. `image` is a File/Blob here; a URL works too. */
let items = [];
/** Inèdit Connect settings; null = no PDF. */
let connect = null;
let editor = null;
let nextRef = 1;
/** The nest being computed after the last item change; exports wait for it. */
let nesting = Promise.resolve();

function updateNest() {
  nesting = editor.setItems(editorItems());
}

// --- Parameters from the host form -------------------------------------------------------------

function readOptions() {
  const rotation = $("#rotation").value;
  return {
    mode: $("#mode").value,
    allowRotation: rotation !== "none",
    allowOrthogonalRotation: rotation === "quarter" || rotation === "free",
    rotationStep: rotation === "free" ? 15 : undefined,
    padding: Number($("#padding").value) || 0,
    paddingUnits: "mm",
    bleed: Number($("#bleed").value) || 0,
    bleedUnits: "mm",
    showCutLines: $("#cut-lines").checked,
  };
}

function readPage() {
  return { width: Number($("#page-width").value) || 1, units: "m" };
}

/** The editor's items: the host's data, in the shape the editor expects. */
function editorItems() {
  return items.map(item => ({
    ref: item.ref,
    name: item.name,
    image: item.image,
    width: item.width,
    // Without a length the editor keeps the image proportions.
    length: item.length || undefined,
    units: "cm",
    copies: item.copies,
    meta: { addedAt: item.addedAt },
  }));
}

// --- The editor ----------------------------------------------------------------------------------

/** (Re)create the editor. `render` is read when the editor is created, so new Connect settings need a new editor. */
function createEditor() {
  editor?.destroy();
  editor = new NestingEditor("#nesting", {
    page: readPage(),
    options: readOptions(),
    items: editorItems(),
    // The editor's language; the select at the top of the page switches it with setLocale().
    locale: $("#language").value,
    ui: {
      // The host form already sets page and parameters: the editor's own panel keeps only the placement order.
      controls: ["order", "recompute"],
    },
    render: connect ? { baseUrl: connect.url, getToken: () => connect.token } : undefined,
  });

  editor.on("change", ({ document }) => {
    $("#export-json").disabled = !document;
    $("#generate-pdf").disabled = !document || !connect;
    if (document) log(`change: ${document.placements.length} pieces, ${document.stats.usedLength.toFixed(3)} ${document.page.units}`);
  });
  editor.on("error", ({ message }) => log(`error: ${message}`));
  editor.on("select", ({ piece }) => piece && log(`select: ${piece.ref} #${piece.copy + 1}`));
  editor.on("pdf-status", ({ status, error }) => {
    $("#pdf-state").textContent = error || status || "";
    log(`pdf-status: ${status}${error ? ` (${error})` : ""}`);
  });
}

// --- Items -------------------------------------------------------------------------------------------

function renderItemTable() {
  const rows = items.map((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="name"></td>
      <td><input type="number" min="0.1" step="0.1" data-field="width" /></td>
      <td><input type="number" min="0.1" step="0.1" data-field="length" placeholder="auto" /></td>
      <td><input type="number" min="1" step="1" data-field="copies" /></td>
      <td><button type="button" aria-label="Remove">×</button></td>`;
    row.querySelector(".name").textContent = item.name;
    for (const input of row.querySelectorAll("input")) {
      input.value = item[input.dataset.field] ?? "";
      input.addEventListener("change", () => {
        const value = input.value === "" ? undefined : Number(input.value);
        // "change" also fires when the field loses focus; nest again only when the value really changed.
        if (value === item[input.dataset.field]) return;
        item[input.dataset.field] = value;
        updateNest();
      });
    }
    row.querySelector("button").addEventListener("click", () => {
      items.splice(index, 1);
      renderItemTable();
      updateNest();
    });
    return row;
  });
  $("#items tbody").replaceChildren(...rows);
}

function addItems(newItems) {
  items.push(...newItems.map(item => ({ ref: `item-${nextRef++}`, copies: 1, addedAt: new Date().toISOString(), ...item })));
  renderItemTable();
  updateNest();
}

/** Sample artwork drawn on a canvas, with transparent backgrounds so true-shape nesting has a silhouette to follow. */
function drawSample(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 400;
  draw(canvas.getContext("2d"), 400);
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

async function sampleItems() {
  const star = await drawSample((c, s) => {
    c.fillStyle = "#f59e0b";
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? s * 0.2 : s * 0.48;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      c.lineTo(s / 2 + radius * Math.cos(angle), s / 2 + radius * Math.sin(angle));
    }
    c.fill();
  });
  const badge = await drawSample((c, s) => {
    c.fillStyle = "#7c3aed";
    c.beginPath();
    c.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff";
    c.font = `bold ${s / 3}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("OK", s / 2, s / 2);
  });
  // Keep a transparent margin: in true-shape mode an opaque image whose border is one uniform colour
  // has that colour keyed out as background.
  const label = await drawSample((c, s) => {
    c.fillStyle = "#0f766e";
    c.beginPath();
    c.roundRect(4, s * 0.1, s - 8, s * 0.8, s * 0.12);
    c.fill();
    c.fillStyle = "#fff";
    c.font = `bold ${s / 6}px sans-serif`;
    c.textAlign = "center";
    c.fillText("LABEL", s / 2, s / 2 + s / 18);
  });
  return [
    { name: "Star", image: star, width: 25, copies: 4 },
    { name: "Badge", image: badge, width: 15, copies: 6 },
    { name: "Label", image: label, width: 40, length: 20, copies: 2 },
  ];
}

// --- Output ------------------------------------------------------------------------------------------

async function exportJson() {
  await nesting;
  const nestingDocument = editor.getDocument();
  if (!nestingDocument) return;
  const blob = new Blob([JSON.stringify(nestingDocument, null, 2)], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "nesting.json" });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  log(`exported nesting.json (${nestingDocument.items.length} items)`);
}

async function generatePdf() {
  $("#generate-pdf").disabled = true;
  $("#pdf-link").hidden = true;
  try {
    await nesting;
    const { downloadUrl, report } = await editor.generatePdf({ name: "Example nest" });
    $("#pdf-link").href = downloadUrl;
    $("#pdf-link").hidden = false;
    log(`pdf ready: ${report?.overlaps.length ?? 0} overlapping cuts, ${report?.warnings.length ?? 0} warnings`);
  } catch (error) {
    log(`pdf failed: ${error.message}`);
  } finally {
    $("#generate-pdf").disabled = !connect || !editor.getDocument();
  }
}

function log(text) {
  const entry = document.createElement("li");
  entry.textContent = `${new Date().toLocaleTimeString()} ${text}`;
  $("#log").prepend(entry);
  while ($("#log").children.length > 30) $("#log").lastElementChild.remove();
}

// --- Wiring ------------------------------------------------------------------------------------------

for (const id of ["#mode", "#rotation", "#padding", "#bleed", "#cut-lines"]) {
  $(id).addEventListener("change", () => editor.setOptions(readOptions()));
}
$("#page-width").addEventListener("change", () => editor.setPage(readPage()));
// Switching language keeps the nest, the selection and any manual change.
$("#language").addEventListener("change", () => {
  editor.setLocale($("#language").value);
  log(`language: ${editor.getLocale()}`);
});

$("#add-samples").addEventListener("click", async () => addItems(await sampleItems()));
$("#files").addEventListener("change", event => {
  // A dropped-in image has no known size: 20 cm wide, the length follows the image.
  addItems([...event.target.files].map(file => ({ name: file.name, image: file, width: 20 })));
  event.target.value = "";
});

$("#connect").addEventListener("click", () => {
  const url = $("#api-url").value.trim();
  const token = $("#token").value.trim();
  connect = url && token ? { url, token } : null;
  const apiHint = connect && !/\/api\/?$/.test(url) ? " (the Inèdit Connect API URL usually ends in /api)" : "";
  $("#connect-state").textContent = connect ? `PDF through ${url}${apiHint}` : "Not connected: the editor works, without PDF.";
  createEditor();
});
$("#export-json").addEventListener("click", exportJson);
$("#generate-pdf").addEventListener("click", generatePdf);

createEditor();
// Exposed for experimenting in the browser console (and for the automated test).
window.example = { get editor() { return editor; } };
