// Faction marks: the symbol cast into the frame's collar. Cameo ships no
// symbols and knows nothing about what they mean. A world names a folder of
// images and, if it likes, which piece of actor data picks one; a panel then
// shows the image whose file name matches that data ("Toreador" finds
// toreador.png), or one set by hand on the actor.
//
// For a World of Darkness game the data is system.clan and the folder holds the
// clan symbols. For anything else it is whatever that system calls a house, a
// school, a guild or a sect. Nothing here is specific to one game.
//
// The matching is the same approach as Threadwork's card emblems, which is the
// author's own MIT code; the tinting is not, because a frame casts its mark in
// metal through an SVG filter instead of recolouring pixels on a canvas.
//
// Everything here is plain functions over plain data, so it runs in node.

import { MARK_NONE } from "./constants.js";

/** The files in a mark folder worth offering. */
export const MARK_EXTENSIONS = ["png", "webp", "svg", "jpg", "jpeg", "avif", "gif"];

/** "Banu Haqim" → "banu-haqim", "Thin-Blood" → "thin-blood", "Followers of Set" → "followers-of-set". */
export function slugify(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A path's file name without its folder or extension: "assets/clans/banu-haqim.webp" → "banu-haqim". */
export function fileStem(path) {
  const name = decodeURIComponent(String(path ?? "").split(/[?#]/)[0].split("/").pop() ?? "");
  return name.replace(/\.[^.]+$/, "");
}

/** Whether a path is an image a mark folder should offer. */
export const isMarkFile = (path) =>
  MARK_EXTENSIONS.includes(String(path ?? "").split(/[?#]/)[0].split(".").pop()?.toLowerCase());

/**
 * The names a file answers to. A file can carry several, joined with "+", so one
 * symbol serves every name for the same thing without copies of it:
 * "banu-haqim+assamite.png" is both Banu Haqim and Assamite.
 */
export const markNames = (path) => fileStem(path).split("+").map(slugify).filter(Boolean);

/** "banu-haqim+assamite.webp" → "Banu Haqim", for a tooltip: its first name. */
export const markTitle = (path) =>
  (fileStem(path).split("+")[0] ?? "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

/**
 * The folder's images keyed by every name they answer to. When two files claim
 * the same name (toreador.png beside toreador.webp) the first in sorted order
 * wins, so every client picks the same one.
 */
export function markLookup(paths) {
  const lookup = new Map();
  for (const path of [...(paths ?? [])].filter(isMarkFile).sort()) {
    for (const key of markNames(path)) if (!lookup.has(key)) lookup.set(key, path);
  }
  return lookup;
}

/** Each image once, for a picker: a file with several names is still one symbol. */
export const markChoices = (lookup) => [...new Set(lookup?.values() ?? [])];

/**
 * The image a piece of text names: the file of exactly that name, or else the
 * longest file name it begins with, a whole word at a time. So "Brujah
 * antitribu" finds brujah's symbol unless a brujah-antitribu file exists.
 */
export function matchMark(text, lookup) {
  const slug = slugify(text);
  if (!slug || !lookup?.size) return null;
  if (lookup.has(slug)) return lookup.get(slug);
  let best = null;
  for (const key of lookup.keys()) {
    if (slug.startsWith(`${key}-`) && (!best || key.length > best.length)) best = key;
  }
  return best ? lookup.get(best) : null;
}

/** "system.clan, system.sect" → ["system.clan", "system.sect"]. */
export const parseFields = (text) =>
  String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * The text at a dotted path in a document. Some systems keep a trait as
 * `{value: "Toreador"}` or as an embedded item with a name; both are read.
 */
export function textAt(doc, path) {
  let value = path.split(".").reduce((node, key) => node?.[key], doc);
  if (value && typeof value === "object") value = value.value ?? value.name ?? value.label;
  return typeof value === "string" ? value : null;
}

/**
 * The image a panel's collar shows, or null for a clean rail.
 * @param {string} chosen  The actor's own override flag: "" to match on data,
 *   MARK_NONE for no mark at all, anything else an image path.
 * @param {object|null} doc  The actor, if any.
 * @param {{lookup: Map, fields: string[]}|null} marks  The world's folder and fields.
 */
export function markFor(chosen, doc, marks) {
  if (chosen === MARK_NONE) return null;
  if (chosen) return chosen;
  if (!doc || !marks?.lookup?.size) return null;
  for (const field of marks.fields ?? []) {
    const path = matchMark(textAt(doc, field), marks.lookup);
    if (path) return path;
  }
  return null;
}
