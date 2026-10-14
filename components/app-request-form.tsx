import React, { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, useWindowDimensions } from 'react-native';
import { Host, FieldGroup, TextInput, Button, useNativeState, Text, ListItem, Picker } from '@expo/ui';
import { Stack } from 'expo-router';
import { submitAppRequest } from '../services/app-requests';
import type { AppRequestMethod } from '../types/app-request';
import { scrollDisabled } from '@expo/ui/swift-ui/modifiers';
import { getSafeExternalHttpsUrl } from '../services/safe-url';

const METHOD_LABELS: Record<AppRequestMethod, string> = {
  github: 'GitHub project or release',
  repository: 'Another app repository',
  'direct-url': 'Direct IPA download',
  'telegram-r2': 'Telegram / R2 import',
};

const REQUEST_CATEGORIES = [
  'Sideloading',
  'Games',
  'Social',
  'EMU',
  'Movies',
  'Tools',
] as const;

export default function AppRequestForm() {
  const name = useNativeState('');
  const description = useNativeState('');
  const sourceUrl = useNativeState('');
  const [category, setCategory] = useState<(typeof REQUEST_CATEGORIES)[number]>('Sideloading');
  const [method, setMethod] = useState<AppRequestMethod>('github');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const { height: viewportHeight, fontScale } = useWindowDimensions();
  const formHeight = Math.max(viewportHeight + 180, 900 * Math.max(1, fontScale));

  const change = useCallback((state: { value: string }) => (value: string) => {
    'worklet';
    state.value = value;
  }, []);

  const handleSubmit = async () => {
    if (submitLock.current) return;
    const submission = {
      name: name.value.trim(),
      description: description.value.trim(),
      category,
      sourceUrl: sourceUrl.value.trim(),
      method,
    };

    if (!submission.name || !submission.description || !submission.category || !submission.sourceUrl) {
      Alert.alert('完善请求', '需要填写名称、描述、分类和来源链接。');
      return;
    }

    const safeSourceUrl = getSafeExternalHttpsUrl(submission.sourceUrl);
    if (!safeSourceUrl) {
      Alert.alert('使用安全的来源链接', '应用请求仅接受 HTTPS 链接。');
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      await submitAppRequest({ ...submission, sourceUrl: safeSourceUrl });
      name.value = '';
      description.value = '';
      setCategory('Sideloading');
      sourceUrl.value = '';
      setMethod('github');
      Alert.alert('请求已发送', '你的应用请求已发送给仓库开发者审核。');
    } catch (error: any) {
      Alert.alert('无法发送请求', error?.message || 'Try again when you are connected.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '请求应用', headerLargeTitle: true }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        <Host style={{ width: '100%', height: formHeight }}>
          <FieldGroup modifiers={[scrollDisabled()]}>
            <FieldGroup.Section title="请求应用">
              <ListItem>
                <Text>向仓库开发者发送应用来源，请求在发布前会经过审核。</Text>
              </ListItem>
            </FieldGroup.Section>

            <FieldGroup.Section title="应用详情">
              <TextInput value={name} onChangeText={change(name)} placeholder="应用名称" />
              <TextInput value={description} onChangeText={change(description)} placeholder="简短描述" />
              <ListItem
                trailing={
                  <Picker<(typeof REQUEST_CATEGORIES)[number]>
                    selectedValue={category}
                    onValueChange={setCategory}
                    appearance="menu"
                  >
                    {REQUEST_CATEGORIES.map((value) => (
                      <Picker.Item key={value} value={value} label={value} />
                    ))}
                  </Picker>
                }
              >
                <Text>分类</Text>
              </ListItem>
            </FieldGroup.Section>

            <FieldGroup.Section title="来源">
              <ListItem
                trailing={
                  <Picker<AppRequestMethod>
                    selectedValue={method}
                    onValueChange={setMethod}
                    appearance="menu"
                  >
                    {Object.entries(METHOD_LABELS).map(([value, label]) => (
                      <Picker.Item key={value} value={value as AppRequestMethod} label={label} />
                    ))}
                  </Picker>
                }
              >
                <Text>提交方式</Text>
              </ListItem>
              <TextInput
                value={sourceUrl}
                onChangeText={change(sourceUrl)}
                placeholder={method === 'direct-url' ? 'https://example.com/app.ipa' : method === 'telegram-r2' ? 'https://t.me/channel/123' : 'https://source.example.com'}
                autoCapitalize="none"
                keyboardType="url"
              />
              <FieldGroup.SectionFooter>
                <Text>请求在导入前会经过审核。请使用 GitHub 项目、仓库 JSON、直接 IPA URL 或公开 Telegram 消息链接。</Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>

            <FieldGroup.Section>
              <Button onPress={handleSubmit} disabled={isSubmitting}>
                <Text>{isSubmitting ? 'Sending Request…' : 'Send App Request'}</Text>
              </Button>
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      </ScrollView>
    </>
  );
}
