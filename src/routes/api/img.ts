import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { proxyImage } = await import("@/lib/read-page.server.ts");
        return proxyImage(request);
      },
    },
  },
});
