import { fetch } from 'expo/fetch';

// 应用介绍实时翻译：英文 → 中文（MyMemory 免费接口，带内存缓存）

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function isEnglish(text: string): boolean {
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
    if (json?.responseStatus === 429) return text;
    const zh = json?.responseData?.translatedText?.trim();
    if (!zh || zh === text || zh.toUpperCase().includes('MYMEMORY')) return text;
    return zh;
  } catch {
    return text;
  }
}

export function translateDescription(text: string): Promise<string> {
  const t = (text || '').trim();
  if (!t || !isEnglish(t)) return Promise.resolve(text);
  if (cache.has(t)) return Promise.resolve(cache.get(t)!);
  if (pending.has(t)) return pending.get(t)!;
  const p = fetchTranslation(t).then((zh) => {
    cache.set(t, zh);
    pending.delete(t);
    return zh;
  });
  pending.set(t, p);
  return p;
}
