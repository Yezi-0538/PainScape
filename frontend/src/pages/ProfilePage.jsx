// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  currentUserId = "user_guest", 
  targetUserId = "user_guest", 
  isGuest = false,
  onOpenAuth,
  setTargetUserId,
  onViewProfile,
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

  // 本地名片缓存
  const globalProfiles = useMemo(() => {
    try {
      const cached = localStorage.getItem("painscape_simulated_profiles");
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  }, []);

  const authorPostFromApp = useMemo(() => {
    return posts.find(p => String(p.userId || p.user_id || p.authorId) === String(targetUserId));
  }, [posts, targetUserId]);

  // 1. 挂载第 1 毫秒精确计算出初始资料（无伪降级账号）
  const initialProfile = useMemo(() => {
    if (isSelf && !isGuest && userInfo?.email) return userInfo;
    
    if (isGuest && isSelf) {
      return {
        id: targetUserId,
        nickname: "游客同伴",
        email: "未登录 (点击登录同步云端档案)",
        avatar: "🩹",
        signature: t('profile.defaultSignature'),
        bgIndex: 0,
        customAvatar: "",
        customBg: ""
      };
    }

    return {
      id: targetUserId,
      nickname: authorPostFromApp?.nickname || authorPostFromApp?.authorName || `云端同伴_${String(targetUserId).slice(-4)}`,
      email: "已验证云端账户",
      avatar: authorPostFromApp?.avatar || "🌸",
      signature: t('profile.defaultSignature'),
      bgIndex: 0,
      customAvatar: authorPostFromApp?.customAvatar || authorPostFromApp?.custom_avatar || "",
      customBg: ""
    };
  }, [isSelf, isGuest, userInfo, targetUserId, authorPostFromApp, t]);

  const [targetUserInfo, setTargetUserInfo] = useState(initialProfile);
  const [userCloudPosts, setUserCloudPosts] = useState([]);
  const [cloudPainRecordsCount, setCloudPainRecordsCount] = useState(0);

  // 控制全屏加载遮罩
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const activeProfile = isSelf ? (isGuest ? initialProfile : (userInfo || initialProfile)) : targetUserInfo;

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

  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState('🩸');
  const [editBgIndex, setEditBgIndex] = useState(0);
  const [editCustomAvatar, setEditCustomAvatar] = useState('');
  const [editCustomBg, setEditCustomBg] = useState('');
  const [editSignature, setEditSignature] = useState('');

  const activeBg = PRESET_BACKGROUNDS[activeProfile?.bgIndex] || PRESET_BACKGROUNDS[0];

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

  useEffect(() => {
    if (showEditModal && activeProfile) {
      setEditNickname(activeProfile.nickname || "");
      setEditAvatar(activeProfile.avatar || "🩸");
      setEditBgIndex(activeProfile.bgIndex ?? 0);
      setEditCustomAvatar(activeProfile.customAvatar || "");
      setEditCustomBg(activeProfile.customBg || "");
      setEditSignature(activeProfile.signature || t('profile.defaultSignature'));
    }
  }, [showEditModal, activeProfile, t]);

  // 🌟 核心直连 Supabase 云端拉取：Promise.all 5路并发 + 安全超时兜底
  useEffect(() => {
    let isMounted = true;

    const loadCloudData = async () => {
      if (!targetUserId || targetUserId.startsWith('guest_') || targetUserId === 'user_guest') {
        if (isMounted) setIsProfileLoading(false);
        return;
      }

      // 🌟 1. 检查是否有社交关系本地缓存（key: painscape_social_cache_UID）
      const cacheKey = `painscape_social_cache_${targetUserId}`;
      const cachedSocial = JSON.parse(localStorage.getItem(cacheKey) || "null");
      const hasSocialCache = cachedSocial && Array.isArray(cachedSocial.followers) && Array.isArray(cachedSocial.followings);
      // 如果有缓存，直接使用缓存，不让用户等待！
      if (hasSocialCache && isMounted) {
        setFollowers(cachedSocial.followers);
        setFollowings(cachedSocial.followings);
        setIsFollowing(cachedSocial.followers.some(f => String(f.id) === String(currentUserId)));
      } else {
        setIsProfileLoading(true); // 无缓存时才开启加载提示
      }

      try {
        // 🌟 5 路云端请求同时并发发起
        const [
          profileRes,
          userPostsRes,
          painRecordsRes,
          followerRes,
          followingRes,
          authRes
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
          supabase.from("posts").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
          supabase.from("pain_records").select("id").eq("user_id", targetUserId),
          !hasSocialCache ? supabase.from("follows").select("follower_id").eq("following_id", targetUserId) : Promise.resolve({ data: null }),
          !hasSocialCache ? supabase.from("follows").select("following_id").eq("follower_id", targetUserId) : Promise.resolve({ data: null }),
          isSelf ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } })
        ]);

        if (!isMounted) return;

        // 1. 解析 Profile
        const profile = profileRes.data;
        const realAuthEmail = authRes?.data?.user?.email || "";

        if (isSelf && !isGuest) {
          const mappedSelf = {
            id: currentUserId,
            nickname: profile?.nickname || (realAuthEmail ? realAuthEmail.split('@')[0] : "云端同伴"),
            email: realAuthEmail || profile?.email || "云端账号",
            avatar: profile?.avatar || userInfo?.avatar || "🩸",
            signature: profile?.signature || userInfo?.signature || t('profile.defaultSignature'),
            bgIndex: profile?.bg_index ?? userInfo?.bgIndex ?? 0,
            customAvatar: profile?.custom_avatar || profile?.customAvatar || userInfo?.customAvatar || "",
            customBg: profile?.custom_bg || profile?.customBg || userInfo?.customBg || ""
          };
          setTargetUserInfo(mappedSelf);
        } else if (!isSelf) {
          const mappedOther = {
            id: targetUserId,
            nickname: profile?.nickname || authorPostFromApp?.nickname || authorPostFromApp?.authorName || `云端同伴_${String(targetUserId).slice(-4)}`,
            email: profile?.email || "已验证账号",
            avatar: profile?.avatar || authorPostFromApp?.avatar || "🌸",
            signature: profile?.signature || t('profile.defaultSignature'),
            bgIndex: profile?.bg_index ?? 0,
            customAvatar: profile?.custom_avatar || profile?.customAvatar || authorPostFromApp?.customAvatar || authorPostFromApp?.custom_avatar || "",
            customBg: profile?.custom_bg || profile?.customBg || ""
          };
          setTargetUserInfo(mappedOther);
        }

        // 2. 解析云端帖子
        if (userPostsRes.data) {
          const formattedPosts = userPostsRes.data.map(p => ({
            ...p,
            id: String(p.id),
            userId: p.user_id,
            authorId: p.user_id,
            painName: p.pain_tags?.[0] || '痛经',
            userExperience: p.user_experience || '',
            createdAt: p.created_at,
          }));
          setUserCloudPosts(formattedPosts);
        }

        // 3. 解析云端记录数
        if (painRecordsRes.data) {
          setCloudPainRecordsCount(painRecordsRes.data.length);
        }

        // 🌟 3. 如果之前没有缓存，解析 Supabase 的关系表，并立刻写入本地缓存！
        if (!hasSocialCache && (followerRes.data || followingRes.data)) {
          let followerUids = followerRes.data ? followerRes.data.map(r => String(r.follower_id)) : [];
          let followingUids = followingRes.data ? followingRes.data.map(r => String(r.following_id)) : [];

          const allRelatedUids = Array.from(new Set([...followerUids, ...followingUids]));
          let remoteProfilesMap = {};

          if (allRelatedUids.length > 0) {
            const { data: relatedProfiles } = await supabase
              .from("profiles")
              .select("*")
              .in("id", allRelatedUids);

            if (relatedProfiles) {
              relatedProfiles.forEach(p => { remoteProfilesMap[p.id] = p; });
            }
          }

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
            const remoteP = remoteProfilesMap[uidStr];
            const postP = posts.find(p => String(p.userId || p.user_id || p.authorId) === uidStr);

            return {
              id: uidStr,
              nickname: remoteP?.nickname || postP?.nickname || postP?.authorName || `同伴_${uidStr.slice(-4)}`,
              avatar: remoteP?.avatar || postP?.avatar || "🩹",
              customAvatar: remoteP?.custom_avatar || remoteP?.customAvatar || postP?.customAvatar || postP?.custom_avatar || "",
              signature: remoteP?.signature || t('profile.defaultSignature')
            };
          };

          const newFollowers = followerUids.map(uid => resolveProfileByUid(uid));
          const newFollowings = followingUids.map(uid => resolveProfileByUid(uid));

          setFollowers(newFollowers);
          setFollowings(newFollowings);
          setIsFollowing(followerUids.some(uid => String(uid) === String(currentUserId)));

          // 🌟 一键保存入 LocalStorage 缓存
          localStorage.setItem(cacheKey, JSON.stringify({
            followers: newFollowers,
            followings: newFollowings,
            updatedAt: Date.now()
          }));
        }

      } catch (err) {
        console.warn("读取主页云端数据异常:", err);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    loadCloudData();

    return () => { isMounted = false; };
  }, [targetUserId, currentUserId, isSelf, isGuest, t]);

  //  关注与取消关注：云端直连写表并实时更新 state
  // 本地瞬间写缓存 + 异步推云端
  const handleToggleFollow = async () => {
    if (isGuest || !currentUserId || currentUserId.startsWith('guest_') || currentUserId === 'user_guest') {
      if (onOpenAuth) onOpenAuth();
      else alert('请先登录后再关注同伴！');
      return;
    }
    if (isFollowLoading) return;
    setIsFollowLoading(true);

    const willFollow = !isFollowing;
    setIsFollowing(willFollow);

    // 1. 实时计算新的粉丝列表
    let updatedFollowers = [];
    if (willFollow) {
      const myInfo = {
        id: currentUserId,
        nickname: userInfo?.nickname || "同伴",
        avatar: userInfo?.avatar || "🩸",
        signature: userInfo?.signature || "",
        customAvatar: userInfo?.customAvatar || ""
      };
      updatedFollowers = [...followers.filter(f => String(f.id) !== String(currentUserId)), myInfo];
    } else {
      updatedFollowers = followers.filter(f => String(f.id) !== String(currentUserId));
    }

    setFollowers(updatedFollowers);

    // 🌟 2. 实时更新并写入该同伴的社交缓存！
    const cacheKey = `painscape_social_cache_${targetUserId}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      followers: updatedFollowers,
      followings: followings,
      updatedAt: Date.now()
    }));

    setIsFollowLoading(false);

    // 3. 后台单次异步请求写入 Supabase
    try {
      if (willFollow) {
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
      console.warn("后台关注同步云端提示:", err);
    }
  };

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

  const handleSaveChanges = async () => {
    if (!editNickname.trim()) {
      alert(t('toast.saveExperienceRequired') || '昵称不能为空！');
      return;
    }
    const updatedInfo = {
      nickname: editNickname,
      email: activeProfile?.email,
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
      console.warn("云端保存失败:", err);
    }

    const mapped = {
      id: currentUserId,
      nickname: editNickname,
      email: activeProfile?.email,
      avatar: editAvatar,
      bgIndex: editBgIndex,
      customAvatar: editCustomAvatar,
      customBg: editCustomBg,
      signature: editSignature,
    };

    if (isSelf && setUserInfo) setUserInfo(mapped); 
    setTargetUserInfo(mapped);
    setShowEditModal(false);
  };

  //  融合云端、内存与本地最新帖子
  const myRealPosts = useMemo(() => {
    const localPosts = JSON.parse(localStorage.getItem("painscape_posts") || "[]");
    const combined = [...userCloudPosts, ...posts, ...localPosts];
    const uniqueMap = new Map();

    combined.forEach(p => {
      if (!p || typeof p !== 'object') return;
      const matchesUser = 
        (p.userId && String(p.userId) === String(targetUserId)) ||
        (p.authorId && String(p.authorId) === String(targetUserId)) ||
        (p.user_id && String(p.user_id) === String(targetUserId));
        
      if (!matchesUser) return;

      const pKey = String(p.id || p.img || Math.random());
      if (!uniqueMap.has(pKey)) {
        uniqueMap.set(pKey, p);
      }
    });

    return Array.from(uniqueMap.values());
  }, [userCloudPosts, posts, targetUserId]);

  const totalRecords = isSelf 
    ? Math.max(history.length, cloudPainRecordsCount, myRealPosts.length) 
    : myRealPosts.length;

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

  const currentBackground = activeProfile?.customBg
    ? `url(${activeProfile.customBg}) center/cover no-repeat`
    : activeBg.gradient;

  const displaySignature = (!activeProfile?.signature || 
    activeProfile.signature === "让说不出的痛，换一种方式抵达。🧘" || 
    activeProfile.signature === "Let the unspeakable pain find another way to be heard. 🧘")
    ? t('profile.defaultSignature')
    : activeProfile.signature;

  const handleDeletePostInProfile = async (postId) => {
    if (window.confirm('确定要删除这条具身档案吗？删除后不可恢复。')) {
      const targetId = String(postId);
      await deletePost(targetId, currentUserId);
      setUserCloudPosts(prev => prev.filter(p => String(p.id) !== targetId));
      if (setPosts) {
        setPosts(prev => prev.filter(p => String(p.id) !== targetId));
      }
      setSelectedPostDetail(null);
    }
  };

  if (!activeProfile) return null;

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
      {/* 动画样式定义 */}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

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
        {isSelf && isGuest && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,152,0,0.15), rgba(244,67,54,0.15))',
            border: '1px solid rgba(255,152,0,0.4)',
            borderRadius: '18px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ color: '#ffe0b2', fontSize: '12.5px', lineHeight: '1.4' }}>
              ⚡️ 当前为<strong>游客临时身份</strong>。登录后可自动同步云端档案与关注关系。
            </div>
            <button
              onClick={onOpenAuth}
              style={{
                padding: '8px 16px',
                background: '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(255,152,0,0.3)'
              }}
            >
              登录/注册
            </button>
          </div>
        )}
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
            {/* 顶栏微型加载提示：数据更新时显示极简动画，替代原来的全屏遮罩 */}
            {isProfileLoading && (
              <span style={{
                fontSize: '11px',
                color: '#ffb74d',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255,183,77,0.1)',
                border: '1px solid rgba(255,183,77,0.2)',
                padding: '3px 8px',
                borderRadius: '12px',
                lineHeight: 1,
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '9px',
                  height: '9px',
                  border: '1.5px solid rgba(255,183,77,0.3)',
                  borderTop: '1.5px solid #ffb74d',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                更新中
              </span>
            )}
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
              activeProfile.avatar || "🩸"
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
                  borderRadius: '20px',
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
                  color: isGuest ? '#ff9800' : '#4caf50',
                  background: isGuest ? 'rgba(255,152,0,0.1)' : 'rgba(76,175,80,0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-block',
                }}
              >
                {isGuest ? '游客临时态' : t('profile.memberStatus')}
              </span>
            )}
          </div>

          {/* 编辑资料 */}
          {isSelf && !isGuest && (
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
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {isGuest ? '退出游客身份' : t('profile.logout')}
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
                  flex: 1, padding: '12px', background: '#222', color: '#888',
                  border: 'none', borderRadius: '12px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                {t('profile.cancel')}
              </button>
              <button
                onClick={handleSaveChanges}
                style={{
                  flex: 1, padding: '12px',
                  background: 'linear-gradient(135deg, #ff9800, #f44336)',
                  color: '#fff', border: 'none', borderRadius: '12px',
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

      {/* ===== 关注同伴列表弹窗 ===== */}
      {showFollowingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, padding: '16px', boxSizing: 'border-box'
        }} onClick={() => setShowFollowingModal(false)}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: '24px',
            padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2d2d2d', paddingBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                🤝 {isSelf ? t('profile.myFollowings') : `${activeProfile.nickname} 的同伴`} ({followingCount})
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
                    onClick={() => handleSelectUser(followedUser.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '12px', padding: '10px 12px',
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
                    <span style={{ color: '#666', fontSize: '14px' }}>›</span>
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

      {/* ===== 粉丝同伴列表弹窗 ===== */}
      {showFollowersModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, padding: '16px', boxSizing: 'border-box'
        }} onClick={() => setShowFollowersModal(false)}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: '24px',
            padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2d2d2d', paddingBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                🤝 {isSelf ? t('profile.myFollowers') : `${activeProfile.nickname} 的粉丝`} ({followersCount})
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
                    onClick={() => handleSelectUser(followerUser.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '12px', padding: '10px 12px',
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
                    <span style={{ color: '#666', fontSize: '14px' }}>›</span>
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
          zIndex: 1300, padding: '16px', boxSizing: 'border-box'
        }} onClick={() => setSelectedPostDetail(null)}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: '24px',
            padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '90vh',
            overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#ef5350', fontSize: '14px', fontWeight: 'bold' }}>
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
                      borderRadius: '12px',
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

            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '18px' }}>
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
              padding: '14px', borderRadius: '12px', marginBottom: '14px'
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
                padding: '14px', borderRadius: '12px', marginBottom: '20px'
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