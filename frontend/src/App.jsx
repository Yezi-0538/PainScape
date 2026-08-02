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

// ===== 组件导入 =====//
import SomaticHealingSpace from './Components/SomaticHealingSpace.jsx';
import Loading from './Components/Loading.jsx';
import { useToast, Toast } from './Components/Toast.jsx';
import AuthModal from './Components/AuthModal';

// ===== 工具函数导入 =====
import { loadFromStorage, saveToStorage } from './utils/helpers';

// ===== 常量导入 =====
import { PAIN_NAME_MAP, QUOTES } from './i18n/translationsConstants';

// ===== API服务与数据库连接器 =====
import { createPost, getPosts, likePost, hugPost } from './services/postService';
import { supabase } from "./services/supabaseClient";

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'https://painscape-api.onrender.com';

// ============================================================
// AppContent - 主应用逻辑
// ============================================================
function AppContent({ targetLanguage, setTargetLanguage }) {
  const isEn = targetLanguage === 'en';
  const { t } = useI18n();
  const { userInfo, setUserInfo } = useUser();
  const { show, ToastContainer } = useToast();

  // ===== 初始化全局 Toast =====
  useEffect(() => {
    Toast.init({ show });
  }, [show]);

  // ===== 页面路由状态 =====
  const [page, setPage] = useState('splash');
  const [splashOpacity, setSplashOpacity] = useState(1);

  // ===== 多用户状态指针 =====
    const [currentUserId, setCurrentUserId] = useState(null); // 当前登录用户的 UUID
    const [isGuest, setIsGuest] = useState(false);             // 是否是临时游客
    const [targetUserId, setTargetUserId] = useState(null);    // 当前正在看的主页 ID

  // ===== Onboarding 页面内容切换 =====
  const [showContent, setShowContent] = useState('basicInfo');

  // ===== 应用模式 =====
  const [appMode, setAppMode] = useState('medical'); // 'medical' | 'general'

  // ===== 画板相关状态（跨页面共享） =====
  const [imgUrl, setImgUrl] = useState(null);
  const [bodyMode, setBodyMode] = useState('front');
  const [activeBrush, setActiveBrush] = useState(null);
  const [activeColor, setActiveColor] = useState('crimson');
  const [bgScale, setBgScale] = useState(1.0);
  const camRef = useRef({ x: 0, y: 0, zoom: 1.0 });

  // ===== p5 引用 =====
  const p5Ref = useRef(null);
  const pgFrontRef = useRef(null);
  const pgBackRef = useRef(null);
  const bgFrontRef = useRef(null);
  const bgBackRef = useRef(null);

  // ===== 粒子相关 =====
  const brushCounts = useRef({ twist: 0, pierce: 0, heavy: 0, wave: 0, scrape: 0 });
  const dynamicParticles = useRef([]);
  const staticParticles = useRef([]);
  const particlePositions = useRef([]);
  const speedHistory = useRef([]);
  const pressureHistory = useRef([]);
  
  // ===== 历史记录 =====
  const [history, setHistory] = useState(() => loadFromStorage('painscape_history', []));

  useEffect(() => {
    saveToStorage('painscape_history', history);
  }, [history]);

  // ===== 社区帖子 =====
  const [posts, setPosts] = useState([]);
  const [hasLoadedCommunity, setHasLoadedCommunity] = useState(false);

  // ===== P0-2: 社区帖子加载 =====
  useEffect(() => {
    if (page === 'community' && !hasLoadedCommunity) {
      (async () => {
        try {
          const loadedPosts = await getPosts();
          setPosts(Array.isArray(loadedPosts) ? loadedPosts : []);
          setHasLoadedCommunity(true);
        } catch (e) {
          console.error('❌ 加载社区帖子失败:', e);
          showToast('loadPostsFailed');
        }
      })();
    }
  }, [page, hasLoadedCommunity]);

  //检测Supabase本地Session会话实现自动免密登录
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setCurrentUserId(session.user.id);
          setTargetUserId(session.user.id);
        }
      } catch (err) {
        console.warn("自动检测云端登录态失败，已自动开启安全降级本地模式:", err);
      }
    };
    checkActiveSession();
  }, []);

  // ===== 用户偏好 =====
  const [userPrefs, setUserPrefs] = useState(['care']);
  const [tonePreference, setTonePreference] = useState('gentle');
  const [cycleDay, setCycleDay] = useState('');
  const [leaveRecipient, setLeaveRecipient] = useState('manager');
  const [leaveTone, setLeaveTone] = useState('polite');

  // ===== 医疗背景 =====
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

  // ===== 结果页面相关 =====
  const [currentReportData, setCurrentReportData] = useState(null);
  const [llmData, setLlmData] = useState(null);
  const [identity, setIdentity] = useState('partner');
  const [editedContents, setEditedContents] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [refineInput, setRefineInput] = useState('');
  const [refiningField, setRefiningField] = useState(null);
  const [refineTargetField, setRefineTargetField] = useState('chief_complaint');
  const [isLoading, setIsLoading] = useState(false);

  // ===== 分享相关 =====
  const [shareContent, setShareContent] = useState(null);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [generatedCardUrl, setGeneratedCardUrl] = useState(null);

  // ===== 发布相关 =====
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // ===== 查看详情 =====
  const [viewingDiary, setViewingDiary] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [diaryShareIdentity, setDiaryShareIdentity] = useState('partner');

  // ===== 社区交互 =====
  const [userLikedPosts, setUserLikedPosts] = useState(() => loadFromStorage('painscape_user_likes', []));
  const [painFilter, setPainFilter] = useState('all');
  const [showExpInput, setShowExpInput] = useState(false);
  const [expText, setExpText] = useState('');
  const [expTags, setExpTags] = useState('');

  // ===== 历史日历 =====
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState([]);
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [menstrualDates, setMenstrualDates] = useState([]);

  // ===== 自愈舱 =====
  const [healingState, setHealingState] = useState({ isOpen: false, activeTab: 'breathing' });
  const [randomSelfCareTips, setRandomSelfCareTips] = useState([]);
  const [randomPartnerTips, setRandomPartnerTips] = useState([]);

  // ===== 引导提示 =====
  const [showGuide, setShowGuide] = useState(false);

  // ===== 音频 =====
  const [isMuted, setIsMuted] = useState(false);
  const audioCtx = useRef(null);

  // ===== 分享预览准备 =====
  const prepareSharePreview = useCallback((contentData) => {
    setShareContent(contentData);
    setShowSharePreview(true);
  }, []);

  // ===== Toast 快捷方法 =====
  const showToast = useCallback((key, vars = {}) => {
    const msg = t(`toast.${key}`, vars);
    show(msg);
  }, [show, t]);

  // ===== Splash 自动跳转 =====
  useEffect(() => {
    if (page === 'splash') {
      const timer1 = setTimeout(() => setSplashOpacity(0), 2000);
      const timer2 = setTimeout(() => setPage('modeSelection'), 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [page]);

  // ===== 获取引用名言 =====
  const getQuote = () => {
    // ✅ 从 translations.js 读取，支持双语
    const quotes = t('splash.quotes', { returnObjects: true });
    if (Array.isArray(quotes) && quotes.length > 0) {
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    return '';
  };

  // ===== 获取主导痛感 =====
  const getDominantPain = useCallback(() => {
    const counts = brushCounts.current;
    const maxVal = Math.max(...Object.values(counts));
    return maxVal > 0 ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : 'twist';
  }, []);

  // ===== 生成内容 =====
  const generateContent = useCallback((overrideType, externalLlm = null, externalReportData = null) => {
    const activeLlm = externalReportData || externalLlm || currentReportData || llmData;
    const hasLlm = activeLlm && (activeLlm.status === 'success' || activeLlm.chief_complaint || activeLlm.present_illness);

    const dominant = overrideType || getDominantPain();
    const painName = t(`painNames.${dominant}`) || '痛经';

    // 默认模板
    const defaultAnalogy = t(`painTemplates.${dominant}.analogy`) || t('painTemplates.heavy.analogy') || '强烈的痛觉。';
    const defaultSelfCare = t(`painTemplates.${dominant}.selfCare`) || t('painTemplates.heavy.selfCare') || '好好休息。';

    const symptomsText = (medicalBackground.accompanyingSymptomsArr || [])
      .map(s => t(`onboarding.accompanyingOptions.${s}`) || s)
      .join(isEn ? ', ' : '、') || (isEn ? 'No significant accompanying symptoms' : '无明显伴随症状');

    const defaultComplaint = isEn
      ? `Recurrent lower abdominal ${painName} during menstruation, accompanied by ${symptomsText} for 1 day.`
      : `月经期出现下腹部周期性${painName}，伴${symptomsText}1天。`;
    const defaultPresentIllness = isEn
      ? `Patient reports regular menstrual cycles. Sudden onset of ${painName} today (day ${cycleDay || 'X'} of menstruation). Pain image reconstruction shows high pain scores with typical ${defaultAnalogy}, limited activity.`
      : `患者自述既往月经规律。自述于今日（行经第${cycleDay || 'X'}天）突发${painName}。图像特征向量重构显示：痛感评分较高，伴有典型的${defaultAnalogy}，活动受限。`;
    const defaultClinicalDiagnosis = isEn
      ? `Based on pain imaging, recommend evaluation for endometriosis, uterine smooth muscle spasms, or pelvic organic congestion. Pelvic ultrasound is recommended.`
      : `结合痛觉成像，建议排查子宫内膜异位症、子宫平滑肌痉挛或盆腔器质性充血。建议行妇科超声筛查。`;

    // 伴侣动作
    const prefKey = userPrefs[0] || 'care';
    const actionsTemplates = t(`partnerActions.${prefKey}`, { returnObjects: true }) || [];
    const formattedActions = Array.isArray(actionsTemplates)
      ? actionsTemplates.map(act => act.replace('{{med}}', isEn ? 'Ibuprofen' : '布洛芬'))
      : isEn ? ['☑️ Apply warm compress and prepare pain medication.'] : ['☑️ 帮她热敷小腹并准备好止痛药。'];
    const defaultAction = formattedActions.join('\n');

    // 请假模板
    const defaultWorkText = t('workTemplate')
      ? t('workTemplate').replace('{{pain}}', painName)
      : isEn ? `Dear Manager, I am experiencing severe acute pain (${painName}) today and am unable to work. I kindly request a day off. Thank you for your understanding.`
        : `领导您好：本人今日突发严重痛经（${painName}），申请休假一天，望批准。`;

    if (hasLlm) {
      return {
        pain: activeLlm.pain || painName,
        analogy: activeLlm.analogy || defaultAnalogy,
        workText: activeLlm.workText || activeLlm.work || defaultWorkText,
        action: activeLlm.action || defaultAction,
        selfCare: activeLlm.selfCare || defaultSelfCare,
        chief_complaint: activeLlm.chief_complaint || activeLlm.med_complaint || defaultComplaint,
        present_illness: activeLlm.present_illness || activeLlm.med_reference || defaultPresentIllness,
        past_history: activeLlm.past_history || t('defaultTemplates.past_history'),
        menstrual_history: activeLlm.menstrual_history || t('defaultTemplates.menstrual_history'),
        clinical_diagnosis: activeLlm.clinical_diagnosis || defaultClinicalDiagnosis,
        clinical_suggestions: activeLlm.clinical_suggestions || t('defaultTemplates.clinical_suggestions'),
        exam_advice: activeLlm.exam_advice || null,
      };
    }

    return {
      pain: painName,
      analogy: defaultAnalogy,
      workText: defaultWorkText,
      action: defaultAction,
      selfCare: defaultSelfCare,
      chief_complaint: defaultComplaint,
      present_illness: defaultPresentIllness,
      past_history: t('defaultTemplates.past_history'),
      menstrual_history: isEn ? t('defaultTemplates.menstrual_history') : '月经史：13岁初潮，经期5天，周期28-30天（5/28-30天）。',
      clinical_diagnosis: defaultClinicalDiagnosis,
      clinical_suggestions: t('defaultTemplates.clinical_suggestions'),
      exam_advice: null,
    };
  }, [currentReportData, llmData, getDominantPain, t, medicalBackground, cycleDay, userPrefs]);

  // ===== 获取编辑后的内容 =====
  const getEditedOrDefault = useCallback((key, defaultVal) => {
    return editedContents[key] !== undefined ? editedContents[key] : defaultVal;
  }, [editedContents]);

  // ===== 获取上下文标题 =====
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
  }, []);

  // ===== 判断画板是否为空 =====
  const isSideEmpty = useCallback((side) => {
    const totalCount = Object.values(brushCounts.current).reduce((a, b) => a + b, 0);
    if (totalCount > 10) return false;
    if (dynamicParticles.current && dynamicParticles.current.some(dp => dp.bodyMode === side)) {
      return false;
    }
    return true;
  }, []);

  // ===== 历史快照栈引用 =====
  const undoStackRef = useRef([]); 
  const redoStackRef = useRef([]); 
  const MAX_HISTORY = 100; 

  // ===== 保存当前画布与动态粒子快照 =====
  const saveSnapshot = useCallback(() => {
    if (!pgFrontRef.current || !pgBackRef.current) return;

    // 1. 复制离屏画布
    const frontImg = pgFrontRef.current.get();
    const backImg = pgBackRef.current.get();

    // 2. 浅拷贝当前的动态粒子数组
    const dynamicCopy = dynamicParticles.current ? [...dynamicParticles.current] : [];

    undoStackRef.current.push({
      front: frontImg,
      back: backImg,
      dynamicParticles: dynamicCopy, // 保存动态粒子状态
      counts: { ...brushCounts.current }
    });

    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }

    redoStackRef.current = [];
  }, []);

  // ===== 1. 重置视角 (Reset View) =====
  const handleResetView = useCallback(() => {
    camRef.current = { x: 0, y: 0, zoom: 1.0 };
    setBgScale(1.0);
  }, [setBgScale]);

  // ===== 2. 清空画布 (Clear) =====
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

  // ===== 3. 撤销 (Undo) =====
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    if (!pgFrontRef.current || !pgBackRef.current) return;

    // 1. 将当前图像与动态粒子存入 redo 栈
    const currentFront = pgFrontRef.current.get();
    const currentBack = pgBackRef.current.get();
    redoStackRef.current.push({
      front: currentFront,
      back: currentBack,
      dynamicParticles: dynamicParticles.current ? [...dynamicParticles.current] : [], // 🌟 存入当前动态粒子
      counts: { ...brushCounts.current }
    });

    // 2. 弹出 undo 栈上一笔快照
    const lastState = undoStackRef.current.pop();

    // 3. 还原离屏画布
    pgFrontRef.current.clear();
    pgFrontRef.current.image(lastState.front, 0, 0);

    pgBackRef.current.clear();
    pgBackRef.current.image(lastState.back, 0, 0);

    // 4. 还原动态粒子数组
    dynamicParticles.current = lastState.dynamicParticles ? [...lastState.dynamicParticles] : [];

    // 5. 还原笔刷计数
    brushCounts.current = { ...lastState.counts };
  }, []);

  // ===== 4. 重做 / 恢复 (Redo) =====
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    if (!pgFrontRef.current || !pgBackRef.current) return;

    // 1. 将当前图像与动态粒子存入 undo 栈
    const currentFront = pgFrontRef.current.get();
    const currentBack = pgBackRef.current.get();
    undoStackRef.current.push({
      front: currentFront,
      back: currentBack,
      dynamicParticles: dynamicParticles.current ? [...dynamicParticles.current] : [], // 🌟 存入当前动态粒子
      counts: { ...brushCounts.current }
    });

    // 2. 弹出 redo 栈下一步快照
    const nextState = redoStackRef.current.pop();

    // 3. 还原离屏画布
    pgFrontRef.current.clear();
    pgFrontRef.current.image(nextState.front, 0, 0);

    pgBackRef.current.clear();
    pgBackRef.current.image(nextState.back, 0, 0);

    // 4. 还原动态粒子数组
    dynamicParticles.current = nextState.dynamicParticles ? [...nextState.dynamicParticles] : [];

    // 5. 还原笔刷计数
    brushCounts.current = { ...nextState.counts };
  }, []);

  // ===== 渲染页面 =====
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
              // ✅ 根据模式设置 showContent
              if (mode === 'general') {
                setShowContent('preference');   // 自愈模式 → 显示偏好设置
              } else {
                setShowContent('basicInfo');    // 医疗模式 → 显示基础信息
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
            onProfile={() => setPage('profile')}
          />
        );

      case 'canvas':
        return (
          <CanvasPage
            bodyMode={bodyMode}
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
                // ── 1. 导出画布为 base64 图片 ──
                let frontBase64 = null;
                let backBase64 = null;
                const pgFront = pgFrontRef.current;
                const pgBack = pgBackRef.current;
                if (pgFront && typeof pgFront.get === 'function') {
                  try { frontBase64 = pgFront.get().canvas.toDataURL('image/jpeg', 0.8); } catch (_) { }
                }
                if (pgBack && typeof pgBack.get === 'function') {
                  try { backBase64 = pgBack.get().canvas.toDataURL('image/jpeg', 0.8); } catch (_) { }
                }
                const canvasImg = frontBase64 || backBase64 || 'data:image/jpeg;base64,';
                setImgUrl(canvasImg);

                // ── 2. 收集画板数据 ──
                const dominant = getDominantPain();
                const bc = brushCounts.current || {};
                // P2-4: 前端画笔名映射到后端名称 (heavy→sink, wave→swell)
                const brushNameMap = { heavy: 'sink', wave: 'swell' };
                const mappedDominant = brushNameMap[dominant] || dominant;
                const mappedBc = Object.fromEntries(
                  Object.entries(bc).map(([k, v]) => [brushNameMap[k] || k, v])
                );
                // P2-3: leaveTone 值域映射 (polite→neutral, objective→formal)
                const toneMap = { polite: 'neutral', objective: 'formal' };
                const mappedWorkTone = toneMap[leaveTone] || leaveTone || 'neutral';
                const totalBrushes = Object.values(bc).reduce((a, b) => a + b, 0);
                const painScore = Math.min(100, Math.max(10, Math.round(totalBrushes * 1.5)));

                // intensityProfile: 从 speedHistory / pressureHistory 计算
                const spHist = speedHistory.current || [];
                const prHist = pressureHistory.current || [];
                const avgSpeed = spHist.length > 0 ? spHist.reduce((a, b) => a + b, 0) / spHist.length : 5.0;
                const peakSpeed = spHist.length > 0 ? Math.max(...spHist) : 10.0;
                const avgPressure = prHist.length > 0 ? prHist.reduce((a, b) => a + b, 0) / prHist.length : 0.5;

                // spatialMap: 从 particlePositions 估算
                const positions = particlePositions.current || [];
                let abdomenWeight = 0, lowerBackWeight = 0, upperBodyWeight = 0;
                positions.forEach(p => {
                  if (p && p.y != null) {
                    const normY = p.y / (p.canvasH || 600);
                    if (normY < 0.33) upperBodyWeight += 1;
                    else if (normY < 0.66) abdomenWeight += 1;
                    else lowerBackWeight += 1;
                  }
                });
                const posTotal = abdomenWeight + lowerBackWeight + upperBodyWeight || 1;
                const spatialMap = {
                  abdomen: abdomenWeight / posTotal || 0.5,
                  lowerBack: lowerBackWeight / posTotal || 0.5,
                  upperBody: upperBodyWeight / posTotal || 0.0,
                };

                // timeRhythm: 简单均匀分布（前端无时间戳时使用默认）
                const timeRhythm = { morning: 0.33, afternoon: 0.33, night: 0.34, dominantPeriod: 'morning' };

                // ── 3. 构建 PainData 请求体 ──
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
                  accompanyingSymptoms: medicalBackground.accompanyingSymptomsArr || [],
                  workScenario: leaveRecipient || 'manager',
                  workTone: mappedWorkTone,
                };

                // ── 4. 调用后端 API ──
                let apiResult = null;
                try {
                  const resp = await fetch(`${API_BASE}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                  });
                  if (!resp.ok) {
                    const errText = await resp.text();
                    throw new Error(`API ${resp.status}: ${errText.slice(0, 200)}`);
                  }
                  apiResult = await resp.json();
                } catch (apiErr) {
                  console.warn('⚠️ API 调用失败，使用本地模板降级:', apiErr.message);
                  showToast('apiGenerateFallback');
                }

                // ── 5. 设置结果数据 ──
                if (apiResult) {
                  setLlmData(apiResult);
                  setCurrentReportData(apiResult);
                } else {
                  // 降级：使用本地模板
                  const content = generateContent(dominant);
                  setCurrentReportData(content);
                }

                // ── 6. 创建历史条目 ──
                const now = new Date();
                const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const historyEntry = {
                  id: Date.now().toString(),
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
                };
                setHistory(prev => [historyEntry, ...prev]);

                setPage('result');
              } catch (e) {
                console.error('❌ 生成失败:', e);
                showToast('generateFailed', { msg: e.message });
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
        // 在进入 ResultPage 前
        useEffect(() => {
          if (page === 'result') {
            const tips = t('partnerTips', { returnObjects: true }) || [];
            setRandomPartnerTips(Array.isArray(tips) ? tips : []);
          }
        }, [page, t]);
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
            onShare={() => { }}
            onPublish={() => setShowPostModal(true)}
            handleRefine={async (field) => {
              // P0-5: 内容精调 — 重新调用 /api/generate 并只替换指定字段
              if (!field) return;
              setRefiningField(field);
              try {
                const dominant = getDominantPain();
                const bc = brushCounts.current || {};
                // P2-4: 前端画笔名映射到后端名称 (heavy→sink, wave→swell)
                const brushNameMap = { heavy: 'sink', wave: 'swell' };
                const mappedDominant = brushNameMap[dominant] || dominant;
                const mappedBc = Object.fromEntries(
                  Object.entries(bc).map(([k, v]) => [brushNameMap[k] || k, v])
                );
                // P2-3: leaveTone 值域映射 (polite→neutral, objective→formal)
                const toneMap = { polite: 'neutral', objective: 'formal' };
                const mappedWorkTone = toneMap[leaveTone] || leaveTone || 'neutral';
                const totalBrushes = Object.values(bc).reduce((a, b) => a + b, 0);
                const painScore = Math.min(100, Math.max(10, Math.round(totalBrushes * 1.5)));

                // 复用上次请求的结构
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
                  accompanyingSymptoms: medicalBackground.accompanyingSymptomsArr || [],
                  workScenario: leaveRecipient || 'manager',
                  workTone: mappedWorkTone,
                };

                let refinedResult = null;
                try {
                  const resp = await fetch(`${API_BASE}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                  });
                  if (!resp.ok) {
                    throw new Error(`API ${resp.status}`);
                  }
                  refinedResult = await resp.json();
                } catch (apiErr) {
                  console.warn('⚠️ 精调 API 失败，使用本地模板:', apiErr.message);
                }

                if (refinedResult) {
                  // 只更新精调的字段，保留其他字段不变
                  const fieldValue = refinedResult[field];
                  if (fieldValue !== undefined && fieldValue !== null) {
                    setCurrentReportData(prev => ({ ...prev, [field]: fieldValue }));
                    setLlmData(prev => ({ ...prev, [field]: fieldValue }));
                    // 如果用户之前编辑过该字段，清除编辑缓存
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
                  // 降级：使用本地 generateContent 刷新
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
            prepareSharePreview={prepareSharePreview}
            randomPartnerTips={randomPartnerTips}
            onConfirmShare={() => { }}
          />
        );

      case 'community':
        return (
          <CommunityPage
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
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onBack={() => setPage('onboarding')}
            onViewProfile={(userId) => {
              setTargetUserId(userId);
              setPage('profile');
            }}
            handleLikePost={(postId) => {
              // 简化处理
              setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
              ));
            }}
            handleAddExperience={() => { }}
            updatePostInCloud={async () => { }}
            showToast={showToast}
          />
        );

      case 'history':
        return (
          <HistoryPage
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
            exportHistoryPDF={() => {
              // P0-3: PDF 导出 — 使用 window.print() 轻量方案
              if (!history || history.length === 0) {
                showToast('noHistoryToExport');
                return;
              }
              try {
                // 构建打印专用 HTML
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                if (!printWindow) {
                  showToast('popupBlocked');
                  return;
                }
                const recordsHtml = history.map((record, idx) => {
                  const rd = record.reportData || {};
                  return `
                    <div style="margin-bottom:24px; page-break-inside:avoid; border-bottom:1px solid #ddd; padding-bottom:16px;">
                      <h3 style="margin:0 0 8px; color:#c62828;">记录 ${idx + 1} — ${record.date || ''} ${record.time || ''}</h3>
                      <p><strong>痛感类型：</strong>${record.painName || ''}</p>
                      <p><strong>痛感评分：</strong>${record.painScore || '-'}</p>
                      ${rd.chief_complaint ? `<p><strong>主诉：</strong>${rd.chief_complaint}</p>` : ''}
                      ${rd.present_illness ? `<p><strong>现病史：</strong>${rd.present_illness}</p>` : ''}
                      ${rd.clinical_diagnosis ? `<p><strong>临床诊断：</strong>${rd.clinical_diagnosis}</p>` : ''}
                      ${rd.clinical_suggestions ? `<p><strong>建议：</strong>${rd.clinical_suggestions}</p>` : ''}
                      ${rd.analogy ? `<p><strong>体感类比：</strong>${typeof rd.analogy === 'object' ? JSON.stringify(rd.analogy) : rd.analogy}</p>` : ''}
                      ${rd.selfCare ? `<p><strong>自愈建议：</strong>${Array.isArray(rd.selfCare) ? rd.selfCare.join('；') : rd.selfCare}</p>` : ''}
                      ${rd.action ? `<p><strong>伴侣/家人行动：</strong>${Array.isArray(rd.action) ? rd.action.join('；') : rd.action}</p>` : ''}
                      ${rd.work ? `<p><strong>请假/推约消息：</strong>${typeof rd.work === 'object' ? JSON.stringify(rd.work) : rd.work}</p>` : ''}
                    </div>`;
                }).join('');

                printWindow.document.write(`<!DOCTYPE html>
                  <html><head><title>PainScape 历史记录</title>
                  <style>
                    body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                    h1 { color: #c62828; border-bottom: 2px solid #c62828; padding-bottom: 8px; }
                    h3 { font-size: 15px; }
                    p { font-size: 13px; margin: 4px 0; }
                    @media print { body { padding: 0; } }
                  </style></head>
                  <body>
                    <h1>PainScape 痛觉记录导出</h1>
                    <p>导出时间：${new Date().toLocaleString('zh-CN')}　|　共 ${history.length} 条记录</p>
                    <hr/>
                    ${recordsHtml}
                  </body></html>`);
                printWindow.document.close();
                // 延迟打印确保内容渲染完毕
                setTimeout(() => {
                  printWindow.print();
                }, 500);
              } catch (e) {
                console.error('❌ PDF 导出失败:', e);
                showToast('exportFailed');
              }
            }}
            showToast={showToast}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            currentUserId={currentUserId}
            targetUserId={targetUserId}
            medicalBackground={medicalBackground}
            history={history}
            posts={posts}
            lang={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            onBack={() => {
              if (currentUserId !== targetUserId) {
                setPage('community');
              } else {
                setPage('onboarding');
              }
            }}
            onLogout={() => {
              alert("模拟退出登录成功。");
              setPage('splash');
            }}
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

      {/* 用户系统登录注册/游客拦截弹窗保护层 */}
      <AuthModal
        isOpen={currentUserId === null && !isGuest}
        onAuthSuccess={(userId) => {
          setCurrentUserId(userId);
          setTargetUserId(userId);
        }}
        onGuestLogin={(guestId) => {
          setCurrentUserId(guestId);
          setTargetUserId(guestId);
          setIsGuest(true); // 开启游客态
        }}
      />

      {/* 全局 Toast */}
      <ToastContainer />

      {/* 全局 Loading */}
      <Loading
        isLoading={isLoading}
        message={t('app.loading')}
        subMessage={t('app.loadingSub')}
        hint={t('app.loadingHint')}
      />

      {/* 自愈舱 - 全局组件 */}
      <SomaticHealingSpace
        isOpen={healingState.isOpen}
        activeTab={healingState.activeTab}
        onClose={() => setHealingState(prev => ({ ...prev, isOpen: false }))}
        language="zh"
        dominantPainName={t(`painNames.${getDominantPain()}`) || '绞痛'}
        aiSelfCareTips={[]}
        onPublishSharedTip={() => { }}
      />
    </>
  );
}

// ============================================================
// App - 根组件
// ============================================================
export default function App() {
  const [targetLanguage, setTargetLanguage] = useState('zh');

  console.log('🔵 App targetLanguage:', targetLanguage);  // ✅ 添加这行

  return (
    <I18nProvider lang={targetLanguage}>
      <UserProvider>
        <AppContent
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
        />
      </UserProvider>
    </I18nProvider>
  );
}