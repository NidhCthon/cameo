// The frame's claim is that it connects: one closed rail, one closed vine, and
// ornament that sits on the vine because it was placed by the same parameter
// rather than by eye. These tests are what makes that checkable instead of a
// thing to look at and hope.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FRAME,
  SIZE_NAMES,
  atPerim,
  collarGeometry,
  frameFor,
  geometry,
  ironwork,
  roundedRect,
  skirtFor,
  vineCycles,
  vinePath,
  escapeText
} from "../scripts/frame.js";

/** A panel the size a 3:4 portrait makes at the default band. */
const panel = () =>
  geometry({
    width: 416,
    height: 541,
    bezel: { left: 56, top: 56, right: 360, bottom: 461 },
    band: FRAME.band
  });

const numbers = (d) => d.match(/-?\d+(?:\.\d+)?/g).map(Number);
const points = (d) => {
  const n = numbers(d);
  const out = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
};

test("the rail is one closed path", () => {
  const per = roundedRect(0, 0, 300, 400, 34);
  assert.equal(per.railPath.match(/M /g).length, 1, "one move-to, so one subpath");
  assert.match(per.railPath, /Z$/);
});

test("walking the perimeter comes back to where it started", () => {
  const per = roundedRect(10, 20, 310, 420, 34);
  const [a] = per.walk(0);
  const [b] = per.walk(1);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.001, `${a} vs ${b}`);
});

test("the outward normal points away from the middle everywhere", () => {
  const per = roundedRect(0, 0, 300, 400, 34);
  for (let i = 0; i < 64; i++) {
    const [p, n] = per.walk(i / 64);
    const out = [p[0] - 150, p[1] - 200];
    const len = Math.hypot(out[0], out[1]);
    assert.ok((out[0] / len) * n[0] + (out[1] / len) * n[1] > 0, `s=${i / 64}`);
    assert.ok(Math.abs(Math.hypot(n[0], n[1]) - 1) < 1e-9, "unit length");
  }
});

test("the vine closes on itself, with no step anywhere along it", () => {
  const g = panel();
  const per = roundedRect(g.x0, g.y0, g.x1, g.y1, g.band * 0.6);
  const cycles = vineCycles(per.total, g.band, FRAME.period);
  const d = vinePath(per, g.band * FRAME.amp, cycles, 900);
  const p = points(d);
  const gap = Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]);
  assert.ok(gap < 0.05, `closure gap ${gap.toFixed(3)}px`);
  let worst = 0;
  for (let i = 1; i < p.length; i++) worst = Math.max(worst, Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  // The vine's own stroke is band * 0.085, about 4.8px, so a step below that
  // cannot show as a break in the drawn line.
  assert.ok(worst < g.band * FRAME.vine, `worst step ${worst.toFixed(2)}px vs a ${(g.band * FRAME.vine).toFixed(2)}px stroke`);
});

test("the wave count is a whole number, which is why it closes", () => {
  for (const total of [600, 937.4, 1288, 2001.9]) {
    const cycles = vineCycles(total, FRAME.band, FRAME.period);
    assert.equal(cycles, Math.round(cycles));
    assert.ok(cycles >= 4);
  }
});

test("every leaf and rivet lands on the vine", () => {
  const g = panel();
  const per = roundedRect(g.x0, g.y0, g.x1, g.y1, g.band * 0.6);
  const amp = g.band * FRAME.amp;
  const cycles = vineCycles(per.total, g.band, FRAME.period);
  const vine = points(vinePath(per, amp, cycles, 4000));
  const near = (p) => Math.min(...vine.map((v) => Math.hypot(v[0] - p[0], v[1] - p[1])));
  let worst = 0;
  for (let k = 0; k < cycles; k++) {
    worst = Math.max(worst, near(atPerim(per, (k + 0.25) / cycles, amp)));
    worst = Math.max(worst, near(atPerim(per, (k + 0.75) / cycles, -amp)));
    worst = Math.max(worst, near(atPerim(per, k / cycles, 0)));
  }
  assert.ok(worst < 1.5, `worst ornament ${worst.toFixed(2)}px off the vine`);
});

test("the whole frame draws, with no NaN and nothing left undefined", () => {
  const svg = ironwork(panel(), FRAME, { uid: "t", mark: "assets/clans/toreador.png", name: "Celeste Ngo" });
  assert.ok(svg.length > 4000);
  assert.ok(!/NaN|undefined|Infinity/.test(svg), "no broken numbers in the path data");
  assert.equal(svg.match(/<image /g).length, 3, "the mark is cast in three layers, like a forged bar");
  assert.match(svg, /<text [^>]*font-family="Cinzel/);
});

test("with no mark and no name the rail stays clean", () => {
  const bare = ironwork(panel(), FRAME, { uid: "t" });
  assert.ok(!bare.includes("<image"), "no symbol");
  assert.ok(!bare.includes("<text"), "no banderole");
  assert.ok(!bare.includes("<filter"), "and no filters defined for a symbol that is not there");
  assert.ok(bare.includes("<path"), "but the ironwork is still drawn");
});

test("a name with no mark still has something to hang from", () => {
  const svg = ironwork(panel(), FRAME, { uid: "t", name: "Ambrose Hale" });
  assert.match(svg, /<text /);
  const { R } = collarGeometry({ railY: 461, band: 56, name: "Ambrose Hale", maxW: 416, hasMark: false });
  assert.ok(R > 0 && R < 56 * 0.62, "a plain boss, smaller than a medallion");
});

test("the lettering clears the medallion, whatever the name", () => {
  const band = FRAME.band;
  const railY = 461;
  for (const name of ["Ira", "Celeste Ngo", "The Keeper of Colma", "Archbishop Ambrose Hale of the Lancea Sanctum"]) {
    const { R, ty, fs, pw, py, ph } = collarGeometry({ railY, band, name, maxW: 416, hasMark: true });
    assert.ok(ty - (railY + R) >= fs * 0.9, `${name}: baseline only ${(ty - railY - R).toFixed(1)}px below the disc`);
    assert.ok(pw <= 416 - band * 0.6 + 0.001, `${name}: strap ${pw.toFixed(1)}px wider than the panel allows`);
    assert.ok(fs > 4, `${name}: lettering shrank to ${fs.toFixed(1)}px`);
    assert.ok(ty + fs * 0.34 <= py + ph + 0.001, `${name}: lettering past the bottom of the strap`);
  }
});

test("a long name shrinks the lettering instead of widening the panel", () => {
  const short = collarGeometry({ railY: 461, band: 56, name: "Ira", maxW: 416, hasMark: true });
  const long = collarGeometry({ railY: 461, band: 56, name: "The Keeper of Colma", maxW: 416, hasMark: true });
  assert.ok(long.pw >= short.pw);
  assert.ok(long.fs < short.fs, "the lettering gives way before the strap does");
});

test("the skirt below the frame closes up when there is no name", () => {
  assert.ok(skirtFor(56, false) < skirtFor(56, true));
});

test("a short window gets a narrower band, a tall one the full frame", () => {
  assert.equal(frameFor(1080).band, FRAME.band);
  assert.ok(frameFor(760).band < FRAME.band);
  assert.equal(frameFor(undefined).band, FRAME.band, "an unknown viewport is not a short one");
});

test("a player's chosen size is the size they get, and the sizes differ", () => {
  const bands = SIZE_NAMES.map((name) => frameFor(1080, name).band);
  assert.deepEqual([...bands].sort((a, b) => a - b), bands, "small, medium, large in order");
  assert.equal(new Set(bands).size, bands.length, "no two sizes are the same frame");
  assert.equal(frameFor(1080, "enormous").band, FRAME.band, "an unknown size is the default");
  // Every measurement in the ironwork is a fraction of the band, so a size with
  // the band alone changed would let the portrait outgrow its own frame.
  for (const name of SIZE_NAMES) {
    const style = frameFor(1080, name);
    assert.match(style.maxWidth, /rem$/, name);
    assert.match(style.maxHeight, /vh$/, name);
  }
});

test("a short window steps the chosen size down, and small has nowhere to fall", () => {
  assert.equal(frameFor(760, "large").band, frameFor(1080, "medium").band);
  assert.equal(frameFor(760, "medium").band, frameFor(1080, "small").band);
  assert.equal(frameFor(760, "small").band, frameFor(1080, "small").band);
});

test("a name with markup in it cannot break out of the SVG", () => {
  assert.equal(escapeText('Ira & "the <Hand>"'), 'Ira &amp; "the &lt;Hand&gt;"');
  const svg = ironwork(panel(), FRAME, { uid: "t", name: "<script>x</script>" });
  assert.ok(!svg.includes("<script"), svg.slice(svg.indexOf("<text")));
});

test("the geometry puts the ironwork around the portrait, not over it", () => {
  const g = panel();
  assert.ok(g.x0 < 56 && g.y0 < 56, "the rail sits outside the bezel");
  assert.ok(g.x1 > 360 && g.y1 > 461);
  assert.equal(g.cx, (g.x0 + g.x1) / 2);
});
