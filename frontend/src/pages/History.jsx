// src/pages/HistoryPage.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { deleteRecordFromCloud } from '../services/painRecordService';
import RecordDetailModal from '../Components/modals/RecordDetailModal';
import PublishPostModal from '../Components/modals/PublishPostModal';

// ============================================================
// 常量
// ============================================================
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// 删除上面的 import，直接在文件中定义：
const CHINESE_TO_KEY_MAP = {
  '绞痛': 'twist', '刺痛': 'pierce', '坠胀': 'heavy',
  '坠胀重压': 'heavy', '坠痛': 'heavy', '酸胀': 'wave',
  '酸胀痛': 'wave', '弥漫酸胀痛': 'wave', '刮痛': 'scrape',
  '撕裂痛': 'scrape', '撕裂刮痛': 'scrape',
};

const PAIN_COLORS = {
  twist: '#e67e22',
  pierce: '#8e44ad',
  heavy: '#d35400',
  wave: '#27ae60',
  scrape: '#c0392b',
};

const PAIN_ICONS = {
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


// ============================================================
// 工具函数（补零修复）
// ============================================================
const normalizeDateStr = (dateStr) => {
  if (!dateStr) return '';
  const cleanStr = String(dateStr).replace(/\//g, '-').replace(/\./g, '-');
  const parsed = new Date(cleanStr);
  if (isNaN(parsed.getTime())) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const formatYearMonth = (year, monthIndex, isEn) => {
  if (isEn) return `${EN_MONTHS[monthIndex]} ${year}`;
  return `${year}年${monthIndex + 1}月`;
};

const getPainNameDisplay = (record, t) => {
  if (!record) return '';
  const key = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName] || record.type;
  if (key && t(`painNames.${key}`)) return t(`painNames.${key}`);
  return record.painName || '';
};

const getPainIcon = (record) => {
  if (!record) return '●';
  const key = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName] || record.type;
  return PAIN_ICONS[key] || PAIN_ICON_MAP[record.painName] || '●';
};

// ============================================================
// 子组件：趋势摘要卡片
// ============================================================
const TrendSummary = ({ history, t, isEn }) => {
  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;

    const typeFreq = {};
    history.forEach(h => {
      const key = h.dominantPain || CHINESE_TO_KEY_MAP[h.painName] || 'twist';
      typeFreq[key] = (typeFreq[key] || 0) + 1;
    });

    const sortedTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]);
    const dominantKey = sortedTypes[0]?.[0] || 'twist';

    const now = new Date();
    const thisMonth = history.filter(h => {
      const d = normalizeDateStr(h.date);
      return d.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }).length;

    const uniqueDays = new Set(history.map(h => normalizeDateStr(h.date)).filter(Boolean));

    const dates = history.map(h => normalizeDateStr(h.date)).filter(Boolean).sort();
    let avgGap = 0;
    if (dates.length > 1) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
      }
      avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }

    return {
      sortedTypes,
      dominantKey,
      thisMonth,
      uniqueDays: uniqueDays.size,
      avgGap,
      total: history.length,
    };
  }, [history]);

  if (!stats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
      <div style={cardStyle}>
        <div style={cardLabelStyle}>{t('history.totalRecords')}</div>
        <div style={cardValueStyle}>{stats.total}</div>
        <div style={cardSubStyle}>
          {t('history.records', { count: stats.thisMonth })}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardLabelStyle}>{t('history.activeDays')}</div>
        <div style={cardValueStyle}>{stats.uniqueDays}</div>
        <div style={cardSubStyle}>
          {isEn ? 'days with records' : '天有记录'}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardLabelStyle}>{t('history.mostFrequent')}</div>
        <div style={cardValueStyle}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: PAIN_COLORS[stats.dominantKey] || '#888',
            marginRight: '8px',
          }} />
          {t(`painNames.${stats.dominantKey}`) || stats.dominantKey}
        </div>
        <div style={cardSubStyle}>
          {stats.sortedTypes.length > 1
            ? (isEn ? `+${stats.sortedTypes.length - 1} other types` : `另有 ${stats.sortedTypes.length - 1} 种感受`)
            : (isEn ? 'Only type' : '唯一感受')}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardLabelStyle}>{t('history.avgInterval')}</div>
        <div style={cardValueStyle}>{stats.avgGap || '—'}</div>
        <div style={cardSubStyle}>
          {stats.avgGap ? (isEn ? 'days' : '天') : (isEn ? 'first record' : '首次记录')}
        </div>
      </div>
    </div>
  );
};

const cardStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '14px',
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  transition: 'background 0.2s ease',
};

const cardLabelStyle = {
  color: '#666',
  fontSize: '12px',
  letterSpacing: '0.5px',
};

const cardValueStyle = {
  color: '#e0e0e0',
  fontSize: '24px',
  fontWeight: '300',
  letterSpacing: '-0.5px',
};

const cardSubStyle = {
  color: '#555',
  fontSize: '12px',
  marginTop: '2px',
};

// ============================================================
// 子组件：疼痛类型分布条
// ============================================================
const PainTypeDistribution = ({ history, t }) => {
  const distribution = useMemo(() => {
    if (!history || history.length === 0) return [];
    const freq = {};
    history.forEach(h => {
      const key = h.dominantPain || CHINESE_TO_KEY_MAP[h.painName] || 'twist';
      freq[key] = (freq[key] || 0) + 1;
    });
    const total = history.length;
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count, pct: Math.round((count / total) * 100) }));
  }, [history]);

  if (distribution.length === 0 || distribution.every(d => d.pct === 0)) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        color: '#666',
        fontSize: '12px',
        letterSpacing: '1px',
        marginBottom: '10px',
        textTransform: 'uppercase',
      }}>
        {t('history.painTypeDistribution')}
      </div>
      <div style={{
        display: 'flex',
        height: '10px',
        borderRadius: '5px',
        overflow: 'hidden',
        gap: '3px',
        marginBottom: '12px',
      }}>
        {distribution.map(({ key, pct }) => (
          <div
            key={key}
            style={{
              flex: Math.max(pct, 1),
              background: PAIN_COLORS[key] || '#444',
              borderRadius: '5px',
              transition: 'flex 0.3s ease',
              minWidth: '6px',
            }}
            title={`${t(`painNames.${key}`) || key}: ${pct}%`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {distribution.map(({ key, pct }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: PAIN_COLORS[key] || '#555',
            }} />
            <span style={{ color: '#999', fontSize: '13px' }}>
              {t(`painNames.${key}`) || key}
              <span style={{ color: '#666', marginLeft: '4px', fontWeight: '500' }}>{pct}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 子组件：对比视图（增强版 - 支持多维度对比）
// ============================================================
const ComparisonView = ({ source, target, t, isEn, onClear }) => {
  if (!source || !target) {
    return (
      <div style={{
        padding: 'var(--space-2xl)',
        textAlign: 'center',
        color: '#555',
        fontSize: '13px',
        border: '1px dashed rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '16px',
      }}>
        {t('history.selectTwoRecords')}
      </div>
    );
  }

  const sourcePain = getPainNameDisplay(source, t);
  const targetPain = getPainNameDisplay(target, t);
  const sourceIcon = getPainIcon(source);
  const targetIcon = getPainIcon(target);

  const sourceDate = normalizeDateStr(source.date);
  const targetDate = normalizeDateStr(target.date);
  const sourceTime = source.time || '';
  const targetTime = target.time || '';

  // 判断类型是否相同
  const sameType = (source.dominantPain || CHINESE_TO_KEY_MAP[source.painName]) ===
    (target.dominantPain || CHINESE_TO_KEY_MAP[target.painName]);
  const sameDay = sourceDate === targetDate;

  // 🌟 新增：计算间隔天数
  const getDaysDiff = () => {
    const d1 = new Date(sourceDate);
    const d2 = new Date(targetDate);
    return Math.abs(Math.round((d1 - d2) / 86400000));
  };
  const daysDiff = getDaysDiff();
  // 🌟 修复：获取身体部位描述（支持新分区）
  const getLocationDesc = (record) => {
    const map = record.spatialMap || {};
    const parts = [];

    // 检查是正面还是背面（通过字段判断）
    const isFront = 'head' in map || 'chest' in map || 'upperAbdomen' in map || 'lowerAbdomen' in map || 'legs' in map;
    const isBack = 'upperBack' in map || 'waist' in map || 'sacrum' in map;

    if (isFront) {
      // 正面五分区
      const head = (map.head || 0) * 100;
      const chest = (map.chest || 0) * 100;
      const upperAbdomen = (map.upperAbdomen || 0) * 100;
      const lowerAbdomen = (map.lowerAbdomen || 0) * 100;
      const legs = (map.legs || 0) * 100;

      if (head > 3) parts.push(`${t('history.bodyHead')} ${Math.round(head)}%`);
      if (chest > 3) parts.push(`${t('history.bodyChest')} ${Math.round(chest)}%`);
      if (upperAbdomen > 3) parts.push(`${t('history.bodyUpperAbdomen')} ${Math.round(upperAbdomen)}%`);
      if (lowerAbdomen > 3) parts.push(`${t('history.bodyLowerAbdomen')} ${Math.round(lowerAbdomen)}%`);
      if (legs > 3) parts.push(`${t('history.bodyLegs')} ${Math.round(legs)}%`);
    } else if (isBack) {
      // 背面三分区
      const upperBack = (map.upperBack || 0) * 100;
      const waist = (map.waist || 0) * 100;
      const sacrum = (map.sacrum || 0) * 100;

      if (upperBack > 3) parts.push(`${t('history.bodyUpperBack')} ${Math.round(upperBack)}%`);
      if (waist > 3) parts.push(`${t('history.bodyWaist')} ${Math.round(waist)}%`);
      if (sacrum > 3) parts.push(`${t('history.bodySacrum')} ${Math.round(sacrum)}%`);
    }

    // 如果没有任何数据，尝试从旧的字段读取（兼容旧数据）
    if (parts.length === 0) {
      // 兼容旧的三分区
      const abdomen = (map.abdomen || 0) * 100;
      const lowerBack = (map.lowerBack || 0) * 100;
      const upperBody = (map.upperBody || 0) * 100;
      if (abdomen > 5) parts.push(`${t('history.bodyAbdomen')} ${Math.round(abdomen)}%`);
      if (lowerBack > 5) parts.push(`${t('history.bodyLowerBack')} ${Math.round(lowerBack)}%`);
      if (upperBody > 5) parts.push(`${t('history.bodyUpperBody')} ${Math.round(upperBody)}%`);
    }

    if (parts.length === 0) {
      // 如果有 bodyMode 但没有 spatialMap，显示 bodyMode 信息
      const mode = record.bodyMode || record.meta?.bodyMode;
      if (mode === 'front') return t('history.bodyFront');
      if (mode === 'back') return t('history.bodyBack');
      return t('history.bodyNotRecorded');
    }

    return parts.join(' · ');
  };

  // 🌟 新增：获取颜色描述
  const getColorDesc = (record) => {
    const colorMap = {
      crimson: { zh: t('history.colorCrimson'), en: t('history.colorCrimsonEn') },
      dark: { zh: t('history.colorDark'), en: t('history.colorDarkEn') },
      purple: { zh: t('history.colorPurple'), en: t('history.colorPurpleEn') },
      blue: { zh: t('history.colorBlue'), en: t('history.colorBlueEn') },
    };
    const c = record.colorPalette || 'crimson';
    return isEn ? colorMap[c]?.en || c : colorMap[c]?.zh || c;
  };

  // 🌟 新增：获取伴随症状
  const getSymptoms = (record) => {
    const symptoms = record.accompanyingSymptoms || [];
    return symptoms.length > 0 ? symptoms.join('、') : t('history.symptomsNone');
  };

  const sourceLocation = getLocationDesc(source);
  const targetLocation = getLocationDesc(target);
  const sourceColor = getColorDesc(source);
  const targetColor = getColorDesc(target);
  const sourceSymptoms = getSymptoms(source);
  const targetSymptoms = getSymptoms(target);
  const locationChanged = sourceLocation !== targetLocation && sourceLocation !== t('history.bodyNotRecorded') && targetLocation !== t('history.bodyNotRecorded');
  const colorChanged = sourceColor !== targetColor;

  return (
    <div style={{
      marginBottom: '16px',
      padding: 'var(--space-lg)',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* 标题行 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
      }}>
        <span style={{ color: '#888', fontSize: '12px', letterSpacing: '0.5px' }}>
          {t('history.compareTitle')}
        </span>
        {onClear && (
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#555',
              fontSize: '10px',
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            {t('history.clearCompare')}
          </button>
        )}
      </div>

      {/* 对比主体 - 增强版 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '12px',
        alignItems: 'stretch',
      }}>
        {/* 本次记录 */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-md)',
          background: 'rgba(230,126,34,0.04)',
          borderRadius: '10px',
        }}>
          <div style={{
            color: '#888',
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '6px',
          }}>
            {t('history.compareSource')}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>
            {sourceDate} {sourceTime}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(230,126,34,0.12)',
            borderRadius: 'var(--radius-md)',
            color: '#e8a87c',
            fontSize: '13px',
            marginBottom: '6px',
          }}>
            <span>{sourceIcon}</span>
            <span>{sourcePain}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
            📍 {sourceLocation}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            🌡️ {sourceColor}
          </div>
          {sourceSymptoms !== t('history.symptomsNone') && (
            <div style={{ fontSize: '10px', color: '#666' }}>
              🤢 {sourceSymptoms}
            </div>
          )}
        </div>

        {/* VS 分隔 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}>
          <div style={{
            color: '#444',
            fontSize: '12px',
            fontWeight: '300',
            letterSpacing: '2px',
          }}>
            VS
          </div>
          {daysDiff > 0 && (
            <div style={{ fontSize: '9px', color: '#555' }}>
              {daysDiff} {t('history.daysUnit')}
            </div>
          )}
        </div>

        {/* 上次记录 */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-md)',
          background: 'rgba(184,168,152,0.04)',
          borderRadius: '10px',
        }}>
          <div style={{
            color: '#888',
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '6px',
          }}>
            {t('history.compareTarget')}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>
            {targetDate} {targetTime}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(184,168,152,0.10)',
            borderRadius: 'var(--radius-md)',
            color: '#b8a898',
            fontSize: '13px',
            marginBottom: '6px',
          }}>
            <span>{targetIcon}</span>
            <span>{targetPain}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
            📍 {targetLocation}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            🌡️ {targetColor}
          </div>
          {targetSymptoms !== t('history.symptomsNone') && (
            <div style={{ fontSize: '10px', color: '#666' }}>
              🤢 {targetSymptoms}
            </div>
          )}
        </div>
      </div>

      {/* 对比洞察 - 增强版 */}
      <div style={{
        marginTop: '14px',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.015)',
        borderRadius: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        justifyContent: 'center',
      }}>
        {/* 间隔天数 */}
        {daysDiff > 0 && (
          <span style={{ color: '#666', fontSize: '10px' }}>
            ⏱️ {daysDiff} {t('history.daysUnit')} {isEn ? 'apart' : '间隔'}
          </span>
        )}

        {/* 同一天标记 */}
        {sameDay && (
          <span style={{ color: '#666', fontSize: '10px' }}>
            📅 {t('history.sameDay')}
          </span>
        )}

        {/* 痛感类型变化 */}
        <span style={{ color: sameType ? '#81c784' : '#e8a87c', fontSize: '10px' }}>
          {sameType
            ? `🔄 ${t('history.sameType')}`
            : `🔀 ${t('history.diffType')}`}
        </span>

        {/* 位置变化 */}
        {locationChanged && (
          <span style={{ color: '#64b5f6', fontSize: '10px' }}>
            📍 {t('history.locationChanged')}
          </span>
        )}

        {/* 颜色/体感变化 */}
        {colorChanged && (
          <span style={{ color: '#ce93d8', fontSize: '10px' }}>
            🌡️ {t('history.sensationChanged')}
          </span>
        )}

        {/* 无变化标记 */}
        {sameType && !locationChanged && !colorChanged && (
          <span style={{ color: '#555', fontSize: '10px' }}>
            {t('history.noSignificantChange')}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================
// 子组件：记录卡片（含对比按钮）
// ============================================================
const RecordCard = ({
  record, t, isEn, compact = false,
  onView, onDelete, onCompare,
  isCompareSelected, isCompareTarget,
  exportMode = false,
  isExportSelected = false,
  onToggleExport,
  onShare,
}) => {
  const painName = getPainNameDisplay(record, t);
  const painKey = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName];
  const painColor = PAIN_COLORS[painKey] || '#555';
  const painIcon = getPainIcon(record);
  const isQuickLog = record.isQuickLog;
  const hasReport = record.reportData && !record.isSavedOnly;
  const displayDate = normalizeDateStr(record.date);

  const displayDateTime = displayDate && record.time
    ? `${displayDate} ${record.time}`
    : displayDate || record.time || '';

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          marginBottom: '2px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
          background: isCompareSelected
            ? 'rgba(230,126,34,0.08)'
            : isCompareTarget
              ? 'rgba(76,175,80,0.06)'
              : 'transparent',
        }}
        onClick={onView}
        onMouseEnter={(e) => {
          if (!isCompareSelected && !isCompareTarget) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isCompareSelected && !isCompareTarget) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {exportMode && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleExport?.(record.id);
            }}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              border: isExportSelected
                ? '2px solid #4caf50'
                : '2px solid rgba(255,255,255,0.15)',
              background: isExportSelected
                ? 'rgba(76,175,80,0.2)'
                : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              fontSize: '12px',
              color: '#4caf50',
            }}
          >
            {isExportSelected && '✓'}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--text-base)' }}>{painIcon}</span>
          <span style={{ color: '#aaa', fontSize: '12px' }}>{painName}</span>
          {isQuickLog && <span style={{ color: '#d32f2f', fontSize: '9px' }}>⚡</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#444', fontSize: '10px' }}>{displayDate}</span>
          {/* 分享按钮 */}
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(record); }}
              style={{
                background: 'rgba(33,150,243,0.08)',
                border: '1px solid rgba(33,150,243,0.15)',
                color: '#64b5f6',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                minHeight: 'auto',
                minWidth: '30px',
              }}
            >
              {isEn ? 'Share' : '分享'}
            </button>
          )}
          {onCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(record); }}
              style={{
                background: isCompareSelected
                  ? 'rgba(230,126,34,0.15)'
                  : isCompareTarget
                    ? 'rgba(76,175,80,0.12)'
                    : 'rgba(255,255,255,0.03)',
                border: isCompareSelected
                  ? '1px solid rgba(230,126,34,0.3)'
                  : isCompareTarget
                    ? '1px solid rgba(76,175,80,0.25)'
                    : '1px solid rgba(255,255,255,0.06)',
                color: isCompareSelected ? '#e8a87c' : isCompareTarget ? '#81c784' : '#555',
                fontSize: '9px',
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minHeight: 'auto', // ✅ 覆盖全局 min-height
                minWidth: '30px',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              {isCompareSelected
                ? (isEn ? 'Source' : '已选')
                : isCompareTarget
                  ? (isEn ? 'Target' : '对比')
                  : (isEn ? 'Compare' : '对比')}
            </button>
          )}
          {/* 删除按钮 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#444',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '3px 4px',
              flexShrink: 0,
              borderRadius: '6px',
              minHeight: 'auto', // ✅ 覆盖全局 min-height
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244,67,54,0.1)';
              e.currentTarget.style.color = '#ef5350';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#444';
            }}
          >
            {t('history.delete')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        marginBottom: '6px',
        background: isCompareSelected
          ? 'rgba(230,126,34,0.06)'
          : isCompareTarget
            ? 'rgba(76,175,80,0.04)'
            : 'rgba(255,255,255,0.015)',
        border: isCompareSelected
          ? '1px solid rgba(230,126,34,0.2)'
          : isCompareTarget
            ? '1px solid rgba(76,175,80,0.15)'
            : '1px solid rgba(255,255,255,0.04)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={onView}
      onMouseEnter={(e) => {
        if (!isCompareSelected && !isCompareTarget) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isCompareSelected && !isCompareTarget) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
        }
      }}
    >
      {exportMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleExport?.(record.id);
          }}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: isExportSelected
              ? '2px solid #4caf50'
              : '2px solid rgba(255,255,255,0.15)',
            background: isExportSelected
              ? 'rgba(76,175,80,0.2)'
              : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: 'pointer',
            fontSize: '12px',
            color: '#4caf50',
          }}
        >
          {isExportSelected && '✓'}
        </div>
      )}
      {record.img && !isQuickLog && (
        <img
          src={record.img}
          alt=""
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            objectFit: 'cover',
            background: '#111',
            flexShrink: 0,
          }}
        />
      )}
      {isQuickLog && (
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '8px',
          background: 'rgba(211,47,47,0.08)',
          border: '1px solid rgba(211,47,47,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '18px' }}>{painIcon}</span>
          <span style={{ color: '#d0d0d0', fontSize: '15px', fontWeight: '400' }}>{painName}</span>
          {isQuickLog && (
            <span style={{
              color: '#d32f2f',
              fontSize: '9px',
              background: 'rgba(211,47,47,0.08)',
              padding: '2px 8px',
              borderRadius: '8px',
            }}>
              {isEn ? 'Quick' : '快速'}
            </span>
          )}
          {hasReport && (
            <span style={{
              color: '#e8a87c',
              fontSize: '9px',
              background: 'rgba(232,168,124,0.12)',
              padding: '2px 8px',
              borderRadius: '8px',
            }}>
              {isEn ? 'Report' : '报告'}
            </span>
          )}
          {record.isSavedOnly && (
            <span style={{
              color: '#666',
              fontSize: '9px',
              background: 'rgba(255,255,255,0.05)',
              padding: '2px 8px',
              borderRadius: '8px',
            }}>
              {isEn ? 'Saved' : '仅保存'}
            </span>
          )}
        </div>
        <div style={{ color: '#555', fontSize: '12px' }}>
          {displayDateTime}
        </div>
      </div>

      {/* 右侧按钮组 */}
      <div style={{
        display: 'flex',
        gap: '4px',
        flexShrink: 0,
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        minWidth: '70px',
      }}>
        {/* 分享按钮 */}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(record); }}
            style={{
              background: 'rgba(33,150,243,0.08)',
              border: '1px solid rgba(33,150,243,0.15)',
              color: '#64b5f6',
              fontSize: '9px',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minWidth: '30px',
              minHeight: '24px',    // ✅ 添加固定高度
              height: '24px',       // ✅ 固定高度
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isEn ? 'Share' : '分享'}
          </button>
        )}
        {/* 对比按钮 */}
        {onCompare && (
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(record); }}
            style={{
              background: isCompareSelected
                ? 'rgba(230,126,34,0.15)'
                : isCompareTarget
                  ? 'rgba(76,175,80,0.12)'
                  : 'rgba(255,255,255,0.03)',
              border: isCompareSelected
                ? '1px solid rgba(230,126,34,0.3)'
                : isCompareTarget
                  ? '1px solid rgba(76,175,80,0.25)'
                  : '1px solid rgba(255,255,255,0.06)',
              color: isCompareSelected ? '#e8a87c' : isCompareTarget ? '#81c784' : '#555',
              fontSize: '8px',
              cursor: 'pointer',
              padding: '2px 5px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minWidth: '24px',
              minHeight: '24px',    // ✅ 添加固定高度
              height: '24px',       // ✅ 固定高度
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
          >
            {isCompareSelected
              ? (isEn ? 'Src' : '已选')
              : isCompareTarget
                ? (isEn ? 'Tgt' : '对比')
                : (isEn ? 'Cmp' : '对比')}
          </button>
        )}
        {/* 删除按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#444',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '2px 4px',
            flexShrink: 0,
            borderRadius: '6px',
            minHeight: '24px',      // ✅ 添加固定高度
            height: '24px',         // ✅ 固定高度
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(244,67,54,0.1)';
            e.currentTarget.style.color = '#ef5350';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#444';
          }}
        >
          {t('history.delete')}
        </button>
      </div>
    </div>
  );
};
// ============================================================
// 新增：搜索过滤钩子
// ============================================================
const useSearchFilter = (history, searchQuery, painTypeFilter) => {
  return useMemo(() => {
    if (!history || history.length === 0) return [];

    let filtered = history;

    // 按疼痛类型筛选
    if (painTypeFilter && painTypeFilter !== 'all') {
      filtered = filtered.filter(h => {
        const key = h.dominantPain || CHINESE_TO_KEY_MAP[h.painName] || 'twist';
        return key === painTypeFilter;
      });
    }

    // 按搜索关键词筛选
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(h => {
        const painName = getPainNameDisplay(h, () => '') || '';
        const date = normalizeDateStr(h.date) || '';
        const key = h.dominantPain || CHINESE_TO_KEY_MAP[h.painName] || '';
        const symptoms = (h.accompanyingSymptoms || []).join(' ').toLowerCase();
        const color = h.colorPalette || '';

        return painName.toLowerCase().includes(query) ||
          date.includes(query) ||
          key.toLowerCase().includes(query) ||
          color.toLowerCase().includes(query) ||
          symptoms.includes(query);
      });
    }

    return filtered;
  }, [history, searchQuery, painTypeFilter]);
};

// ============================================================
// 新增：时间线可视化组件
// ============================================================
const TimelineView = ({ records, t, isEn, onRecordClick }) => {
  if (!records || records.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#444',
        fontSize: 'var(--text-sm)',
      }}>
        {t('history.timelineEmpty')}
      </div>
    );
  }

  // 按日期排序（从旧到新）
  const sorted = [...records].sort((a, b) => {
    const dateA = new Date(normalizeDateStr(a.date) || 0);
    const dateB = new Date(normalizeDateStr(b.date) || 0);
    return dateA - dateB;
  });

  // 计算总跨度用于归一化
  const firstDate = new Date(normalizeDateStr(sorted[0]?.date) || 0);
  const lastDate = new Date(normalizeDateStr(sorted[sorted.length - 1]?.date) || 0);
  const totalDays = Math.max(1, Math.round((lastDate - firstDate) / 86400000));

  return (
    <div style={{
      padding: 'var(--space-lg) 0',
      position: 'relative',
    }}>
      {/* 时间线轴线 */}
      <div style={{
        position: 'absolute',
        left: '20px',
        top: '20px',
        bottom: '20px',
        width: '2px',
        background: 'linear-gradient(to bottom, rgba(230,126,34,0.3), rgba(230,126,34,0.05))',
        borderRadius: '2px',
      }} />

      {sorted.map((record, index) => {
        const recordDate = new Date(normalizeDateStr(record.date) || 0);
        const painKey = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName] || 'twist';
        const painColor = PAIN_COLORS[painKey] || '#888';
        const painName = getPainNameDisplay(record, t);
        const painIcon = getPainIcon(record);
        const isQuickLog = record.isQuickLog;

        // 计算在时间线上的位置（百分比）
        let position = 0;
        if (totalDays > 0) {
          const diff = (recordDate - firstDate) / 86400000;
          position = Math.min(100, Math.max(0, (diff / totalDays) * 100));
        }

        return (
          <div
            key={record.id}
            onClick={() => onRecordClick?.(record)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              padding: '10px 12px 10px 40px',
              marginBottom: '4px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* 时间线节点 */}
            <div style={{
              position: 'absolute',
              left: '18px',
              top: '14px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: painColor,
              boxShadow: `0 0 12px ${painColor}40`,
              transform: 'translateX(-2px)',
            }} />

            {/* 日期标签 */}
            <div style={{
              minWidth: '80px',
              color: '#666',
              fontSize: 'var(--text-xs)',
              flexShrink: 0,
            }}>
              {normalizeDateStr(record.date)}
              {record.time && (
                <span style={{ color: '#444', marginLeft: '4px' }}>
                  {record.time}
                </span>
              )}
            </div>

            {/* 内容 */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 'var(--text-lg)' }}>{painIcon}</span>
              <span style={{
                color: '#d0d0d0',
                fontSize: 'var(--text-sm)',
                fontWeight: '400',
              }}>
                {painName}
              </span>
              {isQuickLog && (
                <span style={{
                  color: '#d32f2f',
                  fontSize: '9px',
                  background: 'rgba(211,47,47,0.08)',
                  padding: '1px 6px',
                  borderRadius: '6px',
                }}>
                  ⚡
                </span>
              )}
              {/* 颜色标记 */}
              {record.colorPalette && (
                <span style={{
                  fontSize: '9px',
                  color: '#555',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  🌡️ {record.colorPalette}
                </span>
              )}
            </div>

            {/* 进度指示 */}
            <div style={{
              fontSize: '9px',
              color: '#333',
              flexShrink: 0,
            }}>
              {Math.round(position)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// 新增：搜索栏组件
// ============================================================
const SearchBar = ({
  searchQuery,
  setSearchQuery,
  painTypeFilter,
  setPainTypeFilter,
  painTypes,
  t,
  isEn,
  onClear,
  resultCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      marginBottom: '16px',
    }}>
      {/* 搜索输入行 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1,
          minWidth: '180px',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: searchQuery ? '1px solid rgba(230,126,34,0.25)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-md)',
          padding: '0 12px',
          transition: 'all 0.3s ease',
        }}>
          <span style={{ color: '#555', fontSize: '14px', marginRight: '8px' }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#d0d0d0',
              fontSize: 'var(--text-sm)',
              padding: '10px 0',
              outline: 'none',
              minHeight: 'var(--btn-min-touch)',
            }}
          />
          {searchQuery && (
            <button
              onClick={onClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#555',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* 疼痛类型筛选下拉 */}
        <div style={{
          position: 'relative',
          minWidth: '100px',
        }}>
          <select
            value={painTypeFilter}
            onChange={(e) => setPainTypeFilter(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-md)',
              color: '#d0d0d0',
              fontSize: 'var(--text-xs)',
              padding: '8px 28px 8px 12px',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
              width: '100%',
              minHeight: 'var(--btn-min-touch)',
            }}
          >
            <option value="all">{t('history.allTypes')}</option>
            {painTypes.map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({PAIN_ICONS[key] || '●'})
              </option>
            ))}
          </select>
          <span style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#555',
            fontSize: '10px',
            pointerEvents: 'none',
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* 结果统计 */}
      {(searchQuery || painTypeFilter !== 'all') && (
        <div style={{
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            color: resultCount > 0 ? '#e8a87c' : '#555',
            fontSize: 'var(--text-xs)',
          }}>
            {resultCount > 0
              ? t('history.searchResults', { count: resultCount })
              : t('history.searchEmpty')}
          </span>
          {searchQuery && resultCount === 0 && (
            <span style={{
              color: '#444',
              fontSize: 'var(--text-xs)',
            }}>
              {t('history.noResultFor', { query: searchQuery })}
            </span>
          )}
          <button
            onClick={onClear}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#666',
              fontSize: '10px',
              padding: '2px 10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {t('history.searchClear')}
          </button>
        </div>
      )}
    </div>
  );
};
// ============================================================
// 主组件
// ============================================================
export default function HistoryPage({
  history = [],
  setHistory,
  calendarDate = new Date(),
  setCalendarDate,
  selectedDate = null,
  onViewDraftBox,
  draftCount,
  setSelectedDate,
  selectedDateRecords = [],
  setSelectedDateRecords,
  showGroupedView = true,
  setShowGroupedView,
  menstrualDates = [],
  setMenstrualDates,
  viewingDiary = null,
  setViewingDiary,
  onBack,
  exportHistoryPDF,
  showToast,
  onShareRecord,
  onPublishRecord,
  lang = 'zh',
  setTargetLanguage,
  currentUserId = null,
}) {
  const { t } = useI18n();
  const isEn = lang === 'en';
  const [collapsedMonths, setCollapsedMonths] = useState({});
  const [exportMode, setExportMode] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState(new Set());
  const [publishConfirm, setPublishConfirm] = useState(null);
  // 任意两条记录对比
  const [compareSource, setCompareSource] = useState(null);
  const [compareTarget, setCompareTarget] = useState(null);
  const [compareMode, setCompareMode] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishCustomText, setPublishCustomText] = useState('');
  // ===== 新增：搜索和筛选状态 =====
  const [searchQuery, setSearchQuery] = useState('');
  const [painTypeFilter, setPainTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'timeline'

  // ===== 获取所有疼痛类型 =====
  const painTypes = useMemo(() => {
    const types = new Set();
    history.forEach(h => {
      const key = h.dominantPain || CHINESE_TO_KEY_MAP[h.painName] || 'twist';
      types.add(key);
    });
    return Array.from(types).map(key => [key, t(`painNames.${key}`) || key]);
  }, [history, t]);

  // ===== 应用搜索和筛选 =====
  const filteredHistory = useSearchFilter(history, searchQuery, painTypeFilter);

  // ===== 清除搜索 =====
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setPainTypeFilter('all');
  }, []);

  // ===== 根据当前视图渲染内容 =====
  const renderViewContent = () => {
    const displayRecords = filteredHistory;

    if (viewMode === 'timeline') {
      return (
        <TimelineView
          records={displayRecords}
          t={t}
          isEn={isEn}
          onRecordClick={(record) => handleViewRecord(record)}
        />
      );
    }

    // 日历视图 - 使用现有的日历逻辑
    return renderCalendarView(displayRecords);
  };
  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_ZH;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const today = new Date();
  const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const hasRecordOnDate = (day) => {
    const targetStr = formatDateKey(year, month, day);
    return history.some(h => normalizeDateStr(h.date) === targetStr);
  };

  const getRecordsOnDate = (day) => {
    const targetStr = formatDateKey(year, month, day);
    return history.filter(h => normalizeDateStr(h.date) === targetStr);
  };

  const changeMonth = (delta) => {
    setCalendarDate(new Date(year, month + delta, 1));
  };

  const handleDateClick = (day) => {
    const dateStr = formatDateKey(year, month, day);
    setSelectedDate(dateStr);
    const records = getRecordsOnDate(day);
    setSelectedDateRecords(records);
  };

  const handleDeleteRecord = async (recordId) => {
    // 1. 找到目标记录
    const recordToDelete = history.find(h => h.id === recordId);
    if (!recordToDelete) return;

    // 2. 权限校验：已登录用户不能删除其他用户的记录
    if (
      currentUserId &&
      !currentUserId.startsWith('guest_') &&
      recordToDelete.userId &&
      !recordToDelete.userId.startsWith('guest_') &&
      recordToDelete.userId !== currentUserId
    ) {
      showToast?.('noPermission');
      return;
    }

    // 3. 用户确认删除
    if (window.confirm(t('history.deleteConfirm') || '确定要删除这条记录吗？')) {
      // 本地状态与缓存优先移除，保证界面响应毫无卡顿
      const updated = history.filter(h => h.id !== recordId);
      setHistory(updated);
      try {
        localStorage.setItem('painscape_history', JSON.stringify(updated));
      } catch (e) { }

      setSelectedDateRecords(prev => prev.filter(h => h.id !== recordId));
      if (viewingDiary?.id === recordId) setViewingDiary(null);

      // 清除对比视图中关联的记录
      if (compareSource?.id === recordId) {
        setCompareSource(null);
        setCompareTarget(null);
        setCompareMode(false);
      }
      if (compareTarget?.id === recordId) {
        setCompareTarget(null);
        setCompareMode(false);
      }

      showToast?.('recordDeleted');

      // 4. 🌟 若为正式登录用户，静默同步删除云端记录
      if (currentUserId && !currentUserId.startsWith('guest_') && currentUserId !== 'user_guest') {
        try {
          await deleteRecordFromCloud(recordId, currentUserId);
        } catch (err) {
          console.warn('⚠️ 云端记录删除失败:', err);
        }
      }
    }
  };

  // 查看详情：过滤 painScore
  const handleViewRecord = (record) => {
    const { painScore, ...cleanRecord } = record;
    setViewingDiary(cleanRecord);
  };

  // 对比选择
  const handleCompareSelect = (record) => {
    const { painScore, ...cleanRecord } = record;

    if (!compareSource) {
      setCompareSource(cleanRecord);
      setCompareTarget(null);
      setCompareMode(false);
    } else if (compareSource.id === cleanRecord.id) {
      setCompareSource(null);
      setCompareTarget(null);
      setCompareMode(false);
    } else {
      setCompareTarget(cleanRecord);
      setCompareMode(true);
    }
  };

  const handleClearCompare = () => {
    setCompareSource(null);
    setCompareTarget(null);
    setCompareMode(false);
  };

  const groupedHistory = useMemo(() => {
    return history.reduce((acc, item) => {
      const parts = normalizeDateStr(item.date).split('-');
      if (parts.length < 2) return acc;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const key = formatYearMonth(y, m, isEn);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [history, isEn]);

  const toggleMonth = (monthKey) => {
    setCollapsedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const isSelectedDate = (day) => {
    return formatDateKey(year, month, day) === selectedDate;
  };

  const isMenstrualDate = (day) => {
    const dateStr = formatDateKey(year, month, day);
    return menstrualDates.includes(dateStr);
  };

  const getDayPainColor = (day) => {
    const records = getRecordsOnDate(day);
    if (records.length === 0) return null;
    const key = records[0].dominantPain || CHINESE_TO_KEY_MAP[records[0].painName];
    return PAIN_COLORS[key] || '#888';
  };

  const getWeekDays = () => {
    return [
      t('history.sun'),
      t('history.mon'),
      t('history.tue'),
      t('history.wed'),
      t('history.thu'),
      t('history.fri'),
      t('history.sat'),
    ];
  };

  const hasMultipleRecordsOnDate = (day) => {
    return getRecordsOnDate(day).length > 1;
  };

  const getRecordCountOnDate = (day) => {
    return getRecordsOnDate(day).length;
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#0a0a0a',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: 'var(--space-xl)',
        paddingBottom: '120px',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== 顶栏 ===== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          zIndex: 10,
          paddingBottom: '8px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: '400', letterSpacing: '1px' }}>
          {t('history.title')}
        </h2>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 视图切换 */}
          <button
            onClick={() => setViewMode(viewMode === 'calendar' ? 'timeline' : 'calendar')}
            style={{
              padding: '3px 10px',
              background: viewMode === 'timeline' ? 'rgba(230,126,34,0.15)' : 'rgba(255,255,255,0.05)',
              border: viewMode === 'timeline' ? '1px solid rgba(230,126,34,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: viewMode === 'timeline' ? '#e8a87c' : '#888',
              borderRadius: 'var(--radius-sm)',
              fontSize: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 'auto',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {viewMode === 'calendar' ? '📊 ' + t('history.showTimeline') : '📅 ' + t('history.showCalendar')}
          </button>

          {/* 语言切换 */}
          {setTargetLanguage && (
            <button
              onClick={() => setTargetLanguage(isEn ? 'zh' : 'en')}
              style={{
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#888',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                minHeight: 'auto',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isEn ? '中文' : 'EN'}
            </button>
          )}

          {/* 草稿箱入口 */}
          {onViewDraftBox && (
            <button
              onClick={onViewDraftBox}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#888',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '10px',
                whiteSpace: 'nowrap',
                minHeight: 'auto',
                height: '28px',
              }}
            >
              📋 {t('draftBox.title')}
              {draftCount > 0 && (
                <span style={{
                  background: '#ff9800',
                  color: '#000',
                  borderRadius: '50%',
                  padding: '0 5px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  minWidth: '16px',
                  textAlign: 'center',
                }}>
                  {draftCount}
                </span>
              )}
            </button>
          )}

          {/* 导出按钮 */}
          <button
            onClick={() => {
              if (exportMode) {
                const recordsToExport = history.filter(h => selectedForExport.has(h.id));
                if (recordsToExport.length === 0) {
                  showToast?.('noExportSelected');
                  return;
                }
                exportHistoryPDF(recordsToExport);
                setExportMode(false);
                setSelectedForExport(new Set());
              } else {
                setExportMode(true);
                setSelectedForExport(new Set());
              }
            }}
            style={{
              padding: '3px 10px',
              background: exportMode ? 'rgba(230,126,34,0.15)' : 'rgba(255,255,255,0.05)',
              border: exportMode ? '1px solid rgba(230,126,34,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: exportMode ? '#e8a87c' : '#888',
              borderRadius: 'var(--radius-sm)',
              fontSize: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 'auto',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {exportMode
              ? (isEn ? `Export (${selectedForExport.size})` : `导出 (${selectedForExport.size})`)
              : t('history.export')}
          </button>

          {/* 取消导出按钮 */}
          {exportMode && (
            <button
              onClick={() => {
                setExportMode(false);
                setSelectedForExport(new Set());
              }}
              style={{
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#888',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                minHeight: 'auto',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isEn ? 'Cancel' : '取消'}
            </button>
          )}

          {/* 返回按钮 */}
          <button
            onClick={onBack}
            style={{
              padding: '3px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#888',
              borderRadius: 'var(--radius-sm)',
              fontSize: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 'auto',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {t('history.back')}
          </button>
        </div>
      </div>

      {/* ===== 搜索栏 ===== */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        painTypeFilter={painTypeFilter}
        setPainTypeFilter={setPainTypeFilter}
        painTypes={painTypes}
        t={t}
        isEn={isEn}
        onClear={handleClearSearch}
        resultCount={filteredHistory.length}
      />

      {/* ===== 趋势摘要 ===== */}
      <TrendSummary history={filteredHistory} t={t} isEn={isEn} />

      {/* ===== 疼痛类型分布 ===== */}
      <PainTypeDistribution history={filteredHistory} t={t} />

      {/* ===== 对比视图 ===== */}
      {(compareMode || compareSource) && (
        <ComparisonView
          source={compareSource}
          target={compareTarget}
          t={t}
          isEn={isEn}
          onClear={handleClearCompare}
        />
      )}

      {/* ===== 视图内容 ===== */}
      {filteredHistory.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#444',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>
            {searchQuery || painTypeFilter !== 'all' ? '🔍' : '🌱'}
          </div>
          <p style={{ fontSize: 'var(--text-base)', margin: 0 }}>
            {searchQuery || painTypeFilter !== 'all'
              ? t('history.searchEmpty')
              : t('history.empty')}
          </p>
          {(searchQuery || painTypeFilter !== 'all') && (
            <p style={{ fontSize: 'var(--text-sm)', margin: '8px 0 0 0', color: '#333' }}>
              {t('history.searchHint')}
            </p>
          )}
          {!searchQuery && painTypeFilter === 'all' && (
            <p style={{ fontSize: 'var(--text-sm)', margin: '8px 0 0 0', color: '#333' }}>
              {isEn
                ? 'Your journey of listening to your body starts here'
                : '倾听身体的旅程，从这里开始'}
            </p>
          )}
          {/* 清除搜索按钮 */}
          {(searchQuery || painTypeFilter !== 'all') && (
            <button
              onClick={handleClearSearch}
              style={{
                marginTop: '16px',
                padding: '6px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#888',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('history.searchClear')}
            </button>
          )}
        </div>
      ) : viewMode === 'timeline' ? (
        <TimelineView
          records={filteredHistory}
          t={t}
          isEn={isEn}
          onRecordClick={(record) => handleViewRecord(record)}
        />
      ) : (
        // ===== 日历视图 =====
        <>
          {/* 日历面板 */}
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <button
                onClick={() => changeMonth(-1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
              >
                ‹
              </button>
              <span style={{ color: '#ccc', fontSize: '15px', fontWeight: '400' }}>
                {formatYearMonth(year, month, isEn)}
              </span>
              <button
                onClick={() => changeMonth(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
              >
                ›
              </button>
            </div>

            <div style={{ display: 'flex', marginBottom: '12px' }}>
              {getWeekDays().map((day) => {
                const isWeekend = day === t('history.sun') || day === t('history.sat');
                return (
                  <div
                    key={day}
                    style={{
                      width: '14.28%',
                      textAlign: 'center',
                      color: isWeekend ? 'rgba(211,47,47,0.3)' : '#444',
                      fontSize: '11px',
                      fontWeight: isWeekend ? '400' : '300',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ width: '14.28%', padding: '6px', boxSizing: 'border-box' }} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateKey = formatDateKey(year, month, day);
                const hasRecord = hasRecordOnDate(day);
                const hasMultiple = hasMultipleRecordsOnDate(day);
                const painColor = getDayPainColor(day);
                const isSelected = selectedDate === dateKey;
                const isToday = todayStr === dateKey;
                const isMenstrual = isMenstrualDate(day);
                const recordCount = getRecordCountOnDate(day);

                return (
                  <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    style={{
                      width: '14.28%',
                      padding: '6px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: isSelected
                          ? 'rgba(230,126,34,0.25)'
                          : hasRecord
                            ? 'rgba(230,126,34,0.12)'
                            : isToday
                              ? 'rgba(255,255,255,0.05)'
                              : 'transparent',
                        border: isSelected
                          ? '2px solid rgba(230,126,34,0.5)'
                          : hasRecord
                            ? '1.5px solid rgba(230,126,34,0.25)'
                            : isToday
                              ? '1px solid rgba(255,255,255,0.08)'
                              : '1px solid transparent',
                        color: isSelected
                          ? '#f0d0b0'
                          : hasRecord
                            ? '#e8c8a8'
                            : isMenstrual
                              ? '#ffcdd2'
                              : isToday
                                ? '#aaa'
                                : '#444',
                        fontWeight: isSelected || hasRecord ? '500' : '300',
                        fontSize: 'var(--text-base)',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                    >
                      {day}
                      {hasRecord && !isSelected && recordCount > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          fontSize: '8px',
                          color: 'rgba(230,126,34,0.5)',
                          fontWeight: '400',
                        }}>
                          {recordCount}
                        </span>
                      )}
                    </div>
                    {/* 疼痛标记点 */}
                    {hasRecord && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '2px',
                          marginTop: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: isSelected ? '#f0d0b0' : (painColor || '#e67e22'),
                            opacity: isSelected ? 0.9 : 0.7,
                          }}
                        />
                        {hasMultiple && (
                          <div
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: isSelected ? '#f0d0b0' : (painColor || '#e67e22'),
                              opacity: isSelected ? 0.6 : 0.35,
                            }}
                          />
                        )}
                      </div>
                    )}
                    {!hasRecord && (
                      <div style={{ height: '9px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== 选中日期记录列表 ===== */}
          {selectedDate && (
            <div style={{ marginTop: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#666', fontSize: 'var(--text-base)' }}>📅</span>
                  <span style={{ color: '#888', fontSize: 'var(--text-base)', fontWeight: '300' }}>
                    {t('history.recordsOfDate', { date: selectedDate })}
                  </span>
                  <span style={{ color: '#444', fontSize: '12px' }}>
                    · {selectedDateRecords.length} {isEn ? 'records' : '条记录'}
                  </span>
                </div>
              </div>

              {selectedDateRecords.length === 0 ? (
                <div style={{
                  background: 'rgba(255,255,255,0.01)',
                  padding: '32px 20px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  border: '1px dashed rgba(255,255,255,0.04)',
                }}>
                  <span style={{ color: '#444', fontSize: 'var(--text-base)' }}>{t('history.noRecordThisDay')}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedDateRecords.map((record) => (
                    <RecordCard
                      key={record.id}
                      record={record}
                      t={t}
                      isEn={isEn}
                      onView={() => handleViewRecord(record)}
                      onDelete={() => handleDeleteRecord(record.id)}
                      onCompare={handleCompareSelect}
                      isCompareSelected={compareSource?.id === record.id}
                      isCompareTarget={compareTarget?.id === record.id}
                      exportMode={exportMode}
                      isExportSelected={selectedForExport.has(record.id)}
                      onToggleExport={(id) => {
                        const newSet = new Set(selectedForExport);
                        if (newSet.has(id)) {
                          newSet.delete(id);
                        } else {
                          newSet.add(id);
                        }
                        setSelectedForExport(newSet);
                      }}
                      onShare={(record) => onShareRecord?.(record)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== 汇总分组折叠视图 ===== */}
          {history.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  paddingTop: '20px',
                }}
              >
                <span style={{ color: '#666', fontSize: '13px', letterSpacing: '0.5px' }}>
                  {t('history.allRecords')}
                  {filteredHistory.length !== history.length && (
                    <span style={{ color: '#444', fontSize: '11px', marginLeft: '8px' }}>
                      ({t('history.matchingRecords')}: {filteredHistory.length})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowGroupedView(!showGroupedView)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#555',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {showGroupedView
                    ? t('history.collapseLabel')
                    : t('history.expandLabel')}
                </button>
              </div>

              {showGroupedView && Object.entries(groupedHistory)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([monthKey, records]) => {
                  // 检查这个月是否有匹配的记录
                  const monthRecords = records.filter(r => filteredHistory.some(f => f.id === r.id));
                  if (monthRecords.length === 0 && (searchQuery || painTypeFilter !== 'all')) return null;

                  const isCollapsed = collapsedMonths[monthKey] || false;
                  const displayRecords = searchQuery || painTypeFilter !== 'all' ? monthRecords : records;

                  return (
                    <div key={monthKey} style={{ marginBottom: '8px' }}>
                      <div
                        onClick={() => toggleMonth(monthKey)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.015)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <span style={{ color: '#888', fontSize: '13px' }}>
                          {monthKey}
                          {(searchQuery || painTypeFilter !== 'all') && monthRecords.length !== records.length && (
                            <span style={{ color: '#e8a87c', fontSize: '11px', marginLeft: '8px' }}>
                              ({monthRecords.length}/{records.length})
                            </span>
                          )}
                        </span>
                        <span style={{ color: '#555', fontSize: '11px' }}>
                          {t('history.recordsCount', { count: displayRecords.length })}
                          <span style={{ marginLeft: '6px', color: '#444' }}>
                            {isCollapsed ? '▶' : '▼'}
                          </span>
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div style={{ padding: '4px 0 0 4px' }}>
                          {displayRecords.map((record) => (
                            <RecordCard
                              key={record.id}
                              record={record}
                              t={t}
                              isEn={isEn}
                              compact
                              onView={() => handleViewRecord(record)}
                              onDelete={() => handleDeleteRecord(record.id)}
                              onCompare={handleCompareSelect}
                              isCompareSelected={compareSource?.id === record.id}
                              isCompareTarget={compareTarget?.id === record.id}
                              exportMode={exportMode}
                              isExportSelected={selectedForExport.has(record.id)}
                              onToggleExport={(id) => {
                                const newSet = new Set(selectedForExport);
                                if (newSet.has(id)) {
                                  newSet.delete(id);
                                } else {
                                  newSet.add(id);
                                }
                                setSelectedForExport(newSet);
                              }}
                              onShare={(record) => onShareRecord?.(record)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* ===== 记录详情弹窗 ===== */}
      <RecordDetailModal
        viewingDiary={viewingDiary}
        mode="history"
        onClose={() => setViewingDiary(null)}
        onDelete={handleDeleteRecord}
        onShare={(record) => onShareRecord?.(record)}
        onPublish={(record, customText) => {
          setPublishTarget(record);
          setPublishCustomText(customText || '');
          setShowPublishModal(true);
        }}
        lang={lang}
      />

      {/* ===== 发布确认弹窗 ===== */}
      {publishConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-xl)',
          }}
          onClick={() => setPublishConfirm(null)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              maxWidth: '300px',
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🖼️</div>
            <p style={{ color: '#ccc', fontSize: 'var(--text-base)', lineHeight: '1.6', margin: '0 0 8px 0' }}>
              {t('diary.publishEmptyTitle')}
            </p>
            <p style={{ color: '#888', fontSize: '12px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {t('diary.publishEmptyDesc')}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setPublishConfirm(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#888',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  onPublishRecord?.(publishConfirm.record, '');
                  setPublishConfirm(null);
                }}
                style={{
                  background: 'rgba(211,47,47,0.15)',
                  border: '1px solid rgba(211,47,47,0.3)',
                  color: '#d32f2f',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  minHeight: '40px',
                }}
              >
                {t('diary.publishAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 发布弹窗 ===== */}
      <PublishPostModal
        isOpen={showPublishModal}
        imgUrl={publishTarget?.img}
        postText={publishCustomText}
        setPostText={setPublishCustomText}
        onClose={() => {
          setShowPublishModal(false);
          setPublishTarget(null);
          setPublishCustomText('');
        }}
        onSubmit={(submitData) => {
          if (publishTarget) {
            onPublishRecord?.(publishTarget, submitData.text);
          }
          setShowPublishModal(false);
          setPublishTarget(null);
          setPublishCustomText('');
        }}
      />
    </div>
  );
}