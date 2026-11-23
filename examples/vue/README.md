# Vue example

A Vite + Vue 3 app using the nesting editor through the [`@inedit/nesting-vue`](../../docs/VUE.md) component.

The app owns its data and passes it to `<NestingEditor>` as props:

- images with a number of copies each (0 leaves an image out), plus images the user adds from disk;
- roll width, spacing, 90° rotation and language, as the app's own controls (the editor's panel is hidden);
- Export JSON and Export PDF buttons, and a status line fed by the component's events.

| File | |
|---|---|
| [`src/config.js`](src/config.js) | Inèdit Connect URL and token, starting values, the list of images, PDF name. |
| [`src/App.vue`](src/App.vue) | The whole app: state, `<NestingEditor>`, events, exports. |
| [`public/assets/`](public/assets) | The images listed in `config.js`. |

## Running it

```sh
npm install
npm run dev        # then open the address it prints
```

`npm install` downloads the component, which includes the editor, from Inèdit Connect; see [`package.json`](package.json).
With pnpm or yarn, install the same way.

The editor works without a token. To generate the PDF, put your Inèdit Connect token in
[`src/config.js`](src/config.js). The token is then readable by anyone who opens the page: fine for a demo or an
internal tool, not for a public website (see ["Where the token should live"](../../docs/GUIDE.md#where-the-token-should-live)).

## Worth copying

- **Items as a `computed`** of the app's own images: the editor only re-nests when they really change.
- **`v-model.lazy`** on number fields: the nest is recomputed when the field is left, not on every keystroke.
- **`await nesting.value.settled()`** before exporting: a number typed just before clicking Export is included.
- **The PDF tab is opened at the start of the click**, before any `await`, so the browser does not block it.
- **`ui` and `render` are constants**: changing them would rebuild the editor.
