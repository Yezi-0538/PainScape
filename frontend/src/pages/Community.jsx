// src/pages/CommunityPage.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { PAIN_NAME_MAP } from '../i18n/translationsConstants';

export default function CommunityPage({
  // 导航
  onBack,

  // 数据
  posts,
  setPosts,

  // 筛选
  painFilter,
  setPainFilter,

  // 查看帖子
  viewingPost,
  setViewingPost,

  // 点赞
  handleLikePost,

  // 经验
  showExpInput,
  setShowExpInput,
  expText,
  setExpText,
  expTags,
  setExpTags,
  handleAddExperience,

  // 工具函数
  updatePostInCloud,
  showToast,
}) {
    const { t } = useI18n(); 
  // ===== 内部函数 =====
  const getDynamicCommunityStats = () => {
    if (!posts || posts.length === 0) return { total: 0, topPainKey: 'twist' };

    const total = posts.length < 5 ? posts.length + 6 : posts.length;

    const counts = {};
    posts.forEach((p) => {
      const tag = p.painTags?.[0] || 'twist';
      counts[tag] = (counts[tag] || 0) + 1;
    });

    const topPainKey = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b), 'twist');

    return { total, topPainKey };
  };

  const getTopReliefTips = (currentFilter) => {
    let eligible = posts.filter((p) => p.userExperience && p.userExperience.trim());
    if (currentFilter !== 'all') {
      eligible = eligible.filter((p) => (p.painTags || []).includes(currentFilter));
    }
    return eligible.sort((a, b) => (b.helpfulVotes || 0) - (a.helpfulVotes || 0)).slice(0, 5);
  };

  const { total, topPainKey } = getDynamicCommunityStats();
  const displayPainName = t(`painNames.${topPainKey}`);
  const topTips = getTopReliefTips(painFilter);

  // ===== 处理投票 =====
  const handleHelpfulVote = async (tip, e) => {
    e.stopPropagation();
    const hasVoted = tip.hasUserVotedHelpful || false;
    const nextVotes = (tip.helpfulVotes || 0) + (hasVoted ? -1 : 1);
    const updates = { helpfulVotes: nextVotes, hasUserVotedHelpful: !hasVoted };

    setPosts((prev) => prev.map((p) => (p.id === tip.id ? { ...p, ...updates } : p)));
    showToast(hasVoted ? 'helpfulRemoved' : 'helpfulAdded');

    await updatePostInCloud(tip.id, updates);
  };

  // ===== 处理拥抱 =====
  const handleHug = async (postId, e) => {
    e.stopPropagation();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isHugged = post.hasUserHugged || false;
    const updates = {
      hugs: (post.hugs || 0) + (isHugged ? -1 : 1),
      hasUserHugged: !isHugged,
    };

    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)));
    showToast(isHugged ? 'hugRetracted' : 'hugSent');

    await updatePostInCloud(postId, updates);
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#0a0a0a',
        width: '100vw',
        minHeight: '100vh',
        padding: '20px',
        paddingBottom: '100px',
        boxSizing: 'border-box',
      }}
    >
      {/* 头部 */}
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
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>
          {t('community.title')}
        </h2>
        <button
          className="retry-btn"
          style={{ margin: 0, padding: '6px 15px', width: 'auto' }}
          onClick={onBack}
        >
          {t('community.back')}
        </button>
      </div>

      {/* 周统计 */}
      <div
        style={{
          background: 'rgba(211,47,47,0.06)',
          border: '1px solid rgba(211,47,47,0.15)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#ffcdd2',
            fontSize: '13.5px',
            margin: 0,
            fontWeight: '500',
            lineHeight: '1.5',
          }}
        >
          {t('community.weeklyStats', { count: posts.length, pain: displayPainName })}
        </p>
      </div>

      {/* 筛选 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <button
          onClick={() => setPainFilter('all')}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: 'none',
            whiteSpace: 'nowrap',
            background: painFilter === 'all' ? '#d32f2f' : '#1e1e1e',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          {t('community.filterAll')}
        </button>
        {Object.entries(PAIN_NAME_MAP).map(([key, name]) => (
          <button
            key={key}
            onClick={() => setPainFilter(key)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: 'none',
              whiteSpace: 'nowrap',
              background: painFilter === key ? '#d32f2f' : '#1e1e1e',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {t(`painNames.${key}`)} ({posts.filter((p) => (p.painTags || []).includes(key)).length})
          </button>
        ))}
      </div>

      {/* 自愈锦囊 */}
      <div style={{ marginBottom: '30px' }}>
        <h3
          style={{
            color: '#4caf50',
            fontSize: '14px',
            margin: '0 0 12px 0',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {t('community.topTipsTitle')}
        </h3>

        {topTips.length === 0 ? (
          <div
            style={{
              background: '#121212',
              border: '1px dashed #333',
              borderRadius: '14px',
              padding: '24px',
              textAlign: 'center',
              color: '#666',
              fontSize: '12.5px',
            }}
          >
            {t('community.topTipsEmpty')}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none',
            }}
          >
            {topTips.map((tip) => (
              <div
                key={tip.id}
                style={{
                  flexShrink: 0,
                  width: '260px',
                  background: 'linear-gradient(135deg, #161a16, #121212)',
                  border: '1.5px solid rgba(76, 175, 80, 0.25)',
                  borderRadius: '16px',
                  padding: '16px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#4caf50',
                        background: 'rgba(76,175,80,0.1)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      {t(`painNames.${tip.painTags?.[0] || 'twist'}`)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      👍 {tip.helpfulVotes || 0}
                    </span>
                  </div>
                  <p
                    style={{
                      color: '#ddd',
                      fontSize: '13px',
                      margin: 0,
                      lineHeight: '1.5',
                      height: '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    “{tip.userExperience}”
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    borderTop: '1px solid #222',
                    paddingTop: '8px',
                  }}
                >
                  <button
                    onClick={() => setViewingPost(tip)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    查看详情
                  </button>
                  <button
                    onClick={(e) => handleHelpfulVote(tip, e)}
                    style={{
                      background: tip.hasUserVotedHelpful
                        ? 'rgba(76,175,80,0.15)'
                        : 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(76,175,80,0.3)',
                      borderRadius: '12px',
                      color: '#4caf50',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {tip.hasUserVotedHelpful
                      ? t('post.votedHelpful') || '已认可'
                      : '+ ' + (t('post.markHelpful') || '亲测有用')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 图片网格 */}
      <h3
        style={{
          color: '#fff',
          fontSize: '14px',
          margin: '0 0 12px 0',
          fontWeight: '600',
        }}
      >
        🖼️ 具身痛觉图谱
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {posts
          .filter((p) => painFilter === 'all' || (p.painTags || []).includes(painFilter))
          .map((post) => (
            <div
              key={post.id}
              style={{
                background: '#121212',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #222',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={post.img}
                onClick={() =>
                  setViewingPost({
                    ...post,
                    hugs: post.hugs || 0,
                    hasUserHugged: post.hasUserHugged || false,
                    userExperience: post.userExperience || null,
                    experienceTags: post.experienceTags || [],
                  })
                }
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  background: '#000',
                }}
              />
              <div
                style={{
                  padding: '12px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <p
                  style={{
                    color: '#eee',
                    fontSize: '12.5px',
                    margin: '0 0 10px 0',
                    lineHeight: '1.4',
                    fontWeight: '500',
                  }}
                >
                  {post.text}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      color: '#d32f2f',
                      fontSize: '10px',
                      background: 'rgba(211,47,47,0.1)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                    }}
                  >
                    {t(`painNames.${post.painTags?.[0] || 'twist'}`)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikePost(post.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ❤️ {post.likes || 0}
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}