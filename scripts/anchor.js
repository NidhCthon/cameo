// Where the panel sits: the bottom-left of the board, clear of the interface.
//
// This was a few lines inside cameo.js and it put the panel in the wrong half of
// the screen. It asked #ui-left how wide it was and #ui-bottom how tall, which
// sound like the furniture and are not. In Foundry v14 both are invisible layout
// regions that reserve half the window each: #ui-left is `width: 50%` with the
// scene controls pinned to its left edge, and #ui-bottom is `height: 50%` with
// the hotbar at its bottom. Measuring them pushed the panel to the middle of the
// screen and off the top of it.
//
// So the rule here is to measure the widgets a player can actually see, and to
// refuse any measurement that would push the panel more than a fraction of the
// way across the window. A box that wide is not furniture; it is a region that
// happens to be in the way, and the clamp means the next time Foundry moves its
// layout about the panel lands in roughly the right corner instead of a random
// one.
//
// It is a function from rectangles to two numbers, so the geometry is tested in
// node and only the reading of the DOM is left to cameo.js.

/** How far the panel keeps from the furniture it clears, in pixels. */
export const GAP = 12;

/** Where the panel goes when nothing could be measured. */
export const FALLBACK = { left: 110, bottom: 120 };

/**
 * The furthest across the window a single measurement may push the panel, as a
 * fraction of the window. Anything past this is ignored.
 */
export const LIMIT = 0.4;

/** A rectangle is only worth measuring if it is actually on screen. */
const drawn = (r) => !!r && r.width > 0 && r.height > 0;

/**
 * How far the panel has to be offset to clear a set of rectangles, ignoring any
 * that asks for more than LIMIT of the span. The fallback is for having nothing
 * to go on at all, so a real measurement wins even when it is the smaller
 * number: a short hotbar means the panel can sit lower, not that the guess was
 * better.
 */
const clearance = (rects, edge, span, fallback) => {
  const wanted = rects
    .filter(drawn)
    .map(edge)
    .filter((n) => n > 0 && n <= span * LIMIT);
  return wanted.length ? Math.max(...wanted) : fallback;
};

/**
 * The panel's offsets from the bottom-left corner of the window.
 *
 * @param {object} view
 * @param {number} view.width  The window's width in pixels.
 * @param {number} view.height  The window's height in pixels.
 * @param {DOMRect[]} [view.beside]  Furniture the panel keeps to the right of, such as the scene controls and the player list.
 * @param {DOMRect[]} [view.above]  Furniture the panel keeps above, such as the hotbar.
 * @returns {{left: number, bottom: number}}  Pixels, for `left` and `bottom`.
 */
export function anchorFor({ width = 0, height = 0, beside = [], above = [] } = {}) {
  const left = clearance(beside, (r) => r.right, width, FALLBACK.left);
  const bottom = clearance(above, (r) => height - r.top, height, FALLBACK.bottom);
  return { left: Math.round(left + GAP), bottom: Math.round(bottom + GAP) };
}
