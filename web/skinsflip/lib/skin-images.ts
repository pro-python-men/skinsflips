"use client";

import { useEffect, useState } from "react";

type SkinManifest = Record<string, string>;

let manifestCache: SkinManifest | null = null;
let manifestPromise: Promise<SkinManifest> | null = null;

async function loadSkinManifest() {
  if (manifestCache) {
    return manifestCache;
  }

  if (!manifestPromise) {
    manifestPromise = fetch("/skins/manifest.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return {} as SkinManifest;
        }

        const payload = (await response.json().catch(() => ({}))) as unknown;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return {} as SkinManifest;
        }

        const next: SkinManifest = {};
        for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
          if (typeof key === "string" && key.trim() && typeof value === "string" && value.trim()) {
            next[key] = value;
          }
        }
        return next;
      })
      .catch(() => ({} as SkinManifest))
      .then((manifest) => {
        manifestCache = manifest;
        return manifest;
      });
  }

  return manifestPromise;
}

export function useLocalSkinImage(name: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const safeName = typeof name === "string" ? name.trim() : "";
    if (!safeName) {
      setSrc(null);
      return;
    }

    void loadSkinManifest().then((manifest) => {
      if (cancelled) {
        return;
      }

      setSrc(typeof manifest[safeName] === "string" ? manifest[safeName] : null);
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return src;
}
