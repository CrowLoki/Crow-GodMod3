import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../public/crow-godmod3.html", import.meta.url), "utf8");
const sidebarStart = html.indexOf("    // Sidebar\n");
const sidebarEnd = html.indexOf("    // Conversations\n", sidebarStart);
const initStart = html.indexOf("      // Collapse sidebar on mobile by default\n");
const initEnd = html.indexOf("      // Set up auto-save", initStart);
assert.ok(sidebarStart > 0 && sidebarEnd > sidebarStart && initStart > 0 && initEnd > initStart);

function createSidebarHarness(width = 1440, desktopOpen = true) {
  const listeners = new Map();
  const mediaListeners = [];
  const media = {
    matches: width <= 768,
    addEventListener(type, callback) {
      assert.equal(type, "change");
      mediaListeners.push(callback);
    },
  };
  const document = {
    activeElement: null,
    getElementById: (id) => elements[id],
    querySelector: (selector) => selector === ".toggle-sidebar" ? elements.sidebarToggle : null,
    addEventListener(type, callback) { listeners.set(type, callback); },
  };
  function element() {
    const classes = new Set();
    return {
      attributes: {},
      inert: false,
      classList: {
        add: (name) => classes.add(name),
        contains: (name) => classes.has(name),
        toggle(name, value = !classes.has(name)) {
          if (value) classes.add(name);
          else classes.delete(name);
        },
      },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      focus() { document.activeElement = this; },
      contains(target) { return target === this || target === elements.sidebarClose; },
    };
  }
  const elements = Object.fromEntries(["sidebar", "sidebarOverlay", "sidebarToggle", "sidebarClose"].map((id) => [id, element()]));
  const state = { sidebarOpen: desktopOpen };
  const window = { innerWidth: width, matchMedia: () => media };
  const context = vm.createContext({ document, window, state });
  vm.runInContext(`${html.slice(sidebarStart, sidebarEnd)}\nfunction runSidebarInit() { ${html.slice(initStart, initEnd)} }`, context);
  context.runSidebarInit();
  function resize(nextWidth) {
    window.innerWidth = nextWidth;
    const nextMobile = nextWidth <= 768;
    if (nextMobile === media.matches) return;
    media.matches = nextMobile;
    mediaListeners.forEach((callback) => callback({ matches: nextMobile }));
  }
  function keydown(key) {
    const event = { key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    listeners.get("keydown")?.(event);
    return event;
  }
  return { context, state, elements, document, resize, keydown };
}

test("shrinking an open desktop sidebar closes the mobile drawer and restores desktop state on return", () => {
  const { state, elements, document, resize } = createSidebarHarness();
  elements.sidebarClose.focus();
  resize(390);
  assert.equal(elements.sidebar.classList.contains("collapsed"), true);
  assert.equal(elements.sidebarOverlay.classList.contains("visible"), false);
  assert.equal(elements.sidebar.inert, true);
  assert.equal(elements.sidebarToggle.attributes["aria-expanded"], "false");
  assert.equal(document.activeElement, elements.sidebarToggle, "Focus must leave the newly hidden sidebar");
  assert.equal(state.sidebarOpen, true, "Mobile changes must not overwrite the desktop preference");
  resize(1440);
  assert.equal(elements.sidebar.classList.contains("collapsed"), false);
  assert.equal(elements.sidebarOverlay.classList.contains("visible"), false);
  assert.equal(elements.sidebar.inert, false);
});

test("a collapsed desktop preference survives opening the mobile drawer and repeated breakpoint changes", () => {
  const { context, state, elements, resize } = createSidebarHarness(1440, false);
  assert.equal(elements.sidebar.classList.contains("collapsed"), true);
  resize(390);
  context.toggleSidebar();
  assert.equal(elements.sidebar.classList.contains("collapsed"), false);
  assert.equal(elements.sidebarOverlay.classList.contains("visible"), true);
  assert.equal(state.sidebarOpen, false);
  resize(320);
  assert.equal(elements.sidebar.classList.contains("collapsed"), false, "Resizing within mobile keeps an intentionally opened drawer open");
  resize(1440);
  assert.equal(elements.sidebar.classList.contains("collapsed"), true);
  assert.equal(elements.sidebarOverlay.classList.contains("visible"), false);
  resize(768);
  assert.equal(elements.sidebar.classList.contains("collapsed"), true);
});

test("mobile startup stays closed while preserving the desktop preference", () => {
  const { state, elements } = createSidebarHarness(390, true);
  assert.equal(elements.sidebar.classList.contains("collapsed"), true);
  assert.equal(elements.sidebar.inert, true);
  assert.equal(elements.sidebarOverlay.classList.contains("visible"), false);
  assert.equal(state.sidebarOpen, true);
});

test("mobile close button and backdrop close the drawer idempotently and restore focus", () => {
  const { context, elements, document } = createSidebarHarness(390);
  const closeMarkup = html.match(/<button[^>]*id="sidebarClose"[^>]*>/)?.[0];
  assert.ok(closeMarkup, "An explicit keyboard-operable close button must be present");
  assert.match(closeMarkup, /aria-label="Close sidebar"/);
  const closeHandler = closeMarkup.match(/onclick="([^"]+)"/)[1];
  const overlayHandler = html.match(/<div[^>]*id="sidebarOverlay"[^>]*onclick="([^"]+)"/)[1];
  for (const handler of [closeHandler, overlayHandler]) {
    context.toggleSidebar();
    assert.equal(document.activeElement, elements.sidebarClose);
    assert.equal(elements.sidebarToggle.attributes["aria-expanded"], "true");
    vm.runInContext(handler, context);
    assert.equal(elements.sidebar.classList.contains("collapsed"), true);
    assert.equal(elements.sidebarOverlay.classList.contains("visible"), false);
    assert.equal(document.activeElement, elements.sidebarToggle);
    vm.runInContext(handler, context);
    assert.equal(elements.sidebar.classList.contains("collapsed"), true, "Repeated dismissal must not reopen the drawer");
  }
});

test("Escape dismisses only an open mobile drawer", () => {
  const { context, elements, resize, keydown } = createSidebarHarness(390);
  assert.equal(keydown("Escape").defaultPrevented, false);
  context.toggleSidebar();
  assert.equal(keydown("Enter").defaultPrevented, false);
  assert.equal(elements.sidebar.classList.contains("collapsed"), false);
  assert.equal(keydown("Escape").defaultPrevented, true);
  assert.equal(elements.sidebar.classList.contains("collapsed"), true);
  resize(1440);
  assert.equal(keydown("Escape").defaultPrevented, false);
  assert.equal(elements.sidebar.classList.contains("collapsed"), false);
});
