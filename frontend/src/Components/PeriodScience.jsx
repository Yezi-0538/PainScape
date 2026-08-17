// src/Components/PeriodScience.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/i18nContext';

const PeriodScience = ({ userTips = [], onAddUserTip }) => {
  const { t, lang } = useI18n();
  const isEn = lang === 'en';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputTag, setInputTag] = useState('');
  const [localUserTips, setLocalUserTips] = useState(userTips || []);

  // ============================================================
  // ✅ 从 translations.js 读取科普数据
  // ============================================================
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

  // ============================================================
  // ✅ 合并预设 + 用户自定义
  // ============================================================
  const allTips = useMemo(() => {
    return [...scienceCards, ...localUserTips];
  }, [scienceCards, localUserTips]);

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const refreshCards = useCallback(() => {
    setIsRefreshing(true);
    const shuffled = shuffleArray(allTips);
    setSelectedCards(shuffled.slice(0, 3));
    setTimeout(() => setIsRefreshing(false), 300);
  }, [allTips, shuffleArray]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  const handleRefresh = () => {
    refreshCards();
  };

  const handleAddTip = () => {
    if (!inputTitle.trim() || !inputDesc.trim()) return;

    const newTip = {
      id: Date.now(),
      title_zh: isEn ? '' : inputTitle.trim(),
      title_en: isEn ? inputTitle.trim() : '',
      desc_zh: isEn ? '' : inputDesc.trim(),
      desc_en: isEn ? inputDesc.trim() : '',
      tag_zh: isEn ? '' : (inputTag.trim() || t('periodScience.userTag')),
      tag_en: isEn ? (inputTag.trim() || t('periodScience.userTag')) : '',
      isUser: true,
      createdLang: lang,
    };

    setLocalUserTips(prev => [newTip, ...prev]);
    if (onAddUserTip) {
      onAddUserTip(newTip);
    }

    setInputTitle('');
    setInputDesc('');
    setInputTag('');
    setShowInput(false);
  };

  const handleDeleteTip = (tipId) => {
    setLocalUserTips(prev => prev.filter(tip => tip.id !== tipId));
    if (onAddUserTip) {
      onAddUserTip(localUserTips.filter(tip => tip.id !== tipId));
    }
  };

  return (
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #222' }}>
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h4
          style={{
            color: '#ef5350',
            fontSize: '15px',
            fontWeight: '700',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💡</span>
          <span>{t('periodScience.title')}</span>
        </h4>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => setShowInput(!showInput)}
            style={{
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              color: '#81c784',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>✏️</span>
            <span>{t('periodScience.addTip')}</span>
          </button>

          <button
            onClick={handleRefresh}
            style={{
              background: 'rgba(239, 83, 80, 0.1)',
              border: '1px solid rgba(239, 83, 80, 0.3)',
              color: '#ff8a80',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '11.5px',
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
        </div>
      </div>

      {/* ✅ 用户添加输入区域 */}
      {showInput && (
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid #333',
          }}
        >
          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                color: '#888',
                fontSize: '11px',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {isEn ? 'Title' : '标题'}
            </label>
            <input
              type="text"
              placeholder={isEn ? 'e.g. Magnesium helps cramps' : '例如：补镁有助于缓解痉挛'}
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#111',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                color: '#888',
                fontSize: '11px',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {isEn ? 'Description' : '内容描述'}
            </label>
            <textarea
              placeholder={isEn ? 'Share your knowledge...' : '分享你的科普知识...'}
              value={inputDesc}
              onChange={(e) => setInputDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#111',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '60px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                color: '#888',
                fontSize: '11px',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {isEn ? 'Tag (optional)' : '标签（可选）'}
            </label>
            <input
              type="text"
              placeholder={isEn ? 'e.g. Nutrition, Exercise' : '例如：营养、运动'}
              value={inputTag}
              onChange={(e) => setInputTag(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#111',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAddTip}
              style={{
                padding: '6px 20px',
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                minHeight: '36px',
              }}
            >
              {t('periodScience.add')}
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setInputTitle('');
                setInputDesc('');
                setInputTag('');
              }}
              style={{
                padding: '6px 20px',
                background: 'transparent',
                color: '#888',
                border: '1px solid #333',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                minHeight: '36px',
              }}
            >
              {t('periodScience.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ✅ 科普卡片列表 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          opacity: isRefreshing ? 0.3 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {selectedCards.map((item) => (
          <div
            key={item.id}
            style={{
              background: item.isUser ? '#1a2a1a' : '#161616',
              borderRadius: '14px',
              padding: '14px 16px',
              border: `1px solid ${item.isUser ? '#2a4a2a' : '#262626'}`,
              borderLeft: `4px solid ${item.isUser ? 'rgba(76, 175, 80, 0.8)' : 'rgba(239, 83, 80, 0.8)'}`,
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '6px',
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              {/* ✅ 标题 - 优先当前语言 */}
              <span
                style={{
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.2px',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {isEn ? (item.title_en || item.title_zh) : (item.title_zh || item.title_en)}
                {item.isUser && (
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '9px',
                      color: '#4caf50',
                      background: 'rgba(76, 175, 80, 0.15)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('periodScience.youAdded')}
                  </span>
                )}
              </span>

              {/* ✅ 标签 - 优先当前语言 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: item.isUser ? '#4caf50' : '#ef5350',
                    background: item.isUser ? 'rgba(76, 175, 80, 0.12)' : 'rgba(239, 83, 80, 0.12)',
                    border: `1px solid ${item.isUser ? 'rgba(76, 175, 80, 0.25)' : 'rgba(239, 83, 80, 0.25)'}`,
                    padding: '2px 7px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isEn ? (item.tag_en || item.tag_zh) : (item.tag_zh || item.tag_en)}
                </span>

                {item.isUser && (
                  <button
                    onClick={() => handleDeleteTip(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#555',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      transition: 'color 0.2s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef5350';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#555';
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ✅ 描述 - 优先当前语言 */}
            <p
              style={{
                color: '#aaa',
                fontSize: '11px',
                lineHeight: '1.7',
                margin: 0,
                textAlign: 'justify',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {isEn ? (item.desc_en || item.desc_zh) : (item.desc_zh || item.desc_en)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeriodScience;