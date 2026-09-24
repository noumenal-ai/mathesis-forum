import { test } from "node:test";
import assert from "node:assert/strict";
import { MARKER_RE, person, postPage, threadBody, titleOf } from "../lib/render.mjs";

const ctx = {
  mathesis: "https://noumenal-ai.github.io/mathesis-bank",
  base: "/mathesis-forum",
  members: new Map([["Zetetic-Dhruv", { name: "Dhruv Gupta", avatar: "/avatars/Zetetic-Dhruv.jpg" }]]),
};
const post = {
  argument: "MTH.R-2026-6001",
  claim: "MTH.C-2026-6001",
  publishedAt: "2026-09-24T00:00:00Z",
  author: { login: "Zetetic-Dhruv", name: "Dhruv Gupta" },
  doc: "**Pajor's inequality**, with no finiteness assumptions.\n\nLineage.",
  statement: "∀ {α : Type u_1}, x ≤ y",
  title: "Pajor's inequality",
};

test("a title is the docstring's bold lead, else the declaration's own name", () => {
  assert.equal(titleOf(post.doc, "encard_image_inter_le_encard_shatters"), "Pajor's inequality");
  assert.equal(titleOf(null, "HasVCDimLE.vcGrowth_le_exp"), "vcGrowth_le_exp");
  assert.equal(titleOf("A family whose members…", "Foo.bar"), "bar");
});

test("a member is their photo and their Mathesis profile; anyone else their glyph and GitHub", () => {
  const member = person({ login: "Zetetic-Dhruv" }, ctx);
  assert.match(member, /src="https:\/\/noumenal-ai\.github\.io\/mathesis-bank\/avatars\/Zetetic-Dhruv\.jpg"/);
  assert.match(member, /href="https:\/\/noumenal-ai\.github\.io\/mathesis-bank\/u\/Zetetic-Dhruv\/"/);
  const guest = person({ login: "octocat", name: "The Octocat" }, ctx);
  assert.match(guest, /<svg class="f-glyph/);
  assert.match(guest, /href="https:\/\/github\.com\/octocat"/);
  assert.ok(!guest.includes("<img"));
});

test("a thread's comments render escaped, and the page loads nothing from elsewhere", () => {
  const thread = {
    url: "https://github.com/noumenal-ai/mathesis-forum/discussions/1",
    comments: [{
      url: "https://github.com/x#c1", createdAt: "2026-09-25T10:00:00Z",
      author: { login: "mallory", name: "<b>Mallory</b>" },
      body: "<script>alert(1)</script>",
      replies: [{ url: "https://github.com/x#c2", createdAt: "2026-09-25T11:00:00Z", author: { login: "octocat" }, body: "> quote\n\nreply" }],
    }],
  };
  const html = postPage(post, thread, ctx);
  assert.ok(!html.includes("<script>"), "no script reaches the page");
  assert.ok(html.includes("&lt;script&gt;") && html.includes("&lt;b&gt;Mallory&lt;/b&gt;"));
  assert.match(html, /<blockquote><p>quote<\/p><\/blockquote><p>reply<\/p>/);
  assert.match(html, /default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'/);
  assert.match(html, /href="https:\/\/github\.com\/noumenal-ai\/mathesis-forum\/discussions\/1">Reply on GitHub</);
});

test("a thread's GitHub body carries the post's marker", () => {
  const body = threadBody(post, ctx);
  assert.equal(MARKER_RE.exec(body)?.[1], "MTH.R-2026-6001");
  assert.ok(body.includes("(https://noumenal-ai.github.io/mathesis-bank/a/MTH.R-2026-6001/)"));
  assert.ok(!body.includes("Lineage."), "only the docstring's first paragraph");
});

test("a title's code renders as code on a page and flattens in plain text", async () => {
  const { titleHtml, titleText } = await import("../lib/render.mjs");
  const t = "`HasDSDimLE.hasNatarajanDimLE` has no converse.";
  assert.equal(titleHtml(t), "<code>HasDSDimLE.hasNatarajanDimLE</code> has no converse.");
  assert.equal(titleText(t), "HasDSDimLE.hasNatarajanDimLE has no converse.");
});
