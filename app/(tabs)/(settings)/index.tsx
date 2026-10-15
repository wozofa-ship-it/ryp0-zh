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
        `已验证 @${account?.login ?? '你的账号'} 可管理 ryP0 目录、版本和私有自动化。`,
      );
    } catch (error: any) {
      Alert.alert('验证失败', error?.message || 'GitHub 无法验证此 Token。');
    }
  };

  const handleSignOut = () => {
    Alert.alert('退出开发者模式？',
      '这将从本设备移除已保存的开发者凭证，应用回到只读模式。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出登录',
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
      Alert.alert('无法打开链接', `${title} 在本设备上无法打开。`);
    }
  };

  const credentialProtectionText = credentialProtection?.protection === 'face-id'
    ? 'Face ID 保护本设备保存的开发者 Token。'
    : credentialProtection?.protection === 'touch-id'
      ? 'Touch ID 保护本设备保存的开发者 Token。'
      : credentialProtection?.isExpoGo
        ? '已存于 iOS 钥匙串。开发版或正式版构建中会启用 Face ID。'
        : '已存于设备钥匙串。设置 Face ID 或 Touch ID 可添加生物识别保护。';
  const accentValue = ACCENT_COLORS[accentColor].value;
  // Show the single supported owner account up front without implying that a
  // credential is already connected. A verified login replaces this label.
  const accountLabel = `@${githubLogin ?? ADMIN_GITHUB_LOGIN}`;
  // GitHub logins are case-insensitive. Keep this display guard aligned with
  // token validation so an owner account is never shown as merely generic
  // repository access due to a capitalization difference in the API response.
  const isOwnerAccount = isAdminGitHubLogin(githubLogin);
  const accountDetail = isAuthenticating
    ? '正在检查 GitHub 仓库权限…'
    : isDeveloperMode
      ? isOwnerAccount
        ? `${ADMIN_GITHUB_LOGIN} · 已验证仓库权限`
        : '已验证仓库写入权限'
      : `未连接 · 添加 ${ADMIN_GITHUB_LOGIN} 的 Token 以启用编辑`;
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
              supportingText={isDeveloperMode ? '本设备可使用编辑和工作流控制。' : '浏览、搜索和提交请求，无仓库写入权限。'}
            >
              <Text>{isDeveloperMode ? '开发者模式已启用' : '普通模式（只读）'}</Text>
            </ListItem>
            <TextInput
              value={token}
              onChangeText={handleChangeText}
              placeholder={hasGitHubCredential ? '输入替换的 GitHub Token' : '输入 Token'}
              secureTextEntry
            />
            <Button onPress={handleSave} disabled={isAuthenticating}>
              <Text>{isAuthenticating ? '正在验证 GitHub…' : isDeveloperMode ? '验证并替换 Token' : '验证并启用开发者模式'}</Text>
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
              supportingText="此普通构建无法保存 GitHub 凭证或打开目录管理工具。"
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
                supportingText="Token 仅存于钥匙串，不会写入 repo.json、AsyncStorage 或应用包。"
              >
                <Text>仅本地凭证</Text>
              </ListItem>
            </>
          ) : (
            <ListItem
              leading={<SettingsSymbol name="shield.fill" color={accentValue} />}
              supportingText="此构建不包含 GitHub、Telegram、R2、Cloudflare 或管理员凭证。"
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

        <FieldGroup.Section title="社区">          <ListItem
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
            supportingText="观看 ry0 官方更新"
          >
            <Text>YouTube</Text>
          </ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
