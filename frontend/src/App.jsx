// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { I18nProvider, useI18n } from './i18n/i18nContext';
import { UserProvider, useUser } from './contexts/UserContext';

// ===== 页面导入 =====
import SplashPage from './pages/SplashPage';
import ModeSelectionPage from './pages/ModeSelection';
import OnboardingPage from './pages/Onboarding';
import CanvasPage from './pages/Canvas';
import ResultPage from './pages/ResultPage';
import CommunityPage from './pages/Community';
import HistoryPage from './pages/History';
import ProfilePage from './pages/ProfilePage';
import QuickLogPage from './pages/QuickLogPage';

// ===== 组件导入 =====
import SomaticHealingSpace from './Components/SomaticHealingSpace.jsx';
import Loading from './Components/Loading.jsx';
import { useToast, Toast } from './Components/Toast.jsx';
import AuthModal from './Components/AuthModal';

import PublishPostModal from './Components/modals/PublishPostModal.jsx';
import GeneratedCardModal from './Components/modals/GeneratedCardModal.jsx';
import SharePreviewModal from './Components/modals/SharePreviewModal.jsx';

// ===== 工具函数与常量 =====
import { loadFromStorage, saveToStorage } from './utils/helpers';
import { PAIN_NAME_MAP } from './i18n/translationsConstants';

// ===== API服务与数据库连接器 =====
import { createPost, getPosts } from './services/postService';
import { supabase } from "./services/supabaseClient";

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'https://painscape-api.onrender.com';

const CHINESE_TO_KEY_MAP = {
  '绞痛': 'twist', '刺痛': 'pierce', '坠胀': 'heavy',
  '坠胀重压': 'heavy', '坠痛': 'heavy', '酸胀': 'wave',
  '酸胀痛': 'wave', '酸痛': 'wave', '刮痛': 'scrape',
  '撕裂痛': 'scrape', '撕刮痛': 'scrape',
};

function AppContent({ targetLanguage, setTargetLanguage }) {
  const isEn = targetLanguage === 'en';
  const { t } = useI18n();
  const { userInfo, setUserInfo } = useUser();
  const { show, ToastContainer } = useToast();

  const showToast = useCallback((key, vars = {}) => {
    const msg = t(`toast.${key}`, vars);
    show(msg);
  }, [show, t]);

  useEffect(() => {
    Toast.init({ show });
  }, [show]);

  // 兜底静态图片生成器
  const getFallbackImgUrl = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#ef5350';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("PainScape Somatic Map", 200, 200);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  // 🌟 仅在 Auth 初始化时校验 basic session，绝不主动强行冲掉当前用户修改
  const syncSupabaseUserProfile = useCallback(async (userId, sessionUser = null) => {
    if (!userId || userId.startsWith('guest_') || userId === 'user_guest') return;
    try {
      let localCached = JSON.parse(localStorage.getItem("painscape_user_info") || "null");
      if (localCached && localCached.id === userId) {
        if (setUserInfo) setUserInfo(localCached);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (profile) {
        const mapped = {
          id: userId,
          email: sessionUser?.email || profile.email || "",
          nickname: profile.nickname || "云端同伴",
          avatar: profile.avatar || "🩸",
          signature: profile.signature || t('profile.defaultSignature'),
          bgIndex: Number(profile.bg_index ?? 0),
          customAvatar: profile.custom_avatar || profile.customAvatar || "",
          customBg: profile.custom_bg || profile.customBg || ""
        };
        if (setUserInfo) setUserInfo(mapped);
        localStorage.setItem("painscape_user_info", JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn("App 基础同步提示:", err);
    }
  }, [setUserInfo, t]);

  const [page, setPage] = useState('splash');
  const [splashOpacity, setSplashOpacity] = useState(1);

  // 🌟 核心状态初始化（无重复声明）
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem('painscape_last_uid') || null;
  });
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('painscape_is_guest') === 'true';
  });
  const [targetUserId, setTargetUserId] = useState(currentUserId);
  const [authReady, setAuthReady] = useState(false);

  const handleAuthSuccess = useCallback((userId) => {
    setCurrentUserId(userId);
    setTargetUserId(userId);
    setIsGuest(false);
    setShowAuthModal(false);
    setAuthReady(true);
    localStorage.setItem('painscape_last_uid', userId);
    localStorage.setItem('painscape_is_guest', 'false');
    syncSupabaseUserProfile(userId);
    if (page === 'splash') {
      setPage('modeSelection');
    }
  }, [page, syncSupabaseUserProfile]);

  const handleGuestLogin = useCallback((guestId) => {
    setCurrentUserId(guestId);
    setTargetUserId(guestId);
    setIsGuest(true);
    setShowAuthModal(false);
    setAuthReady(true);
    localStorage.setItem('painscape_last_uid', guestId);
    localStorage.setItem('painscape_is_guest', 'true');
    if (page === 'splash') {
      setPage('modeSelection');
    }
  }, [page]);

  const handleLogout = useCallback(async () => {
    try {
      localStorage.removeItem('painscape_last_uid');
      localStorage.removeItem('painscape_is_guest');
      localStorage.removeItem('painscape_user_info');
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut failed:', err);
    }
  }, []);

  // 🌟 全局统一 Auth 状态与 Active Session 监听器（合并去重）
  useEffect(() => {
    let isMounted = true;

    // 1. 页面加载时，主动检查一次 session 状态
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          const uid = session.user.id;
          setCurrentUserId(uid);
          setTargetUserId(prev => prev || uid);
          setIsGuest(false);
          localStorage.setItem('painscape_last_uid', uid);
          localStorage.setItem('painscape_is_guest', 'false');
          syncSupabaseUserProfile(uid, session.user);
        } else {
          let guestUid = localStorage.getItem('painscape_guest_id');
          if (!guestUid) {
            guestUid = `guest_${Math.random().toString(36).substr(2, 8)}`;
            localStorage.setItem('painscape_guest_id', guestUid);
          }
          setCurrentUserId(guestUid);
          setTargetUserId(prev => prev || guestUid);
          setIsGuest(true);
          localStorage.setItem('painscape_is_guest', 'true');
          setShowAuthModal(true);
        }
      } catch (err) {
        console.warn("云端检测失败，切入游客模式:", err);
        let guestUid = localStorage.getItem('painscape_guest_id') || `guest_${Math.random().toString(36).substr(2, 8)}`;
        setCurrentUserId(guestUid);
        setTargetUserId(prev => prev || guestUid);
        setIsGuest(true);
        setShowAuthModal(true);
      } finally {
        if (isMounted) setAuthReady(true);
      }
    };

    checkActiveSession();

    // 2. 实时监听 Auth 状态变更（仅保持这唯一的监听器）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const uid = session.user.id;
        setCurrentUserId(uid);
        setTargetUserId(prev => prev || uid);
        setIsGuest(false);
        setShowAuthModal(false);
        localStorage.setItem('painscape_last_uid', uid);
        localStorage.setItem('painscape_is_guest', 'false');
        syncSupabaseUserProfile(uid, session.user);
      } else {
        let guestUid = localStorage.getItem('painscape_guest_id') || `guest_${Math.random().toString(36).substr(2, 8)}`;
        setCurrentUserId(guestUid);
        setTargetUserId(prev => prev || guestUid);
        setIsGuest(true);
        localStorage.setItem('painscape_is_guest', 'true');

        if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          setShowAuthModal(true);
        }
      }
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [syncSupabaseUserProfile]);

  const [showContent, setShowContent] = useState('basicInfo');
  const [appMode, setAppMode] = useState('medical');

  const [imgUrl, setImgUrl] = useState(null);
  const [bodyMode, setBodyMode] = useState('front');
  const [activeBrush, setActiveBrush] = useState(null);
  const [activeColor, setActiveColor] = useState('crimson');
  const [bgScale, setBgScale] = useState(1.0);
  const camRef = useRef({ x: 0, y: 0, zoom: 1.0 });

  const p5Ref = useRef(null);
  const pgFrontRef = useRef(null);
  const pgBackRef = useRef(null);
  const bgFrontRef = useRef(null);
  const bgBackRef = useRef(null);

  const brushCounts = useRef({ twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 });
  const dynamicParticles = useRef([]);
  const staticParticles = useRef([]);
  const particlePositions = useRef([]);
  const speedHistory = useRef([]);
  const pressureHistory = useRef([]);

  const getDominantPain = useCallback(() => {
    const counts = brushCounts.current;
    const maxVal = Math.max(...Object.values(counts));
    return maxVal > 0 ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : 'twist';
  }, []);

  const handlePublishPost = useCallback(async (record, customText) => {
    if (!record) return;

    const PAIN_KEY_MAP = {
      'twist': 'twist', '绞痛': 'twist',
      'pierce': 'pierce', '刺痛': 'pierce',
      'heavy': 'heavy', 'sink': 'heavy', '坠胀': 'heavy', '坠胀重压': 'heavy', '坠痛': 'heavy',
      'wave': 'wave', 'swell': 'wave', '酸胀': 'wave', '酸胀痛': 'wave', '弥漫酸胀痛': 'wave',
      'scrape': 'scrape', '刮痛': 'scrape', '撕裂痛': 'scrape', '撕裂刮痛': 'scrape'
    };

    const dominantKey = record.dominantPain || PAIN_KEY_MAP[record.painName] || getDominantPain() || 'twist';
    const painNameDisplay = t(`painNames.${dominantKey}`) || record.painName || '痛经';

    let cleanText = customText && customText.trim() ? customText.trim() : '';
    if (!cleanText) {
      const rd = record.reportData || record.content || {};
      if (typeof rd === 'string' && rd.startsWith('{')) {
        try {
          const parsed = JSON.parse(rd);
          cleanText = parsed.chief_complaint || '分享具身痛觉图谱';
        } catch (_) {
          cleanText = '分享具身痛觉图谱';
        }
      } else if (typeof rd === 'object') {
        cleanText = rd.chief_complaint || '分享具身痛觉图谱';
      } else {
        cleanText = String(rd || '分享具身痛觉图谱');
      }
    }

    const newPost = {
      id: Date.now().toString(),
      userId: currentUserId || 'user_guest',
      authorId: currentUserId || 'user_guest',
      nickname: userInfo?.nickname || '同伴',
      avatar: userInfo?.avatar || '🩸',
      customAvatar: userInfo?.customAvatar || '',
      img: record.img || imgUrl || getFallbackImgUrl(),
      painName: painNameDisplay,
      dominantPain: dominantKey,
      painTags: [dominantKey],
      text: cleanText,
      likes: 0,
      hugs: 0,
      userExperience: '',
      createdAt: new Date().toISOString(),
      reportData: record.reportData || record.content || {},
    };

    try {
      const savedPost = await createPost(newPost);
      setPosts(prev => [savedPost, ...prev]);
      showToast('publishSuccess', { count: 8, pain: painNameDisplay });
      setPage('community');
    } catch (err) {
      console.warn('云端发布失败，保存到本地状态:', err);
      setPosts(prev => [newPost, ...prev]);
      showToast('publishSuccess', { count: 8, pain: painNameDisplay });
      setPage('community');
    }
  }, [currentUserId, userInfo, imgUrl, getDominantPain, t, showToast, getFallbackImgUrl]);

  const handleSaveImage = useCallback((url) => {
    const downloadUrl = url || imgUrl;
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `PainScape_Somatic_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('shareSaved');
  }, [imgUrl, showToast]);

  const [history, setHistory] = useState(() => loadFromStorage('painscape_history', []));
  useEffect(() => {
    saveToStorage('painscape_history', history);
  }, [history]);

  const [posts, setPosts] = useState([]);
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
      if (!Array.isArray(existing) || existing.length === 0) {
        const now = new Date().toISOString();
        const seed = [
          {
            id: 'seed_1',
            userId: 'user_seed',
            authorId: 'user_seed',
            nickname: '小红',
            avatar: '❤️',
            text: '今天画了痛觉图谱，感觉被看见了。大家也来试试吧～',
            img: '',
            painTags: ['twist'],
            likes: 3,
            hugs: 1,
            userExperience: '热敷与深呼吸有效缓解',
            experienceTags: ['self-care'],
            is_anonymous: false,
            created_at: now,
            createdAt: now,
          },
          {
            id: 'seed_2',
            userId: 'user_seed2',
            authorId: 'user_seed2',
            nickname: '小明',
            avatar: '🌿',
            text: '分享我的恢复方法：短时散步 + 放松呼吸，疼痛减轻许多。',
            img: '',
            painTags: ['wave'],
            likes: 5,
            hugs: 2,
            userExperience: '运动与呼吸结合',
            experienceTags: ['movement'],
            is_anonymous: false,
            created_at: now,
            createdAt: now,
          },
        ];
        localStorage.setItem('painscape_posts', JSON.stringify(seed));
      }
    } catch (e) {
      console.warn('Seed posts failed:', e);
    }
  }, []);

  const refreshCommunity = useCallback(async () => {
    setIsCommunityLoading(true);
    try {
      const loadedPosts = await getPosts();
      setPosts(Array.isArray(loadedPosts) ? loadedPosts : []);
    } catch (e) {
      console.error('❌ 加载社区帖子失败:', e);
      showToast('loadPostsFailed');
    } finally {
      setIsCommunityLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (page === 'community') {
      refreshCommunity();
    }
  }, [page, refreshCommunity]);

  const [userPrefs, setUserPrefs] = useState(['care']);
  const [tonePreference, setTonePreference] = useState('gentle');
  const [cycleDay, setCycleDay] = useState('');
  const [leaveRecipient, setLeaveRecipient] = useState('manager');
  const [leaveTone, setLeaveTone] = useState('polite');

  const [medicalBackground, setMedicalBackground] = useState(() => {
    const cached = loadFromStorage('painscape_med_bg', {});
    return {
      diagnosed: cached.diagnosed || '',
      allergies: cached.allergies || '',
      age: cached.age || '',
      lifestyle: cached.lifestyle || '',
      activityLevel: cached.activityLevel || '',
      familyHistory: cached.familyHistory || '',
      psychosocial: cached.psychosocial || '',
      reproductiveHistory: cached.reproductiveHistory || '',
      height: cached.height || '',
      weight: cached.weight || '',
      otherDiagnosis: cached.otherDiagnosis || '',
      otherAllergies: cached.otherAllergies || '',
      surgicalHistory: cached.surgicalHistory || '',
      menarcheAge: cached.menarcheAge || '',
      cycleRegular: cached.cycleRegular || '',
      periodDuration: cached.periodDuration || '',
      lastPeriod: cached.lastPeriod || '',
      familyHistoryArr: cached.familyHistoryArr || [],
      lifestyleArr: cached.lifestyleArr || [],
      reproductiveHistoryArr: cached.reproductiveHistoryArr || [],
      accompanyingSymptomsArr: cached.accompanyingSymptomsArr || [],
    };
  });

  useEffect(() => {
    saveToStorage('painscape_med_bg', medicalBackground);
  }, [medicalBackground]);

  const [currentReportData, setCurrentReportData] = useState(null);
  const [llmData, setLlmData] = useState(null);
  const [identity, setIdentity] = useState('partner');
  const [editedContents, setEditedContents] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [refineInput, setRefineInput] = useState('');
  const [refiningField, setRefiningField] = useState(null);
  const [refineTargetField, setRefineTargetField] = useState('chief_complaint');
  const [isLoading, setIsLoading] = useState(false);

  const [shareContent, setShareContent] = useState(null);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [generatedCardUrl, setGeneratedCardUrl] = useState(null);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [viewingDiary, setViewingDiary] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);

  const [userLikedPosts, setUserLikedPosts] = useState(() => loadFromStorage('painscape_user_likes', []));
  const [painFilter, setPainFilter] = useState('all');
  const [showExpInput, setShowExpInput] = useState(false);
  const [expText, setExpText] = useState('');
  const [expTags, setExpTags] = useState('');

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState([]);
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [menstrualDates, setMenstrualDates] = useState([]);

  const [healingState, setHealingState] = useState({ isOpen: false, activeTab: 'breathing' });
  const [randomPartnerTips, setRandomPartnerTips] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (page === 'result') {
      const tips = t('partnerTips', { returnObjects: true }) || [];
      setRandomPartnerTips(Array.isArray(tips) ? tips : []);
    }
  }, [page, t]);

  const prepareSharePreview = useCallback((contentData) => {
    setShareContent(contentData);
    setShowSharePreview(true);
  }, []);

  useEffect(() => {
    if (page === 'splash') {
      const timer1 = setTimeout(() => setSplashOpacity(0), 2000);
      const timer2 = setTimeout(() => setPage('modeSelection'), 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [page]);

  const getQuote = () => {
    const quotes = t('splash.quotes', { returnObjects: true });
    if (Array.isArray(quotes) && quotes.length > 0) {
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    return '';
  };


  const generateContent = useCallback((overrideType, externalLlm = null, externalReportData = null) => {
    try {
      const isEn = targetLanguage === 'en';
      const activeLlm = externalReportData || externalLlm || currentReportData || llmData;

      const containsChinese = (str) => /[\u4e00-\u9fa5]/.test(String(str || ''));
      const getLocalizedText = (activeText, defaultText) => {
        if (!activeText) return defaultText;
        if (isEn && containsChinese(activeText)) return defaultText;
        if (!isEn && !containsChinese(activeText)) return defaultText;
        return activeText;
      };

      const dominant = overrideType || getDominantPain() || 'twist';
      const painName = t(`painNames.${dominant}`) || (isEn ? 'Dysmenorrhea' : '痛经');

      // ============================================================
      // ✅ 从用户填写的数据中提取信息
      // ============================================================
      const mb = medicalBackground || {};

      // ---- 伴随症状 ----
      const symptomsArr = mb.accompanyingSymptomsArr || [];
      const symptomsText = Array.isArray(symptomsArr) && symptomsArr.length > 0
        ? symptomsArr.map(s => t(`onboarding.accompanyingOptions.${s}`) || s).join(isEn ? ', ' : '、')
        : t('defaultTemplates.noSymptoms');

      const customSymptoms = mb.accompanyingOther || '';
      const allSymptomsText = customSymptoms
        ? (isEn ? `${symptomsText}, ${customSymptoms}` : `${symptomsText}、${customSymptoms}`)
        : symptomsText;

      // ---- 年龄 ----
      const ageLabel = mb.age ? t(`onboarding.ageOptions.${mb.age}`) || mb.age : t('defaultTemplates.notProvided');

      // ---- 身高体重 ----
      const height = mb.height || t('defaultTemplates.notProvided');
      const weight = mb.weight || t('defaultTemplates.notProvided');
      const heightWeightText = (mb.height && mb.weight)
        ? `${height}cm / ${weight}kg`
        : t('defaultTemplates.notProvided');

      // ---- 活动水平 ----
      const activityLabel = mb.activityLevel ? t(`onboarding.activityOptions.${mb.activityLevel}`) || mb.activityLevel : t('defaultTemplates.notProvided');

      // ---- 周期 ----
      const cycleDisplay = cycleDay || t('defaultTemplates.notProvided');

      // ---- 周期规律 ----
      let cycleRegDisplay = t('defaultTemplates.notProvided');
      if (mb.cycleRegular && mb.cycleRegular !== '') {
        cycleRegDisplay = t(`onboarding.cycleRegularOptions.${mb.cycleRegular}`) || mb.cycleRegular;
      }

      // ---- 既往诊断 ----
      let diagnosedText = t('defaultTemplates.noDiagnosis');
      if (mb.diagnosed && mb.diagnosed !== 'none' && mb.diagnosed !== 'unknown' && mb.diagnosed !== '') {
        const diagnosedLabel = t(`onboarding.diagnosisOptions.${mb.diagnosed}`) || mb.diagnosed;
        diagnosedText = diagnosedLabel;
        if (mb.otherDiagnosis) {
          diagnosedText = isEn ? `${diagnosedText}, ${mb.otherDiagnosis}` : `${diagnosedText}、${mb.otherDiagnosis}`;
        }
      }

      // ---- 手术史 ----
      let surgText = t('defaultTemplates.noSurgery');
      if (mb.surgicalHistory && mb.surgicalHistory !== 'none' && mb.surgicalHistory !== '') {
        surgText = t(`onboarding.surgicalHistoryOptions.${mb.surgicalHistory}`) || mb.surgicalHistory;
      }

      // ---- 过敏史 ----
      let allergyText = t('defaultTemplates.noAllergy');
      if (mb.allergies && mb.allergies !== 'none' && mb.allergies !== 'unknown' && mb.allergies !== '') {
        const allergyLabel = t(`onboarding.allergyOptions.${mb.allergies}`) || mb.allergies;
        allergyText = allergyLabel;
        if (mb.otherAllergies) {
          allergyText = isEn ? `${allergyText}, ${mb.otherAllergies}` : `${allergyText}、${mb.otherAllergies}`;
        }
      }

      // ---- 生活方式 ----
      const lifestyleArr = mb.lifestyleArr || [];
      const lifestyleText = lifestyleArr.length > 0
        ? lifestyleArr.map(s => t(`onboarding.lifestyleOptions.${s}`) || s).join(isEn ? ', ' : '、')
        : t('defaultTemplates.noLifestyle');

      // ---- 月经史 ----
      const menarche = mb.menarcheAge || t('defaultTemplates.notProvided');
      const periodDuration = mb.periodDuration || t('defaultTemplates.notProvided');
      const lmp = mb.lastPeriod || t('defaultTemplates.notProvided');

      // ---- 生育史 ----
      const repArr = mb.reproductiveHistoryArr || [];
      const repText = repArr.length > 0
        ? repArr.map(s => t(`onboarding.reproductiveHistoryOptions.${s}`) || s).join(isEn ? ', ' : '、')
        : t('defaultTemplates.noReproductive');

      // ---- 家族史 ----
      const famArr = mb.familyHistoryArr || [];
      const famText = famArr.length > 0
        ? famArr.map(s => t(`onboarding.familyHistoryOptions.${s}`) || s).join(isEn ? ', ' : '、')
        : t('defaultTemplates.noFamilyHistory');

      // ---- 心理社会因素 ----
      const psychText = mb.psychosocial
        ? (t(`onboarding.psychosocialOptions.${mb.psychosocial}`) || mb.psychosocial)
        : t('defaultTemplates.noPsychosocial');

      // ============================================================
      // ✅ 构建各字段文本
      // ============================================================

      // ---- 主诉 ----
      const chiefComplaintText = t('defaultTemplates.chief_complaint')
        .replace(/{{pain}}/g, painName)
        .replace(/{{symptoms}}/g, allSymptomsText);

      // ---- 现病史（组合多个小模板） ----
      let presentIllnessParts = [];

      // 年龄身高体重
      const agePart = t('defaultTemplates.presentIllnessAge')
        .replace(/{{age}}/g, ageLabel)
        .replace(/{{heightWeight}}/g, heightWeightText);
      presentIllnessParts.push(agePart);

      // 月经周期
      const cyclePart = t('defaultTemplates.presentIllnessCycle')
        .replace(/{{cycleRegular}}/g, cycleRegDisplay);
      presentIllnessParts.push(cyclePart);

      // 发作情况
      const onsetPart = t('defaultTemplates.presentIllnessOnset')
        .replace(/{{cycleDay}}/g, cycleDisplay)
        .replace(/{{pain}}/g, painName);
      presentIllnessParts.push(onsetPart);

      // 伴随症状（只在有症状时添加）
      if (allSymptomsText && allSymptomsText !== t('defaultTemplates.noSymptoms')) {
        const symptomsPart = t('defaultTemplates.presentIllnessSymptoms')
          .replace(/{{symptoms}}/g, allSymptomsText);
        presentIllnessParts.push(symptomsPart);
      }

      // 活动水平（只在有数据时添加）
      if (activityLabel && activityLabel !== t('defaultTemplates.notProvided')) {
        const activityPart = t('defaultTemplates.presentIllnessActivity')
          .replace(/{{activityLevel}}/g, activityLabel);
        presentIllnessParts.push(activityPart);
      }

      const presentIllnessText = presentIllnessParts.join(' ');

      // ---- 既往史（组合多个小模板） ----
      let pastHistoryParts = [];

      // 诊断
      if (diagnosedText && diagnosedText !== t('defaultTemplates.noDiagnosis')) {
        const part = t('defaultTemplates.pastHistoryDiagnosis')
          .replace(/{{diagnosed}}/g, diagnosedText);
        pastHistoryParts.push(part);
      }

      // 手术史
      if (surgText && surgText !== t('defaultTemplates.noSurgery')) {
        const part = t('defaultTemplates.pastHistorySurgery')
          .replace(/{{surgery}}/g, surgText);
        pastHistoryParts.push(part);
      }

      // 过敏史
      if (allergyText && allergyText !== t('defaultTemplates.noAllergy')) {
        const part = t('defaultTemplates.pastHistoryAllergy')
          .replace(/{{allergy}}/g, allergyText);
        pastHistoryParts.push(part);
      }

      // 生活方式
      if (lifestyleText && lifestyleText !== t('defaultTemplates.noLifestyle')) {
        const part = t('defaultTemplates.pastHistoryLifestyle')
          .replace(/{{lifestyle}}/g, lifestyleText);
        pastHistoryParts.push(part);
      }

      // 家族史
      if (famText && famText !== t('defaultTemplates.noFamilyHistory')) {
        const part = t('defaultTemplates.pastHistoryFamily')
          .replace(/{{familyHistory}}/g, famText);
        pastHistoryParts.push(part);
      }

      // 生育史
      if (repText && repText !== t('defaultTemplates.noReproductive')) {
        const part = t('defaultTemplates.pastHistoryReproductive')
          .replace(/{{reproductiveHistory}}/g, repText);
        pastHistoryParts.push(part);
      }

      // 心理社会因素
      if (psychText && psychText !== t('defaultTemplates.noPsychosocial')) {
        const part = t('defaultTemplates.pastHistoryPsychosocial')
          .replace(/{{psychosocial}}/g, psychText);
        pastHistoryParts.push(part);
      }

      const pastHistoryText = pastHistoryParts.length > 0
        ? pastHistoryParts.join(' ')
        : t('defaultTemplates.pastHistoryNone');

      // ---- 月经史 ----
      const menstrualHistoryText = t('defaultTemplates.menstrual_history')
        .replace(/{{menarche}}/g, menarche)
        .replace(/{{periodDuration}}/g, periodDuration)
        .replace(/{{cycleRegular}}/g, cycleRegDisplay)
        .replace(/{{lmp}}/g, lmp);

      // ---- 临床诊断 ----
      const diagnosisText = t('defaultTemplates.clinical_diagnosis');

      // ---- 临床建议 ----
      const suggestionsText = t('defaultTemplates.clinical_suggestions');

      // ---- 默认值 ----
      const defaultAnalogy = t(`painTemplates.${dominant}.analogy`) || '';
      const defaultSelfCare = t(`painTemplates.${dominant}.selfCare`) || '';
      const prefKey = (Array.isArray(userPrefs) && userPrefs[0]) ? userPrefs[0] : 'care';
      const actionsTemplates = t(`partnerActions.${prefKey}`, { returnObjects: true });
      let defaultAction = '';
      if (Array.isArray(actionsTemplates) && actionsTemplates.length > 0) {
        defaultAction = actionsTemplates.map(act => String(act).replace(/{{med}}/g, t('defaultTemplates.medication') || '布洛芬')).join('\n');
      } else {
        defaultAction = t('defaultTemplates.defaultActions') || '';
      }
      const defaultWorkText = t('defaultTemplates.workTemplate').replace(/{{pain}}/g, painName);

      // ============================================================
      // 如果 activeLlm 存在，使用 LLM 数据
      // ============================================================
      if (activeLlm) {
        return {
          pain: painName,
          analogy: getLocalizedText(activeLlm.analogy, defaultAnalogy),
          workText: getLocalizedText(activeLlm.workText || activeLlm.work, defaultWorkText),
          action: getLocalizedText(activeLlm.action, defaultAction),
          selfCare: getLocalizedText(activeLlm.selfCare, defaultSelfCare),
          chief_complaint: getLocalizedText(activeLlm.chief_complaint || activeLlm.med_complaint, chiefComplaintText),
          present_illness: getLocalizedText(activeLlm.present_illness || activeLlm.med_reference, presentIllnessText),
          past_history: getLocalizedText(activeLlm.past_history, pastHistoryText),
          menstrual_history: getLocalizedText(activeLlm.menstrual_history, menstrualHistoryText),
          clinical_diagnosis: getLocalizedText(activeLlm.clinical_diagnosis, diagnosisText),
          clinical_suggestions: getLocalizedText(activeLlm.clinical_suggestions, suggestionsText),
          exam_advice: activeLlm.exam_advice || null,
          _fieldSources: {
            chief_complaint: 'ai',
            present_illness: 'ai',
            past_history: 'user',
            menstrual_history: 'user',
            clinical_diagnosis: 'ai',
            clinical_suggestions: 'ai'
          }
        };
      }

      // ============================================================
      // ✅ 降级返回 - 使用用户填写的真实数据
      // ============================================================
      return {
        pain: painName,
        analogy: defaultAnalogy,
        workText: defaultWorkText,
        action: defaultAction,
        selfCare: defaultSelfCare,
        chief_complaint: chiefComplaintText,
        present_illness: presentIllnessText,
        past_history: pastHistoryText,
        menstrual_history: menstrualHistoryText,
        clinical_diagnosis: diagnosisText,
        clinical_suggestions: suggestionsText,
        exam_advice: null,
        _fieldSources: {
          chief_complaint: 'ai',
          present_illness: 'ai',
          past_history: 'user',
          menstrual_history: 'user',
          clinical_diagnosis: 'ai',
          clinical_suggestions: 'ai'
        }
      };
    } catch (err) {
      console.warn('⚠️ generateContent 降级兜底:', err);
      // 最终兜底
      const fallbackPain = t('painNames.twist') || '痛经';
      return {
        pain: fallbackPain,
        analogy: t(`painTemplates.twist.analogy`) || '',
        workText: t('defaultTemplates.workTemplate').replace(/{{pain}}/g, fallbackPain),
        action: t('defaultTemplates.defaultActions') || '',
        selfCare: t(`painTemplates.twist.selfCare`) || '',
        chief_complaint: t('defaultTemplates.chief_complaint')
          .replace(/{{pain}}/g, fallbackPain)
          .replace(/{{symptoms}}/g, t('defaultTemplates.noSymptoms')),
        present_illness: t('defaultTemplates.presentIllnessAge')
          .replace(/{{age}}/g, t('defaultTemplates.notProvided'))
          .replace(/{{heightWeight}}/g, t('defaultTemplates.notProvided'))
          + ' ' + t('defaultTemplates.presentIllnessCycle')
            .replace(/{{cycleRegular}}/g, t('defaultTemplates.notProvided'))
          + ' ' + t('defaultTemplates.presentIllnessOnset')
            .replace(/{{cycleDay}}/g, t('defaultTemplates.notProvided'))
            .replace(/{{pain}}/g, fallbackPain)
          + ' ' + t('defaultTemplates.presentIllnessSymptoms')
            .replace(/{{symptoms}}/g, t('defaultTemplates.noSymptoms')),
        past_history: t('defaultTemplates.pastHistoryNone'),
        menstrual_history: t('defaultTemplates.menstrual_history')
          .replace(/{{menarche}}/g, t('defaultTemplates.notProvided'))
          .replace(/{{periodDuration}}/g, t('defaultTemplates.notProvided'))
          .replace(/{{cycleRegular}}/g, t('defaultTemplates.notProvided'))
          .replace(/{{lmp}}/g, t('defaultTemplates.notProvided')),
        clinical_diagnosis: t('defaultTemplates.clinical_diagnosis') || '',
        clinical_suggestions: t('defaultTemplates.clinical_suggestions') || '',
        exam_advice: null,
        _fieldSources: {
          chief_complaint: 'ai',
          present_illness: 'ai',
          past_history: 'user',
          menstrual_history: 'user',
          clinical_diagnosis: 'ai',
          clinical_suggestions: 'ai'
        }
      };
    }
  }, [currentReportData, llmData, getDominantPain, t, medicalBackground, cycleDay, userPrefs, targetLanguage, leaveRecipient, leaveTone]);

  const getEditedOrDefault = useCallback((key, defaultVal) => {
    return editedContents[key] !== undefined ? editedContents[key] : defaultVal;
  }, [editedContents]);

  const getContextTitle = useCallback((idty, recipient = 'manager') => {
    const isEn = targetLanguage === 'en';
    if (idty === 'partner') return isEn ? 'Somatic Companion Guide' : '经期陪伴指南';
    if (idty === 'work') {
      const recipientLabels = {
        manager: isEn ? 'Leave Request (To Manager)' : '体感请假条 (致领导)',
        teacher: isEn ? 'Leave Request (To Teacher)' : '体感请假条 (致老师)',
        client: isEn ? 'Leave Request (To Client)' : '体感请假条 (致客户)',
        friend: isEn ? 'Somatic Status (To Friend)' : '体感情况说明 (致朋友)',
      };
      return recipientLabels[recipient] || (isEn ? 'Somatic Leave Statement' : '体感请假说明');
    }
    if (idty === 'doctor') return isEn ? 'Clinical Consultation Aid' : '临床就诊协助单';
    if (idty === 'self') return isEn ? 'Self-Healing Somatic Log' : '自愈理疗手记';
    return isEn ? 'Somatic Pain Declaration' : '体感痛觉声明';
  }, [targetLanguage]);

  const isSideEmpty = useCallback((side) => {
    const totalCount = Object.values(brushCounts.current).reduce((a, b) => a + b, 0);
    if (totalCount > 10) return false;
    if (dynamicParticles.current && dynamicParticles.current.some(dp => dp.bodyMode === side)) {
      return false;
    }
    return true;
  }, []);

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const MAX_HISTORY = 100;

  const saveSnapshot = useCallback(() => {
    if (!pgFrontRef.current || !pgBackRef.current) return;
    const frontImg = pgFrontRef.current.get();
    const backImg = pgBackRef.current.get();
    const dynamicCopy = dynamicParticles.current ? [...dynamicParticles.current] : [];

    undoStackRef.current.push({
      front: frontImg,
      back: backImg,
      dynamicParticles: dynamicCopy,
      counts: { ...brushCounts.current }
    });

    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const handleResetView = useCallback(() => {
    camRef.current = { x: 0, y: 0, zoom: 1.0 };
    setBgScale(1.0);
  }, [setBgScale]);

  const allSymptoms = [
    ...(medicalBackground.accompanyingSymptomsArr || []),
  ];
  if (medicalBackground.accompanyingOther) {
    // 按逗号、顿号、空格分割
    const custom = medicalBackground.accompanyingOther.split(/[，,、\s]+/).filter(s => s.trim());
    allSymptoms.push(...custom);
  }
  const handleGenerateFromData = async (data) => {
    setIsLoading(true);
    try {
      const canvasImg = getFallbackImgUrl();

      const requestBody = {
        appMode: appMode || 'medical',
        dominantPain: data.selectedPain,
        userPref: userPrefs[0] || 'care',
        painScore: data.painScore || 50,
        brushCounts: data.brushCounts || {},
        spatialMap: data.spatialMap || { abdomen: 0.5, lowerBack: 0.5, upperBody: 0.0 },
        intensityProfile: data.intensityProfile || { avgSpeed: 25, peakSpeed: 50, avgPressure: 0.5 },
        timeRhythm: data.timeRhythm || { morning: 0.33, afternoon: 0.33, night: 0.34, dominantPeriod: 'morning' },
        colorPalette: data.activeColor || 'crimson',
        bodyMode: bodyMode || 'front',
        medicalBackground,
        tonePreference: tonePreference || 'gentle',
        cycleDay: cycleDay || (isEn ? 'Not provided' : '未提供'),
        targetLanguage: targetLanguage || 'zh',
        accompanyingSymptoms: allSymptoms,
        workScenario: leaveRecipient || 'manager',
        workTone: 'neutral',
      };

      let apiResult = null;
      try {
        const resp = await fetch(`${API_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        if (resp.ok) {
          apiResult = await resp.json();
        }
      } catch (apiErr) {
        console.warn('No backend API, using local templates:', apiErr.message);
      }

      if (apiResult) {
        setLlmData(apiResult);
        setCurrentReportData(apiResult);
      } else {
        const content = generateContent(data.selectedPain || 'twist');
        setCurrentReportData(content);
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const historyEntry = {
        id: Date.now().toString(),
        userId: currentUserId || 'user_guest',
        date: dateStr,
        time: timeStr,
        img: canvasImg,
        painName: t(`painNames.${data.selectedPain}`) || data.selectedPain,
        dominantPain: data.selectedPain,
        painScore: data.painScore,
        appMode,
        reportData: apiResult || generateContent(data.selectedPain || 'twist'),
        medicalBackground,
        userPrefs,
        tonePreference,
        cycleDay,
        isQuickLog: true,
      };
      setHistory(prev => [historyEntry, ...prev]);

      setPage('result');
    } catch (e) {
      console.error('Generate failed:', e);
      const content = generateContent(data.selectedPain || 'twist');
      setCurrentReportData(content);
      setPage('result');
    } finally {
      setIsLoading(false);
    }
  };

  const exportHistoryPDF = (recordsToExport) => {
    const records = recordsToExport || history;

    if (!records || records.length === 0) {
      showToast('noHistoryToExport');
      return;
    }

    try {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        showToast('popupBlocked');
        return;
      }

      const docTitle = t('pdf.docTitle') || 'PainScape Somatic Report';
      const exportTimeLabel = t('pdf.exportTime') || 'Exported: ';
      const totalRecordsLabel = t('pdf.totalCount', { count: records.length }) || `${records.length} records`;
      const timeLocale = isEn ? 'en-US' : 'zh-CN';

      const containsChinese = (str) => /[\u4e00-\u9fa5]/.test(String(str || ''));

      const recordsHtml = records.map((record, idx) => {
        const dominantKey = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName] || 'twist';
        const painNameDisplay = t(`painNames.${dominantKey}`) || record.painName || '';

        let rd = record.reportData || {};
        if (isEn) {
          const freshEn = generateContent(dominantKey);
          const prefKey = record.userPrefs?.[0] || 'care';
          const actionsArr = t(`partnerActions.${prefKey}`, { returnObjects: true }) || [];
          const actionEn = Array.isArray(actionsArr)
            ? actionsArr.map(a => String(a).replace('{{med}}', 'Ibuprofen')).join('\n')
            : '';

          rd = {
            chief_complaint: containsChinese(rd.chief_complaint) ? freshEn.chief_complaint : rd.chief_complaint,
            present_illness: containsChinese(rd.present_illness) ? freshEn.present_illness : rd.present_illness,
            clinical_diagnosis: containsChinese(rd.clinical_diagnosis) ? freshEn.clinical_diagnosis : rd.clinical_diagnosis,
            clinical_suggestions: containsChinese(rd.clinical_suggestions) ? freshEn.clinical_suggestions : rd.clinical_suggestions,
            analogy: containsChinese(rd.analogy) ? freshEn.analogy : rd.analogy,
            selfCare: containsChinese(rd.selfCare) ? freshEn.selfCare : rd.selfCare,
            action: containsChinese(rd.action) ? actionEn : rd.action,
            work: containsChinese(rd.work) ? (t('workTemplate') ? t('workTemplate').replace('{{pain}}', painNameDisplay) : rd.work) : rd.work,
          };
        }

        const formatText = (val) => {
          if (!val) return '';
          if (Array.isArray(val)) return val.join(isEn ? '; ' : '；');
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        };

        let imgHtml = '';
        if (record.img) {
          imgHtml = `
          <div style="text-align:center; margin:12px 0;">
            <img src="${record.img}" style="max-width:100%; max-height:400px; border:1px solid #ddd; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.08);" />
          </div>
        `;
        }

        return `
        <div style="margin-bottom:28px; page-break-inside:avoid; border-bottom:1px solid #e8e8e8; padding-bottom:20px;">
          <h3 style="margin:0 0 8px; color:#c62828; font-size:16px; font-weight:600;">
            ${t('pdf.record', { index: idx + 1 })} — ${record.date || ''} ${record.time || ''}
          </h3>
          ${imgHtml}
          <p style="margin:4px 0; font-size:13px; line-height:1.7;">
            <strong>${t('pdf.painType') || 'Pain Type:'}</strong> ${painNameDisplay}
          </p>
          ${rd.chief_complaint ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.chiefComplaint') || 'Chief Complaint:'}</strong> ${formatText(rd.chief_complaint)}</p>` : ''}
          ${rd.present_illness ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.presentIllness') || 'Present Illness:'}</strong> ${formatText(rd.present_illness)}</p>` : ''}
          ${rd.clinical_diagnosis ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.clinicalDiagnosis') || 'Clinical Diagnosis:'}</strong> ${formatText(rd.clinical_diagnosis)}</p>` : ''}
          ${rd.clinical_suggestions ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.suggestions') || 'Suggestions:'}</strong> ${formatText(rd.clinical_suggestions)}</p>` : ''}
          ${rd.analogy ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.analogy') || 'Analogy:'}</strong> ${formatText(rd.analogy)}</p>` : ''}
          ${rd.selfCare ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.selfCare') || 'Self-Care:'}</strong> ${formatText(rd.selfCare)}</p>` : ''}
          ${rd.action ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.action') || 'Action:'}</strong> ${formatText(rd.action)}</p>` : ''}
          ${rd.work ? `<p style="margin:4px 0; font-size:13px; line-height:1.7;"><strong>${t('pdf.work') || 'Work:'}</strong> ${formatText(rd.work)}</p>` : ''}
        </div>
      `;
      }).join('');

      printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle}</title>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
            padding: 30px 40px;
            color: #333;
            line-height: 1.7;
            max-width: 900px;
            margin: 0 auto;
            background: #fafafa;
          }
          h1 {
            color: #c62828;
            border-bottom: 3px solid #c62828;
            padding-bottom: 12px;
            font-size: 28px;
            font-weight: 600;
            letter-spacing: 1px;
          }
          .meta {
            color: #888;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          h3 {
            font-size: 16px;
            color: #1a1a1a;
          }
          p {
            font-size: 13px;
            margin: 5px 0;
            line-height: 1.7;
          }
          strong {
            color: #555;
            font-weight: 600;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
          }
          @media print {
            body { background: #fff; padding: 20px; }
          }
          @media (max-width: 600px) {
            body { padding: 15px; }
            h1 { font-size: 22px; }
          }
        </style>
      </head>
      <body>
        <h1>${docTitle}</h1>
        <div class="meta">
          <span>${exportTimeLabel} ${new Date().toLocaleString(timeLocale)}</span>
          <span>${totalRecordsLabel}</span>
        </div>
        ${recordsHtml}
        <div style="text-align:center; color:#aaa; font-size:12px; margin-top:30px; padding-top:15px; border-top:1px solid #eee;">
          PainScape — ${isEn ? 'Generated by Somatic AI Engine' : '由体感 AI 引擎生成'}
        </div>
        <div style="text-align:center; margin-top:16px; color:#bbb; font-size:11px;">
          ${isEn ? '💡 Right-click → Print (or Ctrl+P) to save as PDF' : '💡 右键 → 打印（或 Ctrl+P）可保存为 PDF'}
        </div>
      </body>
      </html>
    `);

      printWindow.document.close();

      const images = printWindow.document.querySelectorAll('img');
      let imagesLoaded = 0;
      const totalImages = images.length;

      if (totalImages === 0) {
        setTimeout(() => printWindow.print(), 500);
      } else {
        images.forEach((img) => {
          if (img.complete) {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
              setTimeout(() => printWindow.print(), 400);
            }
          } else {
            img.onload = () => {
              imagesLoaded++;
              if (imagesLoaded === totalImages) {
                setTimeout(() => printWindow.print(), 400);
              }
            };
            img.onerror = () => {
              imagesLoaded++;
              if (imagesLoaded === totalImages) {
                setTimeout(() => printWindow.print(), 400);
              }
            };
          }
        });
        setTimeout(() => {
          printWindow.print();
        }, 5000);
      }

    } catch (e) {
      console.error('❌ 导出失败:', e);
      showToast('exportFailed');
    }
  };

  const handleShareSavedPainting = async () => {
    const canvasImg = generateCompositeCanvas() || getFallbackImgUrl();

    if (navigator.share) {
      try {
        const blob = await (await fetch(canvasImg)).blob();
        const file = new File([blob], `painscape_${new Date().toISOString().slice(0, 10)}.png`, {
          type: 'image/png',
        });
        await navigator.share({
          title: 'PainScape',
          text: '',
          files: [file],
        });
      } catch (e) {
        console.log('Share cancelled');
      }
    } else {
      const link = document.createElement('a');
      link.download = `painscape_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvasImg;
      link.click();
    }
  };

  const handleSaveOnly = () => {
    saveSnapshot();

    const canvasImg = generateCompositeCanvas() || getFallbackImgUrl();

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const paintingData = {
      id: Date.now().toString(),
      userId: currentUserId || 'user_guest',
      date: dateStr,
      time: timeStr,
      img: canvasImg,
      painName: t('history.savedOnly') || '仅保存',
      dominantPain: null,
      painScore: null,
      appMode: appMode,
      reportData: null,
      isSavedOnly: true,
      timestamp: Date.now(),
    };

    setHistory(prev => [paintingData, ...prev]);
  };

  const handleClear = useCallback(() => {
    saveSnapshot();
    brushCounts.current = { twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 };
    dynamicParticles.current = [];
    staticParticles.current = [];
    particlePositions.current = [];
    speedHistory.current = [];
    pressureHistory.current = [];

    if (pgFrontRef.current && typeof pgFrontRef.current.clear === 'function') {
      pgFrontRef.current.clear();
    }
    if (pgBackRef.current && typeof pgBackRef.current.clear === 'function') {
      pgBackRef.current.clear();
    }
  }, [saveSnapshot]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    if (!pgFrontRef.current || !pgBackRef.current) return;

    const currentFront = pgFrontRef.current.get();
    const currentBack = pgBackRef.current.get();
    redoStackRef.current.push({
      front: currentFront,
      back: currentBack,
      dynamicParticles: dynamicParticles.current ? [...dynamicParticles.current] : [],
      counts: { ...brushCounts.current }
    });

    const lastState = undoStackRef.current.pop();

    pgFrontRef.current.clear();
    pgFrontRef.current.image(lastState.front, 0, 0);

    pgBackRef.current.clear();
    pgBackRef.current.image(lastState.back, 0, 0);

    dynamicParticles.current = lastState.dynamicParticles ? [...lastState.dynamicParticles] : [];
    brushCounts.current = { ...lastState.counts };
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    if (!pgFrontRef.current || !pgBackRef.current) return;

    const currentFront = pgFrontRef.current.get();
    const currentBack = pgBackRef.current.get();
    undoStackRef.current.push({
      front: currentFront,
      back: currentBack,
      dynamicParticles: dynamicParticles.current ? [...dynamicParticles.current] : [],
      counts: { ...brushCounts.current }
    });

    const nextState = redoStackRef.current.pop();

    pgFrontRef.current.clear();
    pgFrontRef.current.image(nextState.front, 0, 0);

    pgBackRef.current.clear();
    pgBackRef.current.image(nextState.back, 0, 0);

    dynamicParticles.current = nextState.dynamicParticles ? [...nextState.dynamicParticles] : [];
    brushCounts.current = { ...nextState.counts };
  }, []);

  const captureFullCanvas = useCallback((side) => {
    try {
      const p5 = p5Ref.current;
      if (!p5) return document.createElement('canvas');

      const pg = side === 'front' ? pgFrontRef.current : pgBackRef.current;
      if (!pg || !pg.width || !pg.height) return document.createElement('canvas');

      const captureGraphics = p5.createGraphics(pg.width, pg.height);
      captureGraphics.background(10);

      const { x, y, zoom } = camRef.current;
      const activeImg = side === 'front' ? bgFrontRef.current : bgBackRef.current;

      captureGraphics.push();
      captureGraphics.translate(x, y);
      captureGraphics.scale(zoom);

      if (activeImg && side !== 'none' && activeImg.height && activeImg.height > 0) {
        try {
          captureGraphics.imageMode(p5.CENTER);
          captureGraphics.tint(255, 40);
          const currentBgScale = bgScale || 1.0;
          const imgScale = ((pg.height * 0.8) / activeImg.height) * currentBgScale;
          captureGraphics.image(
            activeImg,
            pg.width / 2,
            pg.height / 2,
            activeImg.width * imgScale,
            activeImg.height * imgScale
          );
        } catch (e) {
          console.warn('画人体底图降级:', e);
        }
      }

      if (pg) {
        try {
          captureGraphics.noTint();
          captureGraphics.imageMode(p5.CORNER);
          captureGraphics.image(pg, 0, 0);
        } catch (e) {
          console.warn('画静态笔触降级:', e);
        }
      }

      if (dynamicParticles.current && dynamicParticles.current.length > 0) {
        dynamicParticles.current.forEach((dp) => {
          if (dp && dp.bodyMode === side && typeof dp.show === 'function') {
            try {
              dp.show(captureGraphics);
            } catch (err) {
              console.warn('绘制动态粒子失败:', err);
            }
          }
        });
      }

      captureGraphics.pop();
      return captureGraphics.elt;
    } catch (e) {
      console.warn('captureFullCanvas 防崩溃捕获:', e);
      return document.createElement('canvas');
    }
  }, [bgScale]);

  const generateCompositeCanvas = useCallback(() => {
    try {
      const p5 = p5Ref.current;
      if (!p5) return getFallbackImgUrl();

      const hasFront = !isSideEmpty('front');
      const hasBack = !isSideEmpty('back');

      if (!hasFront || !hasBack) {
        const side = hasBack && !hasFront ? 'back' : (bodyMode === 'none' ? 'front' : bodyMode);
        const singleCanvas = captureFullCanvas(side);
        return singleCanvas ? singleCanvas.toDataURL("image/jpeg", 0.85) : getFallbackImgUrl();
      }

      const canvasFront = captureFullCanvas('front');
      const canvasBack = captureFullCanvas('back');

      if (!canvasFront || !canvasBack) return getFallbackImgUrl();

      const composite = document.createElement('canvas');
      composite.width = canvasFront.width + canvasBack.width;
      composite.height = Math.max(canvasFront.height, canvasBack.height);
      const ctx = composite.getContext('2d');

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, composite.width, composite.height);

      ctx.drawImage(canvasFront, 0, 0);
      ctx.drawImage(canvasBack, canvasFront.width, 0);

      return composite.toDataURL("image/jpeg", 0.85);
    } catch (e) {
      console.error('图片拼接异常:', e);
      return getFallbackImgUrl();
    }
  }, [bodyMode, captureFullCanvas, isSideEmpty, getFallbackImgUrl]);

  const confirmShare = useCallback(async (customShareData) => {
    const targetContent = customShareData || shareContent;
    if (!targetContent) return;
    setIsLoading(true);

    try {
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');

      const activeIdentity = targetContent.identity || 'partner';
      const isZhMode = targetLanguage === 'zh';

      const cardTitle = targetContent.previewTitle || getContextTitle(activeIdentity, targetContent.leaveRecipient);
      let fullText = targetContent.previewContent || '';

      if (!fullText) {
        const rawAction = String(targetContent.action || '');
        const rawSelfCare = String(targetContent.selfCare || '');
        const rawAnalogy = String(targetContent.analogy || '');
        const rawWorkText = String(targetContent.workText || '');

        const safeAction = rawAction.replace(/☑️|✨|•/g, '•').trim();
        const safeSelfCare = rawSelfCare.replace(/✨|•/g, '•').trim();

        switch (activeIdentity) {
          case 'partner':
            fullText = `${isZhMode ? '她正在经历：' : 'She is experiencing: '}${targetContent.pain || '痛经'}\n${rawAnalogy}\n\n${isZhMode ? '关怀指南：' : 'Care Instructions:'}\n${safeAction}`;
            break;
          case 'family':
            fullText = `${isZhMode ? '身体状况：' : 'Current Status: '}${targetContent.pain || '痛经'}\n${rawAnalogy}\n\n${isZhMode ? '行动支持：' : 'Care Actions:'}\n${safeAction}`;
            break;
          case 'friend':
          case 'work':
            fullText = rawWorkText;
            break;
          case 'doctor':
            fullText = `${isZhMode ? '主诉：' : 'Chief Complaint:'}\n${targetContent.chief_complaint || ''}\n\n${isZhMode ? '现病史：' : 'Present Illness:'}\n${targetContent.present_illness || ''}`;
            break;
          case 'self':
            fullText = `${rawAnalogy}\n\n${isZhMode ? '自愈推荐：' : 'Self-Care:'}\n${safeSelfCare}`;
            break;
          default:
            fullText = rawAnalogy;
        }
      }

      cvs.width = 640;
      const textPadding = 40;
      const maxTextWidth = cvs.width - (textPadding * 2);

      ctx.font = '16px "Microsoft YaHei", -apple-system, sans-serif';
      const lines = [];
      fullText.split('\n').forEach(p => {
        let currentLine = '';
        for (let i = 0; i < p.length; i++) {
          let testLine = currentLine + p[i];
          if (ctx.measureText(testLine).width > maxTextWidth) {
            lines.push(currentLine);
            currentLine = p[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
      });

      const cardBodyY = 560;
      const cardHeight = lines.length * 28 + 140;
      cvs.height = cardBodyY + cardHeight + 100;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      const activeImgSrc = targetContent.historyImg || imgUrl || getFallbackImgUrl();
      const mainImg = new Image();
      await new Promise((resolve) => {
        mainImg.onload = resolve;
        mainImg.onerror = resolve;
        mainImg.src = activeImgSrc;
      });

      const imgDim = 480;
      const imgX = (cvs.width - imgDim) / 2;
      ctx.drawImage(mainImg, imgX, 40, imgDim, imgDim);

      ctx.fillStyle = '#141414';
      ctx.strokeStyle = '#2d2d2d';
      ctx.lineWidth = 1;

      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      roundRect(30, cardBodyY, cvs.width - 60, cardHeight, 20);
      ctx.fill();
      ctx.stroke();

      const barColors = { partner: '#ef5350', family: '#ff9800', friend: '#2196f3', work: '#ff9800', doctor: '#2196f3', self: '#9c27b0' };
      ctx.fillStyle = barColors[activeIdentity] || '#ff9800';
      ctx.fillRect(45, cardBodyY + 28, 4, 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Microsoft YaHei", -apple-system, sans-serif';
      ctx.fillText(cardTitle, 60, cardBodyY + 45);

      ctx.fillStyle = '#b0b0b0';
      ctx.font = '15px "Microsoft YaHei", -apple-system, sans-serif';
      let textY = cardBodyY + 85;
      lines.forEach(line => {
        ctx.fillText(line, 60, textY);
        textY += 28;
      });

      ctx.fillStyle = '#555555';
      ctx.font = 'bold 14px "Microsoft YaHei", -apple-system, sans-serif';
      ctx.fillText(isZhMode ? "PainScape - 让不可见的痛苦被看见" : "PainScape - Making invisible pain visible", 60, cvs.height - 40);

      const finalUrl = cvs.toDataURL('image/jpeg', 0.95);
      setGeneratedCardUrl(finalUrl);
      setShowSharePreview(false);
    } catch (e) {
      console.error("生成卡片失败:", e);
      showToast("shareFailed");
    } finally {
      setIsLoading(false);
    }
  }, [shareContent, imgUrl, targetLanguage, getContextTitle, showToast, getFallbackImgUrl]);

  // ===== 页面路由渲染函数 =====
  const renderPage = () => {
    switch (page) {
      case 'splash':
        return (
          <SplashPage
            splashOpacity={splashOpacity}
            quote={getQuote()}
            targetLanguage={targetLanguage}
            onLanguageSwitch={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
          />
        );

      case 'modeSelection':
        return (
          <ModeSelectionPage
            targetLanguage={targetLanguage}
            onLanguageSwitch={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
            onSelectMode={(mode) => {
              setAppMode(mode);
              setPage('onboarding');
              if (mode === 'general') {
                setShowContent('preference');
              } else {
                setShowContent('basicInfo');
              }
            }}
          />
        );

      case 'onboarding':
        return (
          <OnboardingPage
            appMode={appMode}
            setAppMode={setAppMode}
            showContent={showContent}
            setShowContent={setShowContent}
            medicalBackground={medicalBackground}
            setMedicalBackground={setMedicalBackground}
            userPrefs={userPrefs}
            setUserPrefs={setUserPrefs}
            tonePreference={tonePreference}
            setTonePreference={setTonePreference}
            cycleDay={cycleDay}
            setCycleDay={setCycleDay}
            leaveRecipient={leaveRecipient}
            setLeaveRecipient={setLeaveRecipient}
            leaveTone={leaveTone}
            setLeaveTone={setLeaveTone}
            setBodyMode={setBodyMode}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            showGuide={showGuide}
            setShowGuide={setShowGuide}
            onQuickLog={() => setPage('quickLog')}
            onStartDrawing={() => {
              setBodyMode('front');
              setPage('canvas');
            }}
            onSkip={() => {
              setBodyMode('front');
              setPage('canvas');
            }}
            onBack={() => setPage('modeSelection')}
            onCommunity={() => setPage('community')}
            onHistory={() => setPage('history')}
            onProfile={() => {
              // 🌟 游客点击个人主页直接唤起登录/注册弹窗
              if (isGuest || !currentUserId) {
                setShowAuthModal(true);
                return;
              }
              setTargetUserId(currentUserId);
              setPage('profile');
            }}
          />
        );
      case 'quickLog':
        return (
          <QuickLogPage
            onBack={() => setPage('onboarding')}
            onGenerate={handleGenerateFromData}
            appMode={appMode}
            medicalBackground={medicalBackground}
            userPrefs={userPrefs}
            tonePreference={tonePreference}
            cycleDay={cycleDay}
          />
        );
      case 'canvas':
        return (
          <CanvasPage
            bodyMode={bodyMode}
            onSaveOnly={handleSaveOnly}
            onViewHistory={() => setPage('history')}
            setBodyMode={setBodyMode}
            activeBrush={activeBrush}
            setActiveBrush={setActiveBrush}
            activeColor={activeColor}
            setActiveColor={setActiveColor}
            bgScale={bgScale}
            setBgScale={setBgScale}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            p5Ref={p5Ref}
            pgFrontRef={pgFrontRef}
            pgBackRef={pgBackRef}
            bgFrontRef={bgFrontRef}
            bgBackRef={bgBackRef}
            camRef={camRef}
            brushCounts={brushCounts}
            onShareSaved={handleShareSavedPainting}
            dynamicParticles={dynamicParticles}
            staticParticles={staticParticles}
            particlePositions={particlePositions}
            speedHistory={speedHistory}
            pressureHistory={pressureHistory}
            appMode={appMode}
            onBack={() => setPage('onboarding')}
            onGenerate={async () => {
              setIsLoading(true);
              try {
                const canvasImg = generateCompositeCanvas() || getFallbackImgUrl();
                setImgUrl(canvasImg);

                const BODY_ZONES = {
                  front: {
                    head: { x: [0.35, 0.65], y: [0.00, 0.08] },
                    chest: { x: [0.20, 0.80], y: [0.08, 0.28] },
                    upperAbdomen: { x: [0.22, 0.78], y: [0.28, 0.46] },
                    lowerAbdomen: { x: [0.25, 0.75], y: [0.46, 0.66] },
                    legs: { x: [0.20, 0.80], y: [0.66, 1.00] },
                  },
                  back: {
                    upperBack: { x: [0.20, 0.80], y: [0.08, 0.38] },
                    waist: { x: [0.22, 0.78], y: [0.38, 0.58] },
                    sacrum: { x: [0.25, 0.75], y: [0.58, 0.82] },
                  },
                };

                const isInZone = (x, y, zone) => {
                  return x >= zone.x[0] && x <= zone.x[1] &&
                    y >= zone.y[0] && y <= zone.y[1];
                };

                const getDefaultSpatialMap = (mode) => {
                  if (mode === 'back') {
                    return { upperBack: 0.3, waist: 0.5, sacrum: 0.2 };
                  }
                  return { head: 0.0, chest: 0.1, upperAbdomen: 0.4, lowerAbdomen: 0.5, legs: 0.0 };
                };

                const calculateSpatialMap = (positions, mode, p5) => {
                  if (!p5 || !p5.width || !p5.height) {
                    return getDefaultSpatialMap(mode);
                  }

                  const activeImg = mode === 'back' ? bgBackRef.current : bgFrontRef.current;
                  if (!activeImg) {
                    return getDefaultSpatialMap(mode);
                  }

                  const currentBgScale = bgScaleRef.current || 1.0;
                  const imgScale = ((p5.height * 0.8) / activeImg.height) * currentBgScale;
                  const imgWidth = activeImg.width * imgScale;
                  const imgHeight = activeImg.height * imgScale;
                  const imgLeft = (p5.width / 2) - imgWidth / 2;
                  const imgTop = (p5.height / 2) - imgHeight / 2;

                  const zones = mode === 'back' ? BODY_ZONES.back : BODY_ZONES.front;
                  const zoneKeys = Object.keys(zones);
                  const counts = {};
                  zoneKeys.forEach(key => counts[key] = 0);

                  let totalInBody = 0;

                  positions.forEach(p => {
                    if (!p || p.x == null || p.y == null) return;

                    const normX = (p.x - imgLeft) / imgWidth;
                    const normY = (p.y - imgTop) / imgHeight;

                    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;

                    totalInBody++;

                    for (const key of zoneKeys) {
                      if (isInZone(normX, normY, zones[key])) {
                        counts[key] += 1;
                        break;
                      }
                    }
                  });

                  if (totalInBody === 0) {
                    return getDefaultSpatialMap(mode);
                  }

                  const result = {};
                  zoneKeys.forEach(key => {
                    result[key] = counts[key] / totalInBody;
                  });

                  return result;
                };

                const dominant = getDominantPain() || 'twist';
                const bc = brushCounts.current || {};
                const brushNameMap = { heavy: 'sink', wave: 'swell' };
                const mappedDominant = brushNameMap[dominant] || dominant;
                const mappedBc = Object.fromEntries(
                  Object.entries(bc).map(([k, v]) => [brushNameMap[k] || k, v])
                );

                const toneMap = { polite: 'neutral', objective: 'formal' };
                const mappedWorkTone = toneMap[leaveTone] || leaveTone || 'neutral';

                const totalBrushes = Object.values(bc).reduce((a, b) => a + b, 0);
                const painScore = Math.min(100, Math.max(10, Math.round(totalBrushes * 1.5)));

                const spHist = speedHistory.current || [];
                const prHist = pressureHistory.current || [];
                const avgSpeed = spHist.length > 0 ? spHist.reduce((a, b) => a + b, 0) / spHist.length : 5.0;
                const peakSpeed = spHist.length > 0 ? Math.max(...spHist) : 10.0;
                const avgPressure = prHist.length > 0 ? prHist.reduce((a, b) => a + b, 0) / prHist.length : 0.5;

                const positions = particlePositions.current || [];
                const p5 = p5Ref.current;

                const spatialMap = calculateSpatialMap(positions, bodyMode, p5);

                const timeRhythm = {
                  morning: 0.33,
                  afternoon: 0.33,
                  night: 0.34,
                  dominantPeriod: 'morning',
                };

                const requestBody = {
                  appMode: appMode || 'medical',
                  dominantPain: mappedDominant,
                  userPref: userPrefs[0] || 'care',
                  painScore,
                  brushCounts: mappedBc,
                  spatialMap,
                  intensityProfile: { avgSpeed, peakSpeed, avgPressure },
                  timeRhythm,
                  colorPalette: activeColor || 'crimson',
                  bodyMode: bodyMode || 'front',
                  medicalBackground,
                  tonePreference: tonePreference || 'gentle',
                  cycleDay: cycleDay || (isEn ? 'Not provided' : '未提供'),
                  targetLanguage: targetLanguage || 'zh',
                  accompanyingSymptoms: allSymptoms,
                  workScenario: leaveRecipient || 'manager',
                  workTone: mappedWorkTone,
                };

                let apiResult = null;
                try {
                  const resp = await fetch(`${API_BASE}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                  });
                  if (resp.ok) {
                    apiResult = await resp.json();
                  }
                } catch (apiErr) {
                  console.warn('⚠️ 无后端 API，启用本地模板:', apiErr.message);
                }

                if (apiResult) {
                  setLlmData(apiResult);
                  setCurrentReportData(apiResult);
                } else {
                  const content = generateContent(dominant);
                  setCurrentReportData(content);
                }

                const now = new Date();
                const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                const historyEntry = {
                  id: Date.now().toString(),
                  userId: currentUserId || 'user_guest',
                  date: dateStr,
                  time: timeStr,
                  img: canvasImg,
                  painName: t(`painNames.${dominant}`) || dominant,
                  dominantPain: dominant,
                  painScore,
                  appMode,
                  reportData: apiResult || generateContent(dominant),
                  medicalBackground,
                  userPrefs,
                  tonePreference,
                  cycleDay,
                  spatialMap,
                  colorPalette: activeColor || 'crimson',
                  accompanyingSymptoms: allSymptoms,
                };

                setHistory(prev => [historyEntry, ...prev]);
                setPage('result');
              } catch (e) {
                console.error('❌ 生成失败处理:', e);
                const dominant = getDominantPain();
                setCurrentReportData(generateContent(dominant));
                setPage('result');
              } finally {
                setIsLoading(false);
              }
            }}
            saveSnapshot={saveSnapshot}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            handleClear={handleClear}
            resetView={handleResetView}
          />
        );

      case 'result':
        return (
          <ResultPage
            imgUrl={imgUrl}
            identity={identity}
            setIdentity={setIdentity}
            appMode={appMode}
            editedContents={editedContents}
            setEditedContents={setEditedContents}
            editingField={editingField}
            setEditingField={setEditingField}
            refineInput={refineInput}
            setRefineInput={setRefineInput}
            refiningField={refiningField}
            setRefiningField={setRefiningField}
            refineTargetField={refineTargetField}
            setRefineTargetField={setRefineTargetField}
            leaveRecipient={leaveRecipient}
            setLeaveRecipient={setLeaveRecipient}
            leaveTone={leaveTone}
            setLeaveTone={setLeaveTone}
            shareContent={shareContent}
            setShareContent={setShareContent}
            showSharePreview={showSharePreview}
            setShowSharePreview={setShowSharePreview}
            generatedCardUrl={generatedCardUrl}
            setGeneratedCardUrl={setGeneratedCardUrl}
            showPostModal={showPostModal}
            setShowPostModal={setShowPostModal}
            postText={postText}
            setPostText={setPostText}
            isAnonymous={isAnonymous}
            setIsAnonymous={setIsAnonymous}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            currentReportData={currentReportData}
            llmData={llmData}
            content={generateContent()}
            getEditedOrDefault={getEditedOrDefault}
            getContextTitle={getContextTitle}
            isSideEmpty={isSideEmpty}
            pgFrontRef={pgFrontRef}
            onBack={() => setPage('onboarding')}
            onShare={(url) => handleSaveImage(url || imgUrl)}
            onPublish={() => setShowPostModal(true)}
            prepareSharePreview={prepareSharePreview}
            handleRefine={async (field) => {
              if (!field) return;
              setRefiningField(field);
              try {
                const dominant = getDominantPain();
                const bc = brushCounts.current || {};
                const brushNameMap = { heavy: 'sink', wave: 'swell' };
                const mappedDominant = brushNameMap[dominant] || dominant;
                const mappedBc = Object.fromEntries(
                  Object.entries(bc).map(([k, v]) => [brushNameMap[k] || k, v])
                );
                const toneMap = { polite: 'neutral', objective: 'formal' };
                const mappedWorkTone = toneMap[leaveTone] || leaveTone || 'neutral';
                const totalBrushes = Object.values(bc).reduce((a, b) => a + b, 0);
                const painScore = Math.min(100, Math.max(10, Math.round(totalBrushes * 1.5)));

                const spHist = speedHistory.current || [];
                const prHist = pressureHistory.current || [];
                const avgSpeed = spHist.length > 0 ? spHist.reduce((a, b) => a + b, 0) / spHist.length : 5.0;
                const peakSpeed = spHist.length > 0 ? Math.max(...spHist) : 10.0;
                const avgPressure = prHist.length > 0 ? prHist.reduce((a, b) => a + b, 0) / prHist.length : 0.5;

                const requestBody = {
                  appMode: appMode || 'medical',
                  dominantPain: mappedDominant,
                  userPref: userPrefs[0] || 'care',
                  painScore,
                  brushCounts: mappedBc,
                  spatialMap: { abdomen: 0.5, lowerBack: 0.5, upperBody: 0.0 },
                  intensityProfile: { avgSpeed, peakSpeed, avgPressure },
                  timeRhythm: { morning: 0.33, afternoon: 0.33, night: 0.34, dominantPeriod: 'morning' },
                  colorPalette: activeColor || 'crimson',
                  bodyMode: bodyMode || 'front',
                  medicalBackground,
                  tonePreference: tonePreference || 'gentle',
                  cycleDay: cycleDay || (isEn ? 'Not provided' : '未提供'),
                  targetLanguage: targetLanguage || 'zh',
                  accompanyingSymptoms: allSymptoms,
                  workScenario: leaveRecipient || 'manager',
                  workTone: mappedWorkTone,
                };

                let refinedResult = null;
                try {
                  const resp = await fetch(`${API_BASE}/api/refine`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                  });
                  if (resp.ok) {
                    refinedResult = await resp.json();
                  }
                } catch (apiErr) {
                  console.warn('⚠️ 精调 API 失败，使用本地模板:', apiErr.message);
                }

                if (refinedResult) {
                  const fieldValue = refinedResult[field];
                  if (fieldValue !== undefined && fieldValue !== null) {
                    setCurrentReportData(prev => ({ ...prev, [field]: fieldValue }));
                    setLlmData(prev => ({ ...prev, [field]: fieldValue }));
                    setEditedContents(prev => {
                      const next = { ...prev };
                      delete next[field];
                      return next;
                    });
                    showToast('refineSuccess');
                  } else {
                    showToast('refineNoChange');
                  }
                } else {
                  const content = generateContent(dominant);
                  const fieldValue = content[field];
                  if (fieldValue !== undefined) {
                    setCurrentReportData(prev => ({ ...prev, [field]: fieldValue }));
                    setLlmData(prev => ({ ...prev, [field]: fieldValue }));
                  }
                  showToast('refineFallback');
                }
              } catch (e) {
                console.error('❌ 精调失败:', e);
                showToast('refineFailed');
              } finally {
                setRefiningField(null);
              }
            }}
            handleCopy={(text) => {
              navigator.clipboard.writeText(text).then(() => {
                showToast('copySuccess');
              }).catch(() => {
                showToast('copyFailed');
              });
            }}
            setHealingState={setHealingState}
            randomPartnerTips={randomPartnerTips}
            onConfirmShare={() => { }}
          />
        );

      case 'community':
        return (
          <CommunityPage
            currentUserId={currentUserId}
            posts={posts}
            setPosts={setPosts}
            painFilter={painFilter}
            setPainFilter={setPainFilter}
            viewingPost={viewingPost}
            setViewingPost={setViewingPost}
            userLikedPosts={userLikedPosts}
            setUserLikedPosts={setUserLikedPosts}
            showExpInput={showExpInput}
            setShowExpInput={setShowExpInput}
            expText={expText}
            setExpText={setExpText}
            expTags={expTags}
            setExpTags={setExpTags}
            isLoading={isCommunityLoading}
            onRefreshCommunity={refreshCommunity}
            onBack={() => setPage('onboarding')}
            onViewProfile={(userId) => {
              setTargetUserId(userId);
              setPage('profile');
            }}
            handleLikePost={(postId) => {
              setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
              ));
            }}
            handleAddExperience={() => { }}
            updatePostInCloud={async () => { }}
            showToast={showToast}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
          />
        );

      case 'history':
        return (
          <HistoryPage
            lang={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            history={history}
            setHistory={setHistory}
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedDateRecords={selectedDateRecords}
            setSelectedDateRecords={setSelectedDateRecords}
            showGroupedView={showGroupedView}
            setShowGroupedView={setShowGroupedView}
            menstrualDates={menstrualDates}
            setMenstrualDates={setMenstrualDates}
            viewingDiary={viewingDiary}
            setViewingDiary={setViewingDiary}
            onBack={() => setPage('onboarding')}
            exportHistoryPDF={exportHistoryPDF}
            onShareRecord={(record) => {
              prepareSharePreview({
                ...record.reportData,
                identity: 'partner',
                historyImg: record.img,
                pain: record.painName
              });
            }}
            onPublishRecord={(record, customText) => handlePublishPost(record, customText)}
            showToast={showToast}
            currentUserId={currentUserId}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            key={targetUserId}
            currentUserId={currentUserId}
            targetUserId={targetUserId}
            isGuest={isGuest}
            onOpenAuth={() => setShowAuthModal(true)}
            setTargetUserId={setTargetUserId}
            onViewProfile={(userId) => {
              setTargetUserId(userId);
              setPage('profile');
            }}
            medicalBackground={medicalBackground}
            history={history}
            posts={posts}
            setPosts={setPosts}
            lang={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            onBack={() => {
              if (currentUserId !== targetUserId) {
                setPage('community');
              } else {
                setPage('onboarding');
              }
            }}
            onLogout={handleLogout}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* 主内容 */}
      {renderPage()}

      {/* 社区发布弹窗 */}
      // App.jsx - PublishPostModal 调用
      <PublishPostModal
        isOpen={showPostModal}
        imgUrl={imgUrl}
        postText={postText}
        setPostText={setPostText}
        onClose={() => setShowPostModal(false)}
        onSubmit={(submitData) => {
          // ✅ submitData 包含 text, blurEnabled, blurLevel
          handlePublishPost({
            img: imgUrl,
            reportData: generateContent(),
            blurEnabled: submitData.blurEnabled,
            blurLevel: submitData.blurLevel,
          }, submitData.text);
          setShowPostModal(false);
          setPostText('');
        }}
        isAnonymous={isAnonymous}
        setIsAnonymous={setIsAnonymous}
      />

      {/* 分享海报排版预览 Modal */}
      <SharePreviewModal
        isOpen={showSharePreview}
        shareContent={shareContent}
        imgUrl={imgUrl}
        pgFrontRef={pgFrontRef}
        isSideEmpty={isSideEmpty}
        getContextTitle={getContextTitle}
        onConfirm={confirmShare}
        onCancel={() => setShowSharePreview(false)}
        t={t}
      />

      {/* 已生成可保存的长按体感卡片弹窗 */}
      <GeneratedCardModal
        generatedCardUrl={generatedCardUrl}
        onClose={() => setGeneratedCardUrl(null)}
        lang={targetLanguage}
      />

      {/* 登录/游客拦截弹窗 */}
      <AuthModal
        isOpen={showAuthModal || (!authReady ? false : currentUserId === null && !isGuest)}
        onAuthSuccess={handleAuthSuccess}
        onGuestLogin={handleGuestLogin}
        onClose={() => setShowAuthModal(false)}
      />

      <ToastContainer />

      <Loading
        isLoading={isLoading}
        message={t('app.loading')}
        subMessage={t('app.loadingSub')}
        hint={t('app.loadingHint')}
      />

      <SomaticHealingSpace
        isOpen={healingState.isOpen}
        activeTab={healingState.activeTab}
        onClose={() => setHealingState(prev => ({ ...prev, isOpen: false }))}
        language={targetLanguage}
        dominantPainName={t(`painNames.${getDominantPain()}`) || '绞痛'}
        aiSelfCareTips={[]}
        onPublishSharedTip={() => { }}
      />
    </>
  );
}

export default function App() {
  const [targetLanguage, setTargetLanguage] = useState('zh');

  return (
    <I18nProvider lang={targetLanguage} setLang={setTargetLanguage}>
      <UserProvider>
        <AppContent
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
        />
      </UserProvider>
    </I18nProvider>
  );
}