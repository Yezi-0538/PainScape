// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useUser, PRESET_BACKGROUNDS, PRESET_AVATARS } from '../contexts/UserContext';
import { useI18n } from '../i18n/i18nContext';
import CropModal from '../Components/CropModal';
import { compressImage } from '../utils/imageUtils';
import { supabase } from '../services/supabaseClient';
import { deletePost } from '../services/postService';

const PRESET_BG_NAMES_EN = [
  "Obsidian Black (Default)",
  "Dark Rose (Acute/Congested)",
  "Mystic Purple (Neural/Radiating)",
  "Deep Sea Blue (Cold/Stiff)"
];

export default function ProfilePage({
  currentUserId = "user_A",
  targetUserId = "user_A",
  setTargetUserId,
  onViewProfile, // 🌟 接收主页精准跳转回调
  history = [],
  posts = [],
  setPosts,
  lang = 'zh',
  setTargetLanguage,
  onBack,
  onLogout,
}) {
  const { t } = useI18n();
  const { userInfo, setUserInfo, logout } = useUser();
  const isSelf = currentUserId === targetUserId;
  const isEn = lang === 'en';

  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropType, setCropType] = useState('avatar');

  // 全局用户资料缓存
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
      nickname: `同伴_${String(targetUserId).slice(-4)}`,
      email: "companion@painscape.org",
      avatar: "🩹",
      signature: t('profile.defaultSignature'),
      bgIndex: 0
    });
  });

  const activeProfile = isSelf ? userInfo : targetUserInfo;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isHoverFollowBtn, setIsHoverFollowBtn] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);

  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);

  const followersCount = followers.length;
  const followingCount = followings.length;

  // 编辑状态
  const [editNickname, setEditNickname] = useState(activeProfile.nickname);
  const [editAvatar, setEditAvatar] = useState(activeProfile.avatar);
  const [editBgIndex, setEditBgIndex] = useState(activeProfile.bgIndex);
  const [editCustomAvatar, setEditCustomAvatar] = useState(activeProfile.customAvatar || '');
  const [editCustomBg, setEditCustomBg] = useState(activeProfile.customBg || '');
  const [editSignature, setEditSignature] = useState(activeProfile.signature || '');

  const activeBg = PRESET_BACKGROUNDS[activeProfile.bgIndex] || PRESET_BACKGROUNDS[0];

  // 🌟 点击关注/粉丝列表卡片，精准跳转至该同伴主页
  const handleSelectUser = (selectedId) => {
    if (!selectedId) return;
    setShowFollowingModal(false);
    setShowFollowersModal(false);
    if (onViewProfile) {
      onViewProfile(selectedId);
    } else if (setTargetUserId) {
      setTargetUserId(selectedId);
    }
  };

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
  }, [showEditModal, isEn, t, activeProfile]);

  // 🌟 核心：按 UID 精准加载 Supabase 中的用户头像与昵称
  useEffect(() => {
    const loadProfileAndSocialData = async () => {
      try {
        // 1. 加载目标用户自身资料
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .maybeSingle();

        if (profile) {
          const mapped = {
            id: profile.id,
            nickname: profile.nickname || `同伴_${String(profile.id).slice(-4)}`,
            email: profile.email || "companion@painscape.org",
            avatar: profile.avatar || "🌸",
            signature: profile.signature || t('profile.defaultSignature'),
            bgIndex: profile.bg_index || 0,
            customAvatar: profile.custom_avatar || profile.customAvatar || "",
            customBg: profile.custom_bg || profile.customBg || ""
          };
          setTargetUserInfo(mapped);
          if (isSelf) setUserInfo(mapped);
        }

        // 2. 第一步：查 follows 关注表
        const { data: dbFollowerRows } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", targetUserId);

        const { data: dbFollowingRows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", targetUserId);

        const followerUids = dbFollowerRows ? dbFollowerRows.map(r => r.follower_id) : [];
        const followingUids = dbFollowingRows ? dbFollowingRows.map(r => r.following_id) : [];

        // 3. 第二步：根据 UID 列表批量查询 Supabase profiles 表
        const allRelatedUids = Array.from(new Set([...followerUids, ...followingUids]));
        let remoteProfilesMap = {};

        if (allRelatedUids.length > 0) {
          const { data: relatedProfiles, error: profErr } = await supabase
            .from("profiles")
            .select("*")
            .in("id", allRelatedUids);

          if (relatedProfiles) {
            relatedProfiles.forEach(p => {
              remoteProfilesMap[p.id] = p;
            });
            console.log("🟢 成功通过 UID 读取到云端同伴资料:", remoteProfilesMap);
          } else if (profErr) {
            console.warn("⚠️ 读取 profiles 失败，请检查 Supabase RLS 策略:", profErr);
          }
        }

        const localProfiles = JSON.parse(localStorage.getItem("painscape_simulated_profiles") || "{}");

        // 🌟 多级 UID 智能挖掘函数 (优先当前登录/目标用户 -> Supabase 表 -> 社区帖子名片 -> 本地缓存)
        const resolveProfileByUid = (uid) => {
          const uidStr = String(uid);

          if (uidStr === String(currentUserId) && userInfo) {
            return {
              id: uidStr,
              nickname: userInfo.nickname || "我的名字",
              avatar: userInfo.avatar || "🩸",
              customAvatar: userInfo.customAvatar || "",
              signature: userInfo.signature || t('profile.defaultSignature')
            };
          }

          if (uidStr === String(targetUserId) && targetUserInfo) {
            return {
              id: uidStr,
              nickname: targetUserInfo.nickname || "同伴",
              avatar: targetUserInfo.avatar || "🌸",
              customAvatar: targetUserInfo.customAvatar || "",
              signature: targetUserInfo.signature || t('profile.defaultSignature')
            };
          }

          const remoteP = remoteProfilesMap[uidStr];
          const postP = posts.find(p => String(p.userId || p.user_id || p.authorId) === uidStr);
          const localP = localProfiles[uidStr] || globalProfiles[uidStr] || {};

          const nickname =
            remoteP?.nickname ||
            postP?.nickname || postP?.authorName || postP?.author_name ||
            localP?.nickname ||
            `同伴_${uidStr.slice(-4)}`;

          const avatar =
            remoteP?.avatar ||
            postP?.avatar || postP?.authorAvatar ||
            localP?.avatar ||
            "🩹";

          const customAvatar =
            remoteP?.custom_avatar || remoteP?.customAvatar ||
            postP?.customAvatar || postP?.custom_avatar || postP?.profiles?.custom_avatar ||
            localP?.customAvatar || "";

          const signature =
            remoteP?.signature ||
            localP?.signature ||
            t('profile.defaultSignature');

          return {
            id: uidStr,
            nickname,
            avatar,
            customAvatar,
            signature
          };
        };

        // 4. 组装格式化列表
        const formattedFollowers = followerUids.map(uid => resolveProfileByUid(uid));
        const formattedFollowings = followingUids.map(uid => resolveProfileByUid(uid));

        setFollowers(formattedFollowers);
        setFollowings(formattedFollowings);
        setIsFollowing(followerUids.some(uid => String(uid) === String(currentUserId)));

      } catch (err) {
        console.warn("读取社交数据异常降级:", err);
      }
    };

    loadProfileAndSocialData();
  }, [targetUserId, currentUserId, isSelf, t, posts, userInfo, targetUserInfo]);

  // 关注与取消关注
  const handleToggleFollow = async () => {
    if (isFollowLoading) return;
    setIsFollowLoading(true);

    const willFollow = !isFollowing;
    setIsFollowing(willFollow);

    if (willFollow) {
      const myInfo = {
        id: currentUserId,
        nickname: userInfo?.nickname || "同伴",
        avatar: userInfo?.avatar || "🩸",
        signature: userInfo?.signature || "",
        customAvatar: userInfo?.customAvatar || ""
      };
      setFollowers(prev => [...prev.filter(f => String(f.id) !== String(currentUserId)), myInfo]);
    } else {
      setFollowers(prev => prev.filter(f => String(f.id) !== String(currentUserId)));
    }

    let cachedFollows = JSON.parse(localStorage.getItem("painscape_simulated_follows") || "[]");
    if (willFollow) {
      if (!cachedFollows.some(f => String(f.followerId) === String(currentUserId) && String(f.followingId) === String(targetUserId))) {
        cachedFollows.push({ followerId: currentUserId, followingId: targetUserId });
      }
    } else {
      cachedFollows = cachedFollows.filter(f => !(String(f.followerId) === String(currentUserId) && String(f.followingId) === String(targetUserId)));
    }
    localStorage.setItem("painscape_simulated_follows", JSON.stringify(cachedFollows));

    try {
      if (willFollow) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);

        await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetUserId });
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
      }
    } catch (err) {
      console.warn("关注操作降级处理:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // 图片选择与压缩
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

  // 保存个人资料
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

    if (isSelf) setUserInfo(mapped);
    setTargetUserInfo(mapped);

    const nextProfiles = { ...globalProfiles, [currentUserId]: mapped };
    setGlobalProfiles(nextProfiles);
    localStorage.setItem("painscape_simulated_profiles", JSON.stringify(nextProfiles));

    setShowEditModal(false);
  };

  // 校验筛选属于该用户的帖子
  const myRealPosts = posts.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    const matchesUser =
      (p.userId && String(p.userId) === String(targetUserId)) ||
      (p.authorId && String(p.authorId) === String(targetUserId)) ||
      (p.user_id && String(p.user_id) === String(targetUserId));

    if (!matchesUser) return false;

    const hasValidImg = p.img && typeof p.img === 'string' && p.img.trim().length > 10;
    const hasValidText = Boolean(
      (p.text && String(p.text).trim()) ||
      (p.painName && String(p.painName).trim()) ||
      (p.content && (p.content.chief_complaint || p.content.text))
    );

    return hasValidImg && hasValidText;
  });

  const totalRecords = isSelf ? history.length : myRealPosts.length;

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

  const displaySignature = (!activeProfile.signature ||
    activeProfile.signature === "让说不出的痛，换一种方式抵达。🧘" ||
    activeProfile.signature === "Let the unspeakable pain find another way to be heard. 🧘")
    ? t('profile.defaultSignature')
    : activeProfile.signature;

  // 删除帖子
  const handleDeletePostInProfile = async (postId) => {
    if (window.confirm('确定要删除这条具身档案吗？删除后不可恢复。')) {
      const targetId = String(postId);
      await deletePost(targetId, currentUserId);
      if (setPosts) {
        setPosts(prev => prev.filter(p => String(p.id) !== targetId));
      }
      setSelectedPostDetail(null);
    }
  };

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
      {activeProfile.customBg && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(5, 5, 5, 0.78)',
            zIndex: 0, pointerEvents: 'none',
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
          <h2 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {isSelf ? t('profile.sanctuary') : t('profile.companionSpace')}
          </h2>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {setTargetLanguage && (
              <button
                onClick={() => setTargetLanguage(isEn ? 'zh' : 'en')}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                🌐 {isEn ? '简体中文' : 'English'}
              </button>
            )}

            <button
              onClick={onBack}
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: 'var(--radius-lg)',
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
            padding: 'var(--space-xl)',
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

            {/* 社交关注按钮 */}
            {!isSelf ? (
              <button
                onClick={handleToggleFollow}
                disabled={isFollowLoading}
                onMouseEnter={() => setIsHoverFollowBtn(true)}
                onMouseLeave={() => setIsHoverFollowBtn(false)}
                style={{
                  padding: '6px 20px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: isFollowLoading ? 'wait' : 'pointer',
                  border: isFollowing ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  background: isFollowing
                    ? (isHoverFollowBtn ? 'rgba(211,47,47,0.2)' : 'rgba(255,255,255,0.06)')
                    : '#d32f2f',
                  color: isFollowing
                    ? (isHoverFollowBtn ? '#ef5350' : '#ccc')
                    : '#fff',
                  boxShadow: isFollowing ? 'none' : '0 4px 12px rgba(211, 47, 47, 0.3)',
                  transition: 'all 0.2s ease',
                  opacity: isFollowLoading ? 0.7 : 1,
                }}
              >
                {isFollowLoading
                  ? '处理中...'
                  : isFollowing
                    ? (isHoverFollowBtn ? '💔 取消关注' : '✓ 已关注')
                    : '+ 关注同伴'}
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

          {/* 编辑资料 */}
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
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
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
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
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
              <div
                style={{
                  color: '#a5d6a7',
                  fontSize: '15px',
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
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
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
                fontSize: 'var(--text-base)',
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
              {myRealPosts.slice(0, 10).map((record, index) => {
                const displayText =
                  record.content?.chief_complaint?.replace('主诉：', '') ||
                  record.text ||
                  record.painName ||
                  '具身痛觉图谱分享';

                return (
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
                      padding: 'var(--space-md)',
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
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#121212',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <img
                        src={record.img}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        alt="somatic thumbnail"
                      />
                    </div>

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
                        {displayText}
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
                );
              })}
            </div>
          )}
        </div>

        {/* ===== 安全退出 ===== */}
        {isSelf && (
          <button
            onClick={async () => {
              await logout();
              onLogout?.();
            }}
            style={{
              width: '100%',
              padding: '14px 0',
              background: 'transparent',
              color: '#ef5350',
              border: '1px solid rgba(239,83,80,0.3)',
              borderRadius: '30px',
              fontSize: 'var(--text-base)',
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
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 900,
            padding: 'var(--space-lg)',
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
              maxWidth: 'var(--container-sm)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
              {t('profile.editInfoTitle')}
            </h3>

            <input type="file" ref={avatarInputRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected(e, 'avatar')} />
            <input type="file" ref={bgInputRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected(e, 'bg')} />

            {/* 昵称 */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
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
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-md)',
                  fontSize: 'var(--text-base)',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* 个性签名 */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
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
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-md)',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                  {t('profile.uploadAvatar')}
                </label>
                {editCustomAvatar && (
                  <button
                    onClick={() => setEditCustomAvatar('')}
                    style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {t('profile.restoreDefault')}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button
                  onClick={() => avatarInputRef.current.click()}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px dashed #444',
                    borderRadius: 'var(--radius-sm)',
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
                      width: '40px', height: '40px',
                      borderRadius: '50%', objectFit: 'cover',
                      border: '1px solid #d32f2f',
                    }}
                    alt="avatar preview"
                  />
                )}
              </div>

              {!editCustomAvatar && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setEditAvatar(emoji)}
                      style={{
                        fontSize: '20px',
                        background: editAvatar === emoji ? 'rgba(211,47,47,0.15)' : 'rgba(255,255,255,0.02)',
                        border: editAvatar === emoji ? '1.5px solid #d32f2f' : '1px solid #2a2a2a',
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

            {/* 背景选择 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                  {t('profile.uploadBg')}
                </label>
                {editCustomBg && (
                  <button
                    onClick={() => setEditCustomBg('')}
                    style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {t('profile.restoreGradient')}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button
                  onClick={() => bgInputRef.current.click()}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px dashed #444',
                    borderRadius: 'var(--radius-sm)',
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
                      width: '50px', height: '35px',
                      borderRadius: '6px',
                      background: `url(${editCustomBg}) center/cover no-repeat`,
                      border: '1px solid #d32f2f',
                    }}
                  />
                )}
              </div>

              <div style={{ borderTop: '1px solid #2d2d2d', paddingTop: '16px', marginTop: '16px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  {t('profile.themeTitle')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

            {/* 弹窗底部操作 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  flex: 1, padding: 'var(--space-md)', background: '#222', color: '#888',
                  border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '13px', cursor: 'pointer',
                }}
              >
                {t('profile.cancel')}
              </button>
              <button
                onClick={handleSaveChanges}
                style={{
                  flex: 1, padding: 'var(--space-md)',
                  background: 'linear-gradient(135deg, #ff9800, #f44336)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
                  fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                }}
              >
                {t('profile.saveProfile')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 裁剪弹窗 */}
      <CropModal
        isOpen={showCropModal}
        imageSrc={cropSrc}
        cropType={cropType}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      {/* ===== 🌟 关注同伴列表弹窗（展示真实头像/昵称，且支持精准导航点击） ===== */}
      {showFollowingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, padding: 'var(--space-lg)', boxSizing: 'border-box'
        }} onClick={() => setShowFollowingModal(false)}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: '24px',
            padding: '24px', width: '100%', maxWidth: 'var(--container-sm)', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2d2d2d', paddingBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                🤝 {isSelf ? t('profile.myFollowings') : `${targetUserInfo.nickname} 的同伴`} ({followingCount})
              </h3>
              <button
                onClick={() => setShowFollowingModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 'var(--text-md)', cursor: 'pointer' }}
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
                    onClick={() => handleSelectUser(followedUser.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', overflow: 'hidden', flexShrink: 0
                    }}>
                      {followedUser.customAvatar ? (
                        <img src={followedUser.customAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        followedUser.avatar || "🩹"
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {followedUser.nickname}
                      </div>
                      <div style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {followedUser.signature || t('profile.defaultSignature')}
                      </div>
                    </div>
                    <span style={{ color: '#666', fontSize: 'var(--text-base)' }}>›</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFollowingModal(false)}
              style={{
                width: '100%', padding: '11px 0', marginTop: '16px',
                background: 'transparent', border: '1px solid #333',
                borderRadius: '30px', color: '#888', fontSize: '13px', cursor: 'pointer'
              }}
            >
              {t('profile.closeList')}
            </button>
          </div>
        </div>
      )}

      {/* ===== 🌟 粉丝同伴列表弹窗（展示真实头像/昵称，且支持精准导航点击） ===== */}
      {showFollowersModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, padding: 'var(--space-lg)', boxSizing: 'border-box'
        }} onClick={() => setShowFollowersModal(false)}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: '24px',
            padding: '24px', width: '100%', maxWidth: 'var(--container-sm)', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2d2d2d', paddingBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                🤝 {isSelf ? t('profile.myFollowers') : `${targetUserInfo.nickname} 的粉丝`} ({followersCount})
              </h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 'var(--text-md)', cursor: 'pointer' }}
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
                    onClick={() => handleSelectUser(followerUser.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', overflow: 'hidden', flexShrink: 0
                    }}>
                      {followerUser.customAvatar ? (
                        <img src={followerUser.customAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        followerUser.avatar || "🩹"
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {followerUser.nickname}
                      </div>
                      <div style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {followerUser.signature || t('profile.defaultSignature')}
                      </div>
                    </div>
                    <span style={{ color: '#666', fontSize: 'var(--text-base)' }}>›</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFollowersModal(false)}
              style={{
                width: '100%', padding: '11px 0', marginTop: '16px',
                background: 'transparent', border: '1px solid #333',
                borderRadius: '30px', color: '#888', fontSize: '13px', cursor: 'pointer'
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
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(5, 5, 5, 0.96)', backdropFilter: 'blur(15px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1300, padding: 'var(--space-lg)', boxSizing: 'border-box'
        }} onClick={() => setSelectedPostDetail(null)}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: '24px',
            padding: '24px', width: '100%', maxWidth: 'var(--container-sm)', maxHeight: '90vh',
            overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#ef5350', fontSize: 'var(--text-base)', fontWeight: 'bold' }}>
                📖 具身档案细节回顾
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {(isSelf || (currentUserId && (String(selectedPostDetail.userId || selectedPostDetail.user_id || selectedPostDetail.authorId) === String(currentUserId)))) && (
                  <button
                    onClick={() => handleDeletePostInProfile(selectedPostDetail.id)}
                    style={{
                      background: 'rgba(239, 83, 80, 0.15)',
                      border: '1px solid rgba(239, 83, 80, 0.3)',
                      color: '#ef5350',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🗑️ 删除
                  </button>
                )}

                <button
                  onClick={() => setSelectedPostDetail(null)}
                  style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '18px' }}>
              <img
                src={selectedPostDetail.img}
                onError={(e) => { e.target.style.display = 'none'; }}
                style={{ width: '100%', display: 'block', objectFit: 'contain' }}
                alt="Embodied Paint"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span style={{
                color: '#ef5350',
                fontSize: '11px',
                background: 'rgba(239,83,80,0.08)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
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
              padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px'
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
                padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '20px'
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
                width: '100%', padding: '12px 0',
                background: '#333', border: 'none', borderRadius: '30px',
                color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
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