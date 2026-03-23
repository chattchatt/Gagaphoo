'use client';

import { useRef, useCallback } from 'react';

interface DragToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

// 드래그 + 탭 가능한 토글 스위치
export default function DragToggle({ checked, onChange, label }: DragToggleProps) {
  const trackRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startChecked = useRef(checked);

  // 드래그 시작
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    startX.current = e.clientX;
    startChecked.current = checked;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [checked]);

  // 드래그 중
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) {
      dragging.current = true;
    }
  }, []);

  // 드래그 종료 또는 탭
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      const dx = e.clientX - startX.current;
      // 오른쪽 드래그 → on, 왼쪽 드래그 → off
      const newChecked = dx > 0;
      if (newChecked !== checked) {
        onChange(newChecked);
      }
    } else {
      // 탭 — 토글
      onChange(!checked);
    }
    dragging.current = false;
  }, [checked, onChange]);

  return (
    <button
      ref={trackRef}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 relative touch-none ${
        checked ? 'bg-[#3182F6]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
          checked ? 'left-[calc(100%-1.5rem)]' : 'left-1'
        }`}
      />
    </button>
  );
}
