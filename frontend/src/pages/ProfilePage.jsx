// src/pages/ProfilePage.jsx
import React, { useState, useRef } from 'react';
import { useUser, PRESET_BACKGROUNDS, PRESET_AVATARS } from '../contexts/UserContext';
import { useI18n } from '../i18n/i18nContext';
import CropModal from '../components/CropModal';
import { compressImage } from '../utils/imageUtils';

export default function ProfilePage({ history, onBack }) {
  const { t } = useI18n();
  const { userInfo, setUserInfo, logout, activeBackground } = useUser();

  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropType, setCropType] = useState('avatar');

  // 编辑状态
  const [editNickname, setEditNickname] = useState(userInfo.nickname);
  const [editAvatar, setEditAvatar] = useState(userInfo.avatar);
  const [editBgIndex, setEditBgIndex] = useState(userInfo.bgIndex);
  const [editCustomAvatar, setEditCustomAvatar] = useState(userInfo.customAvatar || '');
  const [editCustomBg, setEditCustomBg] = useState(userInfo.customBg || '');
  const [editSignature, setEditSignature] = useState(userInfo.signature || '');

  // === 图片选择与裁剪 ===
  const handleFileSelected = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const maxSize = type === 'avatar' ? 150 : 800;
      const compressed = await compressImage(file, maxSize, maxSize, 0.85);
      setCropSrc(compressed);
      setCropType(type);
      setShowCropModal(true);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
    e.target.value = '';
  };

  const handleCropConfirm = (croppedData) => {
    if (cropType === 'avatar') {
      setEditCustomAvatar(croppedData);
    } else {
      setEditCustomBg(croppedData);
    }
    setShowCropModal(false);
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setCropSrc(null);
  };

  // === 保存与取消 ===
  const handleSaveChanges = () => {
    if (!editNickname.trim()) {
      alert(t('toast.saveExperienceRequired') || '昵称不能为空！');
      return;
    }
    setUserInfo({
      nickname: editNickname,
      avatar: editAvatar,
      bgIndex: editBgIndex,
      customAvatar: editCustomAvatar,
      customBg: editCustomBg,
      signature: editSignature,
    });
    setShowEditModal(false);
  };

  const handleCancelChanges = () => {
    setEditNickname(userInfo.nickname);
    setEditAvatar(userInfo.avatar);
    setEditBgIndex(userInfo.bgIndex);
    setEditCustomAvatar(userInfo.customAvatar || '');
    setEditCustomBg(userInfo.customBg || '');
    setEditSignature(userInfo.signature || '');
    setShowEditModal(false);
  };

  // === 数据分析 ===
  const totalRecords = history.length;
  const avgPainScore = totalRecords > 0
    ? Math.round(history.reduce((sum, r) => sum + (r.meta?.painScore || 0), 0) / totalRecords)
    : 0;

  const getMostFrequentPain = () => {
    if (totalRecords === 0) return t('resultLabels.notProvided') || '暂无';
    const freqs = {};
    history.forEach(r => {
      freqs[r.painName] = (freqs[r.painName] || 0) + 1;
    });
    return Object.keys(freqs).reduce((a, b) => freqs[a] > freqs[b] ? a : b);
  };

  const currentBackground = userInfo.customBg
    ? `url(${userInfo.customBg}) center/cover no-repeat`
    : activeBackground.gradient;

  const isEn = t('app.name') === 'PainScape';

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: currentBackground,
        width: '100vw',
        minHeight: '100vh',
        padding: '24px 16px 120px 16px',
        boxSizing: 'border-box',
        maxWidth: '480px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
        position: 'relative',
        transition: 'background 0.3s ease',
      }}
    >
      {/* 防白暴暗色滤镜 */}
      {userInfo.customBg && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(5, 5, 5, 0.78)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ===== 头部导航 ===== */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            paddingBottom: '12px',
          }}
        >
          <h2
            style={{
              color: '#fff',
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
            }}
          >
            {t('profile.sanctuary')}
          </h2>
          <button
            onClick={onBack}
            style={{
              padding: '6px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t('community.back')}
          </button>
        </div>

        {/* ===== 用户名片 ===== */}
        <div
          onClick={() => setShowEditModal(true)}
          style={{
            background: activeBackground.cardBg,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            gap: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
        >
          {/* 头像 */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {userInfo.customAvatar ? (
              <img
                src={userInfo.customAvatar}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="avatar"
              />
            ) : (
              userInfo.avatar
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 昵称 */}
            <h3
              style={{
                color: '#fff',
                margin: '0 0 4px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {userInfo.nickname}
              <span style={{ fontSize: '11px', color: '#888' }}>✏️</span>
            </h3>

            {/* 邮箱 */}
            <p style={{ color: '#888', margin: '0 0 6px 0', fontSize: '12px' }}>
              {userInfo.email}
            </p>

            {/* 关注/粉丝 */}
            <div
              style={{
                display: 'flex',
                gap: '14px',
                fontSize: '12.5px',
                color: '#ccc',
                marginBottom: '8px',
              }}
            >
              <span>
                <strong style={{ color: '#fff' }}>{userInfo.followingCount}</strong>{' '}
                {t('profile.following')}
              </span>
              <span>
                <strong style={{ color: '#fff' }}>{userInfo.followersCount}</strong>{' '}
                {t('profile.followers')}
              </span>
            </div>

            {/* 个性签名 */}
            <p
              style={{
                color: '#aaa',
                fontSize: '11.5px',
                fontStyle: 'italic',
                background: 'rgba(255,255,255,0.02)',
                padding: '6px 10px',
                borderRadius: '8px',
                borderLeft: '2px solid rgba(211,47,47,0.4)',
                wordBreak: 'break-all',
              }}
            >
              “ {userInfo.signature} ”
            </p>

            {/* 身份徽章 */}
            <span
              style={{
                fontSize: '9.5px',
                color: '#4caf50',
                background: 'rgba(76,175,80,0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
                display: 'inline-block',
              }}
            >
              {t('profile.memberStatus')}
            </span>
          </div>
        </div>

        {/* ===== 痛感数字化摘要 ===== */}
        <div
          style={{
            background: activeBackground.cardBg,
            border: '1.5px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <h4
            style={{
              color: '#d32f2f',
              margin: '0 0 16px 0',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            {t('profile.summaryTitle')}
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                {totalRecords}
              </div>
              <div style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
                {t('profile.totalRecords')}
              </div>
            </div>
            <div>
              <div style={{ color: '#ef9a9a', fontSize: '20px', fontWeight: 'bold' }}>
                {avgPainScore}
              </div>
              <div style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
                {t('profile.avgIntensity')}
              </div>
            </div>
            <div>
              <div
                style={{
                  color: '#a5d6a7',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {getMostFrequentPain()}
              </div>
              <div style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
                {t('profile.latestPattern')}
              </div>
            </div>
          </div>
        </div>

        {/* ===== 已发布的具身帖子 ===== */}
        <div
          style={{
            background: activeBackground.cardBg,
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              paddingBottom: '10px',
            }}
          >
            <h4
              style={{
                color: '#fff',
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {t('profile.publishedSomatic')}
            </h4>
            <span style={{ fontSize: '11px', color: '#888' }}>
              {t('profile.publicArchive')}
            </span>
          </div>

          {totalRecords === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 10px',
                color: '#555',
                fontSize: '12.5px',
              }}
            >
              {t('profile.noPublicPost')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.slice(0, 3).map((record, index) => (
                <div
                  key={record.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: '14px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')
                  }
                >
                  <img
                    src={record.img}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      background: '#000',
                    }}
                    alt="somatic thumbnail"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: '#eee',
                        fontSize: '12.5px',
                        margin: '0 0 6px 0',
                        lineHeight: '1.4',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {record.content?.chief_complaint?.replace('主诉：', '') ||
                        record.painName}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          color: '#ef5350',
                          fontSize: '9.5px',
                          background: 'rgba(239,83,80,0.08)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                        }}
                      >
                        {record.painName}
                      </span>
                      <span
                        style={{
                          color: '#555',
                          fontSize: '10.5px',
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        <span>❤️ {record.meta?.likes || Math.floor(Math.random() * 12) + 3}</span>
                        <span>🫂 {record.meta?.hugs || Math.floor(Math.random() * 8) + 1}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== 安全退出 ===== */}
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '14px 0',
            background: 'transparent',
            color: '#ef5350',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {t('profile.logout')}
        </button>
      </div>

      {/* ===== 编辑资料弹窗 ===== */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 900,
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={handleCancelChanges}
        >
          <div
            style={{
              background: '#141414',
              border: '1px solid #333',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                color: '#fff',
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              📝 修改个人信息
            </h3>

            {/* 隐藏的文件输入 */}
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelected(e, 'avatar')}
            />
            <input
              type="file"
              ref={bgInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelected(e, 'bg')}
            />

            {/* 昵称 */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  color: '#888',
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                {t('profile.nicknameLabel')}
              </label>
              <input
                type="text"
                maxLength={18}
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* 个性签名 */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  color: '#888',
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                {t('profile.signatureLabel')}
              </label>
              <textarea
                maxLength={60}
                rows={2}
                value={editSignature}
                onChange={(e) => setEditSignature(e.target.value)}
                placeholder={t('profile.signaturePlaceholder')}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.4',
                }}
              />
            </div>

            {/* 头像上传 */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                  {t('profile.uploadAvatar')}
                </label>
                {editCustomAvatar && (
                  <button
                    onClick={() => setEditCustomAvatar('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#d32f2f',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {t('profile.restoreDefault')}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <button
                  onClick={() => avatarInputRef.current.click()}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px dashed #444',
                    borderRadius: '12px',
                    color: '#ccc',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {t('profile.albumCrop')}
                </button>
                {editCustomAvatar && (
                  <img
                    src={editCustomAvatar}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid #d32f2f',
                    }}
                    alt="avatar preview"
                  />
                )}
              </div>

              {!editCustomAvatar && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                  }}
                >
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setEditAvatar(emoji)}
                      style={{
                        fontSize: '20px',
                        background:
                          editAvatar === emoji
                            ? 'rgba(211,47,47,0.15)'
                            : 'rgba(255,255,255,0.02)',
                        border:
                          editAvatar === emoji
                            ? '1.5px solid #d32f2f'
                            : '1px solid #2a2a2a',
                        borderRadius: '10px',
                        padding: '6px 0',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 背景上传 */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                  {t('profile.uploadBg')}
                </label>
                {editCustomBg && (
                  <button
                    onClick={() => setEditCustomBg('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#d32f2f',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {t('profile.restoreGradient')}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <button
                  onClick={() => bgInputRef.current.click()}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px dashed #444',
                    borderRadius: '12px',
                    color: '#ccc',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {t('profile.albumCrop')}
                </button>
                {editCustomBg && (
                  <div
                    style={{
                      width: '50px',
                      height: '35px',
                      borderRadius: '6px',
                      background: `url(${editCustomBg}) center/cover no-repeat`,
                      border: '1px solid #d32f2f',
                    }}
                  />
                )}
              </div>

              {/* 主题色调 */}
              <div
                style={{
                  borderTop: '1px solid #2d2d2d',
                  paddingTop: '16px',
                  marginTop: '16px',
                }}
              >
                <label
                  style={{
                    color: '#888',
                    fontSize: '12px',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  {t('profile.themeTitle')}
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  {PRESET_BACKGROUNDS.map((bg, idx) => (
                    <button
                      key={idx}
                      onClick={() => setEditBgIndex(idx)}
                      style={{
                        background: bg.gradient,
                        border: editBgIndex === idx ? '2px solid #fff' : '1.5px solid #333',
                        borderRadius: '14px',
                        padding: '12px 6px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: editBgIndex === idx ? 'bold' : 'normal',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
                      }}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelChanges}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#222',
                  color: '#888',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('profile.cancel')}
              </button>
              <button
                onClick={handleSaveChanges}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #ff9800, #f44336)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                }}
              >
                {t('profile.saveProfile')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 裁剪弹窗 ===== */}
      <CropModal
        isOpen={showCropModal}
        imageSrc={cropSrc}
        cropType={cropType}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
}