import { Stack } from 'expo-router';

export default function AddStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleShadowVisible: false, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: '添加应用', headerLargeTitle: true }} />
    </Stack>
  );
}
