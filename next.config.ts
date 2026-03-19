import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Serwist PWA 플러그인 설정
const withSerwist = withSerwistInit({
  // 서비스 워커 소스 파일 경로
  swSrc: "src/app/sw.ts",
  // 서비스 워커 출력 경로 (public 디렉토리)
  swDest: "public/sw.js",
  // 개발 환경에서는 서비스 워커 비활성화
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* 추가 Next.js 설정 */
};

export default withSerwist(nextConfig);
