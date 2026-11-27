// What a client may be shown. Foundry sends every world document to every
// client, so nothing here is secrecy: a player's browser already holds the
// actor. These rules only keep the panel from drawing attention to something
// the table has agreed is not on the table yet, which is a courtesy, not a
// guarantee. Do not treat it as one, and do not claim it anywhere in the UI.
//
// Two things follow from that, and they are the whole of this file. A panel
// appears only for a token the user could already click, and it carries the
// token's own name under the token's own nameplate rules, so a token whose
// nameplate is hidden stays unnamed here too. The panel shows the portrait and
// the name and nothing else off the sheet.
//
// Plain functions over plain values, so they run in node.

/**
 * Foundry's token nameplate modes. Kept here as numbers so these rules can be
 * tested without Foundry; tests/visibility.test.mjs checks the table still
 * matches CONST.TOKEN_DISPLAY_MODES.
 */
export const DISPLAY = {
  NONE: 0,
  CONTROL: 10,
  OWNER_HOVER: 20,
  HOVER: 30,
  OWNER: 40,
  ALWAYS: 50
};

/** Portraits Foundry hands out when an actor has none of its own. Framing one is pointless. */
export const PLACEHOLDER = /^icons\/svg\//;

/**
 * Whether the banderole may carry the name, under the token's own nameplate
 * rule. The panel only exists while the pointer is on the token, so every
 * hover mode counts as hovered.
 */
export function showsName(displayMode, { isOwner = false, isControlled = false } = {}) {
  switch (Number(displayMode)) {
    case DISPLAY.ALWAYS:
      return true;
    case DISPLAY.HOVER:
      return true;
    case DISPLAY.OWNER:
      return isOwner;
    case DISPLAY.OWNER_HOVER:
      return isOwner;
    case DISPLAY.CONTROL:
      return isOwner && isControlled;
    default:
      return false;
  }
}

/** Whether a portrait path is worth framing. */
export const hasPortrait = (img) => !!img && !PLACEHOLDER.test(String(img));

/**
 * Whether this token gets a panel at all.
 * @param {object} state
 * @param {boolean} state.visible  Whether the user can see the token on the canvas.
 * @param {string|null} state.img  The actor's portrait.
 * @param {string|null} state.actorType  The actor's type, for the characters-only setting.
 * @param {boolean} state.charactersOnly  The world's setting.
 */
export function showsPanel({ visible, img, actorType, charactersOnly = true }) {
  if (!visible) return false;
  if (!hasPortrait(img)) return false;
  if (charactersOnly && actorType !== "character") return false;
  return true;
}
