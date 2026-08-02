// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useUser, PRESET_BACKGROUNDS, PRESET_AVATARS } from '../contexts/UserContext';
import { useI18n } from '../i18n/i18nContext';
import CropModal from '../Components/CropModal';
import { compressImage } from '../utils/imageUtils';
import { supabase } from '../services/supabaseClient';

const PRESET_BG_NAMES_EN = [
  "Obsidian Black (Default)",
  "Dark Rose (Acute/Congested)",
  "Mystic Purple (Neural/Radiating)",
  "Deep Sea Blue (Cold/Stiff)"
];

export default function ProfilePage({ 
  currentUserId = "user_A", 
  targetUserId = "user_A", 
  history = [], 
  posts = [], 
  lang = 'zh',
  setTargetLanguage, 
  onBack 
}) {
  const { t } = useI18n();
  const { userInfo, setUserInfo, logout, activeBackground } = useUser();
  const isSelf = currentUserId === targetUserId;
  const isEn = lang === 'en';

  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropType, setCropType] = useState('avatar');

  // 社交互通状态 - 全局用户资料缓存
  const [globalProfiles, setGlobalProfiles] = useState(() => {
    const cached = localStorage.getItem("painscape_simulated_profiles");
    if (!cached) {
      const defaultProfiles = {
        "user_A": { 
          nickname: "PainScape_Companion", 
          email: "user@painscape.org", 
          avatar: "🩸", 
          signature: t('profile.defaultSignature'), 
          bgIndex: 0, 
          customAvatar: "", 
          customBg: "" 
        }
      };
      localStorage.setItem("painscape_simulated_profiles", JSON.stringify(defaultProfiles));
      return defaultProfiles;
    }
    return JSON.parse(cached);
  });

  // 目标外部用户信息
  const [targetUserInfo, setTargetUserInfo] = useState(() => {
    return isSelf ? userInfo : (globalProfiles[targetUserId] || { 
      nickname: "同伴", 
      email: "companion@painscape.org", 
      avatar: "🩹", 
      signature: t('profile.defaultSignature'), 
      bgIndex: 0 
    });
  });

  const activeProfile = isSelf ? userInfo : targetUserInfo;

  // 关注状态
  const [follows, setFollows] = useState(() => {
    const cached = localStorage.getItem("painscape_simulated_follows");
    return cached ? JSON.parse(cached) : []; 
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);

  const followersCount = follows.filter(f => f.followingId === targetUserId).length;
  const followingCount = follows.filter(f => f.followerId === targetUserId).length;

  // 编辑状态
  const [editNickname, setEditNickname] = useState(activeProfile.nickname);
  const [editAvatar, setEditAvatar] = useState(activeProfile.avatar);
  const [editBgIndex, setEditBgIndex] = useState(activeProfile.bgIndex);
  const [editCustomAvatar, setEditCustomAvatar] = useState(activeProfile.customAvatar || '');
  const [editCustomBg, setEditCustomBg] = useState(activeProfile.customBg || '');
  const [editSignature, setEditSignature] = useState(activeProfile.signature || '');

  const activeBg = PRESET_BACKGROUNDS[activeProfile.bgIndex] || PRESET_BACKGROUNDS[0];

  // 弹窗打开时同步初始数据
  useEffect(() => {
    if (showEditModal) {
      setEditNickname(activeProfile.nickname || "");
      setEditAvatar(activeProfile.avatar || "🩸");
      setEditBgIndex(activeProfile.bgIndex ?? 0);
      setEditCustomAvatar(activeProfile.customAvatar || "");
      setEditCustomBg(activeProfile.customBg || "");

      const defaultSigZh = "让说不出的痛，换一种方式抵达。🧘";
      const defaultSigEn = "Let the unspeakable pain find another way to be heard. 🧘";
      
      if (activeProfile.signature === defaultSigZh || !activeProfile.signature) {
        setEditSignature(t('profile.defaultSignature'));
      } else if (activeProfile.signature === defaultSigEn) {
        setEditSignature(t('profile.defaultSignature'));
      } else {
        setEditSignature(activeProfile.signature);
      }
    }
  }, [showEditModal, isEn, t]);

  // 从 Supabase 加载数据
  useEffect(() => {
    const loadProfileAndSocialData = async () => {
      try {
        let { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (error && error.code === "PGRST116") {
          const defaultProfile = {
            id: targetUserId,
            nickname: isSelf ? userInfo.nickname : `同伴_${targetUserId.slice(-4)}`,
            email: isSelf ? userInfo.email : "companion@painscape.org",
            avatar: isSelf ? userInfo.avatar : "🌸",
            signature: isSelf ? (userInfo.signature || t('profile.defaultSignature')) : t('profile.defaultSignature'),
            bg_index: isSelf ? userInfo.bgIndex : 0
          };
          await supabase.from("profiles").upsert(defaultProfile);
          profile = defaultProfile;
        }

        if (profile) {
          const mapped = {
            id: profile.id,
            nickname: profile.nickname,
            email: profile.email,
            avatar: profile.avatar,
            signature: profile.signature,
            bgIndex: profile.bg_index,
            customAvatar: profile.custom_avatar,
            customBg: profile.custom_bg
          };
          setTargetUserInfo(mapped);
          if (isSelf) {
            setUserInfo(mapped);
          }
        }

        const { data: dbFollowers } = await supabase
          .from("follows")
          .select("follower_id, profiles!follows_follower_id_fkey(nickname, avatar, signature, custom_avatar)")
          .eq("following_id", targetUserId);

        const formattedFollowers = dbFollowers ? dbFollowers.map(f => ({
          id: f.follower_id,
          nickname: f.profiles?.nickname || "匿名同伴",
          avatar: f.profiles?.avatar || "🩹",
          signature: f.profiles?.signature || "",
          customAvatar: f.profiles?.custom_avatar || ""
        })) : [];
        setFollowers(formattedFollowers);

        const { data: dbFollowings } = await supabase
          .from("follows")
          .select("following_id, profiles!follows_following_id_fkey(nickname, avatar, signature, custom_avatar)")
          .eq("follower_id", targetUserId);

        const formattedFollowings = dbFollowings ? dbFollowings.map(f => ({
          id: f.following_id,
          nickname: f.profiles?.nickname || "同伴",
          avatar: f.profiles?.avatar || "🩹",
          signature: f.profiles?.signature || "",
          customAvatar: f.profiles?.custom_avatar || ""
        })) : [];
        setFollowings(formattedFollowings);

        const isFollowed = formattedFollowers.some(f => f.id === currentUserId);
        setIsFollowing(isFollowed);

      } catch (err) {
        console.warn("未完全连接 Supabase，已自动降级为本地高拟真数据连接:", err);
        const localFollows = follows;
        const isFollowed = localFollows.some(f => f.followerId === currentUserId && f.followingId === targetUserId);
        setIsFollowing(isFollowed);
      }
    };

    loadProfileAndSocialData();
  }, [targetUserId, currentUserId, isSelf]);

  // 关注与取消关注
  const handleToggleFollow = async () => {
    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);

        setIsFollowing(false);
        const nextFollows = follows.filter(f => !(f.followerId === currentUserId && f.followingId === targetUserId));
        setFollows(nextFollows);
        localStorage.setItem("painscape_simulated_follows", JSON.stringify(nextFollows));
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetUserId });

        setIsFollowing(true);
        const nextFollows = [...follows, { 
          followerId: currentUserId, 
          followingId: targetUserId 
        }];
        setFollows(nextFollows);
        localStorage.setItem("painscape_simulated_follows", JSON.stringify(nextFollows));
      }
    } catch (err) {
      console.warn("关注操作失败，使用本地降级方案:", err);
      let nextFollows;
      if (isFollowing) {
        nextFollows = follows.filter(f => !(f.followerId === currentUserId && f.followingId === targetUserId));
      } else {
        nextFollows = [...follows, { followerId: currentUserId, followingId: targetUserId }];
      }
      setFollows(nextFollows);
      localStorage.setItem("painscape_simulated_follows", JSON.stringify(nextFollows));
      setIsFollowing(!isFollowing);
    }
  };

  // 图片裁剪选择
  const handleFileSelected = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const maxSize = type === 'avatar' ? 1000 : 2000; 
      const compressed = await compressImage(file, maxSize, maxSize, 0.9);
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

  // 保存修改
  const handleSaveChanges = async () => {
    if (!editNickname.trim()) {
      alert(t('toast.saveExperienceRequired') || '昵称不能为空！');
      return;
    }
    const updatedInfo = {
      nickname: editNickname,
      email: activeProfile.email,
      avatar: editAvatar,
      bg_index: editBgIndex,
      custom_avatar: editCustomAvatar,
      custom_bg: editCustomBg,
      signature: editSignature,
    };

    try {
      await supabase
        .from("profiles")
        .update(updatedInfo)
        .eq("id", currentUserId);
    } catch (err) {
      console.warn("云端保存失败，保存至本地缓存:", err);
    }

    const mapped = {
      id: currentUserId,
      nickname: editNickname,
      email: activeProfile.email,
      avatar: editAvatar,
      bgIndex: editBgIndex,
      customAvatar: editCustomAvatar,
      customBg: editCustomBg,
      signature: editSignature,
    };

    if (isSelf) {
      setUserInfo(mapped); 
    } 
    setTargetUserInfo(mapped);
    
    const nextProfiles = { ...globalProfiles, [currentUserId]: mapped };
    setGlobalProfiles(nextProfiles);
    localStorage.setItem("painscape_simulated_profiles", JSON.stringify(nextProfiles));
    
    setShowEditModal(false);
  };

  const myRealPosts = posts.filter(
    (p) => p.userId === targetUserId || p.authorId === targetUserId
  );

  const totalRecords = isSelf ? history.length : myRealPosts.length;

  const avgPainScore = totalRecords > 0
    ? Math.round(history.reduce((sum, r) => sum + (r.meta?.painScore || 0), 0) / totalRecords)
    : 0;

  const getMostFrequentPain = () => {
    if (totalRecords === 0) return t('resultLabels.notProvided') || '暂无';
    const freqs = {};
    history.forEach(r => {
      const key = r.dominantPain || r.type || 'twist';
      freqs[key] = (freqs[key] || 0) + 1;
    });
    const topKey = Object.keys(freqs).reduce((a, b) => freqs[a] > freqs[b] ? a : b, 'twist');
    return t(`painNames.${topKey}`) || topKey;
  };

  const getDeterministicCount = (id, baseSeed) => {
    if (!id) return baseSeed;
    const num = parseInt(String(id).slice(-4)) || 0;
    return (num % 15) + baseSeed;
  };

  const currentBackground = activeProfile.customBg
    ? `url(${activeProfile.customBg}) center/cover no-repeat`
    : activeBg.gradient;

  // 默认个性签名处理
  const displaySignature = (!activeProfile.signature || 
    activeProfile.signature === "让说不出的痛，换一种方式抵达。🧘" || 
    activeProfile.signature === "Let the unspeakable pain find another way to be heard. 🧘")
    ? t('profile.defaultSignature')
    : activeProfile.signature;

  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: currentBackground,
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        transition: 'background 0.3s ease',
      }}
    >
      {/* 滤镜 */}
      {activeProfile.customBg && (
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

      <div 
        style={{ 
          position: 'relative', 
          zIndex: 1,
          maxWidth: '480px',
          margin: '0 auto',
          padding: '24px 16px 120px 16px',
          boxSizing: 'border-box',
          fontFamily: 'sans-serif'
        }}
      >
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
            {isSelf ? t('profile.sanctuary') : t('profile.companionSpace')}
          </h2>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* 🌐 语言一键切换按钮 */}
            {setTargetLanguage && (
              <button
                onClick={() => setTargetLanguage(isEn ? 'zh' : 'en')}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                🌐 {isEn ? '简体中文' : 'English'}
              </button>
            )}

            {/* 返回按钮 */}
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
              {t('profile.back')}
            </button>
          </div>
        </div>

        {/* ===== 用户名片 ===== */}
        <div
          style={{
            background: activeBg.cardBg,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            position: 'relative'
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
            {activeProfile.customAvatar ? (
              <img
                src={activeProfile.customAvatar}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="avatar"
              />
            ) : (
              activeProfile.avatar
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
              {activeProfile.nickname}
            </h3>

            {/* 邮箱 */}
            <p style={{ color: '#888', margin: '0 0 6px 0', fontSize: '12px' }}>
              {activeProfile.email}
            </p>

            {/* 关注/粉丝 */}
            <div
              style={{
                display: 'flex',
                gap: '14px',
                fontSize: '12.5px',
                color: '#ccc',
                marginBottom: '8px',
                cursor: 'pointer'
              }}
            >
              <span onClick={() => setShowFollowingModal(true)} style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                <strong style={{ color: '#fff' }}>{followingCount}</strong>{' '}
                {t('profile.following')}
              </span>
              <span onClick={() => setShowFollowersModal(true)} style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                <strong style={{ color: '#fff' }}>{followersCount}</strong>{' '}
                {t('profile.followers')}
              </span>
            </div>

            {/* 个性签名 */}
            <p
              style={{
                color: '#aaa',
                fontSize: '11.5px',
                fontStyle: 'italic',
                lineHeight: '1.45',
                background: 'rgba(255,255,255,0.02)',
                padding: '6px 10px',
                borderRadius: '8px',
                borderLeft: '2px solid rgba(211,47,47,0.4)',
                wordBreak: 'break-all',
                margin: '0 0 10px 0'
              }}
            >
              “ {displaySignature} ”
            </p>

            {/* 社交按钮 */}
            {!isSelf ? (
              <button
                onClick={handleToggleFollow}
                style={{
                  padding: '6px 20px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: 'none',
                  background: isFollowing ? 'rgba(255,255,255,0.06)' : '#d32f2f',
                  color: isFollowing ? '#888' : '#fff',
                  boxShadow: isFollowing ? 'none' : '0 4px 12px rgba(211, 47, 47, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isFollowing ? t('profile.followed') : t('profile.followHer')}
              </button>
            ) : (
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
            )}
          </div>

          {/* ✏️ 编辑按钮 */}
          {isSelf && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(true);
              }}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ccc',
                padding: '5px 12px',
                borderRadius: '14px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              ✏️ {t('profile.editProfile')}
            </button>
          )}
        </div>

        {/* ===== 痛感数字化摘要 ===== */}
        <div
          style={{
            background: activeBg.cardBg,
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
            background: activeBg.cardBg,
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

          {myRealPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 10px',
                color: '#555',
                fontSize: '12.5px',
              }}
            >
              {isSelf ? t('profile.noPublicPost') : t('profile.noPublicPostCompanion')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myRealPosts.slice(0, 10).map((record, index) => (
                <div
                  key={record.id || index}
                  onClick={() => setSelectedPostDetail(record)}
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
                        record.text || record.painName}
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
                        {record.painName || (record.painTags ? record.painTags[0] : "痛经")}
                      </span>
                      <span
                        style={{
                          color: '#555',
                          fontSize: '10.5px',
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        <span>❤️ {record.likes ?? getDeterministicCount(record.id, 8)}</span>
                        <span>🫂 {record.hugs ?? getDeterministicCount(record.id, 3)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== 安全退出 ===== */}
        {isSelf && (
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
        )}
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
          onClick={() => setShowEditModal(false)}
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
              {t('profile.editInfoTitle')}
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
                        fontSize: isEn ? '10px' : '11px', 
                        cursor: 'pointer',
                        fontWeight: editBgIndex === idx ? 'bold' : 'normal',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
                      }}
                    >
                      {isEn ? PRESET_BG_NAMES_EN[idx] : bg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowEditModal(false)}
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

      {/* ===== 关注同伴列表弹窗 ===== */}
      {showFollowingModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '16px',
          boxSizing: 'border-box'
        }} onClick={() => setShowFollowingModal(false)}>
          <div style={{
            background: '#141414',
            border: '1px solid #333',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2d2d2d', paddingBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                🤝 {isSelf ? t('profile.myFollowings') : `${targetUserInfo.nickname} 的同伴`} ({followingCount})
              </h3>
              <button 
                onClick={() => setShowFollowingModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {followings.length === 0 ? (
                <div style={{ color: '#555', fontSize: '12.5px', textAlign: 'center', padding: '30px 10px' }}>
                  🌱 {t('profile.noFollowings')}
                </div>
              ) : (
                followings.map(followedUser => (
                  <div 
                    key={followedUser.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      padding: '10px 12px'
                    }}
                  >
                    <div style={{
                      width: '38px', height: '38px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', overflow: 'hidden', flexShrink: 0
                    }}>
                      {followedUser.customAvatar ? (
                        <img src={followedUser.customAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        followedUser.avatar
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {followedUser.nickname}
                      </div>
                      <div style={{ color: '#666', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {followedUser.signature || t('profile.defaultSignature')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFollowingModal(false)}
              style={{
                width: '100%',
                padding: '11px 0',
                marginTop: '16px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '30px',
                color: '#888',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {t('profile.closeList')}
            </button>

          </div>
        </div>
      )}

      {/* ===== 粉丝同伴列表弹窗 ===== */}
      {showFollowersModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '16px',
          boxSizing: 'border-box'
        }} onClick={() => setShowFollowersModal(false)}>
          <div style={{
            background: '#141414',
            border: '1px solid #333',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2d2d2d', paddingBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                🤝 {isSelf ? t('profile.myFollowers') : `${targetUserInfo.nickname} 的粉丝`} ({followersCount})
              </h3>
              <button 
                onClick={() => setShowFollowersModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {followers.length === 0 ? (
                <div style={{ color: '#555', fontSize: '12.5px', textAlign: 'center', padding: '30px 10px' }}>
                  🌱 {t('profile.noFollowers')}
                </div>
              ) : (
                followers.map(followerUser => (
                  <div 
                    key={followerUser.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      padding: '10px 12px'
                    }}
                  >
                    <div style={{
                      width: '38px', height: '38px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', overflow: 'hidden', flexShrink: 0
                    }}>
                      {followerUser.customAvatar ? (
                        <img src={followerUser.customAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        followerUser.avatar
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {followerUser.nickname}
                      </div>
                      <div style={{ color: '#666', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {followerUser.signature || t('profile.defaultSignature')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFollowersModal(false)}
              style={{
                width: '100%',
                padding: '11px 0',
                marginTop: '16px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '30px',
                color: '#888',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {t('profile.closeList')}
            </button>

          </div>
        </div>
      )}

      {/* ===== 帖子详情弹窗 ===== */}
      {selectedPostDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(5, 5, 5, 0.96)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
          padding: '16px',
          boxSizing: 'border-box'
        }} onClick={() => setSelectedPostDetail(null)}>
          <div style={{
            background: '#141414',
            border: '1px solid #333',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#ef5350', fontSize: '14px', fontWeight: 'bold' }}>
                📖 具身档案细节回顾
              </span>
              <button 
                onClick={() => setSelectedPostDetail(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '18px' }}>
              <img src={selectedPostDetail.img} style={{ width: '100%', display: 'block', objectFit: 'contain' }} alt="Embodied Paint" />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span style={{
                color: '#ef5350',
                fontSize: '11px',
                background: 'rgba(239,83,80,0.08)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 'bold'
              }}>
                {selectedPostDetail.painName || "具身痛感"}
              </span>
              <span style={{ color: '#555', fontSize: '11px' }}>
                ID: #{selectedPostDetail.id ? String(selectedPostDetail.id).slice(-6) : "unknown"}
              </span>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.03)',
              borderLeft: '4px solid #d32f2f',
              padding: '14px',
              borderRadius: '12px',
              marginBottom: '14px'
            }}>
              <h4 style={{ color: '#ef5350', fontSize: '13px', margin: '0 0 6px 0', fontWeight: 'bold' }}>患者自诉与特征</h4>
              <p style={{ color: '#ccc', fontSize: '12.5px', lineHeight: '1.6', margin: 0 }}>
                {selectedPostDetail.content?.chief_complaint?.replace("主诉：", "") || selectedPostDetail.text || "暂无文字自诉记录。"}
              </p>
            </div>

            {selectedPostDetail.content?.present_illness && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderLeft: '4px solid #ab47bc',
                padding: '14px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#ab47bc', fontSize: '13px', margin: '0 0 6px 0', fontWeight: 'bold' }}>现病史与诊疗参考</h4>
                <p style={{ color: '#ccc', fontSize: '12.5px', lineHeight: '1.6', margin: 0 }}>
                  {selectedPostDetail.content.present_illness}
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedPostDetail(null)}
              style={{
                width: '100%',
                padding: '12px 0',
                background: '#333',
                border: 'none',
                borderRadius: '30px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              关闭详情
            </button>

          </div>
        </div>
      )}

    </div>
  );
}