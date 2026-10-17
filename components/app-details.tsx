import React from 'react';
import { Alert, Linking, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button, FieldGroup, Host, ListItem, Text } from '@expo/ui';
import { useRepoStore } from '../store/useRepoStore';
import type { RepoApp, RepoVersion } from '../types/repo';
import { installInLiveContainer } from '../services/livecontainer';
import { getAppStatus, getAppStatusKey, getAppUpdatePolicy } from '../services/app-status';
import { getAppGitHubProjectUrl } from '../services/app-project';
import { requireSafeExternalHttpsUrl } from '../services/safe-url';
import { useTranslatedText } from '../hooks/useTranslatedText';
import { useFavoritesStore } from '../services/favorites';

interface AppDetailsProps {
  app: RepoApp;
}

function formatFileSize(size?: number) {
  if (!size || size < 0) return 'Size unavailable';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const amount = size / Math.pow(1024, exponent);
  return `${amount.toFixed(amount >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export default function AppDetails({ app }: AppDetailsProps) {
  const router = useRouter();
  const isDeveloperMode = useRepoStore((state) => state.isDeveloperMode);
  const installApp = useRepoStore((state) => state.installApp);
  const runtimeStatus = useRepoStore((state) => state.runtimeAppStatuses[getAppStatusKey(app)]);
  const latestVersion = app.versions[0];
  const appStatus = getAppStatus(app, runtimeStatus ?? app.status);
  const githubProjectUrl = getAppGitHubProjectUrl(app);
  const translatedDesc = useTranslatedText(app.localizedDescription || app.subtitle || 'No description has been provided for this app.');

  const handleInstall = async () => {
    try {
      await installApp(app);
    } catch (error: any) {
      Alert.alert('安装', error?.message || '无法打开下载链接。');
    }
  };

  const handleVersionDownload = async (version: RepoVersion) => {
    try {
      const safeUrl = requireSafeExternalHttpsUrl(version.downloadURL, 'This version download link');
      // 先下载到本地再打开：修复 Safari 直接下载 IPA 报 "Cannot create file" 的问题
      const { File, Paths } = await import('expo-file-system');
      const fileName = `ryp0-${Date.now()}.ipa`;
      const destination = new File(Paths.cache, fileName);
      const downloaded = await File.downloadFileAsync(safeUrl, destination);
      await Linking.openURL(downloaded.uri);
    } catch (error: any) {
      Alert.alert('下载', error?.message || '无法打开此版本下载链接。');
    }
  };

  const handleInstallInLiveContainer = async () => {
    if (!latestVersion) return;
    try {
      await installInLiveContainer(latestVersion);
    } catch (error: any) {
      Alert.alert('LiveContainer', error?.message || '无法将此 IPA 交给 LiveContainer。');
    }
  };

  const handleOpenGitHub = async () => {
    if (!githubProjectUrl) return;
    try {
      await Linking.openURL(requireSafeExternalHttpsUrl(githubProjectUrl, 'GitHub project link'));
    } catch (error: any) {
      Alert.alert('GitHub', error?.message || 'Unable to open this app’s GitHub page.');
    }
  };

  const handleFavorite = async () => {
    try {
      const addRepoApp = useFavoritesStore.getState().addRepoApp;
      const latest = latestVersion || app.versions[0];
      const result = await addRepoApp({
        name: app.name,
        bundleIdentifier: app.bundleIdentifier,
        version: latest?.version || app.version || '',
        downloadURL: latest?.downloadURL || '',
        size: latest?.size,
      });
      if (result) {
        Alert.alert('已收藏', `「${app.name}」已加入我的收藏。`);
      } else {
        Alert.alert('收藏', '已在收藏中。');
      }
    } catch (e: any) {
      Alert.alert('收藏失败', e?.message || '无法收藏');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: app.name, headerLargeTitle: false, headerLargeTitleEnabled: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        <Host style={{ minHeight: 700 + app.versions.length * 72, width: '100%' }}>
          <FieldGroup>
            <FieldGroup.Section title="应用信息">
              <ListItem trailing={<Text>{getAppUpdatePolicy(app) === 'daily' ? 'Daily Update' : 'Static'}</Text>}><Text>应用类型</Text></ListItem>
              <ListItem supportingText={appStatus.message || appStatus.detail} trailing={<Text>{appStatus.label}</Text>}><Text>状态</Text></ListItem>
              <ListItem supportingText={app.developerName || 'Unknown developer'}>
                <Text>{app.name}</Text>
              </ListItem>
              <ListItem trailing={<Text>{app.category || 'Uncategorized'}</Text>}>
                <Text>分类</Text>
              </ListItem>
              <ListItem supportingText={app.bundleIdentifier}>
                <Text>Bundle ID</Text>
              </ListItem>
              {latestVersion ? (
                <ListItem trailing={<Text>{latestVersion.version}</Text>}>
                  <Text>最新版本</Text>
                </ListItem>
              ) : null}
            </FieldGroup.Section>

            <FieldGroup.Section title="描述">
              <ListItem supportingText={translatedDesc}>
                <Text>{app.subtitle || 'About this app'}</Text>
              </ListItem>
            </FieldGroup.Section>

            <FieldGroup.Section title={`Versions (${app.versions.length})`}>
              {app.versions.map((version, index) => (
                <ListItem
                  key={`${version.version}-${version.date}-${index}`}
                  onPress={() => void handleVersionDownload(version)}
                  supportingText={[version.date, formatFileSize(version.size), version.minOSVersion ? `iOS ${version.minOSVersion}+` : null].filter(Boolean).join(' · ')}
                  trailing={<Text>下载</Text>}
                >
                  <Text>{version.version}</Text>
                </ListItem>
              ))}
            </FieldGroup.Section>

            <FieldGroup.Section>
              <Button onPress={handleInstall}><Text>安装最新版本</Text></Button>
              {latestVersion ? <Button onPress={() => void handleInstallInLiveContainer()}><Text>在 LiveContainer 中安装</Text></Button> : null}
              {githubProjectUrl ? <Button onPress={() => void handleOpenGitHub()}><Text>在 GitHub 查看</Text></Button> : null}
              <Button onPress={() => void handleFavorite()}><Text>收藏应用</Text></Button>
              {isDeveloperMode ? (
                <Button onPress={() => router.push({ pathname: '/edit', params: { bundleIdentifier: app.bundleIdentifier } })} variant="text">
                  <Text>编辑应用</Text>
                </Button>
              ) : null}
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      </ScrollView>
    </>
  );
}
