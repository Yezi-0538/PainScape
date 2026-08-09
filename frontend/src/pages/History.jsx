// src/pages/HistoryPage.jsx
import React, { useState, useMemo } from 'react';
import { useI18n } from '../i18n/i18nContext';
import RecordDetailModal from '../Components/modals/RecordDetailModal';
// App.jsx 顶部
// import { CHINESE_TO_KEY_MAP, PAIN_COLORS, PAIN_ICONS } from './utils/painUtils';
// getPainNameDisplay,
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
// const CHINESE_TO_KEY_MAP = {
//   '绞痛': 'twist', '刺痛': 'pierce', '坠胀': 'heavy',
//   '坠胀重压': 'heavy', '坠痛': 'heavy', '酸胀': 'wave',
//   '酸胀痛': 'wave', '弥漫酸胀痛': 'wave', '刮痛': 'scrape',
//   '撕裂痛': 'scrape', '撕裂刮痛': 'scrape',
// };


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
// 子组件：对比视图（支持任意两条记录对比）
// ============================================================
const ComparisonView = ({ source, target, t, isEn, onClear }) => {
  if (!source || !target) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#555',
        fontSize: '13px',
        border: '1px dashed rgba(255,255,255,0.06)',
        borderRadius: '12px',
        marginBottom: '16px',
      }}>
        {isEn
          ? 'Select two records to compare'
          : '选择两条记录进行对比'}
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

  return (
    <div style={{
      marginBottom: '16px',
      padding: '16px',
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

      {/* 对比主体 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '12px',
        alignItems: 'center',
      }}>
        {/* 源记录 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: '#888',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '6px',
          }}>
            {t('history.compareSource')}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'rgba(230,126,34,0.12)',
            border: '1px solid rgba(230,126,34,0.25)',
            borderRadius: '20px',
            color: '#e8a87c',
            fontSize: '15px',
          }}>
            <span>{sourceIcon}</span>
            <span>{sourcePain}</span>
          </div>
          <div style={{ color: '#555', fontSize: '11px', marginTop: '6px' }}>
            {sourceDate} {sourceTime}
          </div>
        </div>

        {/* VS 分隔 */}
        <div style={{
          color: '#444',
          fontSize: '14px',
          fontWeight: '300',
          letterSpacing: '2px',
          textAlign: 'center',
        }}>
          VS
        </div>

        {/* 目标记录 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: '#888',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '6px',
          }}>
            {t('history.compareTarget')}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'rgba(76,175,80,0.10)',
            border: '1px solid rgba(76,175,80,0.20)',
            borderRadius: '20px',
            color: '#81c784',
            fontSize: '15px',
          }}>
            <span>{targetIcon}</span>
            <span>{targetPain}</span>
          </div>
          <div style={{ color: '#555', fontSize: '11px', marginTop: '6px' }}>
            {targetDate} {targetTime}
          </div>
        </div>
      </div>

      {/* 对比洞察 */}
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
        {sameDay && (
          <span style={{ color: '#666', fontSize: '11px' }}>
            {isEn ? '📅 Same day' : '📅 同一天'}
          </span>
        )}
        {sameType ? (
          <span style={{ color: '#81c784', fontSize: '11px' }}>
            {isEn ? '🔄 Same pain type' : '🔄 相同感受类型'}
          </span>
        ) : (
          <span style={{ color: '#e8a87c', fontSize: '11px' }}>
            {isEn ? '🔀 Different pain types' : '🔀 不同感受类型'}
          </span>
        )}
        {!sameDay && (
          <span style={{ color: '#555', fontSize: '11px' }}>
            {isEn
              ? `↔️ Different dates`
              : `↔️ 不同日期`}
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
          <span style={{ fontSize: '14px' }}>{painIcon}</span>
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
              }}
            >
              {isEn ? 'Share' : '分享'}
            </button>
          )}
          {onCompare && (
            <span
              onClick={(e) => { e.stopPropagation(); onCompare(record); }}
              style={{
                color: isCompareSelected ? '#e8a87c' : isCompareTarget ? '#81c784' : '#555',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              {isCompareSelected ? '◎' : isCompareTarget ? '◉' : '○'}
            </span>
          )}
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
        borderRadius: '12px',
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
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
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
              fontSize: '10px',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isCompareSelected && !isCompareTarget) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isCompareSelected && !isCompareTarget) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }
            }}
          >
            {isCompareSelected
              ? (isEn ? 'Source' : '已选')
              : isCompareTarget
                ? (isEn ? 'Target' : '对比中')
                : (isEn ? 'Compare' : '对比')}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#444',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '6px',
            flexShrink: 0,
            borderRadius: '6px',
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
// 主组件
// ============================================================
export default function HistoryPage({
  history = [],
  setHistory,
  calendarDate = new Date(),
  setCalendarDate,
  selectedDate = null,
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

  const handleDeleteRecord = (recordId) => {
    if (window.confirm(t('history.deleteConfirm'))) {
      const updated = history.filter(h => h.id !== recordId);
      setHistory(updated);
      try {
        localStorage.setItem('painscape_history', JSON.stringify(updated));
      } catch (e) { }
      setSelectedDateRecords(prev => prev.filter(h => h.id !== recordId));
      if (viewingDiary?.id === recordId) setViewingDiary(null);
      // 清除对比中涉及的记录
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
        padding: '20px',
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
          marginBottom: '20px',
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          zIndex: 10,
          paddingBottom: '10px',
        }}
      >
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '400', letterSpacing: '1px' }}>
          {t('history.title')}
        </h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {setTargetLanguage && (
            <button
              onClick={() => setTargetLanguage(isEn ? 'zh' : 'en')}
              style={{
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#888',
                borderRadius: '16px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isEn ? '中文' : 'EN'}
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
                // ✅ 传入选中的记录列表
                exportHistoryPDF(recordsToExport);
                setExportMode(false);
                setSelectedForExport(new Set());
              } else {
                setExportMode(true);
                setSelectedForExport(new Set());
              }
            }}
            style={{
              padding: '4px 12px',
              background: exportMode ? 'rgba(230,126,34,0.15)' : 'rgba(255,255,255,0.05)',
              border: exportMode ? '1px solid rgba(230,126,34,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: exportMode ? '#e8a87c' : '#888',
              borderRadius: '16px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {exportMode
              ? (isEn ? `Export (${selectedForExport.size})` : `导出 (${selectedForExport.size})`)
              : t('history.export')}
          </button>

          {/* 取消按钮 - 仅在导出模式下显示 */}
          {exportMode && (
            <button
              onClick={() => {
                setExportMode(false);
                setSelectedForExport(new Set());
              }}
              style={{
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#888',
                borderRadius: '16px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {isEn ? 'Cancel' : '取消'}
            </button>
          )}
          <button
            onClick={onBack}
            style={{
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#888',
              borderRadius: '16px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {t('history.back')}
          </button>
        </div>
      </div>

      {/* 趋势摘要 */}
      <TrendSummary history={history} t={t} isEn={isEn} />

      {/* 疼痛类型分布 */}
      <PainTypeDistribution history={history} t={t} />

      {/* ===== 对比视图（全局） ===== */}
      {(compareMode || compareSource) && (
        <ComparisonView
          source={compareSource}
          target={compareTarget}
          t={t}
          isEn={isEn}
          onClear={handleClearCompare}
        />
      )}

      {/* ===== 日历面板 ===== */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
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
                    fontSize: '14px',
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
                {/* 疼痛标记点 - 选中时也显示 */}
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
              <span style={{ color: '#666', fontSize: '14px' }}>📅</span>
              <span style={{ color: '#888', fontSize: '14px', fontWeight: '300' }}>
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
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px dashed rgba(255,255,255,0.04)',
            }}>
              <span style={{ color: '#444', fontSize: '14px' }}>{t('history.noRecordThisDay')}</span>
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
              const isCollapsed = collapsedMonths[monthKey] || false;
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
                    <span style={{ color: '#888', fontSize: '13px' }}>{monthKey}</span>
                    <span style={{ color: '#555', fontSize: '11px' }}>
                      {t('history.recordsCount', { count: records.length })}
                      <span style={{ marginLeft: '6px', color: '#444' }}>
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div style={{ padding: '4px 0 0 4px' }}>
                      {records.map((record) => (
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

      {/* ===== 空状态 ===== */}
      {history.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>🌱</div>
          <p style={{ color: '#555', fontSize: '15px', fontWeight: '300', lineHeight: '1.6' }}>
            {t('history.empty')}
          </p>
          <p style={{ color: '#333', fontSize: '13px', fontWeight: '300' }}>
            {isEn
              ? 'Your journey of listening to your body starts here'
              : '倾听身体的旅程，从这里开始'}
          </p>
        </div>
      )}

      {/* ===== 记录详情弹窗 ===== */}
      <RecordDetailModal
        viewingDiary={viewingDiary}
        mode="history"
        onClose={() => setViewingDiary(null)}
        onDelete={handleDeleteRecord}
        onShare={(record) => onShareRecord?.(record)}
        onPublish={(record, customText) => onPublishRecord?.(record, customText)}
        lang={lang}
        onPublish={(record, customText) => {
          if (!customText || customText.trim() === '') {
            setPublishConfirm({ record, text: '' });
          } else {
            onPublishRecord?.(record, customText);
          }
        }}
      />
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
            padding: '20px',
          }}
          onClick={() => setPublishConfirm(null)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '300px',
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🖼️</div>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', margin: '0 0 8px 0' }}>
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
                  borderRadius: '20px',
                  fontSize: '13px',
                  cursor: 'pointer',
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
                  borderRadius: '20px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                {t('diary.publishAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}