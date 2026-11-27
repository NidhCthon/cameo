// The settings, and the one piece of work behind them: listing the symbol
// folder into a hidden world setting so every client can match a name to a
// file. Players may not browse files, so only the GM lists it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fireOnce, filePicker, settings } from "./foundry.mjs";
import { markSettings, refreshMarkIndex } from "../scripts/settings.js";
import { MARK_FIELDS, MARK_FOLDER, MARK_INDEX, MODULE_ID } from "../scripts/constants.js";

const put = (key, value) => settings.set(`${MODULE_ID}.${key}`, value);
const got = (key) => settings.get(`${MODULE_ID}.${key}`);

await fireOnce("init");

test("the default is the field a World of Darkness sheet keeps its clan in", () => {
  assert.equal(got(MARK_FIELDS), "system.clan");
});

test("the lookup is built from the index and the fields", () => {
  put(MARK_INDEX, ["assets/clans/toreador.png", "assets/clans/brujah.png"]);
  put(MARK_FIELDS, "system.clan, system.sect");
  const marks = markSettings();
  assert.deepEqual(marks.fields, ["system.clan", "system.sect"]);
  assert.equal(marks.lookup.get("brujah"), "assets/clans/brujah.png");
});

test("it is rebuilt only when a setting changes, since every hover asks", () => {
  const first = markSettings();
  assert.equal(markSettings(), first, "the same object comes back untouched");
  put(MARK_FIELDS, "system.clan");
  assert.notEqual(markSettings(), first, "and a new one after a change");
});

test("a player does not list the folder", async () => {
  game.user.isGM = false;
  put(MARK_FOLDER, "assets/clans");
  put(MARK_INDEX, []);
  filePicker.browse = async () => ({ files: ["assets/clans/toreador.png"] });
  await refreshMarkIndex();
  assert.deepEqual(got(MARK_INDEX), [], "nothing written");
});

test("the GM lists it, images only, in a settled order", async () => {
  game.user.isGM = true;
  put(MARK_FOLDER, "assets/clans/");
  put(MARK_INDEX, []);
  filePicker.browse = async (source, path) => {
    assert.equal(source, "data");
    assert.equal(path, "assets/clans", "the trailing slash is trimmed");
    return { files: ["assets/clans/toreador.png", "assets/clans/notes.txt", "assets/clans/brujah.png"] };
  };
  await refreshMarkIndex();
  assert.deepEqual(got(MARK_INDEX), ["assets/clans/brujah.png", "assets/clans/toreador.png"]);
});

test("an unchanged listing is not written again", async () => {
  let writes = 0;
  const set = game.settings.set;
  game.settings.set = async (...args) => {
    writes++;
    return set(...args);
  };
  await refreshMarkIndex();
  game.settings.set = set;
  assert.equal(writes, 0);
});

test("an empty folder setting clears the index instead of guessing", async () => {
  put(MARK_FOLDER, "   ");
  await refreshMarkIndex();
  assert.deepEqual(got(MARK_INDEX), []);
});

test("a folder that will not open warns and leaves the index alone", async () => {
  put(MARK_FOLDER, "assets/nope");
  put(MARK_INDEX, ["assets/clans/brujah.png"]);
  filePicker.browse = async () => {
    throw new Error("no such folder");
  };
  const warn = console.warn;
  console.warn = () => {};
  await refreshMarkIndex();
  console.warn = warn;
  assert.deepEqual(got(MARK_INDEX), ["assets/clans/brujah.png"]);
});
