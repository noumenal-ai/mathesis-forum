// The glyph is the record's: the same login draws the same grid in the same
// tint as Mathesis's Rust `glyph` (values below computed by that algorithm).
import { test } from "node:test";
import assert from "node:assert/strict";
import { glyphParts, glyphSvg } from "../lib/glyph.mjs";

test("matches the record for the cited authors", () => {
  assert.deepEqual(glyphParts("YaelDillies"), {
    tint: 1,
    d: "M0 1h1v1h-1zM4 1h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM0 3h1v1h-1zM4 3h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1zM2 4h1v1h-1z",
  });
  assert.deepEqual(glyphParts("Timeroot"), {
    tint: 1,
    d: "M2 0h1v1h-1zM1 1h1v1h-1zM3 1h1v1h-1zM2 1h1v1h-1zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1zM2 4h1v1h-1z",
  });
});

test("case of a login does not change the glyph", () => {
  assert.deepEqual(glyphParts("yaeldillies"), glyphParts("YaelDillies"));
});

test("is decorative", () => {
  assert.match(glyphSvg("octocat"), /aria-hidden="true"/);
});
