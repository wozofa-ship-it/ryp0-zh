import { fetch } from 'expo/fetch';

// 应用介绍实时翻译：英文 → 中文（MyMemory 免费接口，带内存缓存）
// 性能优化：全局并发限制 3，滚动时快速滑过的卡片不触发请求

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

// 全局并发控制
const MAX_CONCURRENT = 3;
let running = 0;
const queue: Array<() => void> = [];

function pumpQueue() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!;
    running++;
    job();
  }
}

function isChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

function isEnglish(text: string): boolean {
  // 至少 3 个英文字母，且不含中文
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  return letters >= 3 && !isChinese(text);
}

async function fetchTranslation(text: string): Promise<string> {
  const encoded = encodeURIComponent(text.slice(0, 400));
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh-CN`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return text;
    const json = await resp.json();
    if (json?.responseStatus === 429) return text; // 限流，返回原文
    const zh = json?.responseData?.translatedText?.trim();
    if (!zh || zh === text || zh.toUpperCase().includes('MYMEMORY')) return text;
    return zh;
  } catch {
    return text;
  } finally {
    running--;
    pumpQueue();
  }
}

/**
 * 翻译英文应用介绍为中文。
 * - 已有中文/非英文/太短 → 直接返回原文
 * - 带缓存，重复文本不重复请求
 * - 全局最多 3 个并发，避免滚动时大量请求卡顿
 */
export function translateDescription(text: string): Promise<string> {
  const t = (text || '').trim();
  if (!t || !isEnglish(t)) return Promise.resolve(text);
  if (cache.has(t)) return Promise.resolve(cache.get(t)!);
  if (pending.has(t)) return pending.get(t)!;
  const p = new Promise<string>((resolve) => {
    queue.push(() => {
      fetchTranslation(t).then((zh) => {
        cache.set(t, zh);
        pending.delete(t);
        resolve(zh);
      });
    });
    pumpQueue();
  });
  pending.set(t, p);
  return p;
}
