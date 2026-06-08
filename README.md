# rolldown-plugin-lightningcss

Rolldown has officially dropped the builtin support for CSS bundling (see [#8399](https://github.com/rolldown/rolldown/pull/8399)). This plugin seeks to add support for CSS transformation and bundling.

## Comparation

- [rollup-plugin-lightningcss](https://github.com/thearchitector/rollup-plugin-lightningcss): Simple plugin for producing assets on the side, doesn't support imports or the `inputs` option.
- [tsdown](https://github.com/rolldown/tsdown/blob/9f051792865d5876a1063aa7c0afd9397639e7bf/packages/css/src/lightningcss.ts): Features a similar plugin, but lacks URL imports and source mapping. Consider for simple use cases.
- [vite](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/css.ts): Features advanced CSS integration, but relies on the existing ecosystem. Take it or leave it.

## Usage

### Standalone CSS Assets

Add the CSS file to `.inputs` to produce the bundled CSS as an asset.

#### Config

```ts
import { lightningcss } from "rolldown-plugin-lightningcss";

export default defineConfig({
  inputs: ["./styles.css"],
  plugin: [lightningcss()],
});
```

#### Inputs

```css
/* styles.css */
@import "./a.css";
@import "./b.css";

/* a.css */
.a {
  color: red;
}

/* b.css */
.b {
  color: green;
}
```

#### Output

```css
/* output.css */
.a {
  color: red;
}

.b {
  color: green;
}
```

### Importing bundled CSS

Import the CSS file as a module to get the bundled styles as text.

```ts
import { lightningcss } from "rolldown-plugin-lightningcss";

export default defineConfig({
  inputs: ["./main.js"],
  plugin: [lightningcss()],
});
```

#### Inputs

```js
/* main.js */
import styles from "./styles.css";

const styleElement = document.createElement("style");
styleElement.innerHTML = styles;

document.head.append(styleElement);
```

```css
/* styles.css */
@import "./a.css";
@import "./b.css";
```

#### Output

```js
const styles = `.a {
  color: red;
}

.b {
  color: green;
}`;
const styleElement = document.createElement("style");
styleElement.innerHTML = styles;
document.head.append(styleElement);
```

## Limitations

- Does not support CSS modules yet.

## Caveats

- You cannot make imports produce an asset. Instead, mark css imports as external and add them to `inputs`.
- Lightningcss handles the bundling. Importing the same styles from different entries will result in duplicate output.

## Versioning

Semver

## License

MIT
