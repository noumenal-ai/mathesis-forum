// Markdown, reduced. The same closed subset Mathesis renders docstrings with —
// paragraphs, lists, fenced code, inline code, strong, emphasis and links over
// http(s) — plus block quotes, because replies quote. Every other character is
// text, escaped: nothing a commenter writes becomes markup on the forum.

export function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const isItem = (t) => t.startsWith("- ") || t.startsWith("* ");
const isQuote = (t) => t.startsWith(">");
const isFence = (t) => t.startsWith("```");

export function renderMarkdown(md) {
  const lines = (md ?? "").replaceAll("\r\n", "\n").split("\n");
  let out = "";
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "") {
      i += 1;
    } else if (isFence(t)) {
      const code = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i].trim())) code.push(lines[i++]);
      i += 1;
      out += `<div class="f-code"><code>${escapeHtml(code.join("\n"))}</code></div>`;
    } else if (isQuote(t)) {
      const quoted = [];
      while (i < lines.length && isQuote(lines[i].trim())) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      out += `<blockquote>${renderMarkdown(quoted.join("\n"))}</blockquote>`;
    } else if (isItem(t)) {
      const items = [t.slice(2).trimStart()];
      i += 1;
      while (i < lines.length && lines[i].trim() !== "" && !isFence(lines[i].trim())) {
        const n = lines[i].trim();
        if (isItem(n)) items.push(n.slice(2).trimStart());
        else items[items.length - 1] += ` ${n}`;
        i += 1;
      }
      out += `<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`;
    } else {
      let para = t.replace(/^#+/, "").trim();
      i += 1;
      while (i < lines.length) {
        const n = lines[i].trim();
        if (n === "" || isFence(n) || isItem(n) || isQuote(n)) break;
        para += ` ${n}`;
        i += 1;
      }
      out += `<p>${inline(para)}</p>`;
    }
  }
  return out;
}

const SAFE_URL = /^https?:\/\/[^\s"<>]+$/;

/** Inline spans. An unclosed marker is text. */
export function inline(s) {
  let out = "";
  let rest = s;
  while (rest.length > 0) {
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        out += `<code>${escapeHtml(rest.slice(1, end))}</code>`;
        rest = rest.slice(end + 1);
        continue;
      }
    }
    if (rest.startsWith("**")) {
      const end = rest.indexOf("**", 2);
      if (end > 2) {
        out += `<strong>${inline(rest.slice(2, end))}</strong>`;
        rest = rest.slice(end + 2);
        continue;
      }
    }
    if (rest.startsWith("*") && !rest.startsWith("* ") && !rest.startsWith("**")) {
      const end = rest.indexOf("*", 1);
      if (end > 1) {
        out += `<em>${inline(rest.slice(1, end))}</em>`;
        rest = rest.slice(end + 1);
        continue;
      }
    }
    if (rest.startsWith("[")) {
      const close = rest.indexOf("](");
      if (close > 0) {
        const end = rest.indexOf(")", close + 2);
        const url = end > 0 ? rest.slice(close + 2, end) : "";
        if (SAFE_URL.test(url)) {
          out += `<a href="${escapeHtml(url)}" rel="nofollow noopener noreferrer">${inline(rest.slice(1, close))}</a>`;
          rest = rest.slice(end + 1);
          continue;
        }
      }
    }
    // Advance by one whole code point, never half a surrogate pair: `𝒜` is two.
    const first = String.fromCodePoint(rest.codePointAt(0)).length;
    let next = rest.slice(first).search(/[`*[]/);
    next = next < 0 ? rest.length : next + first;
    out += escapeHtml(rest.slice(0, next));
    rest = rest.slice(next);
  }
  return out;
}
