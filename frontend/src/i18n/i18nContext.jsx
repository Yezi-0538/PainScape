// src/i18n/i18nContext.js
import React, { createContext, useContext, useMemo } from "react";
import translations from "./translations";

const I18nContext = createContext();

function t(obj, path, variables = {}) {
  if (!obj || !path) return path;

  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value === undefined || value === null) {
      return `[${keys[keys.length - 1]}]`;
    }
    value = value[key];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") return value;

  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
}

// 🌟 修复关键：安全接收 setLang 和 setTargetLanguage 参数
export function I18nProvider({ lang, setLang, setTargetLanguage, children }) {
  console.log('🔵 I18nProvider lang:', lang);

  const value = useMemo(() => {
    const texts = translations[lang] || translations.zh;
    console.log('🟢 texts loaded for:', lang);

    // 获取可用的修改语言函数
    const activeUpdater = setLang || setTargetLanguage;

    return {
      lang: lang || 'zh',
      setLang: activeUpdater,
      // 安全的切换语言函数
      toggleLang: () => {
        if (typeof activeUpdater === 'function') {
          activeUpdater((prev) => (prev === 'zh' ? 'en' : 'zh'));
        }
      },
      t: (path, vars) => t(texts, path, vars),
      texts,
    };
  }, [lang, setLang, setTargetLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export { translations };