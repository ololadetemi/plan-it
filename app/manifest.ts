import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Plan-it",
    short_name: "Plan-it",
    description: "A small, personal daily planner with gentle check-ins.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdeef5",
    theme_color: "#c2467f",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
