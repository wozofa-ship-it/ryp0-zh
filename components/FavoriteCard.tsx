import React, { useCallback } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FavoriteApp, useFavoritesStore } from '../services/favorites';

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}

export default function FavoriteCard({ app }: { app: FavoriteApp }) {
  const remove = useFavoritesStore(s => s.remove);
  const rename = useFavoritesStore(s => s.rename);
  const shareIpa = useFavoritesStore(s => s.shareIpa);

  const handleUpdate = useCallback(async () => {
    // 检查更新：如果是从仓库收藏的，对比仓库最新版本
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (!app.bundleIdentifier || app.bundleIdentifier.startsWith('local.favorite.')) {
      Alert.alert('更新', '该收藏无仓库信息，无法检查更新。');
      return;
    }
    try {
      // 从仓库获取最新版本
      const { useRepoStore } = await import('../store/useRepoStore');
      const repo = useRepoStore.getState().repo;
      if (!repo) {
        Alert.alert('更新', '仓库数据未加载，请先到"全部应用"页刷新。');
        return;
      }
      const repoApp = repo.apps.find((a: any) => a.bundleIdentifier === app.bundleIdentifier);
      if (!repoApp) {
        Alert.alert('更新', '仓库中已无此应用。');
        return;
      }
      const latestVersion = repoApp.versions?.[0]?.version || repoApp.version;
      if (latestVersion && latestVersion !== app.version) {
        Alert.alert(
          '发现新版本',
          `当前：${app.version || '未知'}\n最新：${latestVersion}\n是否更新？`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '更新',
              onPress: async () => {
                // 删除旧收藏，重新从仓库添加
                const { useFavoritesStore } = await import('../services/favorites');
                await useFavoritesStore.getState().remove(app.id);
                const latest = repoApp.versions?.[0];
                await useFavoritesStore.getState().addRepoApp({
                  name: repoApp.name,
                  bundleIdentifier: repoApp.bundleIdentifier,
                  version: latest?.version || repoApp.version || '',
                  downloadURL: latest?.downloadURL || '',
                  size: latest?.size,
                });
                Alert.alert('已更新', `「${repoApp.name}」已更新到 ${latestVersion}。`);
              },
            },
          ]
        );
      } else {
        Alert.alert('更新', '已是最新版本。');
      }
    } catch (e: any) {
      Alert.alert('更新失败', e?.message || '检查更新时出错');
    }
  }, [app]);

  const handleOpenDetails = useCallback(async () => {
    // 点卡片进收藏详情页（跟点仓库APP进详情页一样效果）
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push(`/(tabs)/(apps)/${app.bundleIdentifier}`);
  }, [app.id, router]);

  const handleShare = useCallback(async () => {
    try {
      await shareIpa(app.id);
    } catch (e: any) {
      Alert.alert('分享失败', e?.message || '无法分享该 IPA。');
    }
  }, [app.id, shareIpa]);

  const handleDelete = useCallback(() => {
    Alert.alert('删除收藏', `确定删除「${app.name}」吗？本地文件也会一并删除。`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => remove(app.id) },
    ]);
  }, [app.id, app.name, remove]);

  const handleRename = useCallback(() => {
    Alert.prompt('重命名', '输入新的应用名称', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: (name?: string) => {
          const n = (name || '').trim();
          if (n) rename(app.id, n);
        },
      },
    ], 'plain-text', app.name);
  }, [app.id, app.name, rename]);

  return (
    <TouchableOpacity onPress={handleOpenDetails} activeOpacity={0.9}>
      <View style={styles.card}>
        {app.iconUri ? (
          <Image source={{ uri: app.iconUri }} style={styles.icon} contentFit="cover" />
        ) : (
          <View style={[styles.icon, styles.iconPlaceholder]}>
            <Text style={styles.iconPlaceholderText}>{(app.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{app.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {app.version}{app.size ? ` · ${formatSize(app.size)}` : ''}{app.importDate ? ` · ${formatDate(app.importDate)}` : ''}
          </Text>
          <Text style={styles.bundle} numberOfLines={1}>{app.bundleIdentifier}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleUpdate} style={[styles.btn, styles.smallBtn]} activeOpacity={0.8}>
            <Text style={styles.smallText}>更新</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={[styles.btn, styles.smallBtn]} activeOpacity={0.8}>
            <Text style={styles.smallText}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRename} style={[styles.btn, styles.smallBtn]} activeOpacity={0.8}>
            <Text style={styles.smallText}>改名</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.btn, styles.smallBtn]} activeOpacity={0.8}>
            <Text style={[styles.smallText, styles.deleteText]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = {
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 7,
  },
  info: { flex: 1, marginRight: 10 },
  icon: { width: 48, height: 48, borderRadius: 10, marginRight: 10 },
  iconPlaceholder: { backgroundColor: '#2C2C2E', alignItems: 'center' as const, justifyContent: 'center' as const },
  iconPlaceholderText: { color: '#8E8E93', fontSize: 20, fontWeight: '600' as const },
  name: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' as const },
  meta: { color: '#8E8E93', fontSize: 13, marginTop: 4 },
  bundle: { color: '#636366', fontSize: 11, marginTop: 2 },
  actions: { alignItems: 'flex-end' as const, gap: 6 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center' as const,
  },
  smallBtn: { backgroundColor: '#2C2C2E', paddingHorizontal: 12, paddingVertical: 5 },
  smallText: { color: '#8E8E93', fontSize: 12 },
  deleteText: { color: '#FF453A' },
};
