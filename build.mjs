#!/usr/bin/env node
// The forum's build. Every post on Mathesis gets one thread here — a GitHub
// Discussion — and one page, which shows the post and its thread. Nothing is
// ever written back to Mathesis: the record takes only verified arguments.
//
//   MATHESIS_BASE   the record's public origin (its JSON is read like any client's)
//   MATHESIS_DIR    read that JSON from a local directory instead (tests)
//   FORUM_BASE      the path this site is served under          (/mathesis-forum)
//   FORUM_REPO      owner/name of the repository holding the threads
//   GITHUB_TOKEN    read the threads; without it, pages carry none
//   CREATE_THREADS  1: open a thread for any post that has none (CI only)
//   OUT             the directory to write                       (site)

import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MARKER_RE, indexPage, layout, postPage, threadBody, titleOf, titleText } from "./lib/render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const env = process.env;
const ctx = {
  mathesis: (env.MATHESIS_BASE ?? "https://noumenal-ai.github.io/mathesis-bank").replace(/\/$/, ""),
  base: (env.FORUM_BASE ?? "/mathesis-forum").replace(/\/$/, ""),
  members: new Map(),
};
const OUT = env.OUT ?? join(here, "site");
const [owner, name] = (env.FORUM_REPO ?? "noumenal-ai/mathesis-forum").split("/");

async function mathesisJson(path) {
  if (env.MATHESIS_DIR) return JSON.parse(await readFile(join(env.MATHESIS_DIR, path), "utf8"));
  const res = await fetch(`${ctx.mathesis}/${path}`);
  if (!res.ok) throw new Error(`Mathesis ${path}: HTTP ${res.status}`);
  return res.json();
}

async function loadPosts() {
  for (const p of await mathesisJson("profiles.json")) {
    ctx.members.set(p.login, { name: p.citation_name, avatar: p.avatar ?? null });
  }
  const rows = [];
  for (let i = 0; ; i++) {
    const page = await mathesisJson(`posts-${String(i).padStart(4, "0")}.json`);
    rows.push(...page.rows);
    if (page.next_cursor == null) break;
  }
  const posts = [];
  for (const r of rows) {
    const claim = await mathesisJson(`a/${r.claim}/index.json`);
    posts.push({
      argument: r.argument,
      claim: r.claim,
      postNumber: r.post_number,
      publishedAt: r.published_at,
      author: { login: r.author_login, name: r.author },
      doc: claim.doc ?? null,
      statement: claim.statement.pretty,
      title: titleOf(claim.doc, claim.decl_name),
    });
  }
  return posts.sort((a, b) => b.postNumber - a.postNumber);
}

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "mathesis-forum",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`GitHub: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

const PERSON = "author { login ... on User { name } }";
const COMMENT = `id url body createdAt isMinimized ${PERSON}`;
const COMMENTS = `pageInfo { hasNextPage endCursor } nodes { ${COMMENT} replies(first: 100) { pageInfo { hasNextPage } nodes { ${COMMENT} } } }`;

const visible = (c) => !c.isMinimized;
const withAuthor = (c) => ({ ...c, author: c.author ?? { login: "ghost" } });

async function loadThreads() {
  const threads = new Map();
  let cursor = null;
  do {
    const d = await gql(
      `query($owner: String!, $name: String!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          discussions(first: 20, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { id url title body comments(first: 100) { ${COMMENTS} } }
          }
        }
      }`,
      { owner, name, cursor },
    );
    const conn = d.repository.discussions;
    for (const n of conn.nodes) {
      const m = MARKER_RE.exec(n.body ?? "");
      if (!m) continue;
      let comments = n.comments.nodes;
      let info = n.comments.pageInfo;
      while (info.hasNextPage) {
        const more = await gql(
          `query($id: ID!, $cursor: String) { node(id: $id) { ... on Discussion { comments(first: 100, after: $cursor) { ${COMMENTS} } } } }`,
          { id: n.id, cursor: info.endCursor },
        );
        comments = comments.concat(more.node.comments.nodes);
        info = more.node.comments.pageInfo;
      }
      for (const c of comments) {
        if (c.replies.pageInfo.hasNextPage) {
          console.warn(`forum: a comment on ${m[1]} has more than 100 replies; the first 100 are shown (${c.url})`);
        }
      }
      threads.set(m[1], {
        id: n.id,
        url: n.url,
        title: n.title,
        body: n.body,
        comments: comments
          .filter(visible)
          .map((c) => ({ ...withAuthor(c), replies: c.replies.nodes.filter(visible).map(withAuthor) })),
      });
    }
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor);
  return threads;
}

/** One thread per post, opened in the announcement category — only the forum
 *  opens threads there; anyone signed in to GitHub can reply. A thread's title
 *  and opening post follow its Mathesis post: if the post's docstring changes,
 *  the thread is edited to match. */
async function syncThreads(posts, threads) {
  const d = await gql(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id discussionCategories(first: 25) { nodes { id slug } } }
    }`,
    { owner, name },
  );
  const cats = d.repository.discussionCategories.nodes;
  const cat = cats.find((c) => c.slug === "announcements") ?? cats.find((c) => c.slug === "general");
  if (!cat) throw new Error("forum: the repository has no announcements or general category");
  for (const p of [...posts].reverse()) {
    const title = titleText(p.title);
    const body = threadBody(p, ctx);
    const have = threads.get(p.argument);
    if (have) {
      if (have.title !== title || have.body !== body) {
        await gql(
          `mutation($id: ID!, $title: String!, $body: String!) {
            updateDiscussion(input: { discussionId: $id, title: $title, body: $body }) { discussion { id } }
          }`,
          { id: have.id, title, body },
        );
        console.log(`forum: brought the thread for ${p.argument} in step with its post: ${have.url}`);
      }
      continue;
    }
    const r = await gql(
      `mutation($repo: ID!, $cat: ID!, $title: String!, $body: String!) {
        createDiscussion(input: { repositoryId: $repo, categoryId: $cat, title: $title, body: $body }) { discussion { id url } }
      }`,
      { repo: d.repository.id, cat: cat.id, title, body },
    );
    const t = r.createDiscussion.discussion;
    threads.set(p.argument, { id: t.id, url: t.url, comments: [] });
    console.log(`forum: opened the thread for ${p.argument}: ${t.url}`);
    await new Promise((ok) => setTimeout(ok, 1500)); // under GitHub's content-creation rate
  }
}

async function writeSite(posts, threads) {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "assets", "fonts"), { recursive: true });
  await copyFile(join(here, "assets", "forum.css"), join(OUT, "assets", "forum.css"));
  for (const f of ["tinos-400-latin.woff2", "tinos-700-latin.woff2", "TINOS-LICENSE.txt"]) {
    await copyFile(join(here, "assets", "fonts", f), join(OUT, "assets", "fonts", f));
  }
  await writeFile(join(OUT, ".nojekyll"), "");
  await writeFile(join(OUT, "index.html"), indexPage(posts, ctx));
  await writeFile(join(OUT, "404.html"), layout(ctx, "Mathesis Forum", ""));
  for (const p of posts) {
    await mkdir(join(OUT, "p", p.argument), { recursive: true });
    await writeFile(join(OUT, "p", p.argument, "index.html"), postPage(p, threads.get(p.argument) ?? null, ctx));
  }
  console.log(`forum: ${posts.length} post pages -> ${OUT}`);
}

const posts = await loadPosts();
let threads = new Map();
if (env.GITHUB_TOKEN) {
  threads = await loadThreads();
  if (env.CREATE_THREADS === "1") await syncThreads(posts, threads);
} else {
  console.warn("forum: no GITHUB_TOKEN, so the pages carry no threads");
}
await writeSite(posts, threads);
