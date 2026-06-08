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
