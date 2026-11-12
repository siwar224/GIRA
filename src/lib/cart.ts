"use client";
import { useSyncExternalStore } from "react";
import type { Selection } from "./crea";

/** A line in the order. Kept in localStorage so it survives reloads (per browser). */
export type CartLine = {
  id: string;
  kind: "crea";
  name: string;
  details: string[];
  allergens: string[];
  price: number;
  selection: Selection;
  createdAt: number;
};

const KEY = "gira.cart.v1";
let lines: CartLine[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) lines = JSON.parse(raw) as CartLine[];
  } catch {
    lines = [];
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* private mode or storage full: keep the in-memory order */
  }
  listeners.forEach((l) => l());
}

export function addToCart(line: Omit<CartLine, "id" | "createdAt">) {
  load();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  lines = [...lines, { ...line, id, createdAt: Date.now() }];
  save();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: CartLine[] = [];

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return lines;
    },
    () => EMPTY,
  );
}
