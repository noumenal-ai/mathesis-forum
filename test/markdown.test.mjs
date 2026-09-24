// The Markdown subset: the Mathesis renderer's cases, plus block quotes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../lib/markdown.mjs";

test("spans and paragraphs", () => {
  assert.equal(
    renderMarkdown("**Pajor's inequality**, with no `A`\nhypothesis.\n\nSecond *part*."),
    "<p><strong>Pajor&#39;s inequality</strong>, with no <code>A</code> hypothesis.</p><p>Second <em>part</em>.</p>",
  );
});

test("nothing a commenter writes becomes markup", () => {
  const html = renderMarkdown('<script>alert(1)</script> & [x](javascript:alert(1)) <img src=x onerror=alert(1)> "q"');
  assert.ok(!html.includes("<script") && !html.includes("<img") && !html.includes("href"), html);
  assert.ok(html.includes("&lt;script&gt;") && html.includes("&lt;img"));
  const quoted = renderMarkdown('[x](https://a.b/"onmouseover="alert(1))');
  assert.ok(!quoted.includes("onmouseover=\"alert"), quoted);
});

test("links, lists, code blocks and quotes", () => {
  const html = renderMarkdown("See [the paper](https://arxiv.org/abs/1).\n\n- one\n- two\n  cont.\n\n```\nx := 1\n```\n\n> quoted\n> *line*\n\nafter");
  assert.ok(html.includes('<a href="https://arxiv.org/abs/1" rel="nofollow noopener noreferrer">the paper</a>'));
  assert.ok(html.includes("<ul><li>one</li><li>two cont.</li></ul>"));
  assert.ok(html.includes('<div class="f-code"><code>x := 1</code></div>'));
  assert.ok(html.includes("<blockquote><p>quoted <em>line</em></p></blockquote><p>after</p>"), html);
});

test("multi-byte text at every position", () => {
  assert.equal(renderMarkdown("𝒜 ⊆ `A` **α** *𝒜*"), "<p>𝒜 ⊆ <code>A</code> <strong>α</strong> <em>𝒜</em></p>");
  assert.equal(renderMarkdown("*𝒜"), "<p>*𝒜</p>");
});

test("unclosed markers are text", () => {
  assert.equal(renderMarkdown("a * b ** c ` d [e](f"), "<p>a * b ** c ` d [e](f</p>");
});
