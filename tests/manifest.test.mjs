// module.json and the entry script have to agree: an esmodules path that does
// not exist fails silently at load, and a styles path that does not exist takes
// the frame's lettering with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { cameo, fireOnce, registered } from "./foundry.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("module.json", root), "utf8"));
const css = await readFile(new URL("styles/cameo.css", root), "utf8");

test("the manifest id is the module id the code uses", () => {
  assert.equal(manifest.id, cameo.MODULE_ID);
});

test("it targets Foundry v14", () => {
  assert.match(manifest.compatibility.minimum, /^14\./);
  assert.match(manifest.compatibility.verified, /^14\./);
});

test("every esmodule and stylesheet it lists exists", async () => {
  for (const path of [...manifest.esmodules, ...manifest.styles]) await access(new URL(path, root));
});

test("every font the stylesheet asks for is shipped, with its licence", async () => {
  const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(urls.length, "the banderole needs a font");
  for (const url of urls) await access(new URL(`styles/${url}`, root));
  await access(new URL("styles/fonts/OFL-Cinzel.txt", root));
});

test("the download URL carries the manifest's version", () => {
  assert.ok(manifest.download.includes(`/v${manifest.version}/`), manifest.download);
});

test("init registers every setting the code reads, under the module id", async () => {
  await fireOnce("init");
  const keys = registered.filter((s) => s.module === cameo.MODULE_ID).map((s) => s.key);
  for (const key of ["markFolder", "markFields", "markIndex", "showName", "charactersOnly", "enabled", "delay"]) {
    assert.ok(keys.includes(key), `${key} is registered`);
  }
});

test("the world's settings are the world's and the player's are the player's", () => {
  const scope = (key) => registered.find((s) => s.key === key)?.options.scope;
  assert.equal(scope("markFolder"), "world", "a world's symbols are the same for everyone at the table");
  assert.equal(scope("markFields"), "world");
  assert.equal(scope("showName"), "world");
  assert.equal(scope("charactersOnly"), "world");
  assert.equal(scope("enabled"), "client", "a player can turn their own frames off");
  assert.equal(scope("delay"), "client");
});

test("the file index is hidden, because players may not browse files", () => {
  const index = registered.find((s) => s.key === "markIndex");
  assert.equal(index.options.config, false);
  assert.equal(index.options.scope, "world");
});

test("the hover panel is wired to the token hover", async () => {
  const { hooks } = await import("./foundry.mjs");
  assert.ok((hooks.on.get("hoverToken") ?? []).length, "hoverToken has a handler");
  assert.ok((hooks.on.get("canvasTearDown") ?? []).length, "and the panel goes when the scene does");
});

test("ready publishes the actor-to-element function, so other surfaces can use it", async () => {
  await fireOnce("ready");
  assert.equal(typeof game.modules.get(cameo.MODULE_ID).api.cameoFor, "function");
});

test("nothing in the module or its docs claims a player cannot see something", async () => {
  // Foundry sends every world document to every client. v14 has no client-side
  // secrecy, so a claim of it here would be a lie to the table.
  const prose = [
    await readFile(new URL("README.md", root), "utf8"),
    manifest.description,
    ...registered.map((s) => `${s.options.name ?? ""} ${s.options.hint ?? ""}`)
  ].join("\n");
  assert.ok(!/\b(secret|secretly|hidden from players|players cannot see|private to the GM)\b/i.test(prose), prose.match(/.{0,60}(secret|hidden from players|players cannot see|private to the GM).{0,60}/i)?.[0]);
});
