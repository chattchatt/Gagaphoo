// Serwist 기반 서비스 워커 — 오프라인 캐싱 및 사전 캐시 설정
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// 타입스크립트: 서비스 워커 전역 변수 선언
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // __SW_MANIFEST는 빌드 시 Serwist가 주입하는 사전 캐시 목록
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// dom lib에는 ServiceWorkerGlobalScope가 없으므로 WorkerGlobalScope로 캐스팅
declare const self: WorkerGlobalScope & typeof globalThis & { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined };

// Serwist 인스턴스 생성
const serwist = new Serwist({
  // 사전 캐시 목록 (빌드 시 자동 주입)
  precacheEntries: self.__SW_MANIFEST,
  // 페이지 이동 시 캐시된 응답 사용 (오프라인 지원)
  skipWaiting: true,
  clientsClaim: true,
  // Next.js 권장 런타임 캐싱 전략
  runtimeCaching: defaultCache,
  navigationPreload: true,
});

serwist.addEventListeners();
