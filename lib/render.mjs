// The forum's pages. Static HTML with no script at all, under a policy that
// loads nothing from anywhere but this origin (Mathesis shares it). A person is
// drawn as Mathesis draws them: a member of the record with their photo and a
// link to their profile there; anyone else with their abstract glyph and a
// link to GitHub.

import { escapeHtml as e, inline, renderMarkdown } from "./markdown.mjs";
import { glyphSvg } from "./glyph.mjs";

export const MARKER = (accession) => `<!-- mathesis:${accession} -->`;
export const MARKER_RE = /<!-- mathesis:(MTH\.R-\d{4}-\d{4,6}) -->/;

/** A post's title: the bold phrase its docstring opens with, else its name.
 *  It is Markdown (a name may be `code`): `titleHtml` renders it for a page,
 *  `titleText` flattens it for a document title or a GitHub thread's. */
export function titleOf(doc, declName) {
  const m = /^\s*\*\*([^*]+)\*\*/.exec(doc ?? "");
  return m ? m[1].trim() : declName.split(".").pop();
}
export const titleHtml = (title) => inline(title);
export const titleText = (title) => title.replaceAll("`", "");

const day = (iso) => (iso ?? "").slice(0, 10);

export function person(p, ctx, size = "sm") {
  const member = ctx.members.get(p.login);
  const name = member?.name ?? p.name ?? p.login;
  const href = member ? `${ctx.mathesis}/u/${encodeURIComponent(p.login)}/` : `https://github.com/${encodeURIComponent(p.login)}`;
  const face = member?.avatar
    ? `<img class="f-avatar f-avatar--${size}" src="${e(ctx.mathesis + member.avatar)}" alt="">`
    : glyphSvg(p.login, `f-avatar--${size}`);
  return `<a class="f-person" href="${e(href)}">${face}<span class="f-person__names"><span class="f-person__name">${e(name)}</span><span class="f-person__handle">${e(p.login)}</span></span></a>`;
}

export function layout(ctx, title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>${e(title)}</title>
<link rel="stylesheet" href="${e(ctx.base)}/assets/forum.css">
</head>
<body>
<header class="f-nav"><a class="f-nav__mark" href="${e(ctx.base)}/">Mathesis Forum</a><a class="f-nav__link" href="${e(ctx.mathesis)}/">Mathesis</a></header>
<main class="f-main">
${body}
</main>
</body>
</html>
`;
}

function comment(c, ctx) {
  const replies = (c.replies ?? []).map((r) => comment(r, ctx)).join("");
  return `<article class="f-comment"><header class="f-comment__head">${person(c.author, ctx)}<a class="f-when" href="${e(c.url)}"><time datetime="${e(c.createdAt)}">${e(day(c.createdAt))}</time></a></header><div class="f-comment__body">${renderMarkdown(c.body)}</div>${replies ? `<div class="f-replies">${replies}</div>` : ""}</article>`;
}

export function postPage(post, thread, ctx) {
  const doc = post.doc ? `<div class="f-doc">${renderMarkdown(post.doc)}</div>` : "";
  const comments = (thread?.comments ?? []).map((c) => comment(c, ctx)).join("");
  const reply = thread?.url ? `<a class="f-reply" href="${e(thread.url)}">Reply on GitHub</a>` : "";
  const body = `<article class="f-post">
<header class="f-post__head">${person(post.author, ctx, "md")}<time class="f-when" datetime="${e(post.publishedAt)}">${e(day(post.publishedAt))}</time></header>
<h1 class="f-post__title">${titleHtml(post.title)}</h1>
${doc}
<pre class="f-lean">${e(post.statement)}</pre>
<p class="f-post__record"><a href="${e(`${ctx.mathesis}/a/${post.argument}/`)}">${e(post.argument)}</a></p>
</article>
<section class="f-thread">
${comments}
${reply}
</section>`;
  return layout(ctx, `${titleText(post.title)} · Mathesis Forum`, body);
}

export function indexPage(posts, ctx) {
  const items = posts
    .map(
      (p) =>
        `<li class="f-list__item"><a class="f-list__title" href="${e(`${ctx.base}/p/${p.argument}/`)}">${titleHtml(p.title)}</a><span class="f-list__meta">${person(p.author, ctx)}<time class="f-when" datetime="${e(p.publishedAt)}">${e(day(p.publishedAt))}</time></span></li>`,
    )
    .join("\n");
  return layout(ctx, "Mathesis Forum", `<ol class="f-list">\n${items}\n</ol>`);
}

/** The body of the GitHub discussion that holds a post's thread. */
export function threadBody(post, ctx) {
  const lead = (post.doc ?? "").split(/\n\s*\n/)[0].trim();
  return [
    `**${titleText(post.title)}** · ${post.author.name ?? post.author.login}`,
    lead,
    "```lean\n" + post.statement + "\n```",
    `[${post.argument}](${ctx.mathesis}/a/${post.argument}/)`,
    MARKER(post.argument),
  ]
    .filter(Boolean)
    .join("\n\n");
}
