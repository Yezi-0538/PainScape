// src/pages/CommunityPage.jsx
import React from 'react';
import { useI18n } from '../i18n/i18nContext';
import { PAIN_NAME_MAP } from '../i18n/translationsConstants';
import CommunityPostDetailModal from '../Components/modals/CommunityPostDetailModal';
import { likePost, hugPost, updatePostExperience, voteHelpfulPost, deletePost } from '../services/postService';

const PAIN_KEY_MAP = {
  'twist': 'twist', '绞痛': 'twist',
  'pierce': 'pierce', '刺痛': 'pierce',
  'heavy': 'heavy', 'sink': 'heavy', '坠胀': 'heavy', '坠胀重压': 'heavy', '坠痛': 'heavy',
  'wave': 'wave', 'swell': 'wave', '酸胀': 'wave', '酸胀痛': 'wave', '弥漫酸胀痛': 'wave',
  'scrape': 'scrape', '刮痛': 'scrape', '撕裂痛': 'scrape', '撕裂刮痛': 'scrape'
};

const parseCleanText = (rawText) => {
  if (!rawText) return '分享具身痛觉图谱';
  if (typeof rawText === 'string' && rawText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawText);
      return parsed.chief_complaint || parsed.analogy || parsed.workText || '分享具身痛觉图谱';
    } catch (_) {
      return '分享具身痛觉图谱';
    }
  }
  return String(rawText);
};

export default function CommunityPage({
  onBack,
  onViewProfile,
  currentUserId,
  posts,
  setPosts,
  painFilter,
  setPainFilter,
  viewingPost,
  setViewingPost,
  showExpInput,
  setShowExpInput,
  expText,
  setExpText,
  expTags,
  setExpTags,
  handleAddExperience,
  showToast,
  isLoading,
  onRefreshCommunity,
  targetLanguage,
  setTargetLanguage,
}) {
  const { t } = useI18n();
  const isEn = targetLanguage === 'en';

  const getPostPainKey = (post) => {
    if (!post) return 'twist';
    if (post.dominantPain && PAIN_KEY_MAP[post.dominantPain]) return PAIN_KEY_MAP[post.dominantPain];
    if (post.pain_tags?.[0] && PAIN_KEY_MAP[post.pain_tags[0]]) return PAIN_KEY_MAP[post.pain_tags[0]];
    if (post.painTags?.[0] && PAIN_KEY_MAP[post.painTags[0]]) return PAIN_KEY_MAP[post.painTags[0]];
    if (post.painName && PAIN_KEY_MAP[post.painName]) return PAIN_KEY_MAP[post.painName];
    return 'twist';
  };

  const getDynamicCommunityStats = () => {
    if (!posts || posts.length === 0) return { total: 0, topPainKey: 'twist' };
    const total = posts.length;
    const counts = {};
    posts.forEach((p) => {
      const key = getPostPainKey(p);
      counts[key] = (counts[key] || 0) + 1;
    });
    const topPainKey = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b), 'twist');
    return { total, topPainKey };
  };

  // 🌟 智慧自愈货架：收集有经验的贴子，按赞数与抱抱总数由高到低降序排列 Top 5
  const getTopReliefTips = (currentFilter) => {
    let eligible = posts.filter((p) => (p.userExperience && p.userExperience.trim()) || (p.user_experience && p.user_experience.trim()));
    if (currentFilter !== 'all') {
      eligible = eligible.filter((p) => getPostPainKey(p) === currentFilter);
    }
    return eligible.sort((a, b) => {
      const scoreA = (a.likes || 0) + (a.hugs || 0) + (a.helpfulVotes || 0);
      const scoreB = (b.likes || 0) + (b.hugs || 0) + (b.helpfulVotes || 0);
      return scoreB - scoreA;
    }).slice(0, 5);
  };

  const { topPainKey } = getDynamicCommunityStats();
  const displayPainName = t(`painNames.${topPainKey}`);
  const topTips = getTopReliefTips(painFilter);

  const filteredPosts = posts.filter((p) => painFilter === 'all' || getPostPainKey(p) === painFilter);

  // 🌟 1. 实时更新贴主的缓解经验并写入数据库
  const handleSaveExperience = async (postId, newExp) => {
    const expStr = String(newExp || '').trim();
    setPosts((prev) => prev.map((p) => (String(p.id) === String(postId) ? { ...p, userExperience: expStr, user_experience: expStr } : p)));
    
    if (viewingPost && String(viewingPost.id) === String(postId)) {
      setViewingPost((prev) => (prev ? { ...prev, userExperience: expStr, user_experience: expStr } : null));
    }

    if (showToast) showToast('publishSuccess', { count: 1, pain: '缓解经验' });
    await updatePostExperience(postId, expStr, ['自愈缓解']);
  };

  // 🌟 2. 实时抱抱并同步弹窗 (无需重新退出进入)
  const handleHug = async (postId, e) => {
    if (e) e.stopPropagation();
    const post = posts.find((p) => String(p.id) === String(postId));
    if (!post) return;

    const isHugged = post.hasUserHugged || false;
    const nextHugs = (post.hugs || 0) + (isHugged ? -1 : 1);
    const updates = { hugs: nextHugs, hasUserHugged: !isHugged };

    setPosts((prev) => prev.map((p) => (String(p.id) === String(postId) ? { ...p, ...updates } : p)));
    if (viewingPost && String(viewingPost.id) === String(postId)) {
      setViewingPost((prev) => (prev ? { ...prev, ...updates } : null));
    }

    if (showToast) showToast(isHugged ? 'hugRetracted' : 'hugSent');
    await hugPost(postId, nextHugs);
  };

  // 🌟 3. 实时赞同/有用投票并同步弹窗
  const handleHelpfulVote = async (postId, e) => {
    if (e) e.stopPropagation();
    const post = posts.find((p) => String(p.id) === String(postId));
    if (!post) return;

    const hasVoted = post.hasUserVotedHelpful || false;
    const nextVotes = (post.helpfulVotes || post.helpful_votes || 0) + (hasVoted ? -1 : 1);
    const updates = {
      helpfulVotes: nextVotes,
      helpful_votes: nextVotes,
      hasUserVotedHelpful: !hasVoted,
    };

    setPosts((prev) => prev.map((p) => (String(p.id) === String(postId) ? { ...p, ...updates } : p)));
    if (viewingPost && String(viewingPost.id) === String(postId)) {
      setViewingPost((prev) => (prev ? { ...prev, ...updates } : null));
    }

    if (showToast) showToast(hasVoted ? 'helpfulRemoved' : 'helpfulAdded');
    await voteHelpfulPost(postId, nextVotes, !hasVoted);
  };

  // 🌟 4. 实时比心/点赞并同步弹窗 (无需重新退出进入)
  const handleLike = async (postId, e) => {
    if (e) e.stopPropagation();
    const post = posts.find((p) => String(p.id) === String(postId));
    if (!post) return;

    const isLiked = post.hasUserLiked || false;
    const nextLikes = (post.likes || 0) + (isLiked ? -1 : 1);
    const updates = { likes: nextLikes, hasUserLiked: !isLiked };

    setPosts((prev) => prev.map((p) => (String(p.id) === String(postId) ? { ...p, ...updates } : p)));
    if (viewingPost && String(viewingPost.id) === String(postId)) {
      setViewingPost((prev) => (prev ? { ...prev, ...updates } : null));
    }

    await likePost(postId, nextLikes);
  };

   // 🌟 4. 删除帖子处理函数
  const handleDeletePost = async (postId) => {
    // 1. 本地立即移除视图
    setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
    if (viewingPost && String(viewingPost.id) === String(postId)) {
      setViewingPost(null);
    }
    // 2. 调接口同步删数据库与 localStorage
    await deletePost(postId, currentUserId);
    if (showToast) showToast('postDeleted');
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
      {/* 顶栏 */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>
            {t('community.title')}
          </h2>
          <button
            onClick={onRefreshCommunity}
            disabled={isLoading}
            style={{
              margin: 0,
              padding: '6px 14px',
              background: isLoading ? '#444' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? t('community.refreshing') || '刷新中...' : t('community.refresh') || '刷新'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {setTargetLanguage && (
            <button
              onClick={() => setTargetLanguage(isEn ? 'zh' : 'en')}
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '20px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {isEn ? '中文' : 'EN'}
            </button>
          )}
          <button
            style={{
              margin: 0,
              padding: '6px 15px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            onClick={onBack}
          >
            {t('community.back')}
          </button>
        </div>
      </div>

      {/* 周数据统计 */}
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
        <p style={{ color: '#ffcdd2', fontSize: '13.5px', margin: 0, fontWeight: '500' }}>
          {t('community.weeklyStats', { count: posts.length, pain: displayPainName })}
        </p>
      </div>

      {/* 分类筛选 */}
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
        {Object.keys(PAIN_NAME_MAP).map((key) => {
          const count = posts.filter((p) => getPostPainKey(p) === key).length;
          return (
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
              {t(`painNames.${key}`)} ({count})
            </button>
          );
        })}
      </div>

      {/* 🌟 智慧自愈货架 (Top 5 高赞经验) */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#4caf50', fontSize: '14px', margin: '0 0 12px 0', fontWeight: '600' }}>
          {t('community.topTipsTitle')}
        </h3>

        {topTips.length === 0 ? (
          <div
            style={{
              background: '#121212',
              border: '1px dashed #333',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '12.5px',
            }}
          >
            {t('community.topTipsEmpty')}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
            {topTips.map((tip) => (
              <div
                key={tip.id}
                onClick={() => setViewingPost(tip)}
                style={{
                  flexShrink: 0,
                  width: '260px',
                  background: 'linear-gradient(135deg, #161a16, #121212)',
                  border: '1.5px solid rgba(76, 175, 80, 0.25)',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#4caf50', background: 'rgba(76,175,80,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {t(`painNames.${getPostPainKey(tip)}`)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666' }}>❤️ {tip.likes || 0}</span>
                </div>
                <p style={{ color: '#ddd', fontSize: '13px', margin: 0, lineHeight: '1.5', height: '60px', overflow: 'hidden' }}>
                  “{tip.userExperience || tip.user_experience}”
                </p>
                <div style={{ marginTop: '10px', color: '#888', fontSize: '11px', textAlign: 'right' }}>
                  by {tip.nickname || tip.authorName || tip.displayName || '同伴'} ›
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #222' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPost(tip);
                    }}
                    style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    查看详情
                  </button>
                  <button
                    onClick={(e) => handleHelpfulVote(tip.id, e)}
                    style={{
                      background: tip.hasUserVotedHelpful ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(76,175,80,0.3)',
                      borderRadius: '12px',
                      color: '#4caf50',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {tip.hasUserVotedHelpful ? t('post.votedHelpful') || '已认可' : '+ ' + (t('post.markHelpful') || '亲测有用')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 具身痛觉图谱展示网格 */}
      <h3 style={{ color: '#fff', fontSize: '14px', margin: '0 0 12px 0', fontWeight: '600' }}>
        {t('community.somaticMap')}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {filteredPosts.map((post) => {
          const painKey = getPostPainKey(post);
          const postAuthorUid = post.userId || post.user_id || post.authorId || "user_guest";
          const authorProfile = post.profiles || {};
          const authorNickname = authorProfile.nickname || post.nickname || post.authorName || post.author_name || post.displayName || "同伴";
          const authorAvatar = authorProfile.avatar || post.avatar || post.authorAvatar || post.author_avatar || "🌸";
          const authorCustomAvatar = authorProfile.custom_avatar || post.customAvatar || post.custom_avatar || "";

          return (
            <div
              key={post.id}
              onClick={() => setViewingPost(post)}
              style={{
                background: '#121212',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #222',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              {/* 发布者名片头 (点击精准绑定其 UID 跳转对方个人主页) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile && onViewProfile(postAuthorUid);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px 6px 12px',
                  borderBottom: '1px solid #1a1a1a',
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {/*  优先渲染自定义头像 */}
                  {authorCustomAvatar ? (
                    <img src={authorCustomAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                  ) : (
                    authorAvatar
                  )}
                </div>
                <span style={{ color: '#ccc', fontSize: '12px', fontWeight: '500', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {authorNickname}
                </span>
              </div>

              {/* 痛觉图谱照片 */}
              <img
                src={post.img}
                style={{
                  width: '100%',
                  height: '130px',
                  objectFit: 'cover',
                  background: '#000',
                }}
                alt="somatic pain mapping"
              />

              {/* 底栏 */}
              <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ color: '#eee', fontSize: '12px', margin: '0 0 10px 0', lineHeight: '1.4', height: '34px', overflow: 'hidden' }}>
                  {parseCleanText(post.text)}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#d32f2f', fontSize: '10px', background: 'rgba(211,47,47,0.1)', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                    {t(`painNames.${painKey}`)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={(e) => handleHug(post.id, e)} style={{ background: 'none', border: 'none', color: post.hasUserHugged ? '#ff6b6b' : '#555', fontSize: '11px', cursor: 'pointer' }}>
                      🫂 {post.hugs || 0}
                    </button>
                    <button onClick={(e) => handleLike(post.id, e)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
                      ❤️ {post.likes || 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPosts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
          <p>{t('community.noPosts') || '暂无具身痛觉图谱分享'}</p>
        </div>
      )}

      {/* 🌟 社区专属帖子详情弹窗 (即时同步状态) */}
      {viewingPost && (
        <CommunityPostDetailModal
          post={viewingPost}
          currentUserId={currentUserId}
          onClose={() => setViewingPost(null)}
          onViewProfile={onViewProfile}
          onHug={handleHug}
          onLike={handleLike}
          onSaveExperience={handleSaveExperience}
          onDelete={handleDeletePost}
          t={t}
        />
      )}
    </div>
  );
}