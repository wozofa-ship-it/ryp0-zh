import React, { useCallback } from 'react';
import { Text as RNText, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import {
  FieldGroup,
  Host,
  ListItem,
  Text,
  TextInput,
  useNativeState,
} from '@expo/ui';
import type { EditAppFormProps } from '../types/edit-app-form';

export default function EditAppForm({
  app,
  onCancel,
  onSave,
}: EditAppFormProps) {
  const name = useNativeState(app.name || '');
  const subtitle = useNativeState(app.subtitle || '');
  const iconURL = useNativeState(app.iconURL || '');
  const tintColor = useNativeState(app.tintColor || '');
  const category = useNativeState(app.category || '');

  const setName = useCallback((value: string) => { 'worklet'; name.value = value; }, [name]);
  const setSubtitle = useCallback((value: string) => { 'worklet'; subtitle.value = value; }, [subtitle]);
  const setIconURL = useCallback((value: string) => { 'worklet'; iconURL.value = value; }, [iconURL]);
  const setTintColor = useCallback((value: string) => { 'worklet'; tintColor.value = value; }, [tintColor]);
  const setCategory = useCallback((value: string) => { 'worklet'; category.value = value; }, [category]);

  const handleSave = () => onSave({
    name: name.value,
    subtitle: subtitle.value,
    iconURL: iconURL.value,
    tintColor: tintColor.value,
    category: category.value,
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '编辑',
          headerLeft: () => (
            <TouchableOpacity onPress={onCancel}>
              <RNText>Cancel</RNText>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave}>
              <RNText>Save</RNText>
            </TouchableOpacity>
          ),
        }}
      />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="应用信息">
            <TextInput value={name} onChangeText={setName} placeholder="应用名称" />
            <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="副标题" />
          </FieldGroup.Section>
          <FieldGroup.Section title="Bundle ID（只读）">
            <ListItem><Text>{app.bundleIdentifier}</Text></ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title="资源">
            <TextInput value={iconURL} onChangeText={setIconURL} placeholder="图标 URL" />
          </FieldGroup.Section>
          <FieldGroup.Section title="设计">
            <TextInput value={tintColor} onChangeText={setTintColor} placeholder="主题色" />
            <TextInput value={category} onChangeText={setCategory} placeholder="分类" />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
