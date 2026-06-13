import { useState, useCallback } from "react";

const STORAGE_KEY = "park_ridge_recently_viewed";
const MAX_ITEMS = 5;

function readPins(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(pin: string): void {
  const current = readPins().filter((p) => p !== pin);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([pin, ...current].slice(0, MAX_ITEMS)));
}

export function useRecentlyViewed() {
  const [pins] = useState<string[]>(readPins);
  return pins;
}

export function useRecentlyViewedUpdater() {
  const update = useCallback((pin: string) => {
    addRecentlyViewed(pin);
  }, []);
  return update;
}
