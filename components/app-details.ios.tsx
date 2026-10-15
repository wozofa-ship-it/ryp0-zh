import React from 'react';
import { Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Color, Stack, useRouter } from 'expo-router';
import { Host } from '@expo/ui';
import {
  Button,
  Form,
  HStack,
  Image,
  LabeledContent,
  Section,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  listRowSeparator,
  listSectionSpacing,
  listStyle,
  opacity,
  padding,
  resizable,
  tint,
  truncationMode,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useRepoStore } from '../store/useRepoStore';
import type { RepoApp, RepoVersion } from '../types/repo';
import { installInLiveContainer } from '../services/livecontainer';
import { getAppStatus, getAppStatusKey, getAppUpdatePolicy } from '../services/app-status';
import { getAppGitHubProjectUrl } from '../services/app-project';
import { requireSafeExternalHttpsUrl } from '../services/safe-url';
import { decodeDescription } from '../services/translate';

const SECONDARY = { type: 'hierarchical', style: 'secondary' } as const;
const TERTIARY = { type: 'hierarchical', style: 'tertiary' } as const;

interface AppDetailsProps {
  app: RepoApp;
}

function sectionHeader(title: string) {
  return (
    <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(SECONDARY)]}>
      {title}
    </Text>
  );
}

function formatFileSize(size?: number) {
  if (!size || size < 0) return 'Size unavailable';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const amount = size / Math.pow(1024, exponent);
  const digits = amount >= 10 || exponent === 0 ? 0 : 1;

  return `${amount.toFixed(digits)} ${units[exponent]}`;
}

function formatReleaseDate(date?: string) {
  if (!date) return '未知时间';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  const y = parsedDate.getFullYear();
  const m = parsedDate.getMonth() + 1;
  const d = parsedDate.getDate();
  let h = parsedDate.getHours();
  const min = String(parsedDate.getMinutes()).padStart(2, '0');

  // 中文时段：凌晨/上午/中午/下午/晚上
  let period = '';
  if (h < 6) period = '凌晨';
  else if (h < 12) period = '上午';
  else if (h < 14) period = '中午';
  else if (h < 18) period = '下午';
  else period = '晚上';

  return `${y}年${m}月${d}日 ${period}${h}:${min}`;
}

function versionSummary(version: RepoVersion) {
  return [
    formatReleaseDate(version.date),
    formatFileSize(version.size),
    version.minOSVersion ? `iOS ${version.minOSVersion}+` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function AppDetails({ app }: AppDetailsProps) {
  const router = useRouter();
  const isDeveloperMode = useRepoStore((state) => state.isDeveloperMode);
  const installApp = useRepoStore((state) => state.installApp);
  const runtimeStatus = useRepoStore((state) => state.runtimeAppStatuses[getAppStatusKey(app)]);
  const latestVersion = app.versions[0];
  const appStatus = getAppStatus(app, runtimeStatus ?? app.status);
  const appDescription = decodeDescription(app.localizedDescription || app.subtitle || '暂无此应用的描述。');
  const githubProjectUrl = getAppGitHubProjectUrl(app);

  const handleInstall = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await installApp(app);
    } catch (error: any) {
      Alert.alert('安装', error?.message || '无法打开下载链接。');
    }
  };

  const handleVersionDownload = async (version: RepoVersion) => {
    try {
      await Haptics.selectionAsync();
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

  const handleInstallInLiveContainer = async (version: RepoVersion) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await installInLiveContainer(version);
    } catch (error: any) {
      Alert.alert('LiveContainer', error?.message || '无法将此 IPA 交给 LiveContainer。');
    }
  };

  const handleOpenGitHub = async () => {
    if (!githubProjectUrl) return;
    try {
      await Haptics.selectionAsync();
      await Linking.openURL(requireSafeExternalHttpsUrl(githubProjectUrl, 'GitHub project link'));
    } catch (error: any) {
      Alert.alert('GitHub', error?.message || 'Unable to open this app’s GitHub page.');
    }
  };

  const handleEdit = () => {
    router.push({ pathname: '/edit', params: { bundleIdentifier: app.bundleIdentifier } });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: app.name,
          headerLargeTitle: false,
          headerLargeTitleEnabled: false,
          headerLargeTitleShadowVisible: false,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: Color.ios.systemGroupedBackground },
          contentStyle: { backgroundColor: Color.ios.systemGroupedBackground },
        }}
      />
      <Stack.Title>{app.name}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={`Install ${app.name}`}
          icon="arrow.down.circle"
          onPress={handleInstall}
        />
        {isDeveloperMode ? (
          <Stack.Toolbar.Button
            accessibilityLabel={`Edit ${app.name}`}
            icon="square.and.pencil"
            onPress={handleEdit}
          />
        ) : null}
      </Stack.Toolbar>

      <Host style={{ flex: 1 }}>
        <Form modifiers={[listStyle('insetGrouped'), listSectionSpacing(10)]}>
          <Section modifiers={[listRowBackground('clear'), listRowSeparator('hidden')]}>
            <HStack spacing={16} modifiers={[padding({ vertical: 8 })]}>
              <ZStack modifiers={[frame({ width: 88, height: 88 })]}>
                {app.iconURL ? (
                  <Image
                    uiImage={app.iconURL}
                    modifiers={[
                      resizable(),
                      aspectRatio({ contentMode: 'fill' }),
                      frame({ width: 88, height: 88 }),
                      clipShape('roundedRectangle', 20),
                    ]}
                  />
                ) : (
                  <Image
                    systemName="app.fill"
                    size={32}
                    color={Color.ios.secondaryLabel}
                    modifiers={[
                      frame({ width: 88, height: 88 }),
                      background(Color.ios.tertiarySystemFill, shapes.roundedRectangle({ cornerRadius: 20 })),
                    ]}
                  />
                )}
              </ZStack>
              <VStack
                alignment="leading"
                spacing={4}
                modifiers={[frame({ maxWidth: 1000, alignment: 'leading' })]}
              >
                <Text
                  modifiers={[
                    font({ size: 24, weight: 'bold' }),
                    lineLimit(2),
                    truncationMode('tail'),
                  ]}
                >
                  {app.name}
                </Text>
                <Text modifiers={[font({ size: 15 }), foregroundStyle(SECONDARY), lineLimit(1), truncationMode('tail')]}>
                  {app.developerName || '未知开发者'}
                </Text>
                {latestVersion ? (
                  <VStack alignment="leading" spacing={1}>
                    <Text modifiers={[font({ size: 14 }), foregroundStyle(SECONDARY)]}>
                      版本 {latestVersion.version}
                    </Text>
                    <Text modifiers={[font({ size: 13 }), foregroundStyle(TERTIARY)]}>
                      发布于 {formatReleaseDate(latestVersion.date)}
                    </Text>
                  </VStack>
                ) : null}
              </VStack>
            </HStack>
          </Section>

          {latestVersion || githubProjectUrl ? (
            <Section modifiers={[listRowBackground(Color.ios.secondarySystemGroupedBackground)]}>
              {latestVersion ? (
                <>
                  <Button
                    label="安装最新版本"
                    systemImage="arrow.down.circle.fill"
                    onPress={handleInstall}
                    modifiers={[buttonStyle('borderedProminent'), tint(Color.ios.systemBlue)]}
                  />
                  <Button
                    label="在 LiveContainer 中安装"
                    systemImage="shippingbox.fill"
                    onPress={() => void handleInstallInLiveContainer(latestVersion)}
                    modifiers={[buttonStyle('bordered')]}
                  />
                </>
              ) : null}
              {githubProjectUrl ? (
                <Button
                  label="在 GitHub 查看"
                  systemImage="arrow.up.right.square"
                  onPress={() => void handleOpenGitHub()}
                  modifiers={[buttonStyle('bordered')]}
                />
              ) : null}
              {latestVersion ? (
                <Text modifiers={[font({ size: 13 }), foregroundStyle(SECONDARY)]}>
                  {`Version ${latestVersion.version} · Released ${formatReleaseDate(latestVersion.date)}`}
                </Text>
              ) : null}
            </Section>
          ) : null}

          <Section
            header={sectionHeader('应用信息')}
            modifiers={[listRowBackground(Color.ios.secondarySystemGroupedBackground)]}
          >
            <LabeledContent label="应用类型">
              <Text modifiers={[font({ weight: 'semibold' }), foregroundStyle(SECONDARY)]}>
                {getAppUpdatePolicy(app) === 'daily' ? '每日更新' : '静态'}
              </Text>
            </LabeledContent>
            <LabeledContent label="状态">
              <HStack spacing={6}>
                <Image systemName={appStatus.symbol} size={14} color={appStatus.color} />
                <Text modifiers={[foregroundStyle(appStatus.color), font({ weight: 'semibold' })]}>{appStatus.label}</Text>
              </HStack>
            </LabeledContent>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(SECONDARY)]}>
              {appStatus.message || appStatus.detail}
              {appStatus.checkedAt ? ` · 检查于 ${formatReleaseDate(appStatus.checkedAt)}` : ''}
            </Text>
            <LabeledContent label="开发者">
              <Text modifiers={[foregroundStyle(SECONDARY), lineLimit(1), truncationMode('tail')]}>
                {app.developerName || 'Unknown'}
              </Text>
            </LabeledContent>
            <LabeledContent label="分类">
              <Text modifiers={[foregroundStyle(SECONDARY)]}>{app.category || 'Uncategorized'}</Text>
            </LabeledContent>
            <LabeledContent label="Bundle ID">
              <Text modifiers={[foregroundStyle(SECONDARY), lineLimit(1), truncationMode('middle')]}>
                {app.bundleIdentifier}
              </Text>
            </LabeledContent>
            {latestVersion ? (
              <LabeledContent label="最新版本">
                <Text modifiers={[foregroundStyle(SECONDARY)]}>{latestVersion.version}</Text>
              </LabeledContent>
            ) : null}
            {latestVersion ? (
              <LabeledContent label="发布时间">
                <Text modifiers={[foregroundStyle(SECONDARY)]}>{formatReleaseDate(latestVersion.date)}</Text>
              </LabeledContent>
            ) : null}
          </Section>

          <Section
            header={sectionHeader('描述')}
            modifiers={[listRowBackground(Color.ios.secondarySystemGroupedBackground)]}
          >
            <Text modifiers={[foregroundStyle(SECONDARY)]}>{appDescription}</Text>
          </Section>

          <Section
            header={sectionHeader(`版本 (${app.versions.length})`)}
            modifiers={[listRowBackground(Color.ios.secondarySystemGroupedBackground)]}
          >
            {app.versions.length ? (
              app.versions.map((version, index) => (
                <Button
                  key={`${version.version}-${version.date}-${index}`}
                  onPress={() => void handleVersionDownload(version)}
                  modifiers={[buttonStyle('plain')]}
                >
                  <HStack spacing={12}>
                    <VStack
                      alignment="leading"
                      spacing={2}
                      modifiers={[frame({ maxWidth: 1000, alignment: 'leading' })]}
                    >
                      <Text modifiers={[font({ size: 17, weight: 'semibold' })]}>{version.version}</Text>
                      <Text
                        modifiers={[
                          font({ size: 14 }),
                          foregroundStyle(SECONDARY),
                          lineLimit(1),
                          truncationMode('tail'),
                        ]}
                      >
                        {versionSummary(version)}
                      </Text>
                      {version.localizedDescription ? (
                        <Text
                          modifiers={[
                            font({ size: 13 }),
                            foregroundStyle(TERTIARY),
                            lineLimit(2),
                            truncationMode('tail'),
                          ]}
                        >
                          {version.localizedDescription}
                        </Text>
                      ) : null}
                    </VStack>
                    <Spacer />
                    <Image systemName="arrow.down.circle.fill" size={20} color={Color.ios.systemBlue} />
                  </HStack>
                </Button>
              ))
            ) : (
              <Text modifiers={[foregroundStyle(SECONDARY)]}>暂无可用版本。</Text>
            )}
          </Section>

          {app.appPermissions?.entitlements?.length || app.appPermissions?.privacy ? (
            <Section
              header={sectionHeader('权限')}
              modifiers={[listRowBackground(Color.ios.secondarySystemGroupedBackground)]}
            >
              {app.appPermissions?.entitlements?.map((entitlement) => (
                <HStack key={entitlement}>
                  <Text modifiers={[lineLimit(1), truncationMode('middle')]}>{entitlement}</Text>
                  <Spacer />
                  <Image systemName="checkmark.seal" size={16} color={Color.ios.systemGreen} />
                </HStack>
              ))}
              {Object.entries(app.appPermissions?.privacy ?? {}).map(([key, value]) => (
                <LabeledContent key={key} label={key}>
                  <Text modifiers={[foregroundStyle(SECONDARY), lineLimit(1), truncationMode('tail')]}>
                    {value}
                  </Text>
                </LabeledContent>
              ))}
            </Section>
          ) : null}
        </Form>
      </Host>
    </>
  );
}
