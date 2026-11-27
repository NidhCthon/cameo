// Cameo: hover a token, and its portrait rises beside the hotbar in a frame of
// wrought-iron vine, with the character's faction mark cast into the collar.
//
// This file is the only part that knows about Foundry. It reads a token, works
// out what this client may see of it, and hands a portrait, a name and a symbol
// to scripts/panel.js. The frame itself (scripts/frame.js), the symbol matching
// (scripts/mark.js) and the visibility rules (scripts/visibility.js) are plain
// functions over plain data, so they can be tested in node and looked at in
// tools/preview without a server.
//
// Nothing here is secrecy. Foundry sends every actor to every client, so the
// portrait a panel shows was already in the player's browser. The rules in
// visibility.js keep the panel from drawing attention to a token the table has
// not put on the table, which is a courtesy and not a guarantee.
import { MARK_FLAG, MODULE_ID } from "./constants.js";
import { FRAME, frameFor } from "./frame.js";
import { markFor } from "./mark.js";
import { cameoElement, mount, unmount } from "./panel.js";
import {
  charactersOnly,
  delay,
  enabled,
  markSettings,
  refreshMarkIndex,
  registerSettings,
  wantsName
} from "./settings.js";
import { showsName, showsPanel } from "./visibility.js";

export * from "./constants.js";
export * from "./frame.js";
export * from "./mark.js";
export * from "./visibility.js";
export { cameoElement } from "./panel.js";

/** How far the panel sits from the sidebar's edge and the hotbar's top. */
const GAP = 12;
/** Used when the interface has not been laid out yet, or its parts have moved. */
const FALLBACK = { left: 110, bottom: 120 };

/* ---------- a portrait in its frame, for any caller ---------- */

/**
 * The frame for an actor, as an element. This is the whole module's useful
 * surface: the hover panel below is one caller, and a sheet header or the token
 * HUD could be another without anything here changing.
 * @param {Actor} actor
 * @param {{name?: string, style?: object}} [options]
 */
export function cameoFor(actor, { name = "", style = frameFor(globalThis.innerHeight) } = {}) {
  const chosen = actor?.getFlag?.(MODULE_ID, MARK_FLAG) ?? "";
  return cameoElement({ img: actor?.img, name, mark: markFor(chosen, actor, markSettings()) }, style);
}

/* ---------- the hover panel ---------- */

let layer = null;
/** The panel on screen, as {token, panel}. */
let showing = null;
/** A panel waiting out the hover delay, as {token, id}. A browser's timer id is a number, so it cannot carry the token itself. */
let pending = null;

/** The fixed box the panel lives in, made once. */
function hostLayer() {
  if (layer?.isConnected) return layer;
  layer = document.createElement("div");
  layer.id = "cameo-layer";
  document.body.append(layer);
  return layer;
}

/**
 * Put the layer in the bottom-left corner of the board, clear of the interface:
 * right of the scene controls and above the hotbar. Both are measured rather
 * than guessed, because their size changes with the player's UI scale and with
 * whether the hotbar is collapsed.
 */
function anchor(el) {
  const right = (id) => {
    const r = document.getElementById(id)?.getBoundingClientRect();
    return r && r.width ? r.right : 0;
  };
  const top = (id) => {
    const r = document.getElementById(id)?.getBoundingClientRect();
    return r && r.height ? window.innerHeight - r.top : 0;
  };
  const left = Math.max(right("ui-left"), right("controls"), FALLBACK.left) + GAP;
  const bottom = Math.max(top("ui-bottom"), top("hotbar"), FALLBACK.bottom) + GAP;
  el.style.left = `${Math.round(left)}px`;
  el.style.bottom = `${Math.round(bottom)}px`;
}

/** What this client may be shown of a token, or null for no panel. */
export function panelContentFor(token) {
  const actor = token?.actor;
  if (!actor) return null;
  if (!showsPanel({ visible: token.visible, img: actor.img, actorType: actor.type, charactersOnly: charactersOnly() })) {
    return null;
  }
  const named =
    wantsName() &&
    showsName(token.document.displayName, { isOwner: token.document.isOwner, isControlled: !!token.controlled });
  return { actor, name: named ? token.document.name : "" };
}

function clear() {
  if (pending) {
    clearTimeout(pending.id);
    pending = null;
  }
  if (showing) {
    unmount(showing.panel);
    showing = null;
  }
}

function open(token) {
  const content = panelContentFor(token);
  if (!content) return;
  clear();
  const panel = cameoFor(content.actor, { name: content.name });
  const host = hostLayer();
  anchor(host);
  mount(panel, host);
  showing = { token, panel };
}

function onHover(token, hovered) {
  if (!hovered) {
    if (showing?.token === token || pending?.token === token) clear();
    return;
  }
  if (!enabled()) return;
  if (showing?.token === token) return;
  if (!panelContentFor(token)) return;
  if (pending) clearTimeout(pending.id);
  const wait = delay();
  // A delay keeps frames from flashing past while the pointer sweeps across a
  // crowded scene; at zero the frame should still appear in the same tick.
  if (!wait) return open(token);
  const id = setTimeout(() => {
    pending = null;
    // The pointer may have left, or the token may have gone, while we waited.
    if (token.hover && token.visible) open(token);
  }, wait);
  pending = { token, id };
}

/* ---------- wiring ---------- */

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  refreshMarkIndex();
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { cameoFor, panelContentFor, FRAME, frameFor };
});

Hooks.on("hoverToken", onHover);

// Anything that can take the hovered token away without a hover-off.
Hooks.on("canvasTearDown", clear);
Hooks.on("deleteToken", (doc) => {
  if (showing?.token?.document === doc || pending?.token?.document === doc) clear();
});
// A token moving under the pointer must not close its own panel, so only the
// fields the panel is built from count as a change.
const PANEL_FIELDS = ["hidden", "displayName", "actorId", "name", "delta"];
Hooks.on("updateToken", (doc, changes) => {
  if (showing?.token?.document !== doc && pending?.token?.document !== doc) return;
  if (PANEL_FIELDS.some((key) => key in (changes ?? {}))) clear();
});
