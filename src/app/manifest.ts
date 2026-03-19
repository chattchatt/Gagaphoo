import type { MetadataRoute } from "next";

// PWA 매니페스트 — 홈 화면 설치 및 앱처럼 동작하도록 설정
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GaGapHoo - 가계부",
    short_name: "GaGapHoo",
    description: "나만의 AI 가계부",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#3182F6",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
