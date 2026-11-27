// The panel: a portrait in its frame, as a plain DOM element.
//
// Nothing here knows about tokens, hovering or Foundry. It takes a portrait, a
// name and a symbol and hands back an element, which is what keeps the sheet and
// the token HUD open as places to show the same frame later without touching
// this file.
//
// The frame is generated at the size the portrait turns out to be, so the
// element has to be measured before it can be drawn. A portrait arrives with no
// size at all and gains one when it loads, so a ResizeObserver redraws the
// ironwork whenever the box changes. That is twice per hover: once empty, once
// with the picture in it.
import { FRAME, geometry, ironwork, skirtFor } from "./frame.js";

const SVGNS = "http://www.w3.org/2000/svg";
let serial = 0;

/**
 * A portrait in its frame.
 * @param {object} content
 * @param {string} content.img  The portrait's path.
 * @param {string} [content.name]  The name for the banderole, or "" for none.
 * @param {string|null} [content.mark]  A symbol's path, or null for a clean rail.
 * @param {string} [content.alt]  The image's alt text; defaults to the name.
 * @param {object} [style]  FRAME, or a variation on it.
 * @returns {{el: HTMLElement, redraw: () => void, destroy: () => void}}
 */
export function cameoElement({ img, name = "", mark = null, alt }, style = FRAME) {
  // Filter ids have to be unique within the document, since two panels could
  // overlap for a moment while one fades out.
  const uid = `cameo-${++serial}`;

  const el = document.createElement("div");
  el.className = "cameo-panel";
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--cameo-band", `${style.band}px`);
  el.style.setProperty("--cameo-skirt", `${skirtFor(style.band, !!name)}px`);
  if (style.maxWidth) el.style.setProperty("--cameo-max-w", style.maxWidth);
  if (style.maxHeight) el.style.setProperty("--cameo-max-h", style.maxHeight);

  const inner = document.createElement("div");
  inner.className = "cameo-inner";
  const bezel = document.createElement("div");
  bezel.className = "cameo-bezel";
  const aperture = document.createElement("div");
  aperture.className = "cameo-aperture";
  const picture = document.createElement("img");
  picture.className = "cameo-portrait";
  picture.alt = alt ?? name ?? "";
  picture.src = img;

  aperture.append(picture);
  bezel.append(aperture);
  inner.append(bezel);

  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "cameo-ironwork");
  svg.setAttribute("aria-hidden", "true");
  inner.append(svg);
  el.append(inner);

  function redraw() {
    const ir = inner.getBoundingClientRect();
    const br = bezel.getBoundingClientRect();
    if (!ir.width || !br.width) return;
    const g = geometry({
      width: ir.width,
      height: ir.height,
      bezel: { left: br.left - ir.left, top: br.top - ir.top, right: br.right - ir.left, bottom: br.bottom - ir.top },
      band: style.band
    });
    svg.setAttribute("viewBox", `0 0 ${Math.round(g.w * 100) / 100} ${Math.round(g.h * 100) / 100}`);
    svg.innerHTML = ironwork(g, style, { uid, mark, name });
  }

  // The portrait arrives with no size and gains one when it loads, so the frame
  // has to be drawn again once it has. The load event is what does that: it is a
  // resource event, so it fires whatever the tab is doing, and reading the box
  // inside it forces the layout the new size needs.
  //
  // A ResizeObserver alone would not do. Its callbacks are delivered with the
  // rendering update, as requestAnimationFrame's are, and neither runs in a
  // hidden or backgrounded tab. Relying on one left the ironwork drawn at the
  // size of an empty box with a full-size portrait sitting inside it. The
  // observer stays for genuine resizes, such as the window changing.
  picture.addEventListener("load", redraw);
  const observer = globalThis.ResizeObserver ? new ResizeObserver(() => redraw()) : null;
  observer?.observe(inner);
  // A broken portrait path would otherwise leave an empty frame around nothing.
  picture.addEventListener("error", () => el.classList.add("cameo-broken"), { once: true });

  return {
    el,
    redraw,
    destroy() {
      observer?.disconnect();
      el.remove();
    }
  };
}

/**
 * Put a panel on screen and let it rise into place.
 *
 * The start state is set inline and the layout is forced with a read before the
 * class goes on, so the transition has something to run from without waiting for
 * an animation frame.
 */
export function mount(panel, parent) {
  parent.append(panel.el);
  panel.redraw();
  void panel.el.offsetHeight;
  panel.el.classList.add("cameo-in");
}

/** Let a panel fade out, then take it away. Safe to call twice. */
export function unmount(panel, ms = 180) {
  if (!panel || panel.leaving) return;
  panel.leaving = true;
  panel.el.classList.remove("cameo-in");
  const done = () => panel.destroy();
  // Belt and braces: transitionend does not fire if the element is already
  // hidden, or if the player has asked for reduced motion.
  panel.el.addEventListener("transitionend", done, { once: true });
  setTimeout(done, ms + 60);
}
