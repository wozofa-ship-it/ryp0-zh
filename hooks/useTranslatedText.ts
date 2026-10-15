import { useEffect, useState } from 'react';
import { translateDescription } from '../services/translate';

/**
 * 把英文文本翻译成中文的 hook。
 * 返回翻译结果（翻译中/失败时返回原文）。
 */
export function useTranslatedText(text: string): string {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let alive = true;
    setDisplay(text);
    translateDescription(text).then((zh) => {
      if (alive) setDisplay(zh);
    });
    return () => { alive = false; };
  }, [text]);

  return display;
}
