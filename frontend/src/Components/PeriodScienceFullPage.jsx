// src/Components/PeriodScienceFullPage.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/i18nContext';

const PAGE_SIZE = 12; // 🌟 规定每页容纳 12 条科普

const HOT_SEARCH_TAGS = {
  zh: ['洗头洗澡', '热敷', '棉条安全', '饮食红黑榜', '血渍清洗', '止痛药', '经血颜色'],
  en: ['Shower', 'Heat therapy', 'Tampon safety', 'Foods to eat', 'Blood stains', 'Painkillers', 'Blood color'],
};

export default function PeriodScienceFullPage({ onBack, userTips = [], onUserTipsChange }) {
  const { t, lang } = useI18n();
  const isEn = lang === 'en';

  const scrollContainerRef = useRef(null); // 滚动容器引用

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1); // 🌟 当前页数状态

  // 控制添加弹窗显示
  const [showAddModal, setShowAddModal] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputTag, setInputTag] = useState('');

  // 页面打开时锁定背景滚动
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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

  // 3. 搜索过滤
  const isSearching = searchQuery.trim().length > 0;
  const filteredCards = useMemo(() => {
    if (!isSearching) return allTips;

    const query = searchQuery.trim().toLowerCase();
    return allTips.filter((item) => {
      const title = (isEn ? (item.title_en || item.title_zh) : (item.title_zh || item.title_en)).toLowerCase();
      const desc = (isEn ? (item.desc_en || item.desc_zh) : (item.desc_zh || item.desc_en)).toLowerCase();
      const tag = (isEn ? (item.tag_en || item.tag_zh) : (item.tag_zh || item.tag_en)).toLowerCase();
      return title.includes(query) || desc.includes(query) || tag.includes(query);
    });
  }, [isSearching, searchQuery, allTips, isEn]);

  // 搜索关键字发生变动时，重置回第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ============================================================
  // 🌟 分页计算与页码格局算法
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));

  // 保证当前页码不超出总页数
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 切割当前页需要展示的 12 条卡片
  const paginatedCards = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredCards.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCards, currentPage]);

  // 翻页并平滑回到顶部
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🌟 格局算法：五页以内展示 1 2 3 4 5；五页以上展示 1 ··· 当前页-1 当前页 当前页+1 ··· 最大页
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // 总页数 > 5
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '···', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '···', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    // 中间标准格局：1 ··· 当前-1 当前 当前+1 ··· 最大页
    return [1, '···', currentPage - 1, currentPage, currentPage + 1, '···', totalPages];
  }, [currentPage, totalPages]);

  // 4. 添加与删除用户科普
  const handleAddTip = () => {
    if (!inputTitle.trim() || !inputDesc.trim()) return;

    const newTip = {
      id: `user-tip-${Date.now()}`,
      title_zh: isEn ? '' : inputTitle.trim(),
      title_en: isEn ? inputTitle.trim() : '',
      desc_zh: isEn ? '' : inputDesc.trim(),
      desc_en: isEn ? inputDesc.trim() : '',
      tag_zh: isEn ? '' : (inputTag.trim() || t('periodScience.userTag') || '用户分享'),
      tag_en: isEn ? (inputTag.trim() || t('periodScience.userTag') || 'User Share') : '',
      isUser: true,
      createdLang: lang,
    };

    const updated = [newTip, ...userTips];
    onUserTipsChange && onUserTipsChange(updated);

    setInputTitle('');
    setInputDesc('');
    setInputTag('');
    setShowAddModal(false);
    setCurrentPage(1); // 添加后跳转到第一页查看新卡片
  };

  const handleDeleteTip = (tipId) => {
    const updated = userTips.filter(tip => tip.id !== tipId);
    onUserTipsChange && onUserTipsChange(updated);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setInputTitle('');
    setInputDesc('');
    setInputTag('');
  };

  const hotTags = HOT_SEARCH_TAGS[lang] || HOT_SEARCH_TAGS.zh;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#fff',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== 顶部导航栏 ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: '#121212',
          borderBottom: '1px solid #222',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#eee',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← {isEn ? 'Back' : '返回'}
        </button>

        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '600',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💡</span>
          <span>{isEn ? 'All Period Knowledge' : '全部经期冷知识与科普'}</span>
        </h3>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'rgba(76, 175, 80, 0.15)',
            border: '1px solid rgba(76, 175, 80, 0.4)',
            color: '#81c784',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>✏️</span>
          <span>{isEn ? 'Add' : '添加科普'}</span>
        </button>
      </div>

      {/* ===== 主滚动区域 ===== */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px 40px 20px',
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* 🔍 搜索框 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#161616',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            padding: '6px 14px',
            gap: '8px',
            boxSizing: 'border-box',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontSize: '14px', color: '#888' }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search period facts, diet, care tips...' : '搜索经期常识、护理技巧、饮食红黑榜...'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              padding: '6px 0',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '13px',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* 热门标签 */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '10px',
            marginBottom: '10px',
            scrollbarWidth: 'none',
          }}
        >
          {hotTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)}
              style={{
                background: searchQuery === tag ? 'rgba(239, 83, 80, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: searchQuery === tag ? '1px solid #ef5350' : '1px solid #282828',
                color: searchQuery === tag ? '#ff8a80' : '#888',
                borderRadius: '12px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 搜索提示 */}
        {isSearching && (
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isEn ? `Found ${filteredCards.length} matching topics` : `找到 ${filteredCards.length} 条相关科普`}</span>
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: '11px' }}
            >
              {isEn ? 'Clear search' : '清空搜索'}
            </button>
          </div>
        )}

        {/* 🌟 当前页的卡片列表（最多 12 条） */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {paginatedCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#666', fontSize: '13px' }}>
              {isEn ? 'No knowledge cards found' : '暂无相关科普内容'}
            </div>
          ) : (
            paginatedCards.map((item) => (
              <div
                key={item.id}
                style={{
                  background: item.isUser ? '#1a2a1a' : '#141414',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: `1px solid ${item.isUser ? '#2a4a2a' : '#222'}`,
                  borderLeft: `4px solid ${item.isUser ? '#4caf50' : '#ef5350'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600', flex: 1 }}>
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
                        }}
                      >
                        {isEn ? 'Custom' : '自建'}
                      </span>
                    )}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        color: item.isUser ? '#81c784' : '#ff8a80',
                        background: item.isUser ? 'rgba(76, 175, 80, 0.12)' : 'rgba(239, 83, 80, 0.12)',
                        padding: '2px 7px',
                        borderRadius: '6px',
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
                          color: '#666',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '0 4px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef5350')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', margin: 0 }}>
                  {isEn ? (item.desc_en || item.desc_zh) : (item.desc_zh || item.desc_en)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* ============================================================ */}
        {/* 🌟 底部标准分页导航器 */}
        {/* ============================================================ */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '28px',
              paddingBottom: '20px',
              userSelect: 'none',
              flexWrap: 'wrap',
            }}
          >
            {/* 上一页 */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentPage === 1 ? '#444' : '#ccc',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isEn ? 'Prev' : '上一页'}
            </button>

            {/* 页码与省略号 */}
            {paginationItems.map((item, index) => {
              if (item === '···') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    style={{
                      color: '#666',
                      padding: '0 4px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                    }}
                  >
                    ···
                  </span>
                );
              }

              const isCurrent = item === currentPage;

              return (
                <button
                  key={`page-${item}`}
                  onClick={() => handlePageChange(item)}
                  style={{
                    background: isCurrent ? '#ef5350' : 'rgba(255,255,255,0.04)',
                    border: isCurrent ? '1px solid #ef5350' : '1px solid rgba(255,255,255,0.08)',
                    color: isCurrent ? '#fff' : '#aaa',
                    borderRadius: '8px',
                    minWidth: '32px',
                    height: '32px',
                    padding: '0 6px',
                    fontSize: '12px',
                    fontWeight: isCurrent ? '700' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = '#444';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.color = '#aaa';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                >
                  {item}
                </button>
              );
            })}

            {/* 下一页 */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentPage === totalPages ? '#444' : '#ccc',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isEn ? 'Next' : '下一页'}
            </button>
          </div>
        )}
      </div>

      {/* ===== 添加科普弹窗 (Modal) ===== */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: '#161616',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '20px 22px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✏️</span>
                <span>{isEn ? 'Add Period Knowledge' : '添加经期科普知识'}</span>
              </h4>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '5px' }}>
                {isEn ? 'Title' : '标题'} <span style={{ color: '#ef5350' }}>*</span>
              </label>
              <input
                type="text"
                placeholder={isEn ? 'e.g. Magnesium helps cramps' : '例如：补充镁元素有助于平复平滑肌痉挛'}
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#101010',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '5px' }}>
                {isEn ? 'Description' : '内容描述'} <span style={{ color: '#ef5350' }}>*</span>
              </label>
              <textarea
                placeholder={isEn ? 'Share your period knowledge or care tips...' : '分享你的科普常识或护理经验...'}
                value={inputDesc}
                onChange={(e) => setInputDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#101010',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '5px' }}>
                {isEn ? 'Tag (optional)' : '标签（可选）'}
              </label>
              <input
                type="text"
                placeholder={isEn ? 'e.g. Nutrition, Care' : '例如：营养饮食、生活起居'}
                value={inputTag}
                onChange={(e) => setInputTag(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#101010',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '7px 18px',
                  background: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {isEn ? 'Cancel' : '取消'}
              </button>
              <button
                onClick={handleAddTip}
                disabled={!inputTitle.trim() || !inputDesc.trim()}
                style={{
                  padding: '7px 20px',
                  background: (!inputTitle.trim() || !inputDesc.trim()) ? '#2d4d2d' : '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!inputTitle.trim() || !inputDesc.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                {isEn ? 'Save' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}