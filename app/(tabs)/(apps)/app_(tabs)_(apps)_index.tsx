import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  useColorScheme,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useRouter, Stack } from 'expo-router';
import { useRepoStore } from '../../../store/useRepoStore';
import { useShallow } from 'zustand/react/shallow';
import { isScrollingDown, scrollY } from '../../../store/sharedScroll';
import { AppCard } from '../../../components/AppCard';
import { APP_CARD_HEIGHT } from '../../../components/app-card-visual.types';
import AppCategoryTabs from '../../../components/app-category-tabs';
import FavoriteCard from '../../../components/FavoriteCard';
import { useFavoritesStore } from '../../../services/favorites';
import { RepoApp } from '../../../types/repo';
import { Inbox } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_COLORS, useAppTheme } from '../../../theme/app-preferences';

const CATEGORIES = [
  { id: 'all', label: '全部应用' },
  { id: 'favorites', label: '我的收藏' },
  { id: 'sideloading', label: '侧载应用' },
  { id: 'games', label: '游戏' },
  { id: 'social', label: '社交' },
  { id: 'emu', label: '模拟器' },
  { id: 'movies', label: '影视' },
  { id: 'tools', label: '工具' },
];

const APP_CARD_ROW_HEIGHT = APP_CARD_HEIGHT + 14;
const NOOP = () => {};
const getAppItemLayout = (_: ArrayLike<RepoApp> | null | undefined, index: number) => ({
  length: APP_CARD_ROW_HEIGHT,
  offset: APP_CARD_ROW_HEIGHT * index,
  index,
});

export default function HomeScreen() {
  const router = useRouter();
  const {
    repo,
    isLoading,
    error,
    fetchRepo,
    reorderApps,
    commitChanges,
    isDeveloperMode,
    initializeStore,
    searchQuery,
    accentColor,
  } = useRepoStore(useShallow((state) => ({
    repo: state.repo,
    isLoading: state.isLoading,
    error: state.error,
    fetchRepo: state.fetchRepo,
    reorderApps: state.reorderApps,
    commitChanges: state.commitChanges,
    isDeveloperMode: state.isDeveloperMode,
    initializeStore: state.initializeStore,
    searchQuery: state.searchQuery,
    accentColor: state.accentColor,
  })));
  const theme = useAppTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const toolbarThemeKey = colorScheme === 'dark' ? 'dark' : 'light';

  const [selectedCategory, setSelectedCategory] = useState('all');
  const selectedCategoryRef = useRef(selectedCategory);

  // 我的收藏
  const favorites = useFavoritesStore(s => s.favorites);
  const favoritesLoaded = useFavoritesStore(s => s.loaded);
  const loadFavorites = useFavoritesStore(s => s.load);
  const importFromFile = useFavoritesStore(s => s.importFromFile);
  const importFromUrl = useFavoritesStore(s => s.importFromUrl);
  const importFromListFile = useFavoritesStore(s => s.importFromListFile);
  const exportToFile = useFavoritesStore(s => s.exportToFile);
  const [importing, setImporting] = useState(false);

  useEffect(() => { void loadFavorites(); }, [loadFavorites]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  const commitAfterChange = useCallback(async (successMessage?: string) => {
    try {
      await commitChanges();
      if (successMessage) Alert.alert('已保存到 GitHub', successMessage);
    } catch (error: any) {
      Alert.alert('无法保存到 GitHub',
        error?.message || 'The change has not been committed. Refresh the repository before retrying.',
      );
    }
  }, [commitChanges]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (event.contentOffset.y > 50) {
        if (event.contentOffset.y > scrollY.value + 5) {
          isScrollingDown.value = true;
        } else if (event.contentOffset.y < scrollY.value - 5) {
          isScrollingDown.value = false;
        }
      } else {
        isScrollingDown.value = false;
      }
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    initializeStore().then(() => {
      fetchRepo();
    });
  }, []);

  const handleCommit = async () => {
    if (!isDeveloperMode) {
      Alert.alert('需要验证', '请在设置中配置 GitHub PAT 后再提交更改。', [
        { text: '去设置', onPress: () => router.push('/(tabs)/settings') },
        { text: '取消', style: 'cancel' }
      ]);
      return;
    }

    try {
      await commitChanges();
      Alert.alert('成功', '仓库已更新并推送到 GitHub！');
    } catch (e: any) {
      Alert.alert('提交失败', e.message);
    }
  };

  const matchesCategory = useCallback((app: RepoApp, catId: string) => {
    if (catId === 'all') return true;
    const cat = (app.category || '').toLowerCase();
    const name = (app.name || '').toLowerCase();
    const desc = (app.subtitle || app.localizedDescription || '').toLowerCase();

    if (catId === 'sideloading') {
      return cat.includes('sideload') || cat.includes('sign') ||
        name.includes('sidestore') || name.includes('altstore') || name.includes('scarlet') ||
        name.includes('esign') || name.includes('feather') || name.includes('livecontainer') ||
        desc.includes('sideload') || desc.includes('sign ipa');
    }
    if (catId === 'games') return cat.includes('game') || name.includes('craft') || name.includes('amethyst') || name.includes('game') || desc.includes('game') || desc.includes('minecraft');
    if (catId === 'emu') return cat.includes('emu') || name.includes('dolphin') || name.includes('melon') || name.includes('ppsspp') || name.includes('psx') || name.includes('retro') || desc.includes('emulator');
    if (catId === 'social') return cat.includes('social') || name.includes('enswilde') || name.includes('3105') || desc.includes('social');
    if (catId === 'movies') return cat.includes('movie') || cat.includes('video') || cat.includes('media') || name.includes('movie') || desc.includes('stream') || desc.includes('video');
    if (catId === 'tools') {
      return cat.includes('tool') || cat.includes('utility') ||
        name.includes('filza') || name.includes('trollstore') || name.includes('cowabunga') ||
        name.includes('misaka') || name.includes('nugget') || desc.includes('utility') || desc.includes('tool');
    }

    return cat.includes(catId);
  }, []);

  const filteredApps = useMemo(() => {
    if (!repo?.apps) return [];
    return repo.apps.filter(app => {
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.bundleIdentifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.developerName && app.developerName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      return matchesCategory(app, selectedCategory);
    });
  }, [repo?.apps, selectedCategory, searchQuery, matchesCategory]);

  // Preserve a card's identity and fallback color when the filtered list changes.
  // This lets FlatList recycle unchanged rows instead of re-rendering them by position.
  const appIndexByBundle = useMemo(
    () => new Map(repo?.apps?.map((app, index) => [app.bundleIdentifier, index])),
    [repo?.apps]
  );

  const handleCategorySelect = useCallback((category: string) => {
    // SwiftUI can deliver a second press before React commits the first one.
    // Keep the source of truth in a ref so the same tab cannot queue duplicate
    // category changes or restart the header's glass state.
    if (category === selectedCategoryRef.current) return;
    selectedCategoryRef.current = category;
    setSelectedCategory(category);
  }, []);

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<RepoApp>) => {
      const index = getIndex() ?? 0;
      return (
        <AppCard
          app={item}
          drag={selectedCategory === 'all' ? drag : NOOP}
          isActive={isActive}
          index={appIndexByBundle.get(item.bundleIdentifier) ?? index}
          onOpen={() => router.push({
            pathname: '/(tabs)/(apps)/[bundleIdentifier]',
            params: { bundleIdentifier: item.bundleIdentifier },
          })}
          onEdit={() => router.push({ pathname: '/edit', params: { bundleIdentifier: item.bundleIdentifier } })}
          onDuplicate={() => {
            if (repo) {
              const newApp = JSON.parse(JSON.stringify(item));
              newApp.bundleIdentifier = `${newApp.bundleIdentifier}.copy`;
              newApp.name = `${newApp.name} (Copy)`;
              useRepoStore.getState().duplicateApp(item.bundleIdentifier, newApp);
              void commitAfterChange(`${newApp.name} was added to repo.json.`);
            }
          }}
          onDelete={() => {
            Alert.alert('删除应用', `确定要删除 ${item.name} 吗？`, [
              { text: '取消', style: 'cancel' },
              {
                text: '删除',
                style: 'destructive',
                onPress: () => {
                  useRepoStore.getState().deleteApp(item.bundleIdentifier);
                  void commitAfterChange(`${item.name} was removed from repo.json.`);
                },
              },
            ]);
          }}
        />
      );
    },
    [appIndexByBundle, commitAfterChange, repo, router, selectedCategory]
  );

  const renderPlainItem = useCallback(
    ({ item, index }: { item: RepoApp; index: number }) => {
      return (
        <AppCard
          app={item}
          drag={NOOP}
          isActive={false}
          index={appIndexByBundle.get(item.bundleIdentifier) ?? index}
          onOpen={() => router.push({
            pathname: '/(tabs)/(apps)/[bundleIdentifier]',
            params: { bundleIdentifier: item.bundleIdentifier },
          })}
          onEdit={() => router.push({ pathname: '/edit', params: { bundleIdentifier: item.bundleIdentifier } })}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      );
    },
    [appIndexByBundle, router]
  );

  const handleImportFile = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const fav = await importFromFile();
      if (fav) Alert.alert('已收藏', `「${fav.name}」已加入我的收藏。`);
    } catch (e: any) {
      Alert.alert('导入失败', e?.message || '无法导入该文件。');
    } finally {
      setImporting(false);
    }
  }, [importing, importFromFile]);

  const handleImportUrl = useCallback(() => {
    Alert.prompt('从链接导入', '粘贴 IPA 下载直链', [
      { text: '取消', style: 'cancel' },
      {
        text: '导入',
        onPress: async (url?: string) => {
          const u = (url || '').trim();
          if (!u) return;
          if (importing) return;
          setImporting(true);
          try {
            const fav = await importFromUrl(u);
            if (fav) Alert.alert('已收藏', `「${fav.name}」已加入我的收藏。`);
          } catch (e: any) {
            Alert.alert('导入失败', e?.message || '无法下载该链接。');
          } finally {
            setImporting(false);
          }
        },
      },
    ], 'plain-text', 'https://');
  }, [importing, importFromUrl]);

  const handleImportListFile = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const n = await importFromListFile();
      if (n) Alert.alert('批量导入完成', `成功导入 ${n} 个应用。`);
    } catch (e: any) {
      Alert.alert('导入失败', e?.message || '无法解析该文件。');
    } finally {
      setImporting(false);
    }
  }, [importing, importFromListFile]);

  const handleExport = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      await exportToFile();
    } catch (e: any) {
      Alert.alert('导出失败', e?.message || '无法导出收藏。');
    } finally {
      setImporting(false);
    }
  }, [importing, exportToFile]);

  const isFavorites = selectedCategory === 'favorites';

  const favoritesHeader = useMemo(() => (
    <View>
      <AppCategoryTabs
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        accentColor={ACCENT_COLORS[accentColor].value}
      />
      <Text
        selectable
        style={[styles.categoryCount, { color: theme.secondaryLabel }]}
      >
        {favorites.length} 个收藏
      </Text>
      <View style={styles.importRow}>
        <TouchableOpacity
          onPress={handleImportFile}
          disabled={importing}
          style={[styles.importBtn, importing && styles.importBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={styles.importBtnText}>{importing ? '导入中…' : '＋ 导入 IPA'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleImportUrl}
          disabled={importing}
          style={[styles.importBtn, styles.importBtnSecondary, importing && styles.importBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={[styles.importBtnText, styles.importBtnTextSecondary]}>链接导入</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.importRow}>
        <TouchableOpacity
          onPress={handleImportListFile}
          disabled={importing}
          style={[styles.importBtn, styles.importBtnSecondary, importing && styles.importBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={[styles.importBtnText, styles.importBtnTextSecondary]}>批量导入（txt 清单）</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleExport}
          disabled={importing || !favorites.length}
          style={[styles.importBtn, styles.importBtnSecondary, (importing || !favorites.length) && styles.importBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={[styles.importBtnText, styles.importBtnTextSecondary]}>导出清单</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [accentColor, favorites.length, handleCategorySelect, handleExport, handleImportFile, handleImportListFile, handleImportUrl, importing, selectedCategory, theme.secondaryLabel]);

  const FavoritesEmpty = () => (
    <View style={styles.emptyContainer}>
      {Platform.OS === 'ios' ? (
        <SymbolView name="star" tintColor="#8E8E93" size={44} fallback="Inbox" />
      ) : (
        <Inbox size={40} color="#8E8E93" />
      )}
      <Text style={styles.emptyTitle}>还没有收藏</Text>
      <Text style={styles.emptySubtitle}>导入本地 IPA 文件，或从下载链接导入，统一在这里管理安装。</Text>
    </View>
  );

  const currentCategoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || 'All Apps';

  const categoryTabs = useMemo(() => (
    <View>
      <AppCategoryTabs
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        accentColor={ACCENT_COLORS[accentColor].value}
      />
      <Text
        selectable
        style={[styles.categoryCount, { color: theme.secondaryLabel }]}
      >
        {filteredApps.length} 个应用
      </Text>
    </View>
  ), [accentColor, filteredApps.length, handleCategorySelect, selectedCategory, theme.secondaryLabel]);

  // NativeTabs floats above scrolling content. Reserve the visual tab bar and
  // home-indicator area so the final app card can scroll fully into view.
  const listContentStyle = useMemo(() => [
    styles.listContent,
    { paddingBottom: Math.max(170, safeAreaInsets.bottom + 136) },
  ], [safeAreaInsets.bottom]);

  const ListEmpty = () => {
    if (isLoading && !repo) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0088FF" />
          <Text style={styles.loadingText}>正在加载仓库…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchRepo} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        {Platform.OS === 'ios' ? (
          <SymbolView name="tray" tintColor="#8E8E93" size={44} fallback="Inbox" />
        ) : (
          <Inbox size={40} color="#8E8E93" />
        )}
        <Text style={styles.emptyTitle}>No Apps in {currentCategoryLabel}</Text>
        <Text style={styles.emptySubtitle}>
          {isDeveloperMode
            ? 'Tap "+" in the bottom bar to add or upload an application to this category.'
            : 'There are currently no applications hosted under this category.'}
        </Text>
        <TouchableOpacity onPress={() => handleCategorySelect('all')} style={styles.showAllBtn} activeOpacity={0.8}>
          <Text style={styles.showAllBtnText}>显示全部应用 ({repo?.apps?.length || 0})</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {isFavorites ? (
        <Animated.FlatList
          style={[styles.list, { backgroundColor: theme.background }]}
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FavoriteCard app={item} />}
          ListHeaderComponent={favoritesHeader}
          ListEmptyComponent={FavoritesEmpty}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        />
      ) : isDeveloperMode ? (
        <DraggableFlatList
          containerStyle={[styles.list, { backgroundColor: theme.background }]}
          data={filteredApps}
          onDragEnd={({ data }) => {
            reorderApps(data);
            void commitAfterChange('The app order was saved to repo.json.');
          }}
          keyExtractor={item => item.bundleIdentifier}
          getItemLayout={getAppItemLayout}
          renderItem={renderDraggableItem}
          ListHeaderComponent={categoryTabs}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          initialNumToRender={7}
          maxToRenderPerBatch={7}
          updateCellsBatchingPeriod={16}
          windowSize={5}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        />
      ) : (
        <Animated.FlatList
          style={[styles.list, { backgroundColor: theme.background }]}
          data={filteredApps}
          keyExtractor={(item: RepoApp) => item.bundleIdentifier}
          getItemLayout={getAppItemLayout}
          renderItem={renderPlainItem}
          ListHeaderComponent={categoryTabs}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          initialNumToRender={7}
          maxToRenderPerBatch={7}
          updateCellsBatchingPeriod={16}
          windowSize={5}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        />
      )}
      <Stack.Toolbar key={`refresh-${toolbarThemeKey}`} placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="刷新仓库"
          icon="arrow.clockwise"
          onPress={fetchRepo}
        />
      </Stack.Toolbar>
      <Stack.Toolbar key={`actions-${toolbarThemeKey}`} placement="right">
        <Stack.Toolbar.Button icon="arrow.triangle.2.circlepath" onPress={fetchRepo} />
        <Stack.Toolbar.Button icon="externaldrive" onPress={handleCommit} />
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    paddingBottom: 170,
  },
  categoryCount: {
    marginLeft: 16,
    marginTop: -4,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  importRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  importBtn: {
    flex: 1,
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  importBtnSecondary: {
    backgroundColor: '#2C2C2E',
  },
  importBtnDisabled: {
    opacity: 0.5,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  importBtnTextSecondary: {
    color: '#0A84FF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : 'System',
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : 'System',
    fontSize: 13.5,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  showAllBtn: {
    backgroundColor: '#0088FF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
  showAllBtnText: {
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : 'System',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
