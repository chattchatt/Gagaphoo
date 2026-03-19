// 토스 스타일 색상 팔레트
export const colors = {
  blue: {
    50: '#EBF5FF',
    100: '#CCE5FF',
    500: '#3182F6',
    600: '#1B64DA',
    700: '#1957B3',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F2F4F6',
    200: '#E5E8EB',
    300: '#D1D6DB',
    400: '#B0B8C1',
    500: '#8B95A1',
    600: '#6B7684',
    700: '#4E5968',
    800: '#333D4B',
    900: '#191F28',
  },
  semantic: {
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#3182F6',
  },
} as const;

export type Colors = typeof colors;
