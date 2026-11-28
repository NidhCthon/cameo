// Cameo's settings. The mark folder and the data that picks a mark belong to
// the world, because a world's symbols are the same for everyone at the table.
// Whether the panel appears at all, and how long the pointer must rest on a
// token first, belong to each player.
import {
  MODULE_ID,
  MARK_FOLDER,
  MARK_FIELDS,
  MARK_INDEX,
  SHOW_NAME,
  PLAYERS_ONLY,
  ENABLED,
  PANEL_SIZE,
  DELAY
} from "./constants.js";
import { DEFAULT_SIZE, SIZE_NAMES } from "./frame.js";
import { isMarkFile, markLookup, parseFields } from "./mark.js";

const read = (key, fallback) => {
  try {
    const value = game.settings.get(MODULE_ID, key);
    return value === undefined || value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

let cached = { index: null, fields: null, value: { lookup: new Map(), fields: [] } };

/**
 * The world's marks: a lookup of the folder's images by file name, and the actor
 * fields that pick one. Rebuilt only when either setting changes, since every
 * hover asks.
 */
export function markSettings() {
  const index = read(MARK_INDEX, []);
  const fields = read(MARK_FIELDS, "");
  if (cached.index !== index || cached.fields !== fields) {
    cached = {
      index,
      fields,
      value: { lookup: markLookup(Array.isArray(index) ? index : []), fields: parseFields(fields) }
    };
  }
  return cached.value;
}

/**
 * List the mark folder into the hidden index, so every client can match names to
 * files. Only the active GM does it, on load and when the folder changes, and
 * only writes when the listing differs. Images added to the folder later show up
 * the next time the GM loads the world.
 */
export async function refreshMarkIndex() {
  if (!game.user?.isGM || (game.users?.activeGM && !game.users.activeGM.isSelf)) return;
  const folder = String(read(MARK_FOLDER, "") ?? "").trim().replace(/\/+$/, "");
  let files = [];
  if (folder) {
    try {
      const picker = foundry.applications.apps.FilePicker.implementation;
      const listing = await picker.browse("data", folder);
      files = (listing?.files ?? []).filter(isMarkFile).sort();
    } catch (error) {
      console.warn(`Cameo | Could not list the mark folder "${folder}"`, error);
      ui.notifications?.warn(`Cameo couldn't open the symbol folder "${folder}". Check the path in Configure Settings.`);
      return;
    }
  }
  const current = read(MARK_INDEX, []);
  if (JSON.stringify(current) !== JSON.stringify(files)) await game.settings.set(MODULE_ID, MARK_INDEX, files);
}

/** Whether the banderole is wanted at all, before the token's own nameplate rule. */
export const wantsName = () => !!read(SHOW_NAME, true);
/** Whether a panel is kept to actors a player owns. Off by default: a GM wants the cast too. */
export const playersOnly = () => !!read(PLAYERS_ONLY, false);
/** This player's own switch. */
export const enabled = () => !!read(ENABLED, true);
/** How big this player wants their frames. */
export const panelSize = () => {
  const size = String(read(PANEL_SIZE, DEFAULT_SIZE) ?? "");
  return SIZE_NAMES.includes(size) ? size : DEFAULT_SIZE;
};
/** How long the pointer must rest on a token, in milliseconds. */
export const delay = () => Math.max(0, Number(read(DELAY, 120)) || 0);

export function registerSettings() {
  game.settings.register(MODULE_ID, MARK_FOLDER, {
    name: "Symbol folder",
    hint: "A folder under Data/ holding the symbols a character can wear on the frame: clans, houses, guilds, whatever the game has. Each is cast in the frame's own iron, so a plain white-on-transparent PNG, WebP or SVG works best. Leave empty for frames with no symbol.",
    scope: "world",
    config: true,
    type: String,
    filePicker: "folder",
    default: "",
    onChange: () => refreshMarkIndex()
  });
  game.settings.register(MODULE_ID, MARK_FIELDS, {
    name: "Symbol chosen by",
    hint: "The actor data that picks each symbol, matched against the file names in the folder: with system.clan, a Toreador gets toreador.png. List several separated by commas to try them in turn (system.clan, system.sect). Leave empty to set symbols only by hand, from the actor's Cameo flag.",
    scope: "world",
    config: true,
    type: String,
    default: "system.clan",
    onChange: () => {}
  });
  game.settings.register(MODULE_ID, SHOW_NAME, {
    name: "Name on the frame",
    hint: "Writes the token's name across the banderole at the bottom of the frame. A token whose nameplate is already hidden from a player stays unnamed on their panel too.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, PLAYERS_ONLY, {
    name: "Player characters only",
    hint: "Off by default, so every token with a portrait of its own gets a frame, the cast and the opposition alike. Turn it on to keep frames to the actors your players own. It asks who owns the actor rather than what the system calls its sheets, so it means the same thing in every game.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, MARK_INDEX, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
  game.settings.register(MODULE_ID, ENABLED, {
    name: "Show portraits on hover",
    hint: "Your own switch. Off means no frame appears for you, whatever the world is set to.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, PANEL_SIZE, {
    name: "Frame size",
    hint: "How much of your screen a frame takes. Your own choice, so a player on a laptop and a GM on a monitor can each have it the size they want. A short window steps down one size on its own, so the panel always clears the hotbar.",
    scope: "client",
    config: true,
    type: String,
    choices: { small: "Small", medium: "Medium", large: "Large" },
    default: DEFAULT_SIZE
  });
  game.settings.register(MODULE_ID, DELAY, {
    name: "Hover delay",
    hint: "How long, in milliseconds, the pointer has to rest on a token before its frame appears. A short delay keeps frames from flashing past while you sweep the mouse across a crowded scene.",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 0, max: 1000, step: 20 },
    default: 120
  });
}
