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
