// What a client may be shown. None of this is secrecy, and the tests say so by
// only ever checking what is drawn, never what a player's browser holds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DISPLAY, hasPortrait, showsName, showsPanel } from "../scripts/visibility.js";
import "./foundry.mjs";

test("the nameplate modes still match Foundry's", () => {
  assert.deepEqual(DISPLAY, CONST.TOKEN_DISPLAY_MODES);
});

test("a token with a hidden nameplate stays unnamed on the frame", () => {
  assert.equal(showsName(DISPLAY.NONE, { isOwner: true, isControlled: true }), false);
});

test("a nameplate shown to everyone is shown on the frame", () => {
  assert.equal(showsName(DISPLAY.ALWAYS, {}), true);
  assert.equal(showsName(DISPLAY.HOVER, {}), true, "the panel only exists while the pointer is on the token");
});

test("an owner-only nameplate is for the owner alone", () => {
  assert.equal(showsName(DISPLAY.OWNER, { isOwner: true }), true);
  assert.equal(showsName(DISPLAY.OWNER, { isOwner: false }), false);
  assert.equal(showsName(DISPLAY.OWNER_HOVER, { isOwner: true }), true);
  assert.equal(showsName(DISPLAY.OWNER_HOVER, { isOwner: false }), false);
});

test("a control-only nameplate needs the token selected, not just hovered", () => {
  assert.equal(showsName(DISPLAY.CONTROL, { isOwner: true, isControlled: true }), true);
  assert.equal(showsName(DISPLAY.CONTROL, { isOwner: true, isControlled: false }), false);
  assert.equal(showsName(DISPLAY.CONTROL, { isOwner: false, isControlled: true }), false);
});

test("an unknown mode shows no name", () => {
  assert.equal(showsName(99, { isOwner: true }), false);
  assert.equal(showsName(undefined, { isOwner: true }), false);
});

test("Foundry's own placeholder portraits are not worth framing", () => {
  assert.equal(hasPortrait("icons/svg/mystery-man.svg"), false);
  assert.equal(hasPortrait(""), false);
  assert.equal(hasPortrait(null), false);
  assert.equal(hasPortrait("worlds/sf-bay/portraits/celeste.webp"), true);
});

test("a token the user cannot see gets no panel", () => {
  const base = { img: "p/celeste.webp", hasPlayerOwner: true, playersOnly: true };
  assert.equal(showsPanel({ ...base, visible: false }), false);
  assert.equal(showsPanel({ ...base, visible: true }), true);
});

test("an NPC with a portrait is framed, because that is the point of hovering one", () => {
  const npc = { visible: true, img: "p/keeper.webp", hasPlayerOwner: false };
  assert.equal(showsPanel(npc), true, "no world setting means every portrait is framed");
  assert.equal(showsPanel({ ...npc, playersOnly: false }), true);
  assert.equal(showsPanel({ ...npc, playersOnly: true }), false, "a world can still ask for the cast alone");
});

test("the rule is ownership, so a system that never says \"character\" still works", () => {
  // The World of Darkness system's actor types are PC, Vampire, Mortal and nine
  // more. Cameo is told who owns the actor and nothing about its type, so there
  // is no word here for a system to spell differently.
  for (const img of ["p/celeste.webp", "p/ambrose.webp"]) {
    assert.equal(showsPanel({ visible: true, img, hasPlayerOwner: true, playersOnly: true }), true);
  }
});

test("an actor with no portrait of its own gets no frame around nothing", () => {
  assert.equal(
    showsPanel({ visible: true, img: "icons/svg/mystery-man.svg", hasPlayerOwner: true, playersOnly: true }),
    false
  );
});
