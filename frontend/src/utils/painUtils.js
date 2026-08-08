// src/utils/painUtils.js

// ✅ 命名导出
export const CHINESE_TO_KEY_MAP = {
  '绞痛': 'twist', '刺痛': 'pierce', '坠胀': 'heavy',
  '坠胀重压': 'heavy', '坠痛': 'heavy', '酸胀': 'wave',
  '酸胀痛': 'wave', '弥漫酸胀痛': 'wave', '刮痛': 'scrape',
  '撕裂痛': 'scrape', '撕裂刮痛': 'scrape',
};

export const PAIN_COLORS = {
  twist: '#e67e22',
  pierce: '#8e44ad',
  heavy: '#d35400',
  wave: '#27ae60',
  scrape: '#c0392b',
};

export const PAIN_ICONS = {
  twist: '🌀',
  pierce: '⚡',
  heavy: '🪨',
  wave: '〰️',
  scrape: '🔪',
};

const PAIN_ICON_MAP = {
  '绞痛': '🌀',
  '刺痛': '⚡',
  '坠胀': '🪨',
  '坠痛': '🪨',
  '酸胀': '〰️',
  '刮痛': '🔪',
  '撕裂痛': '🔪',
};

export const getPainNameDisplay = (record, t) => {
  if (!record) return '';
  const key = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName] || record.type;
  if (key && t(`painNames.${key}`)) return t(`painNames.${key}`);
  return record.painName || '';
};