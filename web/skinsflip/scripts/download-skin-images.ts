import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSkinportItems } from "../../../src/modules/flips/skinport.client.js";

type SkinManifest = Record<string, string>;

type SteamIndexCache = {
  generatedAt: string;
  entries: Record<string, string>;
  nextStart: number;
  totalCount: number;
  complete: boolean;
};

type SteamMarketSearchResult = {
  hash_name?: string;
  asset_description?: {
    icon_url?: string;
    icon_url_large?: string;
    market_hash_name?: string;
  };
};

type SteamMarketSearchResponse = {
  success?: boolean;
  start?: number;
  pagesize?: number;
  total_count?: number;
  results?: SteamMarketSearchResult[];
};

type DownloadTask = {
  name: string;
  iconId: string;
  localPath: string;
  absolutePath: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const publicSkinsDir = path.resolve(appRoot, "public", "skins");
const manifestPath = path.resolve(publicSkinsDir, "manifest.json");
const cacheDir = path.resolve(__dirname, ".cache");
const steamIndexCachePath = path.resolve(cacheDir, "steam-market-image-index.json");

const steamAppId = 730;
const steamMarketBase = "https://steamcommunity.com/market/search/render/";
const steamImageBase = "https://community.cloudflare.steamstatic.com/economy/image";
const userAgent = "SkinFlip/1.0 (+local image sync)";
const steamPageDelayMs = 3250;
const exactQueryConcurrency = 2;
const downloadConcurrency = 6;
const requestRetryCount = 4;
const fullIndexThreshold = 250;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: null as number | null,
    refreshIndex: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--refresh-index") {
      options.refreshIndex = true;
      continue;
    }
    if (arg === "--limit") {
      const next = args[index + 1];
      const numeric = Number(next);
      if (Number.isFinite(numeric) && numeric > 0) {
        options.limit = Math.max(1, Math.round(numeric));
        index += 1;
      }
    }
  }

  return options;
}

function slugifySkinName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u2122™]/g, "")
    .replace(/[|]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function extensionFromContentType(contentType: string | null) {
  const safe = String(contentType || "").toLowerCase();
  if (safe.includes("image/png")) return ".png";
  if (safe.includes("image/webp")) return ".webp";
  if (safe.includes("image/jpeg") || safe.includes("image/jpg")) return ".jpg";
  if (safe.includes("image/avif")) return ".avif";
  return ".png";
}

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(targetPath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(targetPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(targetPath: string, value: unknown) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchWithRetries(
  input: string,
  init: RequestInit,
  label: string,
  retries = requestRetryCount
) {
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        throw new Error(`${label} HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      attempt += 1;
      if (attempt > retries) {
        throw error;
      }

      const message =
        error && typeof error === "object" && "message" in error ? String(error.message) : "";
      const isRateLimited = message.includes("HTTP 429");
      const backoffMs = isRateLimited
        ? 30_000 * attempt
        : 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await sleep(backoffMs);
    }
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>
) {
  const results = new Array<R>(values.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

async function getUsedSkinNames(limit: number | null) {
  const itemsWrap = await fetchSkinportItems({ appId: steamAppId, currency: "USD", tradable: 1 });
  const names = Array.from(
    new Set(
      (Array.isArray(itemsWrap?.data) ? itemsWrap.data : [])
        .map((item) =>
          typeof item?.market_hash_name === "string" ? item.market_hash_name.trim() : ""
        )
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

  return limit ? names.slice(0, limit) : names;
}

async function fetchSteamMarketPage(start: number) {
  const url = new URL(steamMarketBase);
  url.searchParams.set("norender", "1");
  url.searchParams.set("appid", String(steamAppId));
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", "100");
  url.searchParams.set("search_descriptions", "0");
  url.searchParams.set("sort_column", "name");
  url.searchParams.set("sort_dir", "asc");

  const response = await fetchWithRetries(
    url.toString(),
    {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    },
    `Steam market page ${start}`
  );

  return (await response.json()) as SteamMarketSearchResponse;
}

async function fetchExactSteamMatch(name: string) {
  const url = new URL(steamMarketBase);
  url.searchParams.set("norender", "1");
  url.searchParams.set("appid", String(steamAppId));
  url.searchParams.set("count", "10");
  url.searchParams.set("query", name);
  url.searchParams.set("search_descriptions", "0");

  const response = await fetchWithRetries(
    url.toString(),
    {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    },
    `Steam market exact query for ${name}`
  );

  const payload = (await response.json()) as SteamMarketSearchResponse;
  const results = Array.isArray(payload.results) ? payload.results : [];

  const match =
    results.find((result) => String(result.hash_name || "").trim() === name) ||
    results.find(
      (result) =>
        String(result.asset_description?.market_hash_name || "").trim() === name
    ) ||
    null;

  if (!match) return null;

  const iconId =
    match.asset_description?.icon_url_large || match.asset_description?.icon_url || null;

  return typeof iconId === "string" && iconId.trim() ? iconId.trim() : null;
}

async function buildSteamIndexCache(existingCache: SteamIndexCache | null) {
  const entries: Record<string, string> = { ...(existingCache?.entries || {}) };
  let start = Number(existingCache?.nextStart ?? 0) || 0;
  let totalCount = Number(existingCache?.totalCount ?? 0) || 0;
  let pagesSinceCheckpoint = 0;

  while (true) {
    const page = await fetchSteamMarketPage(start);
    const results = Array.isArray(page.results) ? page.results : [];
    totalCount = Number(page.total_count ?? totalCount ?? 0);

    if (results.length === 0) {
      break;
    }

    for (const result of results) {
      const name =
        typeof result.hash_name === "string" && result.hash_name.trim()
          ? result.hash_name.trim()
          : typeof result.asset_description?.market_hash_name === "string" &&
              result.asset_description.market_hash_name.trim()
            ? result.asset_description.market_hash_name.trim()
            : "";
      const iconId =
        result.asset_description?.icon_url_large || result.asset_description?.icon_url || "";

      if (!name || !iconId) continue;
      if (!entries[name]) {
        entries[name] = iconId;
      }
    }

    start += results.length;
    const processed = totalCount > 0 ? Math.min(start, totalCount) : start;
    process.stdout.write(`\rIndexing Steam market: ${processed}/${totalCount || "?"}`);
    pagesSinceCheckpoint += 1;

    if (pagesSinceCheckpoint >= 25) {
      await writeJsonFile(steamIndexCachePath, {
        generatedAt: new Date().toISOString(),
        entries,
        nextStart: start,
        totalCount,
        complete: false,
      } satisfies SteamIndexCache);
      pagesSinceCheckpoint = 0;
    }

    await sleep(steamPageDelayMs);
  }

  process.stdout.write("\n");

  const cache: SteamIndexCache = {
    generatedAt: new Date().toISOString(),
    entries,
    nextStart: start,
    totalCount,
    complete: true,
  };
  await writeJsonFile(steamIndexCachePath, cache);
  return cache;
}

function createDownloadTarget(
  name: string,
  extension: string,
  manifest: SkinManifest,
  allocatedPaths: Map<string, string>
) {
  const existing = manifest[name];
  if (existing) {
    return {
      localPath: existing,
      absolutePath: path.resolve(appRoot, "public", existing.replace(/^\//, "")),
    };
  }

  const baseSlug = slugifySkinName(name) || `skin-${shortHash(name)}`;
  let fileName = `${baseSlug}${extension}`;
  let localPath = `/skins/${fileName}`;
  const owner = allocatedPaths.get(localPath);

  if (owner && owner !== name) {
    fileName = `${baseSlug}-${shortHash(name)}${extension}`;
    localPath = `/skins/${fileName}`;
  }

  allocatedPaths.set(localPath, name);

  return {
    localPath,
    absolutePath: path.join(publicSkinsDir, fileName),
  };
}

async function downloadSteamImage(iconId: string) {
  const url = `${steamImageBase}/${iconId}/330fx330f`;
  const response = await fetchWithRetries(
    url,
    {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": userAgent,
      },
    },
    `Steam image ${iconId}`
  );

  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = extensionFromContentType(response.headers.get("content-type"));
  return { bytes, extension };
}

async function main() {
  const options = parseArgs();

  await mkdir(publicSkinsDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  const usedNames = await getUsedSkinNames(options.limit);
  console.log(`Collected ${usedNames.length} unique Skinport item names${options.limit ? ` (limited)` : ""}.`);

  const existingManifest = await readJsonFile<SkinManifest>(manifestPath, {});
  const allocatedPaths = new Map<string, string>(
    Object.entries(existingManifest).map(([name, localPath]) => [localPath, name])
  );

  let steamIndex = options.refreshIndex
    ? null
    : await readJsonFile<SteamIndexCache | null>(steamIndexCachePath, null);

  if (!steamIndex || !steamIndex.entries || Object.keys(steamIndex.entries).length === 0) {
    steamIndex = {
      generatedAt: "",
      entries: {},
      nextStart: 0,
      totalCount: 0,
      complete: false,
    };
  }

  const hasCachedEntries = Object.keys(steamIndex.entries).length > 0;
  const shouldBuildFullIndex =
    options.refreshIndex ||
    (usedNames.length > fullIndexThreshold && (!steamIndex.complete || !hasCachedEntries));

  if (shouldBuildFullIndex) {
    console.log(
      steamIndex.nextStart > 0
        ? `Resuming Steam market index cache from ${steamIndex.nextStart}/${steamIndex.totalCount || "?"}...`
        : "Building Steam market index cache..."
    );
    steamIndex = await buildSteamIndexCache(steamIndex);
  } else {
    console.log(
      `Loaded Steam market cache with ${Object.keys(steamIndex.entries).length} entries from ${steamIndex.generatedAt}.`
    );
  }

  let unresolvedNames = usedNames.filter((name) => !steamIndex?.entries?.[name]);

  if (unresolvedNames.length > 0) {
    console.log(`Resolving ${unresolvedNames.length} names missing from the cached index...`);

    await mapWithConcurrency(unresolvedNames, exactQueryConcurrency, async (name, index) => {
      try {
        const iconId = await fetchExactSteamMatch(name);
        if (iconId) {
          steamIndex!.entries[name] = iconId;
        }
      } catch (error) {
        console.error(`\nFailed to resolve Steam image id for "${name}":`, error);
      } finally {
        process.stdout.write(`\rResolving missing image ids: ${index + 1}/${unresolvedNames.length}`);
      }
    });

    process.stdout.write("\n");
    await writeJsonFile(steamIndexCachePath, {
      generatedAt: new Date().toISOString(),
      entries: steamIndex.entries,
    } satisfies SteamIndexCache);
    unresolvedNames = usedNames.filter((name) => !steamIndex?.entries?.[name]);
  }

  const tasks: DownloadTask[] = [];
  const nextManifest: SkinManifest = { ...existingManifest };
  let skippedExisting = 0;
  const namesWithoutIconId: string[] = [];

  for (const name of usedNames) {
    const iconId = steamIndex.entries[name];
    if (!iconId) {
      namesWithoutIconId.push(name);
      continue;
    }

    const existingLocalPath = existingManifest[name];
    if (existingLocalPath) {
      const absolutePath = path.resolve(appRoot, "public", existingLocalPath.replace(/^\//, ""));
      if (await pathExists(absolutePath)) {
        nextManifest[name] = existingLocalPath;
        skippedExisting += 1;
        continue;
      }
    }

    tasks.push({
      name,
      iconId,
      localPath: "",
      absolutePath: "",
    });
  }

  let downloadedCount = 0;
  let failedCount = 0;
  const failedNames: string[] = [];

  await mapWithConcurrency(tasks, downloadConcurrency, async (task, index) => {
    try {
      const { bytes, extension } = await downloadSteamImage(task.iconId);
      const target = createDownloadTarget(task.name, extension, nextManifest, allocatedPaths);
      task.localPath = target.localPath;
      task.absolutePath = target.absolutePath;

      if (!(await pathExists(task.absolutePath))) {
        await writeFile(task.absolutePath, bytes);
        downloadedCount += 1;
      } else {
        skippedExisting += 1;
      }

      nextManifest[task.name] = task.localPath;
    } catch (error) {
      failedCount += 1;
      failedNames.push(task.name);
      console.error(`\nFailed to download "${task.name}":`, error);
    } finally {
      process.stdout.write(`\rDownloading images: ${index + 1}/${tasks.length}`);
    }
  });

  process.stdout.write("\n");

  await writeJsonFile(manifestPath, nextManifest);

  const missingNames = usedNames.filter((name) => {
    const localPath = nextManifest[name];
    if (!localPath) return true;
    const absolutePath = path.resolve(appRoot, "public", localPath.replace(/^\//, ""));
    return !existsSync(absolutePath);
  });

  console.log("\nDownload summary");
  console.log(`Downloaded: ${downloadedCount}`);
  console.log(`Skipped existing: ${skippedExisting}`);
  console.log(`Failed downloads: ${failedCount}`);
  console.log(`Manifest entries: ${Object.keys(nextManifest).length}`);

  if (namesWithoutIconId.length > 0) {
    console.log(`\nNo Steam image identifier found for ${namesWithoutIconId.length} skins:`);
    for (const name of namesWithoutIconId) {
      console.log(`- ${name}`);
    }
  }

  if (failedNames.length > 0) {
    console.log(`\nDownload failed for ${failedNames.length} skins:`);
    for (const name of failedNames) {
      console.log(`- ${name}`);
    }
  }

  if (missingNames.length > 0) {
    console.log(`\nMissing local image after verification (${missingNames.length}):`);
    for (const name of missingNames) {
      console.log(`- ${name}`);
    }
  } else {
    console.log("\nVerification passed: every used skin has a local image.");
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
