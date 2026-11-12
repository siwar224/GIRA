"use client";
import { useSyncExternalStore } from "react";

/**
 * Tiny store telling the nav what is underneath it.
 *  - `surface`: "hero" (transparent over the frames) or a section tint.
 *  - `ink`: "light" text (on red / dark) or "dark" text (on cream).
 */
export type NavSurface = "hero" | "crema" | "rosso" | "sugo";
export type NavInk = "light" | "dark";
export type NavTheme = { surface: NavSurface; ink: NavInk };

let state: NavTheme = { surface: "hero", ink: "light" };
const listeners = new Set<() => void>();

export function setNavTheme(next: Partial<NavTheme>) {
  const merged = { ...state, ...next };
  if (merged.surface === state.surface && merged.ink === state.ink) return;
  state = merged;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverState: NavTheme = { surface: "hero", ink: "light" };

export function useNavTheme(): NavTheme {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

/** The hero reports whether the current frame is on a light background. */
let heroInk: NavInk = "light";
let inHero = true;

export function setHeroInk(ink: NavInk) {
  heroInk = ink;
  if (inHero) setNavTheme({ surface: "hero", ink });
}

export function setActiveSurface(surface: NavSurface) {
  inHero = surface === "hero";
  setNavTheme(
    surface === "hero"
      ? { surface, ink: heroInk }
      : { surface, ink: surface === "crema" ? "dark" : "light" },
  );
}
