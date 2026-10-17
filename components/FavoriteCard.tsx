import React, { useCallback } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
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

  const handleInstall = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('安装', `如何安装「${app.name}」？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '直接打开',
          onPress: async () => {
            try {
              await Linking.openURL(app.fileUri);
            } catch (e: any) {
              Alert.alert('安装', e?.message || '无法打开本地 IPA 文件。');
            }
          },
        },
        {
          text: '用 LiveContainer 安装',
          onPress: async () => {
            try {
              // 有远程 URL 的收藏（从仓库加的/从链接导入的）直接跳 LiveContainer
              if (app.sourceUrl && /^https?:\/\//i.test(app.sourceUrl)) {
                const { Linking } = await import('react-native');
                const isInstalled = await Linking.canOpenURL('livecontainer://install');
                if (!isInstalled) {
                  throw new Error('未安装 LiveContainer，请先安装。');
                }
                await Linking.openURL(`livecontainer://install?url=${encodeURIComponent(app.sourceUrl)}`);
                return;
              }
              // 本地文件走系统分享通道，用户在分享页选 LiveContainer
              const Sharing = await import('expo-sharing');
              if (!(await Sharing.isAvailableAsync())) {
                throw new Error('当前设备不支持分享');
              }
              await Sharing.shareAsync(app.fileUri, {
                dialogTitle: `用 LiveContainer 安装 ${app.name}`,
              });
            } catch (e: any) {
              Alert.alert('LiveContainer 安装', e?.message || '无法分享到 LiveContainer，请确认已安装 LiveContainer。');
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('安装', e?.message || '无法打开本地 IPA 文件。');
    }
  }, [app.fileUri, app.name]);

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
    <View style={styles.card}>
      {app.iconUri ? (
        <Image source={{ uri: app.iconUri }} style={styles.icon} contentFit='cover' />
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
        <TouchableOpacity onPress={handleInstall} style={[styles.btn, styles.installBtn]} activeOpacity={0.8}>
          <Text style={styles.installText}>安装</Text>
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
  installBtn: { backgroundColor: '#0A84FF' },
  installText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
  smallBtn: { backgroundColor: '#2C2C2E', paddingHorizontal: 12, paddingVertical: 5 },
  smallText: { color: '#8E8E93', fontSize: 12 },
  deleteText: { color: '#FF453A' },
};
