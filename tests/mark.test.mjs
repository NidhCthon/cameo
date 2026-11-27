// The symbol matching. A world drops files in a folder and names a piece of
// actor data; everything else here is name handling.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMarkFile,
  markChoices,
  markFor,
  markLookup,
  markNames,
  markTitle,
  matchMark,
  parseFields,
  slugify,
  textAt
} from "../scripts/mark.js";
import { MARK_NONE } from "../scripts/constants.js";

const FILES = [
  "assets/clans/brujah.png",
  "assets/clans/followers-of-set+setite+ministry.png",
  "assets/clans/banu-haqim+assamite.png",
  "assets/clans/toreador.png",
  "assets/clans/notes.txt"
];

test("names become file stems", () => {
  assert.equal(slugify("Banu Haqim"), "banu-haqim");
  assert.equal(slugify("Thin-Blood"), "thin-blood");
  assert.equal(slugify("Followers of Set"), "followers-of-set");
  assert.equal(slugify("Lasombra’s"), "lasombras");
  assert.equal(slugify("  "), "");
  assert.equal(slugify(null), "");
});

test("only images are offered", () => {
  assert.ok(isMarkFile("a/b/toreador.PNG"));
  assert.ok(isMarkFile("x.svg?v=2"));
  assert.ok(!isMarkFile("notes.txt"));
  assert.ok(!isMarkFile(""));
});

test("one file can answer to several names", () => {
  assert.deepEqual(markNames("assets/clans/banu-haqim+assamite.png"), ["banu-haqim", "assamite"]);
  assert.equal(markTitle("assets/clans/banu-haqim+assamite.png"), "Banu Haqim");
});

test("the folder becomes a lookup, one entry per name", () => {
  const lookup = markLookup(FILES);
  assert.equal(lookup.get("assamite"), "assets/clans/banu-haqim+assamite.png");
  assert.equal(lookup.get("ministry"), "assets/clans/followers-of-set+setite+ministry.png");
  assert.ok(!lookup.has("notes"), "the text file is not a symbol");
  assert.equal(markChoices(lookup).length, 4, "four files, however many names they carry");
});

test("two files claiming one name resolve the same way on every client", () => {
  const a = markLookup(["z/toreador.png", "z/toreador.webp"]);
  const b = markLookup(["z/toreador.webp", "z/toreador.png"]);
  assert.equal(a.get("toreador"), b.get("toreador"));
});

test("a longer name falls back to the clan it starts with", () => {
  const lookup = markLookup(FILES);
  assert.equal(matchMark("Brujah antitribu", lookup), "assets/clans/brujah.png");
  assert.equal(matchMark("Toreador", lookup), "assets/clans/toreador.png");
  assert.equal(matchMark("Setite", lookup), "assets/clans/followers-of-set+setite+ministry.png");
  assert.equal(matchMark("Caitiff", lookup), null, "nothing to match means a clean rail");
  assert.equal(matchMark("", lookup), null);
});

test("it matches whole words, not any old prefix", () => {
  const lookup = markLookup(["z/set.png"]);
  assert.equal(matchMark("Setite", lookup), null, "Setite does not start with the word Set");
  assert.equal(matchMark("Set Elder", lookup), "z/set.png");
});

test("the field list is read off a comma-separated setting", () => {
  assert.deepEqual(parseFields(" system.clan , system.sect "), ["system.clan", "system.sect"]);
  assert.deepEqual(parseFields(""), []);
});

test("a trait can be a string, an object with a value, or a named item", () => {
  assert.equal(textAt({ system: { clan: "Toreador" } }, "system.clan"), "Toreador");
  assert.equal(textAt({ system: { clan: { value: "Brujah" } } }, "system.clan"), "Brujah");
  assert.equal(textAt({ system: { clan: { name: "Nosferatu" } } }, "system.clan"), "Nosferatu");
  assert.equal(textAt({}, "system.clan.value"), null);
});

test("the actor's own flag beats the data, and can say no symbol at all", () => {
  const marks = { lookup: markLookup(FILES), fields: ["system.clan"] };
  const toreador = { system: { clan: "Toreador" } };
  assert.equal(markFor("", toreador, marks), "assets/clans/toreador.png");
  assert.equal(markFor("assets/clans/brujah.png", toreador, marks), "assets/clans/brujah.png");
  assert.equal(markFor(MARK_NONE, toreador, marks), null);
  assert.equal(markFor("", toreador, { lookup: new Map(), fields: ["system.clan"] }), null);
  assert.equal(markFor("", null, marks), null);
});

test("fields are tried in order", () => {
  const marks = { lookup: markLookup(FILES), fields: ["system.clan", "system.sect"] };
  assert.equal(markFor("", { system: { sect: "Brujah" } }, marks), "assets/clans/brujah.png");
});
