// The abstract avatar, exactly as Mathesis draws it (record/src/pages.rs
// `glyph`): a 5×5 grid mirrored left to right, from an FNV-1a hash of the
// lowercased GitHub login, in one of four tints. A person looks the same on the
// forum as on the record, and no photo of anyone is fetched to draw it.

const MASK = (1n << 64n) - 1n;

export function fnv1a(login) {
  let h = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(login.toLowerCase())) {
    h ^= BigInt(byte);
    h = (h * 0x100000001b3n) & MASK;
  }
  return h;
}

/** The grid as one SVG path, and the tint index. */
export function glyphParts(login) {
  const h = fnv1a(login);
  let d = "";
  for (let row = 0n; row < 5n; row++) {
    for (let col = 0n; col < 3n; col++) {
      if (((h >> (row * 3n + col)) & 1n) === 1n) {
        for (const x of col === 2n ? [2n] : [col, 4n - col]) d += `M${x} ${row}h1v1h-1z`;
      }
    }
  }
  return { d, tint: Number((h >> 15n) % 4n) };
}

export function glyphSvg(login, className = "") {
  const { d, tint } = glyphParts(login);
  const cls = ["f-glyph", `f-glyph--${tint}`, className].filter(Boolean).join(" ");
  return `<svg class="${cls}" viewBox="-0.5 -0.5 6 6" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}
