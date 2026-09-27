import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { extractMeta, type ExtractedPage } from "./extract-meta";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type PageFacts = ExtractedPage & { finalUrl: string };

function fail(message: string): never {
  throw new Error(message);
}

function isBlockedIp(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.includes(":")) {
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) return true;
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isBlockedIp(mapped[1]) : false;
  }
  const parts = lower.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function normalizeHost(host: string): string {
  const bare = host.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (/^\d+$/.test(bare)) {
    const n = Number(bare);
    if (Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff) {
      return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
    }
  }
  return bare;
}

async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail("Enter a full URL, including https://.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail("Only public http and https pages can be read.");
  }
  if (url.username || url.password) fail("URLs with a username or password are blocked.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    fail("Only standard web ports are allowed.");
  }
  const host = normalizeHost(url.hostname);
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    fail("That host isn't allowed.");
  }
  if (
    host === "example" ||
    host.endsWith(".example") ||
    host.endsWith(".invalid") ||
    host.endsWith(".test") ||
    host === "metadata.google.internal"
  ) {
    fail("That domain is reserved. Paste a public page.");
  }
  if (/^0x/i.test(host)) fail("That host isn't allowed.");
  url.hostname = host;
  if (isIP(host)) {
    if (isBlockedIp(host)) fail("Private network addresses are blocked.");
    return url;
  }
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    fail("Could not resolve that host.");
  }
  if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
    fail("That host isn't allowed.");
  }
  return url;
}

function withProtocol(raw: string): string {
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function readBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) fail("The response was empty.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      fail("That response is too large to read.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function fetchPublic(
  raw: string,
  opts: { maxBytes: number; accept: string },
): Promise<{ finalUrl: string; contentType: string; body: Uint8Array }> {
  let current = await assertPublicHttpUrl(withProtocol(raw));
  for (let hop = 0; hop < 5; hop += 1) {
    let response: Response;
    try {
      response = await fetch(current.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          accept: opts.accept,
          "user-agent": UA,
          "accept-language": "en",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        fail("The site took too long to respond.");
      }
      fail("Could not reach that site.");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) fail("The page redirected without a destination.");
      current = await assertPublicHttpUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok) fail(`The page responded ${response.status}.`);
    const body = await readBody(response, opts.maxBytes);
    return {
      finalUrl: current.href,
      contentType: response.headers.get("content-type") ?? "",
      body,
    };
  }
  fail("Too many redirects.");
}

function decodeHtml(body: Uint8Array, contentType: string): string {
  const head = new TextDecoder("latin1").decode(body.subarray(0, 4096));
  const match =
    /charset\s*=\s*["']?([\w.-]+)/i.exec(contentType) ||
    /charset\s*=\s*["']?([\w.-]+)/i.exec(head);
  const charset = match?.[1] || "utf-8";
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

export async function readPage(raw: string): Promise<PageFacts> {
  const result = await fetchPublic(raw, {
    maxBytes: 1_500_000,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  });
  const type = result.contentType.toLowerCase();
  if (type.startsWith("image/") || type.includes("pdf") || type.startsWith("video/")) {
    fail("That URL is a file, not a page.");
  }
  const html = decodeHtml(result.body, result.contentType);
  if (!/<html|<!doctype|<title|<meta/i.test(html)) {
    fail("This site didn't return an HTML page.");
  }
  return { ...extractMeta(html, result.finalUrl), finalUrl: result.finalUrl };
}

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
];

export async function proxyImage(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!raw || raw.length > 2000) return new Response("Missing image URL", { status: 400 });
  try {
    const result = await fetchPublic(raw, { maxBytes: 6_000_000, accept: "image/*,*/*;q=0.8" });
    const type = (result.contentType.split(";")[0] || "").trim().toLowerCase();
    if (!IMAGE_TYPES.includes(type)) return new Response("Not an image", { status: 415 });
    if (type === "image/svg+xml") {
      const text = new TextDecoder().decode(result.body);
      if (/<script|onload=|javascript:/i.test(text)) return new Response("Blocked image", { status: 415 });
    }
    const bytes = result.body;
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return new Response(copy, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch image";
    return new Response(message, { status: 502 });
  }
}
