import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { Button, Text, TextInput, useNativeState } from '@expo/ui';
import { checkChannel, TgCheckResult } from '../services/tg-monitor';

export default function TgViewer() {
  const channel = useNativeState('iOS_TrollStore');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TgCheckResult | null>(null);

  const handleCheck = async () => {
    const ch = channel.value.trim().replace(/^@/, '');
    if (!ch) { Alert.alert('提示', '请输入频道用户名', [{ text: '好' }]); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await checkChannel(ch);
      setResult(r);
      if (r.error) Alert.alert('失败', r.error, [{ text: '好' }]);
    } catch (e: any) {
      Alert.alert('失败', e?.message || '未知错误', [{ text: '好' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TextInput
        defaultValue={channel.value}
        onChangeText={(t) => { channel.value = t; }}
        placeholder="频道用户名，如 iOS_TrollStore"
      />
      <Button onPress={handleCheck}>
        {loading ? '正在获取…' : '查看频道 IPA'}
      </Button>
      {result && !result.error && result.newIpas.length > 0 && (
        <Text>找到 {String(result.newIpas.length)} 个 IPA，点击下方按钮打开链接：</Text>
      )}
      {result && !result.error && result.newIpas.map((url, i) => (
        <Button key={i} onPress={() => Linking.openURL(url)}>
          {(url.split('/').pop() || url).slice(0, 40)}
        </Button>
      ))}
      {result && !result.error && result.newIpas.length === 0 && (
        <Text>该频道暂无 IPA 链接</Text>
      )}
    </>
  );
}
