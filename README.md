# Mathesis Forum

The forum of [Mathesis](https://noumenal-ai.github.io/mathesis-bank/), served at
<https://noumenal-ai.github.io/mathesis-forum/>.

Mathesis takes only verified arguments. Talk about them happens here: every post on
Mathesis has one page on the forum, and each Mathesis post links to it.

## How it works

- **Threads are GitHub Discussions** in this repository, one per post, opened by the
  forum's workflow in the *Announcements* category (only the forum opens threads there;
  anyone signed in to GitHub can reply). A thread carries its post's accession in a
  marker, `<!-- mathesis:MTH.R-… -->`, which is how a page finds it.
- **Pages are static.** `build.mjs` reads the public Mathesis record (its JSON, like any
  client), reads every thread, and writes one page per post plus an index. Replying
  happens on GitHub, through the page's link; the page updates on the next run.
- **The workflow** (`.github/workflows/forum.yml`) runs on every new or edited discussion
  or comment, on every push, and hourly, so a thread and its page stay in step and new
  Mathesis posts get their threads.
- **Nothing third-party loads.** Pages carry no script; their policy loads styles, fonts
  and images from this origin only. A member of Mathesis appears with their photo from
  the record; anyone else with the same abstract glyph Mathesis draws for them.
- **What people write is text.** Comments render from a closed Markdown subset
  (paragraphs, lists, block quotes, code, strong, emphasis, http(s) links); everything
  else is escaped.

## Building

```
node --test                 # the renderer, the glyph, the pages, an offline build
MATHESIS_DIR=../mathesis-bank/docs node build.mjs    # offline: no threads
GITHUB_TOKEN=… node build.mjs                        # with threads (read-only)
```

Fonts: Tinos (SIL Open Font License 1.1, `assets/fonts/TINOS-LICENSE.txt`) where Times New
Roman is not installed.
