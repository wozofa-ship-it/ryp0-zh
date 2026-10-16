import React, { useCallback, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { Button, FieldGroup, Host, ListItem, Picker, Text, TextInput, useNativeState } from '@expo/ui';
import { Image } from 'expo-image';

import { useRepoStore } from '../../../store/useRepoStore';
import { ADMIN_GITHUB_LOGIN, isAdminGitHubLogin } from '../../../services/github-api';
import { isAdminBuild } from '../../../services/build-variant';
import {
  ACCENT_COLORS,
  AccentColor,
  AppearancePreference,
} from '../../../theme/app-preferences';


const DISCORD_URL = 'https://discord.gg/6r2Eax4c5j';
const YOUTUBE_URL = 'https://www.youtube.com/@ry0_Offical';
const OWNER_GITHUB_URL = `https://github.com/${ADMIN_GITHUB_LOGIN}`;

type SettingsSymbolName =
  | 'arrow.up.right'
  | 'checkmark.shield.fill'
  | 'circle.lefthalf.filled'
  | 'faceid'
  | 'key.fill'
  | 'message.fill'
  | 'paintpalette.fill'
  | 'person.crop.circle.fill'
  | 'play.rectangle.fill'
  | 'shield.fill';

function SettingsSymbol({
  name,
  color,
  size = 21,
}: {
  name: SettingsSymbolName;
  color: string;
  size?: number;
}) {
  return (
    <Image
      source={`sf:${name}`}
      contentFit="contain"
      tintColor={color}
      style={{ width: size, height: size }}
    />
  );
}

function DisclosureSymbol({ color }: { color: string }) {
  return <SettingsSymbol name="arrow.up.right" color={color} size={17} />;
}

export default function Settings() {
  const {
    hasGitHubCredential,
    githubLogin,
    setGithubToken,
    isDeveloperMode,
    isAuthenticating,
    authError,
    credentialProtection,
    initializeStore,
    appearancePreference,
    accentColor,
    setAppearancePreference,
    setAccentColor,
  } = useRepoStore();
  const token = useNativeState('');

  useEffect(() => {
    void initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    // A stored PAT should never be copied back into a visible form field.
    if (!hasGitHubCredential) {
      token.value = '';
    }
  }, [hasGitHubCredential, token]);

  const handleChangeText = useCallback((value: string) => {
    'worklet';
    token.value = value;
  }, [token]);

  const handleSave = async () => {
    const submittedToken = token.value.trim();
    if (!submittedToken) {
      Alert.alert('需要 Token', '输入 GitHub Token 以验证或替换开发者模式凭证。');
      return;
    }

    try {
      const account = await setGithubToken(submittedToken);
      token.value = '';
      Alert.alert('开发者模式已启用',
        `GitHub verified @${account?.login ?? 'your account'} can manage the ryP0 catalog, releases, and private automation.`,
      );
    } catch (error: any) {
      Alert.alert('验证失败', error?.message || 'GitHub 无法验证此 Token。');
    }
  };

  const handleSignOut = () => {
    Alert.alert('退出开发者模式？',
      'This removes the stored developer credential from this device and returns the app to read-only mode.',
      [
        { text: '取消', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void setGithubToken('').then(() => {
              token.value = '';
              Alert.alert('只读模式', '开发者凭证已从此设备移除。');
            }).catch((error: any) => {
              Alert.alert('退出失败', error?.message || '无法移除开发者凭证。');
            });
          },
        },
      ],
    );
  };

  const handleOpenLink = async (url: string, title: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('无法打开链接', `${title} could not be opened on this device.`);
    }
  };

  const credentialProtectionText = credentialProtection?.protection === 'face-id'
    ? 'Face ID protects this device’s saved developer token.'
    : credentialProtection?.protection === 'touch-id'
      ? 'Touch ID protects this device’s saved developer token.'
      : credentialProtection?.isExpoGo
        ? 'Stored in the iOS Keychain. Face ID activates in a development or production build.'
        : 'Stored in the device Keychain. Set up Face ID or Touch ID to add biometric protection.';
  const accentValue = ACCENT_COLORS[accentColor].value;
  // Show the single supported owner account up front without implying that a
  // credential is already connected. A verified login replaces this label.
  const accountLabel = `@${githubLogin ?? ADMIN_GITHUB_LOGIN}`;
  // GitHub logins are case-insensitive. Keep this display guard aligned with
  // token validation so an owner account is never shown as merely generic
  // repository access due to a capitalization difference in the API response.
  const isOwnerAccount = isAdminGitHubLogin(githubLogin);
  const accountDetail = isAuthenticating
    ? 'Checking GitHub repository access…'
    : isDeveloperMode
      ? isOwnerAccount
        ? `${ADMIN_GITHUB_LOGIN} · verified repository access`
        : 'Verified repository write access'
      : `Not connected · add a ${ADMIN_GITHUB_LOGIN} token to enable edits`;
  const profileUrl = githubLogin ? `https://github.com/${githubLogin}` : OWNER_GITHUB_URL;

  return (
    <Host
      style={{ flex: 1, width: '100%' }}
      colorScheme={appearancePreference === 'system' ? undefined : appearancePreference}
      seedColor={accentValue}
    >
      <FieldGroup>
        <FieldGroup.Section title="偏好设置">
          <ListItem
            leading={<SettingsSymbol name="circle.lefthalf.filled" color={accentValue} />}
            trailing={
              <Picker<AppearancePreference>
                selectedValue={appearancePreference}
                onValueChange={(value) => void setAppearancePreference(value)}
                appearance="menu"
              >
                <Picker.Item label="跟随系统" value="system" />
                <Picker.Item label="浅色" value="light" />
                <Picker.Item label="深色" value="dark" />
              </Picker>
            }
          >
            <Text>外观</Text>
          </ListItem>
          <ListItem
            leading={<SettingsSymbol name="paintpalette.fill" color={accentValue} />}
            trailing={
              <Picker<AccentColor>
                selectedValue={accentColor}
                onValueChange={(value) => void setAccentColor(value)}
                appearance="menu"
              >
                {Object.entries(ACCENT_COLORS).map(([value, option]) => (
                  <Picker.Item key={value} label={option.label} value={value as AccentColor} />
                ))}
              </Picker>
            }
          >
            <Text>主题色</Text>
          </ListItem>
        </FieldGroup.Section>

        {isAdminBuild ? (
          <FieldGroup.Section title="开发者权限">
            <ListItem
              leading={<SettingsSymbol name={isDeveloperMode ? 'checkmark.shield.fill' : 'shield.fill'} color={isDeveloperMode ? '#34C759' : accentValue} />}
              supportingText={isDeveloperMode ? 'Editing and workflow controls are available on this device.' : 'Browse, search, and submit requests without repository write access.'}
            >
              <Text>{isDeveloperMode ? 'Developer Mode is enabled' : 'Consumer Mode (read-only)'}</Text>
            </ListItem>
            <TextInput
              value={token}
              onChangeText={handleChangeText}
              placeholder={hasGitHubCredential ? 'Enter a replacement GitHub token' : 'Enter Token'}
              secureTextEntry
            />
            <Button onPress={handleSave} disabled={isAuthenticating}>
              <Text>{isAuthenticating ? 'Verifying GitHub…' : isDeveloperMode ? 'Validate & Replace Token' : 'Validate & Enable Developer Mode'}</Text>
            </Button>
            {isDeveloperMode ? (
              <Button onPress={handleSignOut} disabled={isAuthenticating}>
                <Text>退出开发者模式</Text>
              </Button>
            ) : null}
            <FieldGroup.SectionFooter>
              <Text>开发者模式验证对独立目录、版本和私有自动化仓库的写入权限。保存的凭证仅存于本机，可用时受 Face ID 保护。</Text>
              {authError ? <Text>{authError}</Text> : null}
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        ) : (
          <FieldGroup.Section title="公开构建">
            <ListItem
              leading={<SettingsSymbol name="shield.fill" color={accentValue} />}
              supportingText="This consumer build cannot save GitHub credentials or open catalog-management tools."
            >
              <Text>只读目录访问</Text>
            </ListItem>
            <FieldGroup.SectionFooter>
              <Text>从「添加应用」发送应用请求，目录或自动化变更前由 ryP0 管理员审核。</Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        )}

        <FieldGroup.Section title="安全">
          {isAdminBuild ? (
            <>
              <ListItem
                leading={<SettingsSymbol name="faceid" color={accentValue} />}
                supportingText={credentialProtectionText}
              >
                <Text>凭证保护</Text>
              </ListItem>
              <ListItem
                leading={<SettingsSymbol name="key.fill" color={accentValue} />}
                supportingText="The token stays in the Keychain and is never written to repo.json, AsyncStorage, or the app bundle."
              >
                <Text>仅本地凭证</Text>
              </ListItem>
            </>
          ) : (
            <ListItem
              leading={<SettingsSymbol name="shield.fill" color={accentValue} />}
              supportingText="No GitHub, Telegram, R2, Cloudflare, or administrator credential is included in this build."
            >
              <Text>无凭证构建</Text>
            </ListItem>
          )}
        </FieldGroup.Section>

        <FieldGroup.Section title="关于 ryP0">
          <ListItem
            onPress={() => void handleOpenLink(OWNER_GITHUB_URL, 'GitHub')}
            leading={<SettingsSymbol name="person.crop.circle.fill" color={accentValue} />}
            trailing={<DisclosureSymbol color={accentValue} />}
            supportingText="创建者与 ryP0 仓库所有者"
          >
            <Text>{ADMIN_GITHUB_LOGIN}</Text>
          </ListItem>
          <ListItem
            leading={<SettingsSymbol name="shield.fill" color={accentValue} />}
            supportingText="ryP0 公开目录与私有自动化的 iOS 原生伴侣应用"
          >
            <Text>ryP0</Text>
          </ListItem>
          <ListItem
            leading={<SettingsSymbol name="message.fill" color={accentValue} />}
            supportingText="中文汉化"
          >
            <Text>解剖自我汉化</Text>
          </ListItem>
        </FieldGroup.Section>

<FieldGroup.Section title="社区">
          <ListItem
            onPress={() => void handleOpenLink(DISCORD_URL, 'Discord')}
            leading={<SettingsSymbol name="message.fill" color={accentValue} />}
            trailing={<DisclosureSymbol color={accentValue} />}
            supportingText="加入 ryP0 Discord 服务器"
          >
            <Text>Discord</Text>
          </ListItem>
          <ListItem
            onPress={() => void handleOpenLink(YOUTUBE_URL, 'YouTube')}
            leading={<SettingsSymbol name="play.rectangle.fill" color={accentValue} />}
            trailing={<DisclosureSymbol color={accentValue} />}
            supportingText="Watch updates from ry0 Official"
          >
            <Text>YouTube</Text>
          </ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
