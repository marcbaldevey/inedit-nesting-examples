<script setup>
// The host app owns the data (images, copies, roll width, spacing, language) and passes it to <NestingEditor>
// as props; the component keeps the editor in step. Events come back as Vue events.
import { computed, onBeforeUnmount, ref } from "vue";
import { NestingEditor } from "@inedit/nesting-vue"; // also loads the editor's CSS
import { config } from "./config.js";

// --- The app's own state ---

/** One row per image: the configured ones, then the ones the user adds. */
const images = ref(
  config.images.map(image => ({
    ref: image.file,
    name: image.name,
    src: `assets/${image.file}`,
    width: image.width,
    length: image.length,
    units: image.units,
    copies: image.copies ?? 1,
  })),
);
const page = ref({ ...config.page });
const options = ref({ ...config.options });
const locale = ref(config.locale);

/** What the editor nests: images with at least one copy. Recomputed only when the images change. */
const items = computed(() =>
  images.value
    .filter(image => image.copies > 0)
    .map(image => ({
      ref: image.ref,
      name: image.name,
      image: image.file ?? image.src, // a File for uploads, a URL otherwise
      width: image.width,
      length: image.length,
      units: image.units,
      dpi: image.file ? config.uploadDpi : undefined,
      copies: image.copies,
    })),
);

// Read once, when the editor is created: a fixed object, so it never rebuilds the editor.
const render = { baseUrl: config.connect.url, getToken: () => config.connect.token };

// --- Images added by the user ---

let uploads = 0;
function addFiles(event) {
  for (const file of event.target.files) {
    images.value.push({ ref: `upload-${++uploads}`, name: file.name, src: URL.createObjectURL(file), file, copies: 1 });
  }
  event.target.value = "";
}
function remove(image) {
  images.value = images.value.filter(other => other !== image);
  if (image.file) URL.revokeObjectURL(image.src);
}
onBeforeUnmount(() => images.value.forEach(image => image.file && URL.revokeObjectURL(image.src)));

// --- Editor events ---

const nesting = ref(null); // template ref: settled(), getDocument(), generatePdf(), zoomToFit(), editor
const nest = ref(null); // the latest NestingDocument, or null
const computing = ref(false);
const status = ref({ text: "", error: false });
const exporting = ref(false);

function onChange(document) {
  nest.value = document;
  if (document) status.value = { text: `${document.placements.length} pieces · ${document.stats.usedLength.toFixed(3)} ${document.page.units} long`, error: false };
}
function onError({ message }) {
  status.value = { text: message, error: true };
}
const pdfLabels = { uploading: "Uploading images…", queued: "Waiting for Inèdit Connect…", generating: "Generating the PDF…" };
function onPdfStatus({ status: pdfStatus }) {
  if (pdfLabels[pdfStatus]) status.value = { text: pdfLabels[pdfStatus], error: false };
}

// --- Export ---

const fileName = extension => `${config.name.replace(/[^\w-]+/g, "-").toLowerCase()}.${extension}`;

async function exportJson() {
  // A number typed just before clicking reaches the editor on this click: wait until it is nested.
  await nesting.value.settled();
  const document = nesting.value.getDocument();
  if (!document) return;
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  const link = Object.assign(window.document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName("json") });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

async function exportPdf() {
  // Open the tab now, while the click still counts as a user action; it gets the PDF once it is ready.
  const tab = window.open("", "_blank");
  exporting.value = true;
  try {
    await nesting.value.settled();
    const { downloadUrl } = await nesting.value.generatePdf({ name: config.name });
    if (tab) tab.location.href = downloadUrl;
    else window.location.assign(downloadUrl);
    status.value = { text: "PDF ready.", error: false };
  } catch (error) {
    tab?.close();
    status.value = { text: error.message, error: true };
  } finally {
    exporting.value = false;
  }
}

// Exposed for the browser console and the automated test.
window.example = { nesting, images, page, options, locale };
</script>

<template>
  <main class="layout">
    <aside class="side">
      <h1>Nesting with Vue</h1>

      <fieldset class="settings">
        <label>
          Roll width
          <span class="with-unit">
            <input v-model.lazy.number="page.width" type="number" min="0.1" step="0.1" />
            {{ page.units }}
          </span>
        </label>
        <label>
          Spacing
          <select v-model.number="options.padding">
            <option :value="0">None</option>
            <option :value="2">2 mm</option>
            <option :value="5">5 mm</option>
            <option :value="10">10 mm</option>
          </select>
        </label>
        <label class="check">
          <input v-model="options.allowOrthogonalRotation" type="checkbox" />
          Allow 90° rotation
        </label>
        <label>
          Language
          <select v-model="locale">
            <option value="en">English</option>
            <option value="ca">Català</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
          </select>
        </label>
      </fieldset>

      <ul class="images">
        <li v-for="image in images" :key="image.ref">
          <img :src="image.src" alt="" @error="$event.target.style.visibility = 'hidden'" />
          <span class="info">
            <span class="name">{{ image.name }}</span>
            <small v-if="image.file">{{ config.uploadDpi }} dpi</small>
            <small v-else>{{ image.width }} × {{ image.length }} {{ image.units }}</small>
          </span>
          <input v-model.lazy.number="image.copies" type="number" min="0" step="1" :aria-label="`Copies of ${image.name}`" />
          <button v-if="image.file" type="button" class="remove" :aria-label="`Remove ${image.name}`" @click="remove(image)">×</button>
        </li>
      </ul>
      <label class="add">
        Add images…
        <input type="file" accept="image/*" multiple @change="addFiles" />
      </label>

      <div class="actions">
        <button type="button" :disabled="!nest || exporting" @click="exportPdf">Export PDF</button>
        <button type="button" :disabled="!nest" @click="exportJson">Export JSON</button>
      </div>
      <p class="status" :class="{ error: status.error }" role="status">{{ computing ? "Nesting…" : status.text }}</p>
    </aside>

    <NestingEditor
      ref="nesting"
      class="editor"
      :page="page"
      :items="items"
      :options="options"
      :locale="locale"
      :render="render"
      @change="onChange"
      @computing="computing = $event"
      @error="onError"
      @pdf-status="onPdfStatus"
    />
  </main>
</template>
