import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { Host, FieldGroup, ListItem, Text, Button } from '@expo/ui';
import { scrollDisabled } from '@expo/ui/swift-ui/modifiers';
import { approveAppRequest, fetchAppRequests } from '../services/app-requests';
import { AdminRouteGate } from '../components/admin-route-gate';
import type { AppRequestMethod, AppRequestRecord } from '../types/app-request';
import { useRepoStore } from '../store/useRepoStore';
import { getSafeExternalHttpsUrl } from '../services/safe-url';

function methodLabel(method: AppRequestRecord['method']) {
  if (method === 'direct-url') return 'Direct IPA';
  if (method === 'telegram-r2') return 'Telegram / R2';
  if (method === 'repository') return 'Repository';
  return 'GitHub';
}

function suggestedMethod(request: AppRequestRecord): AppRequestMethod {
  const source = request.sourceUrl.toLowerCase();
  if (source.includes('t.me/') || source.includes('telegram.me/')) return 'telegram-r2';
  if (/\.ipa(?:$|[?#])/.test(source)) return 'direct-url';
  if (source.endsWith('.json') || source.includes('repo.json') || source.includes('source.json')) return 'repository';
  return 'github';
}

export default function AppRequestsScreen() {
  return (
    <AdminRouteGate title="应用请求">
      <AuthorizedAppRequestsScreen />
    </AdminRouteGate>
  );
}

function AuthorizedAppRequestsScreen() {
  const [requests, setRequests] = useState<AppRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isDeveloperMode = useRepoStore((state) => state.isDeveloperMode);
  const { height: viewportHeight, fontScale } = useWindowDimensions();
  const contentHeight = Math.max(viewportHeight + 180, (requests.length * 96 + 410) * Math.max(1, fontScale));

  const loadRequests = useCallback(async (showError = false) => {
    if (!isDeveloperMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRequests(await fetchAppRequests());
      setLoadError(null);
    } catch (error: any) {
      const message = error?.message || 'Try again when connected.';
      setLoadError(message);
      if (showError) Alert.alert('无法加载请求', error?.message || 'Try again when connected.');
    } finally {
      setLoading(false);
    }
  }, [isDeveloperMode]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const openSource = async (request: AppRequestRecord) => {
    try {
      const sourceUrl = getSafeExternalHttpsUrl(request.sourceUrl)
        ?? getSafeExternalHttpsUrl(request.issueUrl);
      if (!sourceUrl) throw new Error('unsafe URL');
      await Linking.openURL(sourceUrl);
    } catch {
      Alert.alert('无法打开请求', '该请求没有可用的来源链接。');
    }
  };

  const approveAndQueue = (request: AppRequestRecord) => {
    const suggested = suggestedMethod(request);
    Alert.alert('批准此次导入？',
      `Suggested: ${methodLabel(suggested)}. ryP0 will queue a private import for ${request.name}. The app will not be published unless the importer validates its IPA and catalog data.`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: 'Approve & Queue',
          onPress: () => {
            void (async () => {
              try {
                await approveAppRequest({ ...request, method: suggested });
                setRequests((current) => current.filter((candidate) => candidate.id !== request.id));
                Alert.alert('导入已排队', '私有导入器将在更新公开目录前验证来源。');
              } catch (error: any) {
                Alert.alert('无法排队导入', error?.message || 'Check the private control service and try again.');
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: '应用请求', headerLargeTitle: true }} />
      {!isDeveloperMode ? (
        <Host style={{ flex: 1 }}>
          <FieldGroup>
            <FieldGroup.Section title="需要开发者权限">
              <ListItem supportingText="Sign in with a verified GitHub token in Settings to review incoming app requests.">
                <Text>请求收件箱已锁定</Text>
              </ListItem>
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      ) : (
        <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="arrow.clockwise" onPress={() => void loadRequests(true)} />
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadRequests(true)} />}
      >
        <Host style={{ width: '100%', height: contentHeight }}>
          <FieldGroup modifiers={[scrollDisabled()]}>
            <FieldGroup.Section title="已提交的应用">
              {requests.length ? requests.map((request) => (
                <ListItem
                  key={request.id}
                  onPress={() => void openSource(request)}
                  supportingText={`${request.category} · Suggested: ${methodLabel(suggestedMethod(request))}`}
                  trailing={
                    <Button onPress={() => approveAndQueue(request)}>
                      <Text>批准</Text>
                    </Button>
                  }
                >
                  <Text>{request.name}</Text>
                </ListItem>
              )) : (
                <ListItem supportingText={loading ? 'Loading the GitHub request inbox…' : loadError || 'New submissions will appear here.'}>
                  <Text>{loading ? 'Loading Requests' : loadError ? 'Request Service Unavailable' : 'No Open Requests'}</Text>
                </ListItem>
              )}
            </FieldGroup.Section>

            <FieldGroup.Section title="请求流程说明">
              <ListItem>
                <Text>用户提交会变为私有 GitHub Issue。点按请求查看其来源，然后批准以排队受保护的导入器。</Text>
              </ListItem>
              <Button onPress={() => void loadRequests(true)} disabled={loading}>
                <Text>{loading ? 'Refreshing…' : 'Refresh Requests'}</Text>
              </Button>
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      </ScrollView>
        </>
      )}
    </>
  );
}
