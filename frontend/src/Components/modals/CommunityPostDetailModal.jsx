// src/Components/modals/CommunityPostDetailModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';

const PAIN_KEY_MAP = {
  'twist': 'twist', '绞痛': 'twist',
  'pierce': 'pierce', '刺痛': 'pierce',
  'heavy': 'heavy', 'sink': 'heavy', '坠胀': 'heavy', '坠胀重压': 'heavy', '坠痛': 'heavy',
  'wave': 'wave', 'swell': 'wave', '酸胀': 'wave', '酸胀痛': 'wave', '弥漫酸胀痛': 'wave',
  'scrape': 'scrape', '刮痛': 'scrape', '撕裂痛': 'scrape', '撕裂刮痛': 'scrape'
};

export default function CommunityPostDetailModal({
  post,
  currentUserId,
  onClose,
  onViewProfile,
  onHug,
  onLike,
  onSaveExperience,
  onDelete, // 🌟 接收删除回调
  t,
}) {
  const [experienceInput, setExperienceInput] = useState(post?.userExperience || post?.user_experience || '');
  const [isEditingExp, setIsEditingExp] = useState(false);

  if (!post) return null;

  // 安全提取作者信息
  const authorProfile = post.profiles || {};
  const authorNickname = authorProfile.nickname || post.nickname || post.authorName || post.author_name || post.displayName || "同伴";
  const authorAvatar = authorProfile.avatar || post.avatar || post.authorAvatar || post.author_avatar || "🌸";
  const authorCustomAvatar = authorProfile.custom_avatar || post.customAvatar || post.custom_avatar || "";
  const postAuthorUid = post.userId || post.user_id || post.authorId || "user_guest";

  const painKey = post.dominantPain || PAIN_KEY_MAP[post.painName] || 'twist';
  const displayPainName = t(`painNames.${painKey}`) || post.painName || '痛经';
  
  // 🌟 判断当前用户是否是帖主
  const isAuthor = currentUserId && String(postAuthorUid) === String(currentUserId);

  const handleSaveExp = () => {
    if (onSaveExperience) {
      onSaveExperience(post.id, experienceInput);
    }
    setIsEditingExp(false);
  };

  const handleDeletePost = async () => {
    if (window.confirm('确定要删除这条具身痛觉分享吗？删除后无法恢复。')) {
      if (onDelete) {
        await onDelete(post.id);
      }
      onClose();
    }
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
        padding: '16px',
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
        {/* 1. 标题（发布时输入的文本） + 贴主专属删除按钮 + 关闭按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '8px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: 0, lineHeight: '1.5', flex: 1 }}>
            {post.text || '分享具身痛觉图谱'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 🌟 仅对帖主显示删除按钮 */}
            {isAuthor && (
              <button
                onClick={handleDeletePost}
                style={{
                  background: 'rgba(239, 83, 80, 0.12)',
                  border: '1px solid rgba(239, 83, 80, 0.3)',
                  color: '#ef5350',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                🗑️ 删除
              </button>
            )}
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
        </div>

        {/* 2. 发布用户名片栏 */}
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
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
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
            {authorCustomAvatar ? (
              <img src={authorCustomAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
            ) : (
              authorAvatar
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
              {authorNickname}
            </div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
              {post.createdAt || post.created_at ? new Date(post.createdAt || post.created_at).toLocaleDateString() : '发布于社区'}
            </div>
          </div>
          <span style={{ color: '#ef5350', fontSize: '11px', background: 'rgba(239,83,80,0.12)', padding: '4px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
            {displayPainName}
          </span>
        </div>

        {/* 3. 绘制的图片展示 */}
        {post.img && (
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '20px' }}>
            <img src={post.img} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '280px' }} alt="Pain Mapping" />
          </div>
        )}

        {/* 4. 经验分享区 */}
        <div style={{
          background: 'linear-gradient(135deg, #161a16, #121212)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '16px',
          padding: '16px',
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
                {isEditingExp ? '取消' : (post.userExperience || post.user_experience ? '✏️ 编辑经验' : '+ 填写我的经验')}
              </button>
            )}
          </div>

          {isEditingExp ? (
            <div>
              <textarea
                rows={3}
                value={experienceInput}
                onChange={(e) => setExperienceInput(e.target.value)}
                placeholder="填写你本次缓解疼痛的方法（例如：热水袋热敷下腹15分钟...确认后将汇入智慧货架）"
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
                onClick={handleSaveExp}
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
              {(post.userExperience || post.user_experience)?.trim()
                ? `“${post.userExperience || post.user_experience}”`
                : (isAuthor ? '你尚未填写本次缓解经验。点击右上角“+ 填写我的经验”即可分享给姐妹们。' : '贴主暂未填写本次缓解经验。')}
            </p>
          )}
        </div>

        {/* 5. 底部抱抱与比心互动按钮 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={(e) => onHug && onHug(post.id, e)}
            style={{
              flex: 1,
              padding: '12px',
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
              padding: '12px',
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