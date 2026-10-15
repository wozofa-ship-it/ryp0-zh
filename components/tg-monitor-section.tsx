import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Button, FieldGroup, ListItem, Picker, Text, TextInput, useNativeState } from '@expo/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkChannel, TgCheckResult } from '../services/tg-monitor';
import { useRepoStore } from '../store/useRepoStore';
import type { RepoApp } from '../types/repo';
const CHANNEL_KEY = '@tg_monitor_channel';
const MODE_KEY = '@tg_monitor_mode';
const DEFAULT_CHANNEL = 'iOS_TrollStore';
type TgMode = 'notify' | 'auto';
export default function TgMonitorSection({ accentValue }: { accentValue: string }) {
  const channel = useNativeState(DEFAULT_CHANNEL);
  const [mode, setMode] = useState<TgMode>('notify');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<TgCheckResult | null>(null);
  const { repo, reorderApps, commitChanges } = useRepoStore();
  React.useEffect(() => {
    (async () => {
      const c = await AsyncStorage.getItem(CHANNEL_KEY);
      if (c) channel.value = c;
      const m = await AsyncStorage.getItem(MODE_KEY);
      if (m === 'auto' || m === 'notify') setMode(m);
    })();
  }, []);
  const saveSettings = useCallback(async () => {
    await AsyncStorage.setItem(CHANNEL_KEY, channel.value.trim());
    await AsyncStorage.setItem(MODE_KEY, mode);
  }, [channel.value, mode]);
  const handleCheck = useCallback(async () => {
    const ch = channel.value.trim().replace(/^@/, '');
    if (!ch) { Alert.alert('请填写频道', '输入要监控的 TG 频道用户名', [{ text: '好' }]); return; }
    await saveSettings();
    setChecking(true);
    setResult(null);
    try {
      const r = await checkChannel(ch);
      setResult(r);
      if (r.error) { Alert.alert('检查失败', r.error, [{ text: '好' }]); return; }
      if (r.newIpas.length === 0) { Alert.alert('检查完成', '没有发现新的 IPA', [{ text: '好' }]); return; }
      if (mode === 'auto') {
        const existingUrls = new Set((repo?.apps || []).flatMap((a: RepoApp) => a.versions.map((v) => v.downloadURL)));
        const toAdd = r.newIpas.filter((url: string) => !existingUrls.has(url));
        if (toAdd.length === 0) { Alert.alert('检查完成', '发现的 IPA 都已在仓库中', [{ text: '好' }]); return; }
        const newApps: RepoApp[] = toAdd.map((url: string, i: number) => {
          const name = decodeURIComponent(url.split('/').pop() || `TG应用${i + 1}`).replace(/\.ipa$/i, '');
          return {
            name,
            bundleIdentifier: `tg.import.${Date.now()}.${i}`,
            developerName: `TG频道 @${r.channel}`,
            subtitle: '从 TG 频道自动导入',
            iconURL: '',
            versions: [{ version: '1.0', date: new Date().toISOString().split('T')[0], downloadURL: url, size: 0 }],
            importSource: { method: 'telegram', sourceURL: `https://t.me/s/${r.channel}` },
          };
        });
        reorderApps([...newApps, ...(repo?.apps || [])]);
        await commitChanges();
        Alert.alert('自动上架完成', `已添加 ${newApps.length} 个应用到仓库`, [{ text: '好' }]);
      } else {
        Alert.alert('发现新 IPA', `频道 @${r.channel} 有 ${r.newIpas.length} 个新 IPA:\n${r.newIpas.slice(0, 3).join('\n')}${r.newIpas.length > 3 ? '\n...' : ''}`, [{ text: '好' }]);
      }
    } catch (e: any) { Alert.alert('检查失败', e?.message || '未知错误', [{ text: '好' }]); }
    finally { setChecking(false); }
  }, [channel.value, mode, repo, reorderApps, commitChanges, saveSettings]);
  return (
    <FieldGroup.Section title="TG 频道监控">
      <ListItem><Text>频道用户名</Text></ListItem>
      <TextInput value={channel} onChangeText={(t) => { channel.value = t; }} placeholder="iOS_TrollStore" autoCapitalize="none" autoCorrect={false} />
      <ListItem trailing={<Picker<TgMode> selectedValue={mode} onValueChange={(v) => { setMode(v); }} appearance="menu"><Picker.Item label="仅通知我" value="notify" /><Picker.Item label="自动上架" value="auto" /></Picker>}>
        <Text>发现新 IPA 时</Text>
      </ListItem>
      <ListItem><Button onPress={handleCheck} disabled={checking}>{checking ? '检查中...' : '立即检查'}</Button></ListItem>
      {result && !result.error && result.posts.length > 0 && (
        <ListItem supportingText={`${result.posts.length} 条消息，${result.newIpas.length} 个新 IPA`}>
          <Text>{`上次检查：@${result.channel}`}</Text>
        </ListItem>
      )}
      <FieldGroup.SectionFooter><Text>监控 TG 频道的新 IPA。仅通知：发现时弹窗提醒；自动上架：直接添加到仓库。</Text></FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}
