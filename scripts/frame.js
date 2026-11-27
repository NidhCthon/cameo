// The ironwork: a baroque frame of wrought-iron vine, drawn as one inline SVG
// at the exact size the portrait turns out to be.
//
// The frame is not assembled from corner and edge pieces. An early version was,
// and it had three visible breaks per side: a corner's bar left its box 4% down
// the band while the edge tile's vine arrived 79% down, and the edge tile never
// divided a whole number of times into the run, so the last repeat was cut
// mid-wave. Instead, each perimeter here exposes walk(s) for s in [0,1): a point
// on the centre line and the outward unit normal, parametrised once round the
// whole shape, corners included. The rail is one closed path. The vine is that
// centre line pushed in and out by a sine with a whole number of cycles, so it
// returns to its start exactly. Leaves, rivets and curls are placed by distance
// along the same parameter, so they land on the vine by construction rather
// than by eye.
//
// The cost is that the frame has to be measured before it can be drawn, so the
// panel regenerates it whenever its size changes. That is once per hover.
//
// Everything here is a pure function from plain numbers to an SVG string, so it
// runs in node and in tools/preview without Foundry.

const PI = Math.PI;

/** Two decimals is plenty for a frame a few hundred pixels across, and keeps the path strings short. */
const f = (n) => Math.round(n * 100) / 100;
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

/** Text bound for an SVG text node. */
export const escapeText = (text) =>
  String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Text bound for a double-quoted SVG attribute. */
export const escapeAttr = (text) => escapeText(text).replace(/"/g, "&quot;");

/** Black iron: a dropped shadow, the body, and a thin highlight offset up and left. */
export const IRON = { shadow: "#000000", base: "#232428", light: "#b9c3cd", sheen: 0.55 };

/**
 * Study one from the design page: forged bar, tight scrolls, pointed leaves.
 * Every ratio is a fraction of the band, so the whole frame scales with it.
 */
export const FRAME = {
  /** How wide a margin the ironwork gets around the portrait, in pixels. */
  band: 56,
  metal: IRON,
  /** Stroke widths, as fractions of the band. */
  rail: 0.1,
  vine: 0.085,
  /** How far the vine swings off the rail, and roughly how long one wave is. */
  amp: 0.3,
  period: 1.45,
  /** Leaf length, and whether leaves come to a point. */
  leaf: 0.42,
  pointy: true,
  /** The banderole and the medallion's recess. */
  plateFill: "#2a2d34",
  discFill: "#1b1c20",
  engrave: "#08090b",
  /** How much room the portrait may take. CSS lengths, set on the panel. */
  maxWidth: "19rem",
  maxHeight: "42vh"
};

/**
 * The frame scaled to the room available. A short window gets a narrower band
 * and a smaller portrait, so the whole panel still clears the hotbar on a
 * laptop. The band is the only number that matters: every other measurement in
 * the frame is a fraction of it.
 */
export function frameFor(viewportHeight, style = FRAME) {
  if (!(viewportHeight > 0) || viewportHeight >= 820) return style;
  return { ...style, band: 44, maxWidth: "15rem", maxHeight: "38vh" };
}

/* ---------- metal ---------- */

/**
 * One stroke drawn three times: a dropped shadow, the body, and a thinner
 * highlight offset up and left. That reads as rounded cast metal with a light
 * source above, and it is what makes black iron legible on a dark portrait.
 */
export function bar(d, m, w, extra) {
  return (
    `<path d="${d}" fill="none" stroke="${m.shadow}" stroke-width="${f(w + 2.6)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.3,2.1)" opacity="0.75"/>` +
    `<path d="${d}" fill="none" stroke="${m.base}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra || ""}/>` +
    `<path d="${d}" fill="none" stroke="${m.light}" stroke-width="${f(Math.max(0.7, w * 0.3))}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.7,-1.1)" opacity="${m.sheen}"/>`
  );
}

export function leaf(x, y, rot, len, wid, m, pointy) {
  const c = pointy ? 0.42 : 0.62;
  const d =
    `M0 0 C ${f(len * c)} ${f(-wid)}, ${f(len)} ${f(-wid * 0.42)}, ${f(len)} 0 ` +
    `C ${f(len)} ${f(wid * 0.42)}, ${f(len * c)} ${f(wid)}, 0 0 Z`;
  return (
    `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})">` +
    `<path d="${d}" fill="${m.shadow}" transform="translate(1.1,1.8)" opacity="0.7"/>` +
    `<path d="${d}" fill="${m.base}"/>` +
    `<path d="M${f(len * 0.08)} 0 L${f(len * 0.92)} 0" stroke="${m.light}" stroke-width="${f(wid * 0.17)}" opacity="${m.sheen}" stroke-linecap="round"/>` +
    `</g>`
  );
}

export function stud(x, y, r, m) {
  return (
    `<circle cx="${f(x + 0.9)}" cy="${f(y + 1.6)}" r="${f(r)}" fill="${m.shadow}" opacity="0.7"/>` +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${m.base}"/>` +
    `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.33)}" r="${f(r * 0.4)}" fill="${m.light}" opacity="${m.sheen}"/>`
  );
}

/** A C-scroll, sized by s, with the stroke width corrected for the scale. */
export function curl(x, y, rot, s, m, w) {
  const d = "M0 0 C 0 -15, 11 -24, 19 -18 C 27 -13, 25 -2, 16 -1 C 10 -0.4, 8 -7, 13 -9";
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rot)}) scale(${f(s)})">${bar(d, m, w / s)}</g>`;
}

/* ---------- the perimeter ---------- */

/**
 * A rounded rectangle as one continuous parameter.
 * @returns {{walk: (s: number) => [[number, number], [number, number]], total: number, railPath: string}}
 *   walk(s) gives a point on the centre line and the outward unit normal;
 *   total is the perimeter length; railPath is the whole rail as one closed path.
 */
export function roundedRect(x0, y0, x1, y1, r) {
  const Lt = x1 - x0 - 2 * r;
  const Lr = y1 - y0 - 2 * r;
  const A = (PI / 2) * r;
  const arc = (base, ox, oy) => (d) => {
    const a = base + d / r;
    return [[ox + r * Math.cos(a), oy + r * Math.sin(a)], [Math.cos(a), Math.sin(a)]];
  };
  const segs = [
    { len: Lt, at: (d) => [[x0 + r + d, y0], [0, -1]] },
    { len: A, at: arc(-PI / 2, x1 - r, y0 + r) },
    { len: Lr, at: (d) => [[x1, y0 + r + d], [1, 0]] },
    { len: A, at: arc(0, x1 - r, y1 - r) },
    { len: Lt, at: (d) => [[x1 - r - d, y1], [0, 1]] },
    { len: A, at: arc(PI / 2, x0 + r, y1 - r) },
    { len: Lr, at: (d) => [[x0, y1 - r - d], [-1, 0]] },
    { len: A, at: arc(PI, x0 + r, y0 + r) }
  ];
  const total = 2 * Lt + 2 * Lr + 4 * A;
  function walk(s) {
    let d = (((s % 1) + 1) % 1) * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i].len || i === segs.length - 1) return segs[i].at(Math.min(d, segs[i].len));
      d -= segs[i].len;
    }
    return segs[0].at(0);
  }
  const railPath =
    `M ${f(x0 + r)} ${f(y0)} L ${f(x1 - r)} ${f(y0)}` +
    ` A ${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y0 + r)}` +
    ` L ${f(x1)} ${f(y1 - r)}` +
    ` A ${f(r)} ${f(r)} 0 0 1 ${f(x1 - r)} ${f(y1)}` +
    ` L ${f(x0 + r)} ${f(y1)}` +
    ` A ${f(r)} ${f(r)} 0 0 1 ${f(x0)} ${f(y1 - r)}` +
    ` L ${f(x0)} ${f(y0 + r)}` +
    ` A ${f(r)} ${f(r)} 0 0 1 ${f(x0 + r)} ${f(y0)} Z`;
  return { walk, total, railPath };
}

/**
 * One closed vine: the rail's centre line pushed in and out by a sine with a
 * whole number of cycles, so the last wave meets the first exactly.
 */
export function vinePath(per, amp, cycles, samples) {
  let d = "";
  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    const w = per.walk(s);
    const a = amp * Math.sin(2 * PI * cycles * s);
    d += (i === 0 ? "M " : " L ") + pt([w[0][0] + w[1][0] * a, w[0][1] + w[1][1] * a]);
  }
  return `${d} Z`;
}

/** A point `off` out from the centre line at s, which is where the vine is when off is ±amp. */
export function atPerim(per, s, off) {
  const w = per.walk(s);
  return [w[0][0] + w[1][0] * off, w[0][1] + w[1][1] * off];
}

/** The centre line's heading at s, in degrees, so ornament can lie along it. */
export function tangentDeg(per, s) {
  const e = 0.0015;
  const a = per.walk(s - e)[0];
  const b = per.walk(s + e)[0];
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / PI;
}

/** How many whole waves fit round a perimeter at this band and period. */
export const vineCycles = (total, band, period) => Math.max(4, Math.round(total / (band * period)));

/* ---------- the faction mark ---------- */

/**
 * Filters that cast an arbitrary image in the frame's metal. The mark's own
 * colour is thrown away and only its alpha is kept, so a white-on-transparent
 * symbol and a black one both come out as the same iron. The three layers match
 * bar(): a dropped shadow, the body, and a lit rim inside the upper-left edge.
 *
 * feMorphology works in the element's own user units, which is why the mark is
 * drawn at its final size rather than scaled by a transform.
 */
export function markFilters(uid, m) {
  const flood = (color, into) => `<feFlood flood-color="${color}"/><feComposite in2="${into}" operator="in"/>`;
  return (
    `<defs>` +
    `<filter id="${uid}-mk-shadow" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">${flood(m.shadow, "SourceAlpha")}</filter>` +
    `<filter id="${uid}-mk-body" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">${flood(m.base, "SourceAlpha")}</filter>` +
    `<filter id="${uid}-mk-sheen" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">` +
    `<feMorphology in="SourceAlpha" operator="erode" radius="1.2" result="core"/>` +
    `<feOffset in="SourceAlpha" dx="-1" dy="-1.4" result="up"/>` +
    `<feComposite in="up" in2="core" operator="out" result="ring"/>` +
    `<feComposite in="ring" in2="SourceAlpha" operator="in" result="rim"/>` +
    flood(m.light, "rim") +
    `</filter>` +
    `</defs>`
  );
}

/** The mark itself, cast in the metal: the same three layers as a forged bar. */
export function markCasting(uid, href, cx, cy, size, m) {
  const box = (dx, dy, filter, opacity) =>
    `<image href="${escapeAttr(href)}" x="${f(cx - size / 2 + dx)}" y="${f(cy - size / 2 + dy)}" ` +
    `width="${f(size)}" height="${f(size)}" preserveAspectRatio="xMidYMid meet" ` +
    `filter="url(#${uid}-mk-${filter})"${opacity === undefined ? "" : ` opacity="${opacity}"`}/>`;
  return box(1.3, 2.1, "shadow", 0.75) + box(0, 0, "body") + box(0, 0, "sheen", m.sheen);
}

/* ---------- the bottom assembly ---------- */

/**
 * The collar at bottom centre: a medallion clasped onto the rail, with the
 * banderole hanging from it. The rail runs straight through behind the
 * medallion and the volutes close over it, the way a real casting is clamped
 * on. This is the frame's only deliberate overlap.
 *
 * With neither a mark nor a name there is nothing to mount, so the caller
 * leaves the collar off entirely and the rail stays clean.
 *
 * The medallion's radius, the strap's size and the lettering's baseline come
 * out of collarGeometry so they can be checked numerically. The composition
 * went wrong once in exactly the way the numbers catch: the strap was placed at
 * a guessed fraction of the radius and the disc covered the middle of the name.
 */
export function collarGeometry({ railY, band, name, maxW, hasMark }) {
  // Without a mark the clasp shrinks to a plain boss, so it reads as the rivet
  // holding the strap rather than as a medallion with its symbol missing.
  const R = band * (hasMark ? 0.62 : 0.3);
  if (!name) return { R };
  // The strap grows with the name but never past the frame; past that the
  // lettering shrinks instead, so a long name cannot blow out the panel.
  const chars = Math.max(1, name.length);
  const pw = Math.min(maxW - band * 0.6, Math.max(band * 3.4, chars * band * 0.215));
  const fs = Math.min(band * 0.3, (pw - band * 0.6) / (chars * 0.66));
  // The disc overlaps the strap's top edge so the two read as one casting, and
  // the baseline is set from the disc's lowest point, not the strap's centre, so
  // the lettering can never end up behind the medallion.
  const py = railY + R * 0.52;
  const ty = railY + R + fs * 1.3;
  const ph = Math.max(band * 0.56, ty + fs * 0.34 - py + band * 0.08);
  return { R, pw, fs, py, ty, ph };
}

/** The collar, drawn. See collarGeometry above for the measurements. */
export function collar({ uid, cx, railY, band, style, mark, name, maxW }) {
  const m = style.metal;
  const { R, pw, fs, py, ty, ph } = collarGeometry({ railY, band, name, maxW, hasMark: !!mark });
  let s = "";
  s += curl(cx - R * 1.02, railY, 198, band / 52, m, band * 0.1);
  s += curl(cx + R * 1.02, railY, -18, band / 52, m, band * 0.1);

  if (name) {
    const e = ph * 0.42;
    const d =
      `M ${f(cx - pw / 2)} ${f(py)}` +
      ` C ${f(cx - pw / 2 + e)} ${f(py - e * 0.5)}, ${f(cx - pw / 2 + e)} ${f(py + ph + e * 0.5)}, ${f(cx - pw / 2)} ${f(py + ph)}` +
      ` L ${f(cx + pw / 2)} ${f(py + ph)}` +
      ` C ${f(cx + pw / 2 - e)} ${f(py + ph + e * 0.5)}, ${f(cx + pw / 2 - e)} ${f(py - e * 0.5)}, ${f(cx + pw / 2)} ${f(py)} Z`;
    s += `<path d="${d}" fill="${m.shadow}" opacity="0.8" transform="translate(1.4,2.4)"/>`;
    s += `<path d="${d}" fill="${style.plateFill}"/>`;
    s += `<path d="${d}" fill="none" stroke="${m.base}" stroke-width="${f(band * 0.07)}"/>`;
    s += `<path d="${d}" fill="none" stroke="${m.light}" stroke-width="0.9" opacity="${m.sheen * 0.55}" transform="translate(-0.6,-0.9)"/>`;
    s += curl(cx - pw / 2 - ph * 0.1, py + ph * 0.5, 150, band / 70, m, band * 0.08);
    s += curl(cx + pw / 2 + ph * 0.1, py + ph * 0.5, 30, band / 70, m, band * 0.08);
    // The name, incised: a dark groove with the light catching its lower edge.
    const label = escapeText(name);
    const tA =
      `x="${f(cx)}" text-anchor="middle" font-family="Cinzel, serif" font-weight="600" ` +
      `letter-spacing="${f(fs * 0.1)}" font-size="${f(fs)}"`;
    s += `<text ${tA} y="${f(ty + 1.2)}" fill="${m.light}" opacity="${Math.min(1, m.sheen * 1.45)}">${label}</text>`;
    s += `<text ${tA} y="${f(ty)}" fill="${style.engrave}">${label}</text>`;
  }

  // The medallion, mounted on the rail.
  s += `<circle cx="${f(cx + 1.3)}" cy="${f(railY + 2.2)}" r="${f(R)}" fill="${m.shadow}" opacity="0.8"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(railY)}" r="${f(R)}" fill="${style.discFill}"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(railY)}" r="${f(R)}" fill="none" stroke="${m.base}" stroke-width="${f(band * 0.1)}"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(railY)}" r="${f(R)}" fill="none" stroke="${m.light}" stroke-width="1.1" opacity="${m.sheen * 0.7}" transform="translate(-0.8,-1.2)"/>`;
  if (mark) s += markCasting(uid, mark, cx, railY, R * 1.24, m);
  else s += stud(cx, railY, R * 0.3, m);
  return s;
}

/* ---------- geometry ---------- */

/**
 * Where the ironwork goes, from the measured panel.
 * @param {object} box  The inner box's width and height.
 * @param {object} bezel  The portrait's bezel, in the inner box's coordinates.
 * @param {number} band  The ironwork's margin.
 */
export function geometry({ width, height, bezel, band }) {
  const pad = band * 0.5;
  const g = {
    band,
    w: width,
    h: height,
    x0: bezel.left - pad,
    y0: bezel.top - pad,
    x1: bezel.right + pad,
    y1: bezel.bottom + pad
  };
  g.cx = (g.x0 + g.x1) / 2;
  g.cy = (g.y0 + g.y1) / 2;
  return g;
}

/** How much room the frame needs below the portrait: enough for the strap, or just the rail. */
export const skirtFor = (band, hasName) => Math.round(band * (hasName ? 1.3 : 0.55));

/* ---------- the whole ironwork, in one pass ---------- */

/**
 * The frame as one SVG string, for a viewBox of g.w by g.h.
 * @param {object} g  From geometry().
 * @param {object} style  FRAME, or a variation on it.
 * @param {{uid?: string, mark?: string|null, name?: string}} content
 */
export function ironwork(g, style, { uid = "cameo", mark = null, name = "" } = {}) {
  const m = style.metal;
  const band = g.band;
  const per = roundedRect(g.x0, g.y0, g.x1, g.y1, band * 0.6);
  const cx = (g.x0 + g.x1) / 2;
  const railY = g.y1;
  const amp = band * style.amp;
  const cycles = vineCycles(per.total, band, style.period);
  let out = mark ? markFilters(uid, m) : "";

  // 1. the rail: one closed path, corners included
  out += bar(per.railPath, m, band * style.rail);

  // 2. the vine: one closed path, a whole number of waves
  const samples = Math.max(420, Math.round(per.total / 2));
  out += bar(vinePath(per, amp, cycles, samples), m, band * style.vine);

  // 3. leaves at the swings and rivets at the crossings, placed by the same
  //    parameter that drew the vine, so they sit on it by construction
  for (let k = 0; k < cycles; k++) {
    const sOut = (k + 0.25) / cycles;
    const sIn = (k + 0.75) / cycles;
    const pO = atPerim(per, sOut, amp);
    out += leaf(pO[0], pO[1], tangentDeg(per, sOut) - 34, band * style.leaf, band * style.leaf * 0.31, m, style.pointy);
    if (k % 2 === 0) {
      const pI = atPerim(per, sIn, -amp);
      out += leaf(pI[0], pI[1], tangentDeg(per, sIn) + 146, band * style.leaf * 0.82, band * style.leaf * 0.26, m, style.pointy);
    }
    const pC = atPerim(per, k / cycles, 0);
    out += stud(pC[0], pC[1], band * 0.055, m);
  }

  // 4. corner curls, on the turns
  for (const [x, y, rot] of [[g.x0, g.y0, 0], [g.x1, g.y0, 90], [g.x1, g.y1, 180], [g.x0, g.y1, 270]]) {
    const inx = x === g.x0 ? 1 : -1;
    const iny = y === g.y0 ? 1 : -1;
    out += curl(x + inx * band * 0.52, y + iny * band * 0.52, rot + 135, band / 46, m, band * 0.115);
  }

  // 5. the collar last, so its volutes close over the rail
  if (mark || name) out += collar({ uid, cx, railY, band, style, mark, name, maxW: g.w });
  return out;
}
