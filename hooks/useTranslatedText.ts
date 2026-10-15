import { useEffect, useState } from 'react';
import { translateDescription } from '../services/translate';

/**
 * 把英文文本翻译成中文的 hook。
 * 返回翻译结果（翻译中/失败时返回原文）。
 * 延迟 500ms 后才发起翻译，快速滑过的卡片不触发请求，避免滚动卡顿。
 */
export function useTranslatedText(text: string): string {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let alive = true;
    setDisplay(text);
    // 延迟翻译：用户停留才翻，滑过去的不浪费请求
    const timer = setTimeout(() => {
      if (!alive) return;
      translateDescription(text).then((zh) => {
        if (alive) setDisplay(zh);
      });
    }, 500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [text]);

  return display;
}
