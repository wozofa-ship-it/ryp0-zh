import { Stack } from 'expo-router';

export default function IconsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: '图标' }} />
    </Stack>
  );
}
