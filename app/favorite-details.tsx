import React, { useCallback } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFavoritesStore } from '../services/favorites';

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FavoriteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const favorites = useFavoritesStore((s) => s.favorites);
  const remove = useFavoritesStore((s) => s.remove);
  const shareIpa = useFavoritesStore((s) => s.shareIpa);

  const app = favorites.find((f) => f.id === id);

  const handleInstall = useCallback(async () => {
    if (!app) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (app.sourceUrl && /^https?:\/\//i.test(app.sourceUrl)) {
        const { Linking } = await import('react-native');
        const canOpen = await Linking.canOpenURL('livecontainer://install').catch(() => false);
        if (!canOpen) {
          Alert.alert('提示', '未安装 LiveContainer，请先安装。');
          return;
        }
        await Linking.openURL(`livecontainer://install?url=${encodeURIComponent(app.sourceUrl)}`);
        return;
      }
      const Sharing = await import('expo-sharing');
      const available = await Sharing.isAvailableAsync().catch(() => false);
      if (!available) {
        Alert.alert('提示', '当前设备不支持分享');
        return;
      }
      await Sharing.shareAsync(app.fileUri, { dialogTitle: `安装 ${app.name}` });
    } catch (e: any) {
      Alert.alert('安装失败', String(e?.message || e || '未知错误'));
    }
  }, [app]);

  const handleDelete = useCallback(() => {
    if (!app) return;
    Alert.alert('删除收藏', `确定删除「${app.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(app.id);
            router.back();
          } catch (e: any) {
            Alert.alert('删除失败', String(e?.message || e));
          }
        },
      },
    ]);
  }, [app, remove, router]);

  const handleShare = useCallback(async () => {
    if (!app) return;
    try {
      await shareIpa(app.id);
    } catch (e: any) {
      Alert.alert('分享失败', String(e?.message || e));
    }
  }, [app, shareIpa]);

  if (!app) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: '应用详情' }} />
        <Text style={{ fontSize: 17, color: '#8E8E93' }}>未找到应用</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <Stack.Screen options={{ title: app.name }} />
      <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
        {app.iconUri ? (
          <Image source={{ uri: app.iconUri }} style={{ width: 80, height: 80, borderRadius: 18, marginBottom: 12 }} contentFit="cover" />
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 18, marginBottom: 12, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 32, color: '#8E8E93' }}>{(app.name || '?').charAt(0)}</Text>
          </View>
        )}
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 4 }}>{app.name}</Text>
        <Text style={{ fontSize: 14, color: '#8E8E93' }}>
          {app.version || ''}{app.size ? ` · ${formatSize(app.size)}` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: '#AEAEB2', marginTop: 2 }}>{app.bundleIdentifier || ''}</Text>
      </View>
      <View style={{ padding: 16 }}>
        <TouchableOpacity onPress={handleInstall} style={{ backgroundColor: '#0A84FF', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }} activeOpacity={0.8}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>安装</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }} activeOpacity={0.8}>
          <Text style={{ color: '#0A84FF', fontSize: 17 }}>分享 IPA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' }} activeOpacity={0.8}>
          <Text style={{ color: '#FF3B30', fontSize: 17 }}>删除收藏</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
