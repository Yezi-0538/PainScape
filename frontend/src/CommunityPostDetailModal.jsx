// src/Components/modals/CommunityPostDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/i18nContext';

// 中文痛感词反向映射字典
const PAIN_KEY_MAP = {
  'twist': 'twist', '绞痛': 'twist',
  'pierce': 'pierce', '刺痛': 'pierce',
  'heavy': 'heavy', 'sink': 'heavy', '坠胀': 'heavy', '坠胀重压': 'heavy', '坠痛': 'heavy',
  'wave': 'wave', 'swell': 'wave', '酸胀': 'wave', '酸胀痛': 'wave', '酸胀痛': 'wave',
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

export default function CommunityPostDetailModal({
  post,
  currentUserId,
  onClose,
  onViewProfile,
  onHug,
  onLike,
  onSaveExperience,
}) {
  const { t } = useI18n();
  const [experienceInput, setExperienceInput] = useState(post?.userExperience || '');
  const [isEditingExp, setIsEditingExp] = useState(false);

  // 🌟 当帖子数据实时更新（如赞数、抱抱、经验）时，同步更新输入框
  useEffect(() => {
    if (post?.userExperience) {
      setExperienceInput(post.userExperience);
    }
  }, [post?.userExperience]);

  if (!post) return null;

  const painKey = post.dominantPain || PAIN_KEY_MAP[post.painName] || 'twist';
  const displayPainName = t(`painNames.${painKey}`) || post.painName || '痛经';

  // 🌟 强绑定判断：是否为贴主自己
  const postAuthorUid = post.userId || post.authorId || "user_guest";
  const isAuthor = currentUserId && (postAuthorUid === currentUserId);
  const cleanTitleText = parseCleanText(post.text);

  const handleConfirmExperience = () => {
    if (onSaveExperience) {
      onSaveExperience(post.id, experienceInput);
    }
    setIsEditingExp(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 'var(--space-lg)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#141414',
          border: '1px solid #333',
          borderRadius: '24px',
          padding: '24px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 标题（发布时输入的自定义文案） */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ color: '#fff', fontSize: 'var(--text-md)', fontWeight: 'bold', margin: 0, lineHeight: '1.5', flex: 1, paddingRight: '12px' }}>
            {cleanTitleText}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 2. 作者名片栏 (绑定真实 postAuthorUid，点击跳转对方个人主页) */}
        <div
          onClick={() => {
            onViewProfile && onViewProfile(postAuthorUid);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {post.customAvatar ? (
              <img src={post.customAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
            ) : (
              (post.avatar || post.authorAvatar || "🌸")
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
              {post.nickname || post.authorName || "同伴"}
            </div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
              {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '发布于社区'}
            </div>
          </div>
          <span style={{ color: '#ef5350', fontSize: '11px', background: 'rgba(239,83,80,0.12)', padding: '4px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
            {displayPainName}
          </span>
        </div>

        {/* 3. 绘制图片展示 */}
        {post.img && (
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '20px' }}>
            <img src={post.img} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '280px' }} alt="Pain Map" />
          </div>
        )}

        {/* 4. 经验分享区 (贴主可编辑确认，确认后同步汇入智慧货架) */}
        <div style={{
          background: 'linear-gradient(135deg, #161a16, #121212)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-lg)',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#4caf50', fontSize: '13px', fontWeight: 'bold' }}>
              💡 缓解经验分享区
            </span>
            {isAuthor && (
              <button
                onClick={() => setIsEditingExp(!isEditingExp)}
                style={{ background: 'none', border: 'none', color: '#4caf50', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isEditingExp ? '取消' : (post.userExperience ? '✏️ 编辑经验' : '+ 填写我的经验')}
              </button>
            )}
          </div>

          {isEditingExp ? (
            <div>
              <textarea
                rows={3}
                value={experienceInput}
                onChange={(e) => setExperienceInput(e.target.value)}
                placeholder="填写你本次缓解疼痛的方法（例如：热水袋热敷下腹15分钟、喝红糖姜茶...确认后将同步汇入智慧货架）"
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '10px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleConfirmExperience}
                style={{
                  width: '100%',
                  padding: '9px',
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                确认经验（同步至智慧货架）
              </button>
            </div>
          ) : (
            <p style={{ color: '#ccc', fontSize: '12.5px', lineHeight: '1.6', margin: 0, whitespace: 'pre-line' }}>
              {post.userExperience && post.userExperience.trim()
                ? `“${post.userExperience}”`
                : (isAuthor ? '你尚未填写本次缓解经验。点击右上角“+ 填写我的经验”即可分享给姐妹们。' : '贴主暂未填写本次缓解经验。')}
            </p>
          )}
        </div>

        {/* 5. 底部抱抱与比心赞同按钮 (🌟 实时响应，即点即刷) */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={(e) => onHug && onHug(post.id, e)}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: post.hasUserHugged ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,107,107,0.3)',
              color: post.hasUserHugged ? '#ff6b6b' : '#eee',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            🫂 给予抱抱 ({post.hugs || 0})
          </button>
          <button
            onClick={(e) => onLike && onLike(post.id, e)}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #333',
              color: '#fff',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            ❤️ 比心赞同 ({post.likes || 0})
          </button>
        </div>
      </div>
    </div>
  );
}