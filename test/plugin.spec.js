import assert from "node:assert/strict";
import { it } from "node:test";
import { rolldown } from "rolldown";
import { lightningcss } from "rolldown-plugin-lightningcss";

it("bundles css as module", async () => {
  const result = await rolldown({
    input: ["test/fixtures/a.js"],
    plugins: [lightningcss()],
  });
  const { output } = await result.generate();
  const code = output[0].code;
  assert(code.includes("green"));
  assert(code.includes("red"));
});

it("bundles css as entry", async () => {
  const result = await rolldown({
    input: ["test/fixtures/a.css"],
    plugins: [lightningcss()],
  });
  const { output } = await result.generate();
  const source = output[0].source.toString();
  assert(source.includes("green"));
  assert(source.includes("red"));
});

it("resolves url with suffix", async () => {
  const result = await rolldown({
    input: ["test/fixtures/url-with-suffix.css"],
    plugins: [lightningcss()],
  });
  const { output } = await result.generate();
  const source = output.find((asset) => asset.fileName === "url-with-suffix.css").source.toString();
  assert(source.includes(".png?foo#bar"));
  assert(source.includes(".png#foo?bar"));
  assert(source.includes(".png?foo"));
  assert(source.includes(".png#foo"));
  assert(source.includes(".png"));
});

it("preserves externals urls", async () => {
  const result = await rolldown({
    input: ["test/fixtures/external-url.css"],
    plugins: [lightningcss()],
  });
  const { output } = await result.generate();
  const source = output.find((asset) => asset.fileName === "external-url.css").source.toString();
  assert(source.includes("https://example.com/bg.png"));
  assert(source.includes("data:foo"));
});

it("supports pre transformations", async () => {
  const result = await rolldown({
    input: ["test/fixtures/preprocess.css"],
    plugins: [
      {
        name: "my-css-pre-processing",
        transform: {
          order: "pre",
          filter: {
            moduleType: ["css"],
          },
          async handler(code) {
            return code.replaceAll("\\", "\\\\");
          },
        },
      },
      lightningcss(),
    ],
  });
  const { output } = await result.generate();
  const source = output.find((asset) => asset.fileName === "preprocess.css").source.toString();
  assert(source.includes("\\00ba"));
});

it("supports lightningcss' visitors", async () => {
  const result = await rolldown({
    input: ["test/fixtures/preprocess.css"],
    plugins: [
      lightningcss({
        visitor: {
          Token: (token) => {
            if (token.type === "string") {
              const value = Array.from(token.value)
                .map((char) => {
                  const p = char.charCodeAt(0);
                  return p <= 0x7f ? char : `\\\\${p.toString(16).padStart(4, "0")}`;
                })
                .join("");
              return {
                type: "token",
                value: {
                  type: "string",
                  value: value,
                },
                raw: `'${value.replaceAll("'", "\\'").replaceAll("\\", "\\\\")}'`,
              };
            }
          },
        },
      }),
    ],
  });
  const { output } = await result.generate();
  const source = output.find((asset) => asset.fileName === "preprocess.css").source.toString();
  assert(source.includes("\\00ba"));
});
