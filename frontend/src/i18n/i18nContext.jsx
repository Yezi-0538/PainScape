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
      // ✅ 返回 [key] 而不是完整路径，便于调试
      return `[${keys[keys.length - 1]}]`;
    }
    value = value[key];
  }

  // 如果是数组，直接返回数组（不进行字符串替换）
  if (Array.isArray(value)) {
    return value;
  }

  // 如果不是字符串，也直接返回
  if (typeof value !== "string") return value;

  // 替换模版变量
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
}

export function I18nProvider({ lang, children }) {
  console.log('🔵 I18nProvider lang:', lang);  // ✅ 添加这行

  const value = useMemo(() => {
    const texts = translations[lang] || translations.zh;
    console.log('🟢 texts loaded for:', lang);  // ✅ 添加这行
    return {
      lang,
      t: (path, vars) => t(texts, path, vars),
      texts,
    };
  }, [lang]);

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