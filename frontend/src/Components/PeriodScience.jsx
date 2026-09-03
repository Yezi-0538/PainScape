// src/Components/PeriodScience.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/i18nContext';

export default function PeriodScience({ onOpenFull, userTips = [] }) {
  const { t, lang } = useI18n();
  const isEn = lang === 'en';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);

  // 1. 读取内置科普数据
  const scienceCards = useMemo(() => {
    let cards = [];
    try {
      const rawCards = t('periodScience.cards', { returnObjects: true });
      if (Array.isArray(rawCards)) {
        cards = rawCards;
      } else if (rawCards && typeof rawCards === 'object') {
        cards = Object.values(rawCards);
      }
    } catch (e) {
      console.warn('⚠️ 无法读取 periodScience.cards', e);
    }

    return cards.map((item, index) => ({
      id: `card-${index}`,
      title_zh: item.title || '',
      title_en: item.title || '',
      desc_zh: item.desc || '',
      desc_en: item.desc || '',
      tag_zh: item.tag || '科普',
      tag_en: item.tag || 'Science',
      isFromScience: true,
    }));
  }, [t]);

  // 2. 合并数据
  const allTips = useMemo(() => {
    return [...userTips, ...scienceCards];
  }, [scienceCards, userTips]);

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // 🌟 核心修改：固定只切片取 2 条展示
  const refreshCards = useCallback(() => {
    setIsRefreshing(true);
    const shuffled = shuffleArray(allTips);
    setSelectedCards(shuffled.slice(0, 2)); // ✅ 改为 2 条
    setTimeout(() => setIsRefreshing(false), 300);
  }, [allTips, shuffleArray]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  return (
    <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #222' }}>
      {/* 头部标题与精简操作区 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h4
          style={{
            color: '#ef5350',
            fontSize: '14px',
            fontWeight: '600',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>💡</span>
          <span>{t('periodScience.title')}</span>
        </h4>

        {/* 仅保留：换一换 + 查看全部 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={refreshCards}
            style={{
              background: 'rgba(239, 83, 80, 0.08)',
              border: '1px solid rgba(239, 83, 80, 0.25)',
              color: '#ff8a80',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              opacity: isRefreshing ? 0.5 : 1,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              ↻
            </span>
            <span>{isEn ? 'Refresh' : '换一换'}</span>
          </button>

          <button
            onClick={onOpenFull}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ddd',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{isEn ? 'View All' : '查看全部'}</span>
            <span style={{ fontSize: '10px' }}>➔</span>
          </button>
        </div>
      </div>

      {/* 精选 2 条卡片列表 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          opacity: isRefreshing ? 0.3 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {selectedCards.map((item) => (
          <div
            key={item.id}
            style={{
              background: item.isUser ? '#1a2a1a' : '#141414',
              borderRadius: '12px',
              padding: '12px 14px',
              border: `1px solid ${item.isUser ? '#2a4a2a' : '#262626'}`,
              borderLeft: `4px solid ${item.isUser ? '#4caf50' : '#ef5350'}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
                gap: '8px',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isEn ? (item.title_en || item.title_zh) : (item.title_zh || item.title_en)}
              </span>

              <span
                style={{
                  fontSize: '10px',
                  color: item.isUser ? '#81c784' : '#ff8a80',
                  background: item.isUser ? 'rgba(76, 175, 80, 0.12)' : 'rgba(239, 83, 80, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isEn ? (item.tag_en || item.tag_zh) : (item.tag_zh || item.tag_en)}
              </span>
            </div>

            <p
              style={{
                color: '#aaa',
                fontSize: '11.5px',
                lineHeight: '1.6',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {isEn ? (item.desc_en || item.desc_zh) : (item.desc_zh || item.desc_en)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}