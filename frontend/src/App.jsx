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

// ===== 工具函数导入 =====
import { loadFromStorage, saveToStorage } from './utils/helpers';

// ===== 常量导入 =====
import { PAIN_NAME_MAP, QUOTES } from './i18n/translationsConstants';

// ===== API 服务 =====
import { createPost, getPosts, likePost, hugPost } from './services/postService';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'https://painscape-api.onrender.com';

// ============================================================
// AppContent - 主应用逻辑
// ============================================================
function AppContent({ targetLanguage, setTargetLanguage }) {
  console.log('🔵 AppContent targetLanguage:', targetLanguage);  // ✅ 添加这行
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

  // ===== 音频 =====
  const [isMuted, setIsMuted] = useState(false);
  const audioCtx = useRef(null);

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
    const defaultAnalogy = t(`painTemplates.${dominant}.analogy`) || '强烈的痛觉。';
    const defaultSelfCare = t(`painTemplates.${dominant}.selfCare`) || '好好休息。';

    const symptomsText = (medicalBackground.accompanyingSymptomsArr || [])
      .map(s => t(`onboarding.accompanyingOptions.${s}`) || s)
      .join('、') || '无明显伴随症状';

    const defaultComplaint = `月经期出现下腹部周期性${painName}，伴${symptomsText}1天。`;
    const defaultPresentIllness = `患者自述既往月经规律。自述于今日（行经第${cycleDay || 'X'}天）突发${painName}。图像特征向量重构显示：痛感评分较高，伴有典型的${defaultAnalogy}，活动受限。`;
    const defaultClinicalDiagnosis = `结合痛觉成像，建议排查子宫内膜异位症、子宫平滑肌痉挛或盆腔器质性充血。建议行妇科超声筛查。`;

    // 伴侣动作
    const prefKey = userPrefs[0] || 'care';
    const actionsTemplates = t(`partnerActions.${prefKey}`, { returnObjects: true }) || [];
    const formattedActions = Array.isArray(actionsTemplates)
      ? actionsTemplates.map(act => act.replace('{{med}}', '布洛芬'))
      : ['☑️ 帮她热敷小腹并准备好止痛药。'];
    const defaultAction = formattedActions.join('\n');

    // 请假模板
    const defaultWorkText = t('workTemplate')
      ? t('workTemplate').replace('{{pain}}', painName)
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
        past_history: activeLlm.past_history || '平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。',
        menstrual_history: activeLlm.menstrual_history || '月经史：13岁初潮，经期5天，周期28-30天。',
        clinical_diagnosis: activeLlm.clinical_diagnosis || defaultClinicalDiagnosis,
        clinical_suggestions: activeLlm.clinical_suggestions || '建议温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。',
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
      past_history: '平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。',
      menstrual_history: '月经史：13岁初潮，经期5天，周期28-30天（5/28-30天）。',
      clinical_diagnosis: defaultClinicalDiagnosis,
      clinical_suggestions: '温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。',
      exam_advice: null,
    };
  }, [currentReportData, llmData, getDominantPain, t, medicalBackground, cycleDay, userPrefs]);

  // ===== 获取编辑后的内容 =====
  const getEditedOrDefault = useCallback((key, defaultVal) => {
    return editedContents[key] !== undefined ? editedContents[key] : defaultVal;
  }, [editedContents]);

  // ===== 获取上下文标题 =====
  const getContextTitle = useCallback((idty, recipient = 'manager') => {
    const isEn = false; // 简化处理
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

  // ===== 渲染页面 =====
  const renderPage = () => {
    switch (page) {
      case 'splash':
        return (
          <SplashPage
            splashOpacity={splashOpacity}
            quote={getQuote()}
          />
        );

      case 'modeSelection':
        return (
          <ModeSelectionPage
            onSelectMode={(mode) => {
              setAppMode(mode);
              setPage('onboarding');
            }}
            onLanguageSwitch={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
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
            setTargetLanguage={setTargetLanguage}   // ✅ 添加这行！
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
            brushCounts={brushCounts}
            dynamicParticles={dynamicParticles}
            staticParticles={staticParticles}
            particlePositions={particlePositions}
            speedHistory={speedHistory}
            pressureHistory={pressureHistory}
            appMode={appMode}
            onBack={() => setPage('onboarding')}
            onGenerate={async () => {
              // 生成逻辑 - 简化版，实际需要从 CanvasPage 传递数据
              setIsLoading(true);
              try {
                // 模拟生成
                const url = 'data:image/jpeg;base64,...'; // 实际从 Canvas 获取
                setImgUrl(url);
                const dominant = getDominantPain();
                const content = generateContent(dominant);
                setCurrentReportData(content);
                setPage('result');
              } catch (e) {
                console.error('Generation failed:', e);
              } finally {
                setIsLoading(false);
              }
            }}
            onUndo={() => { }}
            onRedo={() => { }}
            onClear={() => { }}
            onResetView={() => { }}
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
            onShare={() => { }}
            onPublish={() => setShowPostModal(true)}
            onRefine={(field) => {
              // 简化处理
              setRefiningField(field);
              setTimeout(() => setRefiningField(null), 1000);
            }}
            onCopy={(text) => {
              navigator.clipboard.writeText(text).then(() => {
                showToast('copySuccess');
              }).catch(() => {
                showToast('copyFailed');
              });
            }}
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
            onLike={(postId) => {
              // 简化处理
              setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
              ));
            }}
            onHug={(postId) => {
              setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, hugs: (p.hugs || 0) + 1 } : p
              ));
            }}
            onDelete={() => { }}
            onAddExperience={() => { }}
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
            onExport={() => { }}
            showToast={showToast}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            history={history}
            onBack={() => setPage('onboarding')}
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