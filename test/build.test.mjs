// The whole build, offline: the record read from a directory, no threads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("every post gets a page, newest first on the index", () => {
  const out = mkdtempSync(join(tmpdir(), "forum-"));
  const env = { ...process.env, MATHESIS_DIR: join(import.meta.dirname, "fixture"), OUT: out, GITHUB_TOKEN: "" };
  execFileSync(process.execPath, [join(import.meta.dirname, "..", "build.mjs")], { env, stdio: "pipe" });
  for (const acc of ["MTH.R-2026-6001", "MTH.R-2026-6021"]) {
    assert.ok(existsSync(join(out, "p", acc, "index.html")), acc);
  }
  const index = readFileSync(join(out, "index.html"), "utf8");
  const rows = JSON.parse(readFileSync(join(import.meta.dirname, "fixture", "posts-0000.json"), "utf8")).rows;
  const byNumber = [...rows].sort((a, b) => b.post_number - a.post_number).map((r) => r.argument);
  const onPage = [...index.matchAll(/\/p\/(MTH\.R-\d{4}-\d+)\//g)].map((m) => m[1]);
  assert.deepEqual(onPage, byNumber, "newest post number first");
  const page = readFileSync(join(out, "p", "MTH.R-2026-6001", "index.html"), "utf8");
  assert.match(page, /<h1 class="f-post__title">Pajor&#39;s inequality<\/h1>/);
  assert.ok(existsSync(join(out, "assets", "fonts", "TINOS-LICENSE.txt")));
});
