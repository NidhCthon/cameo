# Cameo

A Foundry VTT v14 module. Hover a token and its portrait rises beside the hotbar, large and uncropped, in a frame of wrought-iron vine, with the character's faction mark cast into the collar and their name on the banderole.

That is the whole module. There is no sidebar, no panel to arrange, no second thing it also does.

## What it looks like

The portrait is the point, so it is never cropped. It keeps its own shape and the frame is generated around it, which means a tall portrait, a square one and a wide one all come out looking deliberate.

The frame is drawn rather than stretched. A rail runs round the outside, a vine weaves across it, leaves sit at the swings and rivets at the crossings. At the bottom, a medallion is clasped onto the rail with the character's symbol cast into it in the same iron, and a banderole hangs from the medallion with the name incised across it.

None of that is assembled from pieces. Each frame is one closed rail and one closed vine, generated at the size the portrait turns out to be, so there are no joins to find. The one deliberate overlap is the collar, where the rail runs straight through behind the medallion and the volutes close over it, the way a real casting is clamped on. `scripts/frame.js` explains how the geometry works and why an earlier tiled version had to be thrown away.

## Settings

**Symbol folder** (world). A folder under `Data/` holding the symbols a character can wear: clans, houses, guilds, whatever the game has. The symbol's own colour is thrown away and only its shape is kept, so a white-on-transparent PNG, WebP or SVG works best. Leave it empty for frames with no symbol.

**Symbol chosen by** (world). The actor data that picks a symbol, matched against the file names in the folder. With `system.clan`, a Toreador gets `toreador.png`. List several separated by commas to try them in turn. A file can answer to more than one name if you join them with a plus, so `banu-haqim+assamite.png` serves both. A name that matches nothing exactly falls back to the longest file name it begins with, a whole word at a time, so "Brujah antitribu" finds `brujah.png` unless you add a file of its own.

To set one by hand on a single actor, put the image's path in the actor's `cameo.mark` flag, or the word `none` to leave that character's rail clean.

**Name on the frame** (world). Writes the token's name across the banderole. It follows the token's own nameplate setting, so a token whose nameplate a player does not get is also unnamed on their panel.

**Characters only** (world). On by default. Turn it off to frame every token with a portrait of its own, NPCs included.

**Show portraits on hover** and **Hover delay** (each player's own). The delay keeps frames from flashing past while the pointer sweeps across a crowded scene.

## What Foundry tells every client

Foundry sends every world document to every client, so an actor's portrait is already in every player's browser before anything here runs. The rules in `scripts/visibility.js` keep a panel from drawing attention to a token the table has not put on the table, and they follow the token's own nameplate setting for the name. That is a courtesy. It is not secrecy and nothing here should be described as if it were.

## Symbols are yours, not the module's

Cameo ships no symbols and knows nothing about what any of them mean. It reads a folder you point it at. Artwork you are licensed to use at your own table usually cannot be redistributed, so keep it in the world's own `Data/` folder and out of any repository.

## Using the frame somewhere else

The frame is an element, not a hover panel that happens to contain one:

```js
const { cameoFor } = game.modules.get("cameo").api;
const { el } = cameoFor(actor, { name: actor.name });
document.querySelector("#somewhere").append(el);
```

The hover panel is one caller of that function. A sheet header or the token HUD could be another without the drawing code changing.

## Working on it

```
node --test tests/*.test.mjs
```

A bare `tests/` argument fails with one misleading failure, so pass the glob. The drawing, the symbol matching and the visibility rules are plain functions over plain data, so they run in node without Foundry and can be looked at in `tools/preview/frames.html` without a server.

To put it on the Foundry box, `node tools/deploy.mjs --no-restart`. It ships the committed HEAD only.
