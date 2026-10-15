import { useColorScheme } from 'react-native';

export const ACCENT_COLORS = {
  blue: { label: '蓝色', value: '#007AFF' },
  purple: { label: '紫色', value: '#AF52DE' },
  cyan: { label: '青色', value: '#32ADE6' },
  red: { label: '红色', value: '#FF3B30' },
  rose: { label: '玫红', value: '#FF2D55' },
} as const;

export type AccentColor = keyof typeof ACCENT_COLORS;
export type AppearancePreference = 'system' | 'light' | 'dark';

const appThemes = {
  light: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    control: '#E5E5EA',
    input: '#F9F9FB',
    separator: '#E5E5EA',
    label: '#1C1C1E',
    secondaryLabel: '#6B7280',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    control: '#2C2C2E',
    input: '#2C2C2E',
    separator: '#3A3A3C',
    label: '#F2F2F7',
    secondaryLabel: '#98989F',
  },
} as const;

export function useAppTheme() {
  const colorScheme = useColorScheme();
  return appThemes[colorScheme === 'dark' ? 'dark' : 'light'];
}
