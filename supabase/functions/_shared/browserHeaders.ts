/** Random realistic browser headers for marketplace fetches (reduces static-UA blocking). */

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)]!;
}

function chromePatch(): string {
  const major = randInt(118, 133);
  const build = `${major}.0.${randInt(0, 5999)}.${randInt(10, 299)}`;
  return build;
}

const ACCEPT_HTML =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
const ACCEPT_HTML_SAFARI = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

const ACCEPT_LANG_POOL = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9,de;q=0.8",
  "de-DE,de;q=0.9,en;q=0.8",
  "sl-SI,sl;q=0.9,en;q=0.8,de;q=0.7",
  "hr-HR,hr;q=0.9,en;q=0.8,it;q=0.7",
  "it-IT,it;q=0.9,en;q=0.8,de;q=0.7",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "nl-NL,nl;q=0.9,en;q=0.8,de;q=0.7",
  "en-US,en;q=0.9,it;q=0.8,de;q=0.7,hr;q=0.6",
];

function chromiumExtras(): Record<string, string> {
  return {
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
  };
}

function buildUserAgentAndKind(): { ua: string; kind: "chromium" | "firefox" | "safari" } {
  const roll = randInt(0, 99);
  if (roll < 68) {
    const v = chromePatch();
    const branch = randInt(0, 5);
    if (branch === 0) {
      const win = pick(["10.0; Win64; x64", "10.0; WOW64"] as const);
      return {
        ua: `Mozilla/5.0 (Windows NT ${win}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
        kind: "chromium",
      };
    }
    if (branch === 1) {
      const mac = pick(["10_15_7", "11_7_10", "12_7_1", "13_6_6", "14_4", "14_6", "15_1"] as const);
      return {
        ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${mac}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
        kind: "chromium",
      };
    }
    if (branch === 2) {
      return {
        ua: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
        kind: "chromium",
      };
    }
    if (branch === 3) {
      const major = v.split(".")[0] || "120";
      const edgBuild = `${major}.0.${randInt(1000, 2844)}.${randInt(10, 199)}`;
      return {
        ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36 Edg/${edgBuild}`,
        kind: "chromium",
      };
    }
    const droid = pick(["13", "14", "15"] as const);
    const dev = pick(["Pixel 8", "Pixel 7", "SM-S918B", "SM-A546B"] as const);
    return {
      ua: `Mozilla/5.0 (Linux; Android ${droid}; ${dev}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Mobile Safari/537.36`,
      kind: "chromium",
    };
  }
  if (roll < 88) {
    const ff = randInt(115, 134);
    const branch = randInt(0, 2);
    if (branch === 0) {
      return {
        ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${ff}.0) Gecko/20100101 Firefox/${ff}.0`,
        kind: "firefox",
      };
    }
    if (branch === 1) {
      const mac = pick(["10.15", "11.7", "12.7", "13.6", "14.4", "15.1"] as const);
      return {
        ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${mac}; rv:${ff}.0) Gecko/20100101 Firefox/${ff}.0`,
        kind: "firefox",
      };
    }
    return {
      ua: `Mozilla/5.0 (X11; Linux x86_64; rv:${ff}.0) Gecko/20100101 Firefox/${ff}.0`,
      kind: "firefox",
    };
  }
  const saf = pick(["16.6", "17.2", "17.4", "17.5", "18.0", "18.2"] as const);
  const mac = pick(["10_15_7", "13_6_6", "14_4", "14_6", "15_1"] as const);
  return {
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${mac}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${saf} Safari/605.1.15`,
    kind: "safari",
  };
}

/**
 * Returns a fresh header set per call (User-Agent + Accept* + optional Sec-Fetch-*).
 * Pass `extra` to override or add (e.g. X-Return-Format for Jina).
 */
export function randomBrowserHeaders(extra?: Record<string, string>): Record<string, string> {
  const { ua, kind } = buildUserAgentAndKind();
  const accept = kind === "safari" ? ACCEPT_HTML_SAFARI : ACCEPT_HTML;
  const base: Record<string, string> = {
    "User-Agent": ua,
    Accept: accept,
    "Accept-Language": pick(ACCEPT_LANG_POOL),
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    ...(kind === "chromium" ? chromiumExtras() : {}),
  };
  return { ...base, ...(extra || {}) };
}
