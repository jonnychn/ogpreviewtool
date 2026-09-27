import type { ExtractedPage, RawTag } from "./extract-meta";

export type CardType = "summary_large_image" | "summary";

export type Draft = {
  title: string;
  description: string;
  url: string;
  siteName: string;
  imageUrl: string;
  imageAlt: string;
  imageUpload: string | null;
  imageName: string;
  imageBytes: number | null;
  card: CardType;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterSite: string;
  locale: string;
  robots: string;
  author: string;
  favicon: string;
  contentImage: string;
  note: string;
  rawTags: RawTag[];
};

export type ImageProbe =
  | { state: "none" }
  | { state: "loading" }
  | { state: "error" }
  | { state: "ok"; width: number; height: number };

export type CheckStatus = "pass" | "warn" | "fail" | "note";

export type Check = {
  id: string;
  group: string;
  title: string;
  detail: string;
  status: CheckStatus;
};

export type UrlParts = {
  host: string;
  path: string;
  href: string;
  ok: boolean;
  https: boolean;
};

export const SAMPLE: Draft = {
  title: "North Lamp desk light, warm and quiet, with a real dimmer",
  description:
    "A matte aluminum lamp with a 2700K beam, a dimmer that really dims, and no coil buzz. Made to sit beside a notebook, not light a warehouse.",
  url: "https://northlamp.example/desk",
  siteName: "North Lamp",
  imageUrl: "/sample-card.svg",
  imageAlt: "Matte aluminum desk lamp switched on against a pale wall",
  imageUpload: null,
  imageName: "",
  imageBytes: null,
  card: "summary_large_image",
  ogType: "website",
  ogTitle: "",
  ogDescription: "",
  ogUrl: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  twitterSite: "@northlamp",
  locale: "en_US",
  robots: "",
  author: "",
  favicon: "",
  contentImage: "",
  note: "",
  rawTags: [],
};

export const BLANK: Draft = {
  ...SAMPLE,
  title: "",
  description: "",
  url: "",
  siteName: "",
  imageUrl: "",
  imageAlt: "",
  imageUpload: null,
  imageName: "",
  imageBytes: null,
  twitterSite: "",
  locale: "en_US",
  favicon: "",
  note: "",
  rawTags: [],
};

const OG_TYPES = new Set(["website", "article", "product", "profile", "book", "video.other", "video.movie"]);

export function chars(value: string): number {
  return [...value].length;
}

export function splitUrl(raw: string): UrlParts {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return { host: "", path: "", href: "", ok: false, https: false };
  }
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { host: "", path: "", href: "", ok: false, https: false };
    }
    const path = `${url.pathname}${url.search}`;
    return {
      host: url.hostname.replace(/^www\./, ""),
      path: path === "/" ? "" : path,
      href: url.href,
      ok: true,
      https: url.protocol === "https:",
    };
  } catch {
    return { host: "", path: "", href: "", ok: false, https: false };
  }
}

export type Resolved = {
  title: string;
  description: string;
  url: string;
  host: string;
  path: string;
  siteName: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  imageTag: string;
  previewImage: string;
  imageAlt: string;
  usingUpload: boolean;
  localSample: boolean;
  imessageImage: string;
  imessageBorrowed: boolean;
  card: CardType;
  ogType: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterSite: string;
  locale: string;
  robots: string;
  author: string;
  favicon: string;
};

function imageChoice(draft: Draft): {
  tag: string;
  remoteSrc: string;
  localSample: boolean;
} {
  const value = draft.imageUrl.trim();
  if (!value) return { tag: "", remoteSrc: "", localSample: false };
  if (value.startsWith("/")) {
    return { tag: value, remoteSrc: value, localSample: value.includes("sample-card.svg") };
  }
  if (value.startsWith("data:image/")) return { tag: "", remoteSrc: "", localSample: false };
  const info = splitUrl(value);
  if (!info.ok) return { tag: "", remoteSrc: "", localSample: false };
  return {
    tag: info.href,
    remoteSrc: `/api/img?url=${encodeURIComponent(info.href)}`,
    localSample: false,
  };
}

export function resolve(draft: Draft): Resolved {
  const page = splitUrl(draft.url);
  const ogUrlInfo = splitUrl(draft.ogUrl);
  const href = ogUrlInfo.ok ? ogUrlInfo.href : page.href;
  const host = ogUrlInfo.ok ? ogUrlInfo.host : page.host;
  const path = ogUrlInfo.ok ? ogUrlInfo.path : page.path;
  const image = imageChoice(draft);
  const twitterImageInfo = splitUrl(draft.twitterImage);
  const ogTitle = draft.ogTitle.trim() || draft.title.trim();
  const ogDescription = draft.ogDescription.trim() || draft.description.trim();
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    url: page.ok ? page.href : draft.url.trim(),
    host,
    path,
    siteName: draft.siteName.trim() || host,
    ogTitle,
    ogDescription,
    ogUrl: href,
    imageTag: image.tag,
    previewImage: draft.imageUpload || image.remoteSrc,
    imageAlt: draft.imageAlt.trim(),
    usingUpload: Boolean(draft.imageUpload),
    localSample: image.localSample && !draft.imageUpload,
    imessageImage:
      draft.imageUpload || image.remoteSrc || (draft.contentImage ? proxySrc(draft.contentImage) : ""),
    imessageBorrowed: !draft.imageUpload && !image.remoteSrc && Boolean(draft.contentImage),
    card: draft.card,
    ogType: draft.ogType.trim() || "website",
    twitterTitle: draft.twitterTitle.trim() || ogTitle,
    twitterDescription: draft.twitterDescription.trim() || ogDescription,
    twitterImage: twitterImageInfo.ok ? twitterImageInfo.href : image.tag,
    twitterSite: draft.twitterSite.trim(),
    locale: draft.locale.trim(),
    robots: draft.robots.trim(),
    author: draft.author.trim(),
    favicon: draft.favicon,
  };
}

export function proxySrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  const info = splitUrl(url);
  if (!info.ok) return "";
  return `/api/img?url=${encodeURIComponent(info.href)}`;
}

export function draftFromPage(page: ExtractedPage & { finalUrl: string }): Draft {
  const card = page.twitter["twitter:card"] === "summary" ? "summary" : "summary_large_image";
  const locale = page.og["og:locale"] || localeFromLang(page.lang);
  return {
    title: page.title,
    description: page.description,
    url: page.canonical || page.finalUrl,
    siteName: page.og["og:site_name"] || "",
    imageUrl: page.og["og:image"] || page.twitter["twitter:image"] || "",
    imageAlt: page.og["og:image:alt"] || "",
    imageUpload: null,
    imageName: "",
    imageBytes: null,
    card,
    ogType: page.og["og:type"] || "website",
    ogTitle: page.og["og:title"] || "",
    ogDescription: page.og["og:description"] || "",
    ogUrl: page.og["og:url"] || "",
    twitterTitle: page.twitter["twitter:title"] || "",
    twitterDescription: page.twitter["twitter:description"] || "",
    twitterImage: page.twitter["twitter:image"] && page.twitter["twitter:image"] !== page.og["og:image"]
      ? page.twitter["twitter:image"]
      : "",
    twitterSite: page.twitter["twitter:site"] || "",
    locale,
    robots: page.robots,
    author: page.author,
    favicon: page.favicon,
    contentImage: page.contentImage,
    note: page.note,
    rawTags: page.tags,
  };
}

function localeFromLang(lang: string): string {
  if (!lang) return "";
  const [language, region] = lang.split("-");
  if (!language) return "";
  return region ? `${language.toLowerCase()}_${region.toUpperCase()}` : language.toLowerCase();
}

function esc(value: string): string {
  return value
    .replaceAll("&", "\u0026amp;")
    .replaceAll('"', "\u0026quot;")
    .replaceAll("<", "\u0026lt;")
    .replaceAll(">", "\u0026gt;");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildMarkup(draft: Draft, probe: ImageProbe): string {
  const card = resolve(draft);
  const lines: string[] = [];
  if (card.title) lines.push(`<title>${esc(oneLine(card.title))}</title>`);
  if (card.description) {
    lines.push(`<meta name="description" content="${esc(oneLine(card.description))}" />`);
  }
  if (card.url && splitUrl(card.url).ok) {
    lines.push(`<link rel="canonical" href="${esc(card.url)}" />`);
  }
  if (card.robots) lines.push(`<meta name="robots" content="${esc(oneLine(card.robots))}" />`);
  if (card.author) lines.push(`<meta name="author" content="${esc(oneLine(card.author))}" />`);
  lines.push(`<meta property="og:type" content="${esc(card.ogType)}" />`);
  if (card.siteName) lines.push(`<meta property="og:site_name" content="${esc(card.siteName)}" />`);
  if (card.locale) lines.push(`<meta property="og:locale" content="${esc(card.locale)}" />`);
  if (card.ogUrl && splitUrl(card.ogUrl).ok) {
    lines.push(`<meta property="og:url" content="${esc(card.ogUrl)}" />`);
  }
  if (card.ogTitle) lines.push(`<meta property="og:title" content="${esc(oneLine(card.ogTitle))}" />`);
  if (card.ogDescription) {
    lines.push(`<meta property="og:description" content="${esc(oneLine(card.ogDescription))}" />`);
  }
  const remoteImage = splitUrl(card.imageTag).ok ? card.imageTag : "";
  if (card.usingUpload && !remoteImage) {
    lines.push("<!-- Uploaded image is preview-only. Host the file, then set og:image to the https URL. -->");
  } else if (card.localSample) {
    lines.push("<!-- Sample artwork. Replace og:image with your own absolute https URL before shipping. -->");
    lines.push(`<meta property="og:image" content="${esc(card.imageTag)}" />`);
  } else if (remoteImage) {
    lines.push(`<meta property="og:image" content="${esc(remoteImage)}" />`);
    if (card.imageAlt) lines.push(`<meta property="og:image:alt" content="${esc(oneLine(card.imageAlt))}" />`);
    if (probe.state === "ok" && !card.usingUpload) {
      lines.push(`<meta property="og:image:width" content="${probe.width}" />`);
      lines.push(`<meta property="og:image:height" content="${probe.height}" />`);
    }
  }
  lines.push(`<meta name="twitter:card" content="${card.card}" />`);
  if (card.twitterTitle) {
    lines.push(`<meta name="twitter:title" content="${esc(oneLine(card.twitterTitle))}" />`);
  }
  if (card.twitterDescription) {
    lines.push(`<meta name="twitter:description" content="${esc(oneLine(card.twitterDescription))}" />`);
  }
  const twitterImage = splitUrl(card.twitterImage).ok ? card.twitterImage : "";
  if (twitterImage && twitterImage !== remoteImage) {
    lines.push(`<meta name="twitter:image" content="${esc(twitterImage)}" />`);
  } else if (remoteImage) {
    lines.push(`<meta name="twitter:image" content="${esc(remoteImage)}" />`);
  }
  if (card.twitterSite) lines.push(`<meta name="twitter:site" content="${esc(card.twitterSite)}" />`);
  return lines.join("\n");
}

function cropLoss(width: number, height: number, target = 1.91): number {
  if (width <= 0 || height <= 0) return 0;
  const ratio = width / height;
  if (ratio > target) return 1 - target / ratio;
  return 1 - ratio / target;
}

function push(
  list: Check[],
  status: CheckStatus,
  group: string,
  id: string,
  title: string,
  detail: string,
) {
  list.push({ status, group, id, title, detail });
}

export function evaluate(draft: Draft, probe: ImageProbe): Check[] {
  const card = resolve(draft);
  const checks: Check[] = [];
  const titleLen = chars(card.title);
  const descLen = chars(card.description);
  const page = splitUrl(draft.url);

  if (!card.title) {
    push(checks, "fail", "Search", "title", "Add a page title", "Google and every unfurl need one. Aim for 50–60 characters.");
  } else if (titleLen >= 50 && titleLen <= 60) {
    push(checks, "pass", "Search", "title", "Title length is in range", `${titleLen} characters. Google usually keeps titles around 50–60.`);
  } else if (titleLen >= 30 && titleLen <= 70) {
    push(checks, "warn", "Search", "title", "Title is a little off the ideal", `${titleLen} characters. 50–60 is the band that most often survives Google's cut.`);
  } else {
    push(checks, "fail", "Search", "title", titleLen < 30 ? "Title is very short" : "Title will be cut", `${titleLen} characters. Stay near 50–60 so the snippet doesn't truncate or look empty.`);
  }

  const separators = card.title.match(/[|,·]/g)?.length ?? 0;
  if (separators > 2) {
    push(checks, "warn", "Search", "stuffing", "Title reads like a keyword list", "Pipes and stacks of commas get rewritten. One idea is enough.");
  }

  if (!card.description) {
    push(checks, "fail", "Search", "desc", "Add a meta description", "120–160 characters, with a reason to open the page. Not a copy of the title.");
  } else if (card.description.toLowerCase() === card.title.toLowerCase()) {
    push(checks, "fail", "Search", "desc-dup", "Description repeats the title", "The snippet should add something the title didn't already say.");
  } else if (descLen >= 120 && descLen <= 160) {
    push(checks, "pass", "Search", "desc", "Description length is in range", `${descLen} characters. That's the band search snippets can actually show.`);
  } else if (descLen >= 70 && descLen <= 200) {
    push(checks, "warn", "Search", "desc", "Description is usable, not ideal", `${descLen} characters. 120–160 is the safer window before Google cuts or rewrites it.`);
  } else {
    push(checks, "fail", "Search", "desc", descLen < 70 ? "Description is thin" : "Description is too long", `${descLen} characters. Write 120–160, benefit first.`);
  }

  if (!page.ok) {
    push(checks, "fail", "Search", "url", "Canonical URL isn't a real address", "Use an absolute https URL — the one version of the page you want indexed and shared.");
  } else if (!page.https) {
    push(checks, "fail", "Search", "url", "Canonical URL is not https", "Shares and search both expect https. http pages lose images and trust.");
  } else {
    push(checks, "pass", "Search", "url", "Canonical URL is absolute https", page.href);
  }

  if (/noindex/i.test(card.robots)) {
    push(checks, "warn", "Search", "robots", "This page is marked noindex", "Search won't list it. Social apps may still unfurl it. Don't set this by accident.");
  }

  const ogTitleLen = chars(card.ogTitle);
  if (!card.ogTitle) {
    push(checks, "fail", "Open Graph", "og-title", "Open Graph title is empty", "Facebook, LinkedIn, Slack, and Discord all fall through to this.");
  } else if (ogTitleLen <= 60) {
    push(checks, "pass", "Open Graph", "og-title", "Open Graph title fits the card", `${ogTitleLen} characters. LinkedIn starts cutting around 70.`);
  } else if (ogTitleLen <= 90) {
    push(checks, "warn", "Open Graph", "og-title", "Open Graph title may truncate", `${ogTitleLen} characters. Put the point in the first 60.`);
  } else {
    push(checks, "fail", "Open Graph", "og-title", "Open Graph title is too long", `${ogTitleLen} characters. Most cards keep about 60–70.`);
  }

  const ogDescLen = chars(card.ogDescription);
  if (!card.ogDescription) {
    push(checks, "warn", "Open Graph", "og-desc", "No Open Graph description", "Slack and Discord will look bare. Facebook often hides it, but the others won't.");
  } else if (ogDescLen <= 200) {
    push(checks, "pass", "Open Graph", "og-desc", "Open Graph description fits", `${ogDescLen} characters. Slack shows about two lines of it.`);
  } else if (ogDescLen <= 300) {
    push(checks, "warn", "Open Graph", "og-desc", "Open Graph description will be clamped", `${ogDescLen} characters. Front-load the sentence you want Slack to keep.`);
  } else {
    push(checks, "fail", "Open Graph", "og-desc", "Open Graph description is an essay", `${ogDescLen} characters. Cut it under 200.`);
  }

  if (!OG_TYPES.has(card.ogType)) {
    push(checks, "warn", "Open Graph", "type", "Uncommon og:type", "website or article is what most pages should send. product is fine for a product URL.");
  } else {
    push(checks, "pass", "Open Graph", "type", "og:type is set", card.ogType);
  }

  if (!draft.siteName.trim() && card.host) {
    push(checks, "note", "Open Graph", "site", "Site name falls back to the domain", "Set og:site_name if the brand and the host aren't the same words.");
  } else if (!card.siteName) {
    push(checks, "warn", "Open Graph", "site", "No site name", "Discord uses it as the author line. Slack uses it too.");
  } else {
    push(checks, "pass", "Open Graph", "site", "Site name is set", card.siteName);
  }

  if (draft.ogUrl.trim()) {
    const override = splitUrl(draft.ogUrl);
    if (!override.ok || !override.https) {
      push(checks, "fail", "Open Graph", "og-url", "og:url should be absolute https", "This is the address the share points at.");
    } else if (page.ok && override.host !== page.host) {
      push(checks, "warn", "Open Graph", "og-url", "og:url host doesn't match the canonical", "Shares and search will disagree about which site this is.");
    } else {
      push(checks, "pass", "Open Graph", "og-url", "og:url matches the page", override.href);
    }
  }

  if (!card.locale) {
    push(checks, "note", "Open Graph", "locale", "og:locale is empty", "Optional. en_US is the usual form when the page is English.");
  } else if (/^[a-z]{2}_[A-Z]{2}$/.test(card.locale)) {
    push(checks, "pass", "Open Graph", "locale", "Locale looks right", card.locale);
  } else {
    push(checks, "warn", "Open Graph", "locale", "Locale should look like en_US", "Language, underscore, region. Not a hyphen, and not a full sentence.");
  }

  if (!card.previewImage) {
    push(
      checks,
      "fail",
      "Image",
      "missing",
      "No share image",
      draft.contentImage
        ? "WhatsApp, Facebook, X, and LinkedIn will skip the picture. iMessage may still show a photo it found in the page."
        : "Without one, platforms invent a screenshot or show nothing. Use 1200×630.",
    );
    if (draft.contentImage) {
      push(
        checks,
        "warn",
        "iMessage",
        "borrowed",
        "iMessage is using a photo from the page",
        "There is no og:image, so Messages grabbed a picture out of the HTML. WhatsApp will not. Use that photo as the share image, or set a real 1200×630.",
      );
    }
  } else if (card.usingUpload && !splitUrl(card.imageTag).ok) {
    push(checks, "fail", "Image", "hosted", "Upload is preview-only", "Host the file and paste an absolute https URL. Crawlers cannot see a file on your laptop.");
  } else if (card.localSample) {
    push(checks, "warn", "Image", "sample", "This is the sample artwork", "Swap it for a public https JPG or PNG, 1200×630, before you copy the tags.");
  } else if (splitUrl(card.imageTag).ok && !splitUrl(card.imageTag).https) {
    push(checks, "fail", "Image", "https", "Image URL is not https", "Facebook, X, and LinkedIn drop http images.");
  } else if (!splitUrl(card.imageTag).ok) {
    push(checks, "fail", "Image", "abs", "Image URL must be absolute", "Relative paths resolve for you, not for a crawler on another domain.");
  } else {
    push(checks, "pass", "Image", "hosted", "Image URL is absolute https", card.imageTag);
  }

  if (card.previewImage && probe.state === "error") {
    push(checks, "fail", "Image", "load", "Image didn't load", "If this browser can't fetch it, the platform crawler probably can't either.");
  } else if (card.previewImage && probe.state === "loading") {
    push(checks, "note", "Image", "load", "Checking the image…", "Dimensions land here as soon as the file loads.");
  } else if (probe.state === "ok") {
    const { width, height } = probe;
    if (width < 200 || height < 200) {
      push(checks, "fail", "Image", "size", "Image is too small", `${width}×${height}. Under 600×315, most networks drop it or shrink it to a thumb.`);
    } else if (width < 1200 || height < 630) {
      push(checks, "warn", "Image", "size", "Image is below 1200×630", `${width}×${height}. It can unfurl, but it will look soft. Export the 1200×630 crop.`);
    } else {
      push(checks, "pass", "Image", "size", "Image is at least 1200×630", `${width}×${height}.`);
    }
    const loss = Math.round(cropLoss(width, height) * 100);
    if (loss <= 8) {
      push(checks, "pass", "Image", "ratio", "Ratio matches the share crop", `${(width / height).toFixed(2)}:1. Facebook, LinkedIn, and X keep almost the whole frame.`);
    } else if (loss <= 25) {
      push(checks, "warn", "Image", "ratio", "The share crop cuts this image", `About ${loss}% disappears at 1.91:1. Keep the subject in the center.`);
    } else {
      push(checks, "fail", "Image", "ratio", "Most of this image will be cropped", `About ${loss}% is outside the 1.91:1 frame used by Facebook, LinkedIn, and X.`);
    }
    if (card.card === "summary") {
      const square = Math.round(cropLoss(width, height, 1) * 100);
      if (square > 12) {
        push(checks, "warn", "X", "summary-crop", "X will squash this into a square", "summary uses a small square thumb. summary_large_image shows the banner instead.");
      }
    }
  }

  if (card.previewImage && !card.imageAlt) {
    push(checks, "warn", "Image", "alt", "No og:image:alt", "Optional, and often unread — still the text that shows when the image fails.");
  } else if (card.imageAlt) {
    push(checks, "pass", "Image", "alt", "Image alt text is set", card.imageAlt);
  }

  if (draft.imageBytes != null && draft.imageBytes > 5_000_000) {
    push(checks, "fail", "Image", "weight", "Image is over 5 MB", "Large files time out before the crawler saves them. Export a tighter JPG.");
  } else if (draft.imageBytes != null && draft.imageBytes > 1_000_000) {
    push(checks, "warn", "Image", "weight", "Image is over 1 MB", "It may still pass the hard cap. Smaller arrives more often.");
  }

  if (card.card === "summary_large_image") {
    push(checks, "pass", "X", "card", "X card is a large image", "The description is usually hidden. Title and picture have to carry the post.");
  } else {
    push(checks, "note", "X", "card", "X card is a small summary", "Right for a logo. Weak if you have a real photograph.");
  }

  const twLen = chars(card.twitterTitle);
  if (twLen > 70) {
    push(checks, "warn", "X", "tw-title", "X title is longer than 70 characters", `${twLen} characters. It will end in an ellipsis.`);
  } else if (card.twitterTitle) {
    push(checks, "pass", "X", "tw-title", "X title fits", `${twLen} characters.`);
  }

  if (!card.twitterSite) {
    push(checks, "note", "X", "site", "twitter:site is empty", "Optional. When you set it, use @handle, not a URL.");
  } else if (/^@[A-Za-z0-9_]{1,15}$/.test(card.twitterSite)) {
    push(checks, "pass", "X", "site", "X handle looks valid", card.twitterSite);
  } else {
    push(checks, "fail", "X", "site", "twitter:site should be an @handle", "Not a URL, and not a display name. Example: @northlamp.");
  }

  if (card.usingUpload && splitUrl(card.imageTag).ok) {
    push(checks, "note", "Image", "split", "Preview and tags are using different images", "The cards show your upload. The copied tags still point at the image URL.");
  }

  return checks;
}

export type ScoreFix = { id: string; title: string; detail: string; status: "fail" | "warn" };

export type ScoreTone = "good" | "ok" | "mid" | "bad";

export type PreviewScore = {
  value: number;
  label: string;
  hint: string;
  tone: ScoreTone;
  fixes: ScoreFix[];
};

function checkById(checks: Check[], ids: string[]): Check | undefined {
  return checks.find((check) => ids.includes(check.id));
}

function credit(check: Check | undefined, max: number): number {
  if (!check || check.status === "fail") return 0;
  if (check.status === "pass") return max;
  if (check.status === "warn") return Math.round(max * 0.55);
  return Math.round(max * 0.8);
}

export function scorePreview(checks: Check[]): PreviewScore {
  const title = credit(checkById(checks, ["title"]), 16);
  const description = credit(checkById(checks, ["desc", "desc-dup"]), 16);
  const url = credit(checkById(checks, ["url"]), 10);
  const ogTitle = credit(checkById(checks, ["og-title"]), 12);
  const ogDescription = credit(checkById(checks, ["og-desc"]), 8);
  const image = checkById(checks, ["hosted", "missing", "sample", "https", "abs"]);
  const imagePoints = credit(image, 22);
  const imageUsable = image?.status === "pass" || image?.status === "warn";
  const loading = checks.some((check) => check.id === "load" && check.status === "note");
  const loadFailed = checks.some((check) => check.id === "load" && check.status === "fail");

  let earned = title + description + url + ogTitle + ogDescription + imagePoints;
  let max = 84;
  if (!loading) {
    max += 16;
    if (imageUsable && !loadFailed) {
      earned += credit(checkById(checks, ["size"]), 8);
      earned += credit(checkById(checks, ["ratio"]), 8);
    }
  }

  const value = Math.max(0, Math.min(100, Math.round((earned / max) * 100)));
  const fixes = checks
    .filter((check) => check.status === "fail" || check.status === "warn")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "fail" ? -1 : 1))
    .slice(0, 3)
    .map((check) => ({
      id: check.id,
      title: check.title,
      detail: check.detail,
      status: (check.status === "fail" ? "fail" : "warn") as ScoreFix["status"],
    }));

  const tone: ScoreTone = value >= 90 ? "good" : value >= 75 ? "ok" : value >= 50 ? "mid" : "bad";
  const label = tone === "good" ? "Ready to share" : tone === "ok" ? "Close" : tone === "mid" ? "Needs work" : "Not ready";
  const hint =
    fixes.length === 0
      ? "Title, description, URL, and image are in the range the cards keep."
      : value >= 90
        ? "The card will unfurl. These are the last cuts."
        : "Start here. Each one changes what people actually see.";

  return { value, label, hint, tone, fixes };
}

export type GuideGroup = { index: string; title: string; items: string[] };

export const GUIDE: GuideGroup[] = [
  {
    index: "01",
    title: "Titles",
    items: [
      "Lead with the specific thing, not the brand, unless the brand is why someone clicks.",
      "Stay near 50–60 characters. Google cuts on pixel width, and that width lands there for most titles.",
      "One idea. A pile of pipes and synonyms looks like a keyword list and gets rewritten.",
    ],
  },
  {
    index: "02",
    title: "Descriptions",
    items: [
      "120–160 characters. Long enough to say what it is and why it matters.",
      "Don't repeat the title, and don't dump keywords. Write the reason to open the page.",
      "Google rewrites snippets often. Yours is still the fallback, and it seeds the social description.",
    ],
  },
  {
    index: "03",
    title: "Canonical URLs",
    items: [
      "One absolute https URL: the version you want indexed and shared.",
      "www and the apex host are different pages to a crawler. Pick one.",
      "og:url should be that same address so shares and search agree.",
    ],
  },
  {
    index: "04",
    title: "Open Graph",
    items: [
      "The four that decide the card: og:title, og:description, og:image, og:url.",
      "Set og:type and og:site_name so Facebook, LinkedIn, Slack, and Discord don't guess.",
      "Put the point in the first 80 characters. Everything after that is optional on a phone.",
    ],
  },
  {
    index: "05",
    title: "Images",
    items: [
      "1200×630 pixels, 1.91:1. That is the frame Facebook, LinkedIn, and most large unfurls crop to.",
      "Below 600×315, networks drop the image or shrink it to a thumb.",
      "JPG or PNG, https, absolute, public, ideally under 1 MB. Slow images never arrive.",
      "Keep type and faces in the center. X, Facebook, and iMessage do not crop the same edges.",
      "SVG, data URLs, and files behind a login do not travel. Crawlers will not send your cookies.",
    ],
  },
  {
    index: "06",
    title: "X",
    items: [
      "summary_large_image is the banner. summary is a small square, useful for a logo and not much else.",
      "X falls back to Open Graph when twitter tags are missing. Set both when the X title should be shorter.",
      "Large cards usually hide the description. twitter:site is an @handle, not a URL.",
    ],
  },
  {
    index: "07",
    title: "Other unfurls",
    items: [
      "LinkedIn caches hard and uses the same 1.91 crop. Titles past roughly 70 characters are cut.",
      "Slack keeps about two lines of description, then the image. A long paragraph looks like a mistake.",
      "Discord shows the site name, then the title, and more of the description than Facebook does.",
      "iMessage uses a taller crop than Facebook, and if og:image is missing it may show a large photo from the page instead.",
      "WhatsApp only uses og:image. No share image means a text card, even when iMessage found a photo.",
    ],
  },
  {
    index: "08",
    title: "Crawlers and cache",
    items: [
      "Facebook, LinkedIn, X, Slack, Discord, WhatsApp, and iMessage each keep their own cache. Old shares stay old.",
      "After deploy, force a rescrape. The Facebook Sharing Debugger and LinkedIn Post Inspector are the usual buttons.",
      "Don't block facebookexternalhit, Twitterbot, Slackbot, Discordbot, or LinkedInBot. Perfect tags still unfurl blank.",
      "Tags injected only with JavaScript are invisible. They have to be in the first HTML response.",
    ],
  },
  {
    index: "09",
    title: "Before you ship",
    items: [
      "Read the live URL here after deploy, not from memory.",
      "Check the image at the width of a phone card. Words in the picture that only work at full size will not survive.",
      "noindex keeps a page out of search. It does not reliably stop a social unfurl.",
    ],
  },
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
