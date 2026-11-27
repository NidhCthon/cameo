// Just enough of Foundry for scripts/cameo.js, and every module it imports, to
// load outside it. node --test runs each test file in its own process, so every
// file gets a freshly imported module and a fresh copy of this state.
//
// Everything a test needs to steer or inspect is exported. Extend this stub
// rather than guarding the module's code against it.

export const hooks = { once: new Map(), on: new Map() };

const listFor = (map, event) => {
  if (!map.has(event)) map.set(event, []);
  return map.get(event);
};

globalThis.Hooks = {
  once(event, fn) { listFor(hooks.once, event).push(fn); },
  on(event, fn) { listFor(hooks.on, event).push(fn); return fn; },
  off(event, fn) {
    const list = hooks.on.get(event) ?? [];
    const at = list.indexOf(fn);
    if (at !== -1) list.splice(at, 1);
  },
  callAll(event, ...args) {
    for (const fn of [...(hooks.on.get(event) ?? [])]) fn(...args);
  }
};

/** Run every handler registered with Hooks.once for an event. */
export async function fireOnce(event, ...args) {
  for (const fn of hooks.once.get(event) ?? []) await fn(...args);
}

export const registered = [];
export const settings = new Map();
export const modules = new Map([["cameo", {}]]);

globalThis.game = {
  user: { isGM: false },
  users: {},
  modules: { get: (id) => modules.get(id) },
  settings: {
    register(module, key, options) {
      registered.push({ module, key, options });
      if (!settings.has(`${module}.${key}`)) settings.set(`${module}.${key}`, options.default);
    },
    get: (module, key) => settings.get(`${module}.${key}`),
    set: async (module, key, value) => settings.set(`${module}.${key}`, value)
  }
};

globalThis.ui = { notifications: { warn() {}, error() {} } };

/** The file browser the GM lists the symbol folder with. Tests swap in their own listing. */
export const filePicker = { browse: async () => ({ files: [] }) };
globalThis.foundry = { applications: { apps: { FilePicker: { implementation: filePicker } } } };

// The nameplate modes scripts/visibility.js keeps its own copy of.
globalThis.CONST = {
  TOKEN_DISPLAY_MODES: { NONE: 0, CONTROL: 10, OWNER_HOVER: 20, HOVER: 30, OWNER: 40, ALWAYS: 50 }
};

export const cameo = await import(new URL("../scripts/cameo.js", import.meta.url));
