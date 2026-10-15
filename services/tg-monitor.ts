/**
 * TG 频道监控：抓取公开频道的最新消息，提取 IPA 链接。
 * 走 t.me/s/<channel> 公开预览，无需登录。
 */
export interface TgPost { id: string; text: string; ipaUrls: string[]; date: string; }
export interface TgCheckResult { channel: string; posts: TgPost[]; newIpas: string[]; error?: string; }
const STORAGE_KEY_LAST_IDS = 'tg_monitor_last_ids';
export async function checkChannel(channel: string): Promise<TgCheckResult> {
  const clean = channel.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\/(s\/)?/, '');
  if (!clean) return { channel: clean, posts: [], newIpas: [], error: '请填写频道用户名' };
  try {
    const res = await fetch(`https://t.me/s/${clean}`, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } });
    if (!res.ok) return { channel: clean, posts: [], newIpas: [], error: '频道不存在或无法访问' };
    const html = await res.text();
    const posts = parsePosts(html);
    const lastIds = await getLastIds(clean);
    const newPosts = posts.filter(p => !lastIds.has(p.id));
    const newIpas: string[] = [];
    for (const p of newPosts) { for (const url of p.ipaUrls) { if (!newIpas.includes(url)) newIpas.push(url); } }
    await saveLastIds(clean, posts.slice(0, 20).map(p => p.id));
    return { channel: clean, posts: posts.slice(0, 10), newIpas };
  } catch (e: any) { return { channel: clean, posts: [], newIpas: [], error: '网络错误：' + (e?.message || '未知') }; }
}
function parsePosts(html: string): TgPost[] {
  const posts: TgPost[] = [];
  const msgRegex = /<div class="tgme_widget_message_wrap[^"]*"[^>]*>[\s\S]*?data-post="([^"]+)"[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = msgRegex.exec(html)) !== null) {
    const [, postId, textHtml] = m;
    const text = textHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    const ipaUrls: string[] = [];
    const urlRegex = /https?:\/\/[^\s"'<>]+\.ipa(?:\?[^\s"'<>]*)?/gi;
    let um;
    while ((um = urlRegex.exec(textHtml)) !== null) { const url = um[0]; if (!ipaUrls.includes(url)) ipaUrls.push(url); }
    if (text || ipaUrls.length > 0) posts.push({ id: postId, text: text.slice(0, 200), ipaUrls, date: '' });
  }
  return posts.reverse();
}
async function getLastIds(channel: string): Promise<Set<string>> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_LAST_IDS}:${channel}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
async function saveLastIds(channel: string, ids: string[]): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(`${STORAGE_KEY_LAST_IDS}:${channel}`, JSON.stringify(ids));
  } catch {}
}
