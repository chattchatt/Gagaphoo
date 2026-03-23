'use client';

import { useRef } from 'react';
import { TYPE_INFO } from '@/lib/spending-dna';
import type { DNAScores, DNAType } from '@/lib/spending-dna';

interface Props {
  scores: DNAScores;
  primaryType: DNAType;
  secondaryType: DNAType;
}

// Canvas 400x520 카드 생성 후 PNG 다운로드
export default function ShareCard({ scores, primaryType, secondaryType }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const primaryInfo = TYPE_INFO[primaryType];
  const secondaryInfo = TYPE_INFO[secondaryType];

  // 점수 축 배열
  const axes: { label: string; key: keyof DNAScores }[] = [
    { label: '절약성', key: 'saving' },
    { label: '계획성', key: 'planning' },
    { label: '다양성', key: 'diversity' },
    { label: '충동성', key: 'impulse' },
    { label: '투자성', key: 'investment' },
  ];

  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 400;
    const H = 520;
    canvas.width = W;
    canvas.height = H;

    // 배경: 블루 그라데이션
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1B64DA');
    grad.addColorStop(0.5, '#3182F6');
    grad.addColorStop(1, '#5ba0ff');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 24);
    ctx.fill();

    // 반투명 오버레이 (상단 원형)
    const circleGrad = ctx.createRadialGradient(W / 2, 80, 10, W / 2, 80, 200);
    circleGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    circleGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = circleGrad;
    ctx.beginPath();
    ctx.arc(W / 2, 80, 200, 0, Math.PI * 2);
    ctx.fill();

    // 로고 텍스트
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GaGapHoo', W / 2, 36);

    // 구분선
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 48);
    ctx.lineTo(W - 40, 48);
    ctx.stroke();

    // "나의 소비 유형" 라벨
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('나의 소비 유형', W / 2, 80);

    // 유형 아이콘 (큰 이모지)
    ctx.font = '56px serif';
    ctx.textAlign = 'center';
    ctx.fillText(primaryInfo.icon, W / 2, 155);

    // 주 유형 이름
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(primaryInfo.name, W / 2, 198);

    // 부 유형
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${secondaryInfo.icon} ${secondaryInfo.name} 성향도 있어요`, W / 2, 222);

    // 구분선
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 242);
    ctx.lineTo(W - 40, 242);
    ctx.stroke();

    // 점수 바 영역
    const barStartY = 262;
    const barH = 6;
    const barAreaW = W - 80;
    const labelX = 40;
    const barX = 130;
    const barW = barAreaW - 90;

    axes.forEach(({ label, key }, i) => {
      const value = scores[key];
      const y = barStartY + i * 38;

      // 축 라벨
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, labelX, y + barH);

      // 배경 바
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(barX, y, barW, barH, 3);
      ctx.fill();

      // 값 바
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(barX, y, (barW * value) / 100, barH, 3);
      ctx.fill();

      // 수치
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${value}`, W - 40, y + barH);
    });

    // 한줄 설명
    const descY = barStartY + axes.length * 38 + 16;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    // 긴 설명은 두 줄로 나누기
    const desc = primaryInfo.description;
    const maxW = W - 80;
    wrapText(ctx, desc, W / 2, descY, maxW, 18);

    // 하단 워터마크
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('gagaphoo.vercel.app', W / 2, H - 20);
  };

  // 텍스트 줄바꿈 헬퍼
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) {
    const words = text.split('');
    let line = '';
    let currentY = y;

    // 글자 단위로 처리 (한국어)
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, x, currentY);
        line = chars[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, currentY);
    // words is unused but keeps the variable reference
    void words;
  }

  const handleSave = () => {
    drawCard();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `소비DNA_${primaryInfo.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      {/* 미리보기 캔버스 */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={520}
          className="rounded-2xl shadow-lg max-w-full"
          style={{ display: 'block' }}
          onMouseEnter={drawCard}
        />
      </div>

      {/* 초기 렌더링 트리거 (마운트 시 그리기) */}
      <DrawOnMount draw={drawCard} />

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
        style={{ background: 'var(--primary)' }}
      >
        카드 저장 (PNG)
      </button>
    </div>
  );
}

// 마운트 시 canvas 그리기 트리거용 컴포넌트
function DrawOnMount({ draw }: { draw: () => void }) {
  // useEffect를 직접 사용하지 않고 ref 콜백 방식으로 처리
  // (ShareCard 내부에서 import 없이 처리하기 위해 분리)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const called = useRef(false);
  if (!called.current) {
    // 첫 렌더 후 마이크로태스크로 실행
    Promise.resolve().then(() => {
      if (!called.current) {
        called.current = true;
        draw();
      }
    });
  }
  return null;
}
