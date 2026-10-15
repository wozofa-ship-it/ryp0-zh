import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { Button, Text, TextInput } from '@expo/ui';
import { checkChannel, TgCheckResult } from '../services/tg-monitor';

export default function TgViewer() {
  const [channel, setChannel] = useState('iOS_TrollStore');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TgCheckResult | null>(null);

  const handleCheck = async () => {
    const ch = channel.trim().replace(/^@/, '');
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
        defaultValue={channel}
        onChangeText={setChannel}
        placeholder="频道用户名，如 iOS_TrollStore"
      />
      <Button onPress={handleCheck} disabled={loading}>
        {loading ? '正在获取…' : '查看频道 IPA'}
      </Button>
      {result && !result.error && (
        <>
          <Text>找到 {result.newIpas.length} 个 IPA：</Text>
          {result.newIpas.map((url, i) => (
            <Button key={i} onPress={() => Linking.openURL(url)}>
              {url.split('/').pop() || url}
            </Button>
          ))}
          {result.newIpas.length === 0 && <Text>该频道暂无 IPA 链接</Text>}
        </>
      )}
    </>
  );
}
