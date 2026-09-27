export type RawTag = { key: string; value: string };

export type ExtractedPage = {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  author: string;
  lang: string;
  favicon: string;
  contentImage: string;
  og: Record<string, string>;
  twitter: Record<string, string>;
  tags: RawTag[];
  note: string;
};

function decode(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => {
      const code = Number.parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/\u0026nbsp;/g, " ")
    .replace(/\u0026quot;/g, '"')
    .replace(/\u0026apos;|&#39;/g, "'")
    .replace(/\u0026lt;/g, "<")
    .replace(/\u0026gt;/g, ">")
    .replace(/\u0026amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i"),
  );
  if (!match) return null;
  return decode(match[1] ?? match[2] ?? match[3] ?? "").trim();
}

function abs(base: string, value: string): string {
  if (!value) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

function firstContentImage(html: string, baseUrl: string): string {
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attr(tag, "src");
    if (!src || src.startsWith("data:")) continue;
    const alt = attr(tag, "alt") || "";
    const hint = `${src} ${alt} ${attr(tag, "class") || ""}`.toLowerCase();
    if (/logo|icon|favicon|sprite|pixel|badge|emoji|spinner|tracking/.test(hint)) continue;
    if (/\.svg(?:$|\?)/i.test(src)) continue;
    const width = Number(attr(tag, "width") || 0);
    const height = Number(attr(tag, "height") || 0);
    if ((width && width < 80) || (height && height < 80)) continue;
    return abs(baseUrl, src);
  }
  return "";
}

export function extractMeta(html: string, baseUrl: string): ExtractedPage {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = clip(decode((titleMatch?.[1] ?? "").replace(/<[^>]+>/g, " ")), 500);

  const langMatch = html.match(/<html[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i);
  const lang = langMatch?.[1] ?? "";

  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  const tags: RawTag[] = [];
  let description = "";
  let robots = "";
  let author = "";
  let canonical = "";
  let favicon = "";

  if (title) tags.push({ key: "title", value: title });

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") || attr(tag, "name") || "").toLowerCase();
    const content = attr(tag, "content") ?? "";
    if (!key || !content) continue;
    if (key === "viewport" || key === "charset") continue;
    const value = key.includes("image") || key === "og:url" ? abs(baseUrl, content) : clip(content, 2000);
    tags.push({ key, value });
    if (key === "description" && !description) description = clip(content, 2000);
    else if (key === "robots" && !robots) robots = clip(content, 200);
    else if (key === "author" && !author) author = clip(content, 200);
    else if (key.startsWith("og:") && og[key] == null) og[key] = value;
    else if ((key.startsWith("twitter:") || key.startsWith("x:")) && twitter[key] == null) {
      twitter[key] = value;
    }
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, "rel") || "").toLowerCase();
    const href = attr(tag, "href") || "";
    if (!rel || !href) continue;
    const rels = rel.split(/\s+/);
    if (rels.includes("canonical") && !canonical) {
      canonical = abs(baseUrl, href);
      tags.push({ key: "canonical", value: canonical });
    }
    if (!favicon && rels.some((part) => part.includes("icon"))) {
      favicon = abs(baseUrl, href);
    }
  }

  if (!favicon) {
    try {
      favicon = new URL("/favicon.ico", baseUrl).href;
    } catch {
      favicon = "";
    }
  }

  const contentImage = firstContentImage(html, baseUrl);

  const hasShare = Boolean(title || description || og["og:title"] || og["og:image"]);
  const spaShell =
    !hasShare && /id\s*=\s*["'](?:root|app|__next|___gatsby)["']/i.test(html);
  const note = spaShell
    ? "This looks like a JavaScript app shell. Tags added only in the browser are invisible to most crawlers."
    : "";

  return {
    title,
    description,
    canonical,
    robots,
    author,
    lang,
    favicon,
    contentImage,
    og,
    twitter,
    tags: tags.slice(0, 80),
    note,
  };
}
