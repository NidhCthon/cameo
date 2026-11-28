// Where the panel lands. The first version of this code shipped and put the
// panel in the top right of a 1920x1080 window, so the window Foundry v14
// actually draws is the first case here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FALLBACK, GAP, LIMIT, anchorFor } from "../scripts/anchor.js";

/** A rectangle as getBoundingClientRect gives one. */
const rect = ({ left = 0, top = 0, width = 0, height = 0 }) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height
});

/**
 * Foundry v14 on a 1920x1080 window: the scene controls are two columns of
 * 32px buttons at the left edge, the player list sits below them, and the
 * hotbar is centred at the bottom. The regions holding them are #ui-left at
 * `width: 50%` and #ui-bottom at `height: 50%`, which is what the old code
 * measured.
 */
const V14 = {
  width: 1920,
  height: 1080,
  sceneControls: rect({ left: 16, top: 16, width: 72, height: 560 }),
  players: rect({ left: 104, top: 880, width: 200, height: 184 }),
  hotbar: rect({ left: 760, top: 988, width: 400, height: 76 }),
  uiLeft: rect({ left: 0, top: 0, width: 960, height: 1080 }),
  uiBottom: rect({ left: 384, top: 540, width: 1152, height: 540 })
};

test("the panel sits in the bottom-left corner of a v14 window", () => {
  const { left, bottom } = anchorFor({
    width: V14.width,
    height: V14.height,
    beside: [V14.sceneControls, V14.players],
    above: [V14.hotbar]
  });
  // Right of the player list, which reaches further than the controls do.
  assert.equal(left, V14.players.right + GAP);
  // Above the hotbar.
  assert.equal(bottom, V14.height - V14.hotbar.top + GAP);
  // And well inside the window, which is the part that was wrong.
  assert.ok(left < V14.width / 3, `left ${left}`);
  assert.ok(bottom < V14.height / 3, `bottom ${bottom}`);
});

test("a layout region half the window wide is ignored, not cleared", () => {
  // #ui-left is half the window and #ui-bottom is half its height. Measuring
  // them put the panel at (972, 552) from the bottom left, which on a 1080-high
  // window is the top right of the screen.
  const { left, bottom } = anchorFor({
    width: V14.width,
    height: V14.height,
    beside: [V14.uiLeft],
    above: [V14.uiBottom]
  });
  assert.equal(left, FALLBACK.left + GAP);
  assert.equal(bottom, FALLBACK.bottom + GAP);
});

test("a measurement just inside the limit still counts", () => {
  const edge = V14.width * LIMIT;
  const { left } = anchorFor({
    width: V14.width,
    height: V14.height,
    beside: [rect({ left: 0, top: 0, width: edge, height: 100 })]
  });
  assert.equal(left, Math.round(edge) + GAP);
});

test("a widget that is not drawn is not in the way", () => {
  // A collapsed hotbar and an empty player list are both still in the document.
  const { left, bottom } = anchorFor({
    width: V14.width,
    height: V14.height,
    beside: [rect({ left: 104, top: 880, width: 0, height: 0 })],
    above: [rect({ left: 760, top: 300, width: 400, height: 0 })]
  });
  assert.equal(left, FALLBACK.left + GAP);
  assert.equal(bottom, FALLBACK.bottom + GAP);
});

test("nothing to measure at all still gives a usable corner", () => {
  const { left, bottom } = anchorFor();
  assert.equal(left, FALLBACK.left + GAP);
  assert.equal(bottom, FALLBACK.bottom + GAP);
  assert.ok(left > 0 && bottom > 0);
});
