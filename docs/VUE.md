# Vue 3 component — `@inedit/nesting-vue`

`@inedit/nesting-vue` is the nesting editor as a Vue 3 component. Your app keeps the data (images, copies, page,
parameters, language) in its own state and passes it as props; the component keeps the editor in step and sends
what happens back as Vue events.

Everything about items, parameters, the `NestingDocument`, the PDF and styling is the same as with the plain editor
and is described in the [integration guide](GUIDE.md). This page covers only what is specific to Vue.

## Contents

1. [Requirements](#1-requirements)
2. [Installation](#2-installation)
3. [Quick start](#3-quick-start)
4. [Props](#4-props)
5. [How changes reach the editor](#5-how-changes-reach-the-editor)
6. [Events](#6-events)
7. [Methods (template ref)](#7-methods-template-ref)
8. [Recipes](#8-recipes)
9. [TypeScript](#9-typescript)
10. [Server-side rendering (Nuxt)](#10-server-side-rendering-nuxt)
11. [The example](#11-the-example)
12. [Troubleshooting](#12-troubleshooting)

## 1. Requirements

- Vue 3.3 or later, with a bundler (Vite, webpack, Rollup…). The package is an ES module.
- The [same browsers](GUIDE.md#2-requirements) as the editor.

Vue is a *peer dependency*: the component uses your app's Vue, it does not bring its own.

## 2. Installation

```sh
npm install https://nreservice.inedit.com/api/static/nesting/0.1.1/inedit-nesting-vue-0.1.1.tgz
# pnpm add … and yarn add … take the same URL
```

The editor (`@inedit/nesting-ui`) and the nesting engine (`@inedit/nesting-core`) are installed along with it, from
the same folder. The editor's CSS is loaded by the component: there is nothing else to import.

As with the other packages, `package.json` records the URL, so the version stays pinned. To update, install the URL
of the new version; `npm update` and version ranges do not apply to URL installs.

## 3. Quick start

```vue
<script setup>
import { ref } from "vue";
import { NestingEditor } from "@inedit/nesting-vue";

const page = ref({ width: 1.6, units: "m" });
const options = ref({ mode: "trueShape", allowOrthogonalRotation: true, padding: 5, paddingUnits: "mm" });
const items = ref([
  { ref: "logo", name: "Logo", image: "/images/logo.png", width: 20, units: "cm", copies: 10 },
  { ref: "flag", name: "Flag", image: "/images/flag.png", width: 60, length: 40, units: "cm", copies: 2 },
]);
const nest = ref(null);
</script>

<template>
  <NestingEditor
    style="height: 700px"
    :page="page"
    :items="items"
    :options="options"
    locale="ca"
    @change="document => (nest = document)"
  />
  <p v-if="nest">{{ nest.placements.length }} pieces, {{ nest.stats.usedLength.toFixed(2) }} m</p>
</template>
```

The component fills its own element, so **give it a height** (with `style`, a class, or a flex/grid layout).
`class`, `style` and any other attribute you put on `<NestingEditor>` go to that element.

## 4. Props

| Prop | Type | Follows changes | |
|---|---|---|---|
| `page` | `NestingPage` | yes | **Required.** Page width, unit and optional maximum length. See [Page](GUIDE.md#page). |
| `items` | `NestingEditorItem[]` | yes | What to nest. See [Items and images](GUIDE.md#6-items-and-images). Default: none. |
| `options` | `Partial<NestingOptions>` | yes | Nesting parameters. See [Options](GUIDE.md#options). Missing ones take the editor's defaults. |
| `locale` | `string` | yes | `"en"` (default), `"ca"`, `"es"`, `"it"` or a language added with `registerLocale`. |
| `messages` | `Partial<Messages>` | yes | Texts replacing the built-in ones, by key. See [Changing some texts](GUIDE.md#changing-some-texts). |
| `ui` | `{ editable?, controls?, panel?, theme? }` | rebuilds | The editor's own panel and interaction. See [Configuration reference](GUIDE.md#5-configuration-reference). |
| `render` | `RenderConfig` | rebuilds | Inèdit Connect, to generate the PDF. See [Connecting the editor](GUIDE.md#connecting-the-editor). |
| `timeBudgetMs` | `number` | rebuilds | Time allowed to search for a shorter nest (default 2500 ms). |

"Follows changes": the editor is updated in place. "Rebuilds": the editor is created again, which discards the
pieces the user moved or rotated by hand. Set these once; there is rarely a reason to change them.

## 5. How changes reach the editor

- **Change the data, not the editor.** Replace an array or object, or change it in place
  (`items.value[0].copies = 3`, `options.value.padding = 2`): both are noticed.
- **Only real changes count.** The component compares the content with what it last gave the editor. A parent that
  re-renders and passes a new object with the same content (an inline `:page="{ width: 1.6, units: 'm' }"`, an array
  rebuilt by a `computed`) changes nothing. Inline props are therefore safe.
- **A change of `items` nests again from scratch**, like `setItems()` in the plain editor: the pieces moved by hand are
  released. Changes of `options` and `page` keep them.
- **Typing in a number field.** Each change of `items` re-nests, so bind number fields with `v-model.lazy`
  (updated when the field is left), not on every keystroke.
- **`render.getToken` may change freely.** The editor always calls the latest one you passed, so an inline
  `getToken: () => auth.token` is fine and never rebuilds the editor.
- **`File` and `Blob` images are passed as they are**, never copied. Reactive proxies are removed before the data reaches
  the editor.
- **Changes made inside the editor** (the user changing a parameter in its panel, dragging a piece) are *not* written
  back to your props. Read them from the `change` event if you need them.

## 6. Events

| Event | Payload | When |
|---|---|---|
| `change` | `NestingDocument \| null` | The nest changed. `null` while there is nothing valid to export (loading, an error, no items). |
| `computing` | `boolean` | Nesting started (`true`) or ended (`false`). |
| `select` | `PieceId \| null` | The user selected a piece, or cleared the selection. |
| `error` | `{ message, ref? }` | Something cannot be nested or loaded (`ref`: the item concerned). The message is in the editor's language. A failed PDF is reported by `pdf-status` and by the promise of `generatePdf()`. |
| `pdf-status` | `PdfState` | Progress of a PDF: `uploading`, `queued`, `generating`, `ready`, `error` (with the reason). See [What happens when a PDF is requested](GUIDE.md#what-happens-when-a-pdf-is-requested). |
| `ready` | `NestingEditor` | The editor was created (also when it is rebuilt). Gives the underlying editor. |

## 7. Methods (template ref)

```vue
<script setup>
import { ref } from "vue";
const nesting = ref(null);
// nesting.value.settled(), nesting.value.getDocument()…
</script>

<template>
  <NestingEditor ref="nesting" … />
</template>
```

| Method | |
|---|---|
| `settled(): Promise<void>` | Resolves once the nest reflects the current props: changes just made are applied and computed. Await it before reading the document or generating the PDF right after a change. |
| `getDocument(): NestingDocument \| null` | The current nest, or `null` when there is none. |
| `generatePdf({ name? })` | Generates the print PDF with Inèdit Connect (needs `render`). Resolves with `{ jobId, report, downloadUrl }`. See [Generating the PDF](GUIDE.md#11-generating-the-pdf-with-inèdit-connect). |
| `recompute(): Promise<void>` | Nests again now. |
| `zoomToFit()` | Fits the nest in the view. |
| `setItems(items): Promise<void>` | Replaces the items directly. The `items` prop is the usual way; use this only when the items do not live in your state. |
| `editor` | The underlying `NestingEditor`, for anything else (see [Methods and events](GUIDE.md#9-methods-and-events)). `null` before the component is mounted. |

## 8. Recipes

### Your own controls instead of the editor's panel

Hide the panel and bind your own fields to the props:

```vue
<script setup>
const ui = { panel: false }; // a constant: it never rebuilds the editor
const page = ref({ width: 1.6, units: "m" });
const options = ref({ padding: 5, paddingUnits: "mm", allowOrthogonalRotation: true });
</script>

<template>
  <label>Roll width <input v-model.lazy.number="page.width" type="number" step="0.1" /> m</label>
  <label>Spacing
    <select v-model.number="options.padding">
      <option :value="0">None</option>
      <option :value="5">5 mm</option>
    </select>
  </label>
  <label><input v-model="options.allowOrthogonalRotation" type="checkbox" /> Allow 90° rotation</label>

  <NestingEditor class="editor" :ui="ui" :page="page" :options="options" :items="items" />
</template>
```

`ui: { panel: false, editable: false }` shows the nest read-only: no panel, no dragging. Zoom and scroll still work.

### Copies per image

Keep the images in your state and derive the items with a `computed`:

```js
const images = ref([
  { ref: "logo", name: "Logo", src: "/images/logo.png", width: 20, units: "cm", copies: 4 },
  { ref: "flag", name: "Flag", src: "/images/flag.png", width: 60, length: 40, units: "cm", copies: 0 },
]);

// Images with 0 copies are left out.
const items = computed(() =>
  images.value.filter(image => image.copies > 0).map(({ src, ...image }) => ({ ...image, image: src })),
);
```

```vue
<input v-for="image in images" :key="image.ref" v-model.lazy.number="image.copies" type="number" min="0" />
```

### Images chosen by the user

A `File` can be used directly as `image`. Without a size, give a resolution: the size comes from the image pixels.

```js
function addFiles(event) {
  for (const file of event.target.files) {
    images.value.push({ ref: crypto.randomUUID(), name: file.name, image: file, dpi: 150, copies: 1 });
  }
  event.target.value = "";
}
```

For a thumbnail in your own list use `URL.createObjectURL(file)`, and call `URL.revokeObjectURL()` when the image
is removed and when the component unmounts. The editor manages its own copies.

### Exporting right after a change

A field bound with `v-model.lazy` is updated when it loses focus, which is exactly when the user clicks your Export
button. Wait for the nest before reading it:

```js
async function exportJson() {
  await nesting.value.settled();
  const document = nesting.value.getDocument();
  if (!document) return;
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  // …download it, or send it to your server
}
```

Do not disable the Export button while the editor is computing (`computing` event): the click that follows typing
would land on a disabled button and be lost. `settled()` already waits.

### Generating the PDF

```js
const render = {
  baseUrl: "https://nreservice.inedit.com/api",
  getToken: () => fetch("/my-server/inedit-token").then(response => response.text()),
};

async function exportPdf() {
  // Open the tab during the click, or the browser blocks it as a pop-up.
  const tab = window.open("", "_blank");
  try {
    await nesting.value.settled();
    const { downloadUrl } = await nesting.value.generatePdf({ name: "Order 1234" });
    tab ? (tab.location.href = downloadUrl) : window.location.assign(downloadUrl);
  } catch (error) {
    tab?.close();
    alert(error.message);
  }
}
```

```vue
<NestingEditor :render="render" @pdf-status="state => (pdfStatus = state.status)" … />
```

Where the token should come from is explained in [Where the token should live](GUIDE.md#where-the-token-should-live).
With `render` set and the panel shown, the panel also offers its own PDF button.

### Language

Bind `locale` to your app's language. Switching keeps the nest, the selection and the pieces moved by hand.

```vue
<NestingEditor :locale="i18n.locale" :messages="{ usedLength: 'Metres used' }" … />
```

To add a language, call `registerLocale` (exported by this package too) before the component is mounted.
See [Languages and texts](GUIDE.md#13-languages-and-texts).

### Styling

The editor's CSS is loaded with the component. Override its custom properties or classes in your own CSS, loaded
after it (see [Styling](GUIDE.md#12-styling)):

```css
.editor {
  --inn-accent: #7c3aed;
  height: calc(100vh - 32px);
}
```

### Anything the props do not cover

The underlying editor is at `nesting.value.editor`, or in the `ready` event:

```vue
<NestingEditor @ready="editor => editor.zoomToFit()" … />
```

Use it to call methods, not to change what the props control: `items`, `options`, `page` and `locale` set through the
editor would be overwritten on the next change of the props.

## 9. TypeScript

The package includes its types. Everything `@inedit/nesting-ui` exports is also exported from `@inedit/nesting-vue`
(the plain editor class as `NestingEditorCore`), so one import is enough:

```ts
import { ref } from "vue";
import { NestingEditor, type NestingEditorExposed, type NestingEditorItem, type NestingDocument } from "@inedit/nesting-vue";

const nesting = ref<NestingEditorExposed | null>(null);
const items = ref<NestingEditorItem[]>([]);
const nest = ref<NestingDocument | null>(null);
```

`NestingEditorProps` describes the props.

## 10. Server-side rendering (Nuxt)

The editor is created when the component is mounted, which only happens in the browser. On the server the component
renders its empty element, and the editor appears once the page is hydrated. The package can be imported on the
server, so no `<ClientOnly>` wrapper is needed.

## 11. The example

[`examples/vue`](../examples/vue) is a complete Vite + Vue app: images with copies, images added by the user, roll
width, spacing, rotation and language as the app's own controls, JSON and PDF export, and a status line fed by the events.

```sh
cd examples/vue
npm install
npm run dev        # then open the address it prints
```

To generate the PDF, put your Inèdit Connect token in [`src/config.js`](../examples/vue/src/config.js).

## 12. Troubleshooting

| What you see | Why, and what to do |
|---|---|
| Nothing is shown, or a thin strip | The component has no height. Give it one: `style="height: 700px"`, or `flex: 1` in a container with a height. |
| The nest restarts while typing | The field updates `items` on every keystroke. Use `v-model.lazy`. |
| The pieces moved by hand go back | `items` changed (re-nests from scratch), or `ui`, `render` or `timeBudgetMs` changed (rebuilds the editor). Keep the latter constant. |
| The exported document has the old numbers, or is `null` | It was read before the change was nested. `await nesting.value.settled()` first. |
| The PDF tab is blocked as a pop-up | `window.open` was called after an `await`. Open it first, at the start of the click handler. |
| "Vue: multiple copies" warnings, or the component does not render | Two copies of Vue in the bundle. Vue must be installed once, by your app; with Vite, add `resolve: { dedupe: ["vue"] }`. |
