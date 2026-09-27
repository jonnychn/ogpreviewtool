import { createServerFn } from "@tanstack/react-start";

import type { ExtractedPage } from "./extract-meta";

export type AnalyzeResult =
  | { ok: true; page: ExtractedPage & { finalUrl: string } }
  | { ok: false; error: string; siteStatus?: number };

export const analyzeUrl = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("url" in data) ||
      typeof data.url !== "string"
    ) {
      throw new Error("Enter a URL to read.");
    }
    const url = data.url.trim();
    if (url.length < 3 || url.length > 2000) throw new Error("That URL doesn't look right.");
    return { url };
  })
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    try {
      const { readPage } = await import("./read-page.server.ts");
      const page = await readPage(data.url);
      return { ok: true, page };
    } catch (error) {
      const siteStatus =
        typeof error === "object" && error !== null && "siteStatus" in error &&
        typeof error.siteStatus === "number"
          ? error.siteStatus
          : undefined;
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not read that page.",
        ...(siteStatus ? { siteStatus } : {}),
      };
    }
  });
