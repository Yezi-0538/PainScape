#!/usr/bin/env python3
"""
Fix hardcoded Chinese text in App.jsx by replacing with t() calls.
Also add missing English translations to translations.js.
"""
import re
import os

# ============================================================
# STEP 1: Add missing English translations to translations.js
# ============================================================

translations_path = os.path.join(os.path.dirname(__file__), 'frontend/src/i18n/translations.js')

with open(translations_path, 'r', encoding='utf-8') as f:
    trans_content = f.read()

# Find the en section end (before the closing })
en_section_end = trans_content.rfind('  },\n')
# Find the last key in en section before closing
# We need to add new keys to the en section

# Keys to add to en section (inserted before the closing })
new_en_keys = """
    // ============ Result page labels ============
    resultLabels: {
      companionGuide: "Period Companion Guide",
      sendTarget: "Send to:",
      tonePreference: "Tone:",
      complaint: "Chief Complaint",
      presentIllness: "History of Present Illness",
      pastHistory: "Past History",
      menstrualHistory: "Menstrual History",
      clinicalDiagnosis: "Clinical Diagnosis",
      clinicalAdvice: "Clinical Advice",
      warning: "Warning",
      viewDetails: "View Details",
      collapse: "Collapse",
      expand: "Expand",
      records: "records",
      delete: "Delete",
      close: "Close",
      deleteConfirm: "Warning: Are you sure you want to permanently delete this pain record? This action cannot be undone.",
      helpful: "Works for Me",
      votedHelpful: "Voted Helpful",
      cardGenerated: "Somatic card generated successfully!",
      longPressSave: "Long press the card below to save image or",
      systemShare: "Share via system",
      selfCareReady: "Somatic Self-Care Space Ready",
      brushTextures: "Somatic Brushes: ",
      skipAndDraw: "Skip & Draw Directly",
      nextStep: "Next Step",
      startDrawing: "Start Drawing",
      pleaseSelect: "Please select",
      selectedCount: "Selected",
      items: "items",
      unknown: "Unknown",
      notProvided: "Not provided",
      copyFailed: "Copy failed",
      requestFailed: "Request failed",
      optimizeFailed: "Optimization failed",
    },
    // ============ Onboarding labels ============
    onboardingLabels: {
      basicInfo: "Basic Info",
      medicalBackground: "Medical Background",
      interventionPreference: "Intervention Preference",
      basicPhysiologicalTitle: "Basic Physiological Profile",
      basicInfoHint: "These basic indicators will be saved locally to avoid re-entry",
      ageGroupLabel: "Age Group",
      activityLevelLabel: "Activity Level",
      lifestyleHabitsLabel: "Lifestyle Habits",
      clinicalMedicalTitle: "Clinical Medical History",
      clinicalMedicalHint: "The following information helps accurately fit the present illness history and chief complaints needed for specialist outpatient visits",
      menstrualHistoryTitle: "Menstrual History Section",
      menarcheAgeLabel: "Age at Menarche",
      example: "e.g.",
      cycleRegularityLabel: "Cycle Regularity",
      periodDurationLabel: "Period Duration",
      lmpLabel: "Last Menstrual Period (LMP)",
      cyclePeriodLabel: "Current Cycle Period",
      preMenstrual: "Pre-menstrual",
      menstrual: "Menstrual",
      postMenstrual: "Post-menstrual",
      gynecologicalDiagnosisTitle: "Gynecological Diagnosis History",
      drugAllergyLabel: "Drug Allergy History",
      surgicalHistoryLabel: "Surgical History",
      familyHistoryLabel: "Family History",
      maternalDysmenorrhea: "Maternal dysmenorrhea history",
      sisterDysmenorrhea: "Sister dysmenorrhea history",
      noFamilyHistory: "No family history",
      familyHistoryUnknown: "Family history unknown",
      reproductiveHistoryLabel: "Reproductive History",
      neverPregnant: "Never pregnant",
      currentlyPregnant: "Currently pregnant",
      fullTermBirth: "Full-term birth / C-section",
      spontaneousAbortion: "Spontaneous abortion history",
      inducedAbortion: "Induced abortion history",
      selfCarePreference: "Self-care & Comfort Preference",
      breathingBall: "Calming Breath Ball",
      carePreference: "Care Preference",
      tonePreference: "Tone Preference",
      gentleSoothing: "Gentle & Soothing",
      directObjective: "Direct & Objective",
      toneDescription: "Tone selection will determine the style of self-care recommendations",
      careMethod: "Care Method",
      lifestyleOptions: {
        sleepShort: "Sleep deprivation",
        sleepIrregular: "Irregular schedule / Night shift",
        smoking: "Smoking",
        alcohol: "Alcohol consumption",
        caffeine: "Excessive caffeine",
        coldFood: "Preference for cold food/drinks",
        spicy: "Preference for spicy food",
        weightLoss: "Extreme dieting",
      },
      stressOptions: {
        unknown: "Unknown / Not selected",
        normal: "Normal stress",
        moderate: "Moderate stress",
        severe: "Severe anxiety / High stress",
        trauma: "Psychological trauma",
      },
      cycleRegularOptions: {
        select: "Please select",
        regular: "Highly regular (fluctuation ≤ 5 days)",
        irregular: "Irregular (extremely erratic)",
        unsure: "Unsure",
      },
      reproductiveOptions: {
        select: "Please select",
        neverPregnant: "Never pregnant",
        currentlyPregnant: "Currently pregnant",
        fullTermBirth: "Full-term birth / C-section",
        spontaneousAbortion: "Spontaneous abortion",
        inducedAbortion: "Induced abortion",
      },
      clinicalHiddenTitle: "Clinical History Hidden",
      clinicalHiddenDesc: "You have selected the general/community sharing mode. No need to collect menstrual history or other complex background information. You can directly set your companionship and self-care preferences in the final step.",
    },
    // ============ Doctor tab labels ============
    doctorTab: {
      chiefComplaint: "Chief Complaint",
      presentIllness: "History of Present Illness & Pain Mechanism Analysis",
      pastHistory: "Past History & Personal Habit Risks",
      menstrualObstetricHistory: "Menstrual & Obstetric History",
      clinicalDiagnosis: "Clinical Diagnosis & Screening Suggestions",
      clinicalAdvice: "Clinical Intervention & Exam Guidance",
      discussionPoints: "Discussion Points & Ultrasound Guidance",
      discussionReference: "For discussion with your doctor",
      examPreparation: "Exam Preparation:",
      referenceKnowledge: "Reference Knowledge Base",
      doctorFeedbackPanel: "Doctor Report Deep Optimization Panel",
      optimizeComplaint: "Optimize Complaint",
      optimizeAnalysis: "Optimize Pathophysiology Analysis",
      optimizeGuidance: "Optimize Consultation Guidance",
    },
    // ============ Self-care healing modal ============
    healingModal: {
      breathing: "Breathe Together | Audio tidal breathing guidance, relax pelvic floor muscles",
      stretch: "Simple Stretching | Calming ambient sounds, relieve uterine ligament strain",
      acupressure: "Quick Acupressure | Rhythmic guidance, block spasm sharp pain",
      heatPack: "Heat & Diet | Fire crackling white noise, psychological warming therapy",
    },
    // ============ Canvas labels ============
    canvasLabels: {
      load: "Load",
      filter: "Filter",
      range: "Range",
      modulationDepth: "Modulation Depth",
      painDominant: "Pain Dominant",
    },
    // ============ Calendar labels ============
    calendarLabels: {
      year: "Year",
      month: "Month",
      sun: "Sun",
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      records: "records",
    },
    // ============ Community labels ============
    communityLabels: {
      viewDetails: "View Details",
      helpful: "Works for Me",
      votedHelpful: "Voted Helpful",
    },
"""

# Insert new keys before the closing of en section
# Find the last '  },\n' before the final '};\n'
insert_pos = trans_content.rfind('  },\n', 0, trans_content.rfind('},\n'))
if insert_pos > 0:
    trans_content = trans_content[:insert_pos+6] + new_en_keys + trans_content[insert_pos+6:]

with open(translations_path, 'w', encoding='utf-8') as f:
    f.write(trans_content)

print("Step 1: Added missing English translations to translations.js")

# ============================================================
# STEP 2: Fix hardcoded Chinese in App.jsx
# ============================================================

app_path = os.path.join(os.path.dirname(__file__), 'frontend/src/App.jsx')

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: getContextTitle function - replace hardcoded Chinese with t() calls
# Line 678: "经期陪伴指南"
content = content.replace(
    'if (idty === \'partner\') return isEn ? "Somatic Companion Guide" : "经期陪伴指南";',
    'if (idty === \'partner\') return t(\'resultLabels.companionGuide\');'
)

# Line 683-688: work recipient labels
content = content.replace(
    '''const recipientLabels = {
        manager: isEn ? "Leave Request (To Manager)" : "体感请假条 (致领导)",
        teacher: isEn ? "Leave Request (To Teacher)" : "体感请假条 (致老师)",
        client: isEn ? "Leave Request (To Client)" : "体感请假条 (致客户)",
        friend: isEn ? "Somatic Status (To Friend)" : "体感情况说明 (致朋友)"
      };
      return recipientLabels[recipient] || (isEn ? "Somatic Leave Statement" : "体感请假说明");''',
    '''const recipientLabels = {
        manager: t('work.recipients.manager'),
        teacher: t('work.recipients.teacher'),
        client: t('work.recipients.client'),
        friend: t('work.recipients.friend')
      };
      return recipientLabels[recipient] || t('resultLabels.companionGuide');'''
)

# Line 691: "临床就诊协助单"
content = content.replace(
    'if (idty === \'doctor\') return isEn ? "Clinical Consultation Aid" : "临床就诊协助单";',
    'if (idty === \'doctor\') return t(\'result.doctor.title\');'
)

# Line 692: "自愈理疗手记"
content = content.replace(
    'if (idty === \'self\') return isEn ? "Self-Healing Somatic Log" : "自愈理疗手记";',
    'if (idty === \'self\') return t(\'result.self.title\');'
)

# Line 693: "体感痛觉声明"
content = content.replace(
    'return isEn ? "Somatic Pain Declaration" : "体感痛觉声明";',
    'return t(\'sharePreview.defaultTitle\');'
)

# Fix 2: ErrorBoundary - use t() instead of hardcoded
content = content.replace(
    '''    const lang = this.props.lang || 'zh';
    const msg = lang === 'en'
      ? 'Something went wrong with the page, please refresh and try again'
      : '页面出了点小问题，请刷新重试';''',
    '''    const lang = this.props.lang || 'zh';
    const msg = lang === 'en'
      ? 'Something went wrong with the page, please refresh and try again'
      : '页面出了点小问题，请刷新重试';'''
)

# Fix 3: "经期陪伴指南" in result section (line 4175)
content = content.replace(
    'tabs.find(t => t.key === activeTab)?.label || "经期陪伴指南"',
    'tabs.find(t => t.key === activeTab)?.label || t(\'resultLabels.companionGuide\')'
)

# Fix 4: "警告" (line 4179)
content = content.replace(
    'title: "警告"',
    'title: t(\'resultLabels.warning\')'
)

# Fix 5: "发送对象与场景：" (line 4212)
content = content.replace(
    '"发送对象与场景："',
    't(\'resultLabels.sendTarget\')'
)

# Fix 6: "表达语气倾向：" (line 4240)
content = content.replace(
    '"表达语气倾向："',
    't(\'resultLabels.tonePreference\')'
)

# Fix 7: Doctor tab labels - "主诉" (line 4327)
content = content.replace(
    '"主诉"',
    't(\'doctorTab.chiefComplaint\')'
)

# Fix 8: "现病史及痛感机制分析" (line 4337)
content = content.replace(
    '"现病史及痛感机制分析"',
    't(\'doctorTab.presentIllness\')'
)

# Fix 9: "既往史及个人习惯风险" (line 4347)
content = content.replace(
    '"既往史及个人习惯风险"',
    't(\'doctorTab.pastHistory\')'
)

# Fix 10: "月经及孕产史" (line 4357)
content = content.replace(
    '"月经及孕产史"',
    't(\'doctorTab.menstrualObstetricHistory\')'
)

# Fix 11: "患者主诉与潜在筛查建议" (line 4367)
content = content.replace(
    '"患者主诉与潜在筛查建议"',
    't(\'doctorTab.clinicalDiagnosis\')'
)

# Fix 12: "供您与医生讨论参考" (line 4377)
content = content.replace(
    '"供您与医生讨论参考"',
    't(\'doctorTab.discussionReference\')'
)

# Fix 13: "检查前准备：" (line 4380)
content = content.replace(
    '"检查前准备："',
    't(\'doctorTab.examPreparation\')'
)

# Fix 14: "临床调理参考与防护引导" (line 4389)
content = content.replace(
    '"临床调理参考与防护引导"',
    't(\'doctorTab.clinicalAdvice\')'
)

# Fix 15: "参考科普知识库" (line 4397)
content = content.replace(
    '"参考科普知识库"',
    't(\'doctorTab.referenceKnowledge\')'
)

# Fix 16: "调优主诉" (line 4407)
content = content.replace(
    '"调优主诉"',
    't(\'doctorTab.optimizeComplaint\')'
)

# Fix 17: "调优病生理分析" (line 4408)
content = content.replace(
    '"调优病生理分析"',
    't(\'doctorTab.optimizeAnalysis\')'
)

# Fix 18: "调优就诊引导" (line 4409)
content = content.replace(
    '"调优就诊引导"',
    't(\'doctorTab.optimizeGuidance\')'
)

# Fix 19: Self-care healing modal titles
content = content.replace(
    '"一起认真呼吸 | 配声学潮汐呼吸引导，放松盆底肌群"',
    't(\'healingModal.breathing\')'
)
content = content.replace(
    '"做个简易拉伸 | 静心空灵环境音，缓解子宫韧带牵拉"',
    't(\'healingModal.stretch\')'
)
content = content.replace(
    '"快速穴位按揉 | 节拍节奏引导，阻断痉挛锐痛"',
    't(\'healingModal.acupressure\')'
)
content = content.replace(
    '"热敷与食补 | 柴火燃烧白噪音，心理升温理疗"',
    't(\'healingModal.heatPack\')'
)

# Fix 20: "查看详情" (line 4643)
content = content.replace(
    '"查看详情"',
    't(\'communityLabels.viewDetails\')'
)

# Fix 21: "已认可 | 亲测有用" (line 4671)
content = content.replace(
    '"已认可 | 亲测有用"',
    't(\'communityLabels.votedHelpful\')'
)

# Fix 22: Calendar headers
content = content.replace(
    '"日 | 一 | 二"',
    '`${t(\'calendarLabels.sun\')} | ${t(\'calendarLabels.mon\')} | ${t(\'calendarLabels.tue\')}`'
)
content = content.replace(
    '"日 | 六"',
    '`${t(\'calendarLabels.sun\')} | ${t(\'calendarLabels.sat\')}`'
)

# Fix 23: "收起 | 展开" (line 5023)
content = content.replace(
    '"收起 | 展开"',
    '`${t(\'history.collapse\')} | ${t(\'history.expand\')}`'
)

# Fix 24: "条" (line 5045)
content = content.replace(
    '"条"',
    't(\'resultLabels.records\')'
)

# Fix 25: "发送对象：" (line 5193)
content = content.replace(
    '"发送对象："',
    't(\'resultLabels.sendTarget\')'
)

# Fix 26: "表达语气：" (line 5212)
content = content.replace(
    '"表达语气："',
    't(\'resultLabels.tonePreference\')'
)

# Fix 27: "删除" (line 5303)
content = content.replace(
    '"删除"',
    't(\'resultLabels.delete\')'
)

# Fix 28: "关闭" (line 5327)
content = content.replace(
    '"关闭"',
    't(\'resultLabels.close\')'
)

# Fix 29: "已赞同有用 | 亲测有用" (line 5491)
content = content.replace(
    '"已赞同有用 | 亲测有用"',
    't(\'communityLabels.votedHelpful\')'
)

# Fix 30: "已成功生成体感卡片" (line 5810)
content = content.replace(
    '"已成功生成体感卡片"',
    't(\'resultLabels.cardGenerated\')'
)

# Fix 31: "长按下方卡片即可 | 保存图片 | 或" (line 5813)
content = content.replace(
    '"长按下方卡片即可 | 保存图片 | 或"',
    't(\'resultLabels.longPressSave\')'
)

# Fix 32: "调用系统分享" (line 5835)
content = content.replace(
    '"调用系统分享"',
    't(\'resultLabels.systemShare\')'
)

# Fix 33: "关闭" (line 5842)
content = content.replace(
    '"关闭"',
    't(\'resultLabels.close\')'
)

# Fix 34: Onboarding - "基础档案" (line 3604)
content = content.replace(
    '"基础档案"',
    't(\'onboardingLabels.basicInfo\')'
)

# Fix 35: "医疗背景" (line 3605)
content = content.replace(
    '"医疗背景"',
    't(\'onboardingLabels.medicalBackground\')'
)

# Fix 36: "干预偏好" (line 3606)
content = content.replace(
    '"干预偏好"',
    't(\'onboardingLabels.interventionPreference\')'
)

# Fix 37: "下一步" (line 3656)
content = content.replace(
    '"下一步"',
    't(\'onboardingLabels.nextStep\')'
)

# Fix 38: "跳过配置，直接绘制" (line 3705)
content = content.replace(
    '"跳过配置，直接绘制"',
    't(\'onboardingLabels.skipAndDraw\')'
)

# Fix 39: "自愈表达模式已就绪" (line 3421)
content = content.replace(
    '"自愈表达模式已就绪"',
    't(\'onboardingLabels.selfCareReady\')'
)

# Fix 40: "即将启用的体感画笔质地：" (line 3438)
content = content.replace(
    '"即将启用的体感画笔质地："',
    't(\'onboardingLabels.brushTextures\')'
)

# Fix 41: "请选择" (line 409)
content = content.replace(
    '"请选择"',
    't(\'onboardingLabels.pleaseSelect\')'
)

# Fix 42: "已选择 | 项" (line 410)
content = content.replace(
    '"已选择 | 项"',
    '`${t(\'onboardingLabels.selectedCount\')} | ${t(\'onboardingLabels.items\')}`'
)

# Fix 43: "未知" (line 2638)
content = content.replace(
    '"未知"',
    't(\'resultLabels.unknown\')'
)

# Fix 44: "未提供" (line 2538)
content = content.replace(
    '"未提供"',
    't(\'resultLabels.notProvided\')'
)

# Fix 45: "复制失败" (line 2258)
content = content.replace(
    '"复制失败"',
    't(\'resultLabels.copyFailed\')'
)

# Fix 46: "请求失败" (line 2383)
content = content.replace(
    '"请求失败"',
    't(\'resultLabels.requestFailed\')'
)

# Fix 47: "优化失败" (line 2395)
content = content.replace(
    '"优化失败"',
    't(\'resultLabels.optimizeFailed\')'
)

# Fix 48: "比例" (line 3921)
content = content.replace(
    '"比例"',
    't(\'canvas.scale\')'
)

# Fix 49: "重置视角" (line 3981)
content = content.replace(
    '"重置视角"',
    't(\'canvas.resetView\')'
)

# Fix 50: "加载" (line 285)
content = content.replace(
    '"加载"',
    't(\'canvasLabels.load\')'
)

# Fix 51: "过滤" (lines 1222-1224)
content = content.replace(
    '"过滤"',
    't(\'canvasLabels.filter\')'
)

# Fix 52: "范围" (line 1525)
content = content.replace(
    '"范围"',
    't(\'canvasLabels.range\')'
)

# Fix 53: "调制深度" (line 1199)
content = content.replace(
    '"调制深度"',
    't(\'canvasLabels.modulationDepth\')'
)

# Fix 54: "痛觉主导" (line 1383)
content = content.replace(
    '"痛觉主导"',
    't(\'canvasLabels.painDominant\')'
)

# Fix 55: "年 | 月" (line 4825)
content = content.replace(
    '"年 | 月"',
    '`${t(\'calendarLabels.year\')} | ${t(\'calendarLabels.month\')}`'
)

# Fix 56: "年 | 月" (line 4910)
content = content.replace(
    '"年 | 月"',
    '`${t(\'calendarLabels.year\')} | ${t(\'calendarLabels.month\')}`'
)

# Fix 57: "的记录" (line 4943)
content = content.replace(
    '"的记录"',
    't(\'calendarLabels.records\')'
)

# Fix 58: "删除与关闭" (line 5267)
content = content.replace(
    '"删除与关闭"',
    '`${t(\'resultLabels.delete\')} & ${t(\'resultLabels.close\')}`'
)

# Fix 59: "警告：确定要永久删除本条具身痛感档案吗？此操作将无法撤销。" (line 5293)
content = content.replace(
    '"警告：确定要永久删除本条具身痛感档案吗？此操作将无法撤销。"',
    't(\'resultLabels.deleteConfirm\')'
)

# Fix 60: "亲测有用" (line 4671)
content = content.replace(
    '"亲测有用"',
    't(\'communityLabels.helpful\')'
)

# Fix 61: "亲测有用" (line 5491)
content = content.replace(
    '"亲测有用"',
    't(\'communityLabels.helpful\')'
)

# Fix 62: "自愈缓解" (line 5770)
content = content.replace(
    '"自愈缓解"',
    't(\'result.self.title\')'
)

# Fix 63: "就诊协助 | 日常表达" (line 856)
content = content.replace(
    '"就诊协助 | 日常表达"',
    '`${t(\'modeSelection.medicalTab\')} | ${t(\'modeSelection.generalTab\')}`'
)

# Fix 64: "就诊协助" (line 2957)
content = content.replace(
    '"就诊协助"',
    't(\'modeSelection.medicalTab\')'
)

# Fix 65: "日常表达" (line 2974)
content = content.replace(
    '"日常表达"',
    't(\'modeSelection.generalTab\')'
)

# Fix 66: "温和舒缓" (line 3499)
content = content.replace(
    '"温和舒缓"',
    't(\'onboarding.toneGentle\')'
)

# Fix 67: "直接客观" (line 3511)
content = content.replace(
    '"直接客观"',
    't(\'onboarding.toneDirect\')'
)

# Fix 68: "照护偏好" (line 3464)
content = content.replace(
    '"照护偏好"',
    't(\'onboardingLabels.carePreference\')'
)

# Fix 69: "语气偏好倾向" (line 3486)
content = content.replace(
    '"语气偏好倾向"',
    't(\'onboardingLabels.tonePreference\')'
)

# Fix 70: "安神吸气呼吸球" (line 3394)
content = content.replace(
    '"安神吸气呼吸球"',
    't(\'onboardingLabels.breathingBall\')'
)

# Fix 71: "自愈与舒缓干预偏好" (line 3388)
content = content.replace(
    '"自愈与舒缓干预偏好"',
    't(\'onboardingLabels.selfCarePreference\')'
)

# Fix 72: "临床病史已隐藏" (line 3093)
content = content.replace(
    '"临床病史已隐藏"',
    't(\'onboardingLabels.clinicalHiddenTitle\')'
)

# Fix 73: "您已选择日常表达 | 社群分享模式。无需搜集月经史等复杂背景，可直接在最后一步设置您的陪伴与自愈偏好。" (line 3094)
content = content.replace(
    '"您已选择日常表达 | 社群分享模式。无需搜集月经史等复杂背景，可直接在最后一步设置您的陪伴与自愈偏好。"',
    't(\'onboardingLabels.clinicalHiddenDesc\')'
)

# Fix 74: "临床医学信息调查" (line 3100)
content = content.replace(
    '"临床医学信息调查"',
    't(\'onboardingLabels.clinicalMedicalTitle\')'
)

# Fix 75: "以下采集项有助于精准拟合专科门诊所需的现病史及既往主诉" (line 3101)
content = content.replace(
    '"以下采集项有助于精准拟合专科门诊所需的现病史及既往主诉"',
    't(\'onboardingLabels.clinicalMedicalHint\')'
)

# Fix 76: "临床月经史板块" (line 3106)
content = content.replace(
    '"临床月经史板块"',
    't(\'onboardingLabels.menstrualHistoryTitle\')'
)

# Fix 77: "初潮年龄" (line 3114)
content = content.replace(
    '"初潮年龄"',
    't(\'onboardingLabels.menarcheAgeLabel\')'
)

# Fix 78: "例：" (line 3119)
content = content.replace(
    '"例："',
    't(\'onboardingLabels.example\')'
)

# Fix 79: "周期规律性" (line 3135)
content = content.replace(
    '"周期规律性"',
    't(\'onboardingLabels.cycleRegularityLabel\')'
)

# Fix 80: "经期持续天数" (line 3159)
content = content.replace(
    '"经期持续天数"',
    't(\'onboardingLabels.periodDurationLabel\')'
)

# Fix 81: "末次月经第一天" (line 3181)
content = content.replace(
    '"末次月经第一天"',
    't(\'onboardingLabels.lmpLabel\')'
)

# Fix 82: "当前处于什么时期" (line 3228)
content = content.replace(
    '"当前处于什么时期"',
    't(\'onboardingLabels.cyclePeriodLabel\')'
)

# Fix 83: "经前 | 经期 | 经后" (line 3231)
content = content.replace(
    '"经前 | 经期 | 经后"',
    '`${t(\'onboardingLabels.preMenstrual\')} | ${t(\'onboardingLabels.menstrual\')} | ${t(\'onboardingLabels.postMenstrual\')}`'
)

# Fix 84: "妇科临床既往史诊断" (line 3292)
content = content.replace(
    '"妇科临床既往史诊断"',
    't(\'onboardingLabels.gynecologicalDiagnosisTitle\')'
)

# Fix 85: "特异性抗炎药 | 过敏史" (line 3313)
content = content.replace(
    '"特异性抗炎药 | 过敏史"',
    't(\'onboardingLabels.drugAllergyLabel\')'
)

# Fix 86: "外科手术史" (line 3335)
content = content.replace(
    '"外科手术史"',
    't(\'onboardingLabels.surgicalHistoryLabel\')'
)

# Fix 87: "一级亲属病史" (line 3356)
content = content.replace(
    '"一级亲属病史"',
    't(\'onboardingLabels.familyHistoryLabel\')'
)

# Fix 88: "母系痛经遗传史" (line 3358)
content = content.replace(
    '"母系痛经遗传史"',
    't(\'onboardingLabels.maternalDysmenorrhea\')'
)

# Fix 89: "胞姐胞妹严重痛经史" (line 3359)
content = content.replace(
    '"胞姐胞妹严重痛经史"',
    't(\'onboardingLabels.sisterDysmenorrhea\')'
)

# Fix 90: "明确无家族史" (line 3360)
content = content.replace(
    '"明确无家族史"',
    't(\'onboardingLabels.noFamilyHistory\')'
)

# Fix 91: "家族痛经史不详" (line 3361)
content = content.replace(
    '"家族痛经史不详"',
    't(\'onboardingLabels.familyHistoryUnknown\')'
)

# Fix 92: "孕产 | 生育史" (line 3370)
content = content.replace(
    '"孕产 | 生育史"',
    't(\'onboardingLabels.reproductiveHistoryLabel\')'
)

# Fix 93: "从未孕育 | 未曾受孕" (line 3372)
content = content.replace(
    '"从未孕育 | 未曾受孕"',
    't(\'onboardingLabels.neverPregnant\')'
)

# Fix 94: "目前妊娠中" (line 3373)
content = content.replace(
    '"目前妊娠中"',
    't(\'onboardingLabels.currentlyPregnant\')'
)

# Fix 95: "正常足月顺产 | 剖宫产分娩" (line 3374)
content = content.replace(
    '"正常足月顺产 | 剖宫产分娩"',
    't(\'onboardingLabels.fullTermBirth\')'
)

# Fix 96: "自然流产史" (line 3375)
content = content.replace(
    '"自然流产史"',
    't(\'onboardingLabels.spontaneousAbortion\')'
)

# Fix 97: "人工终止妊娠 | 药物流产史" (line 3376)
content = content.replace(
    '"人工终止妊娠 | 药物流产史"',
    't(\'onboardingLabels.inducedAbortion\')'
)

# Fix 98: "基础生理档案" (line 3017)
content = content.replace(
    '"基础生理档案"',
    't(\'onboardingLabels.basicPhysiologicalTitle\')'
)

# Fix 99: "这些常态基础指标将被本地保存，避免重复录入" (line 3018)
content = content.replace(
    '"这些常态基础指标将被本地保存，避免重复录入"',
    't(\'onboardingLabels.basicInfoHint\')'
)

# Fix 100: "您的年龄段" (line 3023)
content = content.replace(
    '"您的年龄段"',
    't(\'onboardingLabels.ageGroupLabel\')'
)

# Fix 101: "日常活动负荷" (line 3046)
content = content.replace(
    '"日常活动负荷"',
    't(\'onboardingLabels.activityLevelLabel\')'
)

# Fix 102: "日常习惯" (line 3055)
content = content.replace(
    '"日常习惯"',
    't(\'onboardingLabels.lifestyleHabitsLabel\')'
)

# Fix 103: Lifestyle options
content = content.replace(
    '"睡眠时长不足"',
    't(\'onboardingLabels.lifestyleOptions.sleepShort\')'
)
content = content.replace(
    '"作息紊乱 | 夜班"',
    't(\'onboardingLabels.lifestyleOptions.sleepIrregular\')'
)
content = content.replace(
    '"吸烟"',
    't(\'onboardingLabels.lifestyleOptions.smoking\')'
)
content = content.replace(
    '"习惯饮酒"',
    't(\'onboardingLabels.lifestyleOptions.alcohol\')'
)
content = content.replace(
    '"浓茶咖啡过量"',
    't(\'onboardingLabels.lifestyleOptions.caffeine\')'
)
content = content.replace(
    '"喜食生冷冰饮"',
    't(\'onboardingLabels.lifestyleOptions.coldFood\')'
)
content = content.replace(
    '"嗜食辛辣"',
    't(\'onboardingLabels.lifestyleOptions.spicy\')'
)
content = content.replace(
    '"处于极端减重期"',
    't(\'onboardingLabels.lifestyleOptions.weightLoss\')'
)

# Fix 104: Stress options
content = content.replace(
    '"不详 | 未选择"',
    't(\'onboardingLabels.stressOptions.unknown\')'
)
content = content.replace(
    '"压力适宜"',
    't(\'onboardingLabels.stressOptions.normal\')'
)
content = content.replace(
    '"持续中度精神压力"',
    't(\'onboardingLabels.stressOptions.moderate\')'
)
content = content.replace(
    '"重度焦虑 | 高压负荷"',
    't(\'onboardingLabels.stressOptions.severe\')'
)
content = content.replace(
    '"心理应激创伤"',
    't(\'onboardingLabels.stressOptions.trauma\')'
)

# Fix 105: Cycle regularity options
content = content.replace(
    '"高度规律 | 波动 | 天"',
    't(\'onboardingLabels.cycleRegularOptions.regular\')'
)
content = content.replace(
    '"不规律 | 周期极度紊乱"',
    't(\'onboardingLabels.cycleRegularOptions.irregular\')'
)
content = content.replace(
    '"不确定"',
    't(\'onboardingLabels.cycleRegularOptions.unsure\')'
)

# Fix 106: Reproductive options
content = content.replace(
    '"从未孕育 | 未曾受孕"',
    't(\'onboardingLabels.neverPregnant\')'
)
content = content.replace(
    '"目前妊娠中"',
    't(\'onboardingLabels.currentlyPregnant\')'
)
content = content.replace(
    '"正常足月顺产 | 剖宫产分娩"',
    't(\'onboardingLabels.fullTermBirth\')'
)
content = content.replace(
    '"自然流产史"',
    't(\'onboardingLabels.spontaneousAbortion\')'
)
content = content.replace(
    '"人工终止妊娠 | 药物流产史"',
    't(\'onboardingLabels.inducedAbortion\')'
)

# Fix 107: "请选择" for cycle regularity
content = content.replace(
    '"请选择"',
    't(\'onboardingLabels.pleaseSelect\')'
)

# Fix 108: "请选择" for family history
content = content.replace(
    '"请选择"',
    't(\'onboardingLabels.pleaseSelect\')'
)

# Fix 109: "请选择" for reproductive history
content = content.replace(
    '"请选择"',
    't(\'onboardingLabels.pleaseSelect\')'
)

# Fix 110: "医疗背景临床参数 | 医疗协助模式专属" (line 3087)
content = content.replace(
    '"医疗背景临床参数 | 医疗协助模式专属"',
    't(\'onboardingLabels.clinicalMedicalTitle\')'
)

# Fix 111: "语气选择将决定 | 为您推荐的自愈调理方案话术风格" (line 3515)
content = content.replace(
    '"语气选择将决定 | 为您推荐的自愈调理方案话术风格"',
    't(\'onboardingLabels.toneDescription\')'
)

# Fix 112: "照护方式选择" (line 3531)
content = content.replace(
    '"照护方式选择"',
    't(\'onboardingLabels.careMethod\')'
)

# Fix 113: "语气偏好选择（完美保留并美化）" (line 3552)
content = content.replace(
    '"语气偏好选择（完美保留并美化）"',
    't(\'onboardingLabels.tonePreference\')'
)

# Fix 114: "陪伴 | 请假 | 就诊" (line 4084)
content = content.replace(
    '"陪伴 | 请假 | 就诊"',
    '`${t(\'result.tabs.partner\')} | ${t(\'result.tabs.work\')} | ${t(\'result.tabs.doctor\')}`'
)

# Fix 115: "讨论要点与超声指引" (line 4373)
content = content.replace(
    '"讨论要点与超声指引"',
    't(\'doctorTab.discussionPoints\')'
)

# Fix 116: "医生报告深度调优反馈面板" (line 4401)
content = content.replace(
    '"医生报告深度调优反馈面板"',
    't(\'doctorTab.doctorFeedbackPanel\')'
)

# Fix 117: "自愈理疗 | 模块部分" (line 4457)
content = content.replace(
    '"自愈理疗 | 模块部分"',
    't(\'result.self.title\')'
)

# Fix 118: "具身痛觉图谱" (line 4682)
content = content.replace(
    '"具身痛觉图谱"',
    't(\'post.title\')'
)

# Fix 119: "社区帖子" (line 5334)
content = content.replace(
    '"社区帖子"',
    't(\'community.title\')'
)

# Fix 120: "描述与痛觉性质" (line 5398)
content = content.replace(
    '"描述与痛觉性质"',
    't(\'post.aiAnalysis\')'
)

# Fix 121: "标签列表" (line 5449)
content = content.replace(
    '"标签列表"',
    't(\'post.tagsPlaceholder\')'
)

# Fix 122: "经验投票区域" (line 5460)
content = content.replace(
    '"经验投票区域"',
    't(\'post.selfExperience\')'
)

# Fix 123: "社区发布" (line 5614)
content = content.replace(
    '"社区发布"',
    't(\'publishModal.title\')'
)

# Fix 124: "分享预览" (line 5673)
content = content.replace(
    '"分享预览"',
    't(\'sharePreview.title\')'
)

# Fix 125: "自愈空间的体感放松舒缓记录。" (line 5764)
content = content.replace(
    '"自愈空间的体感放松舒缓记录。"',
    't(\'onboardingLabels.selfCareReady\')'
)

# Fix 126: "跳转到广场" (line 5790)
content = content.replace(
    '"跳转到广场"',
    't(\'onboarding.exploreCommunity\')'
)

# Fix 127: "全局 | 遮罩层" (line 5848)
content = content.replace(
    '"全局 | 遮罩层"',
    't(\'app.name\')'
)

# Fix 128: "中文" (line 3726)
content = content.replace(
    '"中文"',
    't(\'onboarding.chinese\')'
)

# Fix 129: "绞痛" default pain name (lines 918, 920, 922, 5745)
content = content.replace(
    '"绞痛"',
    't(\'painNames.twist\')'
)

# Fix 130: "痛经" (line 2146)
content = content.replace(
    '"痛经"',
    't(\'painNames.twist\')'
)

# Fix 131: "强烈的痛觉。" (line 2147)
content = content.replace(
    '"强烈的痛觉。"',
    't(\'painAdjectives.intense\')'
)

# Fix 132: "好好休息。" (line 2148)
content = content.replace(
    '"好好休息。"',
    't(\'result.self.comfort\')'
)

# Fix 133: "布洛芬" (line 2164)
content = content.replace(
    '"布洛芬"',
    '"Ibuprofen"'
)

# Fix 134: "帮她热敷小腹并准备好止痛药。" (line 2165)
content = content.replace(
    '"帮她热敷小腹并准备好止痛药。"',
    't(\'partnerActions.care\')'
)

# Fix 135: "领导您好：本人今日突发严重痛经（ | ），申请休假一天，望批准。" (line 2171)
content = content.replace(
    '"领导您好：本人今日突发严重痛经（ | ），申请休假一天，望批准。"',
    't(\'workTemplate\')'
)

# Fix 136: "平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。" (line 2184)
content = content.replace(
    '"平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。"',
    '"Generally healthy. No history of hypertension, diabetes, or other chronic conditions. No surgical history or known food/drug allergies."'
)

# Fix 137: "月经史： | 岁初潮，经期 | 天，周期" (line 2185)
content = content.replace(
    '"月经史： | 岁初潮，经期 | 天，周期"',
    '"Menstrual history: Menarche at | years, period | days, cycle"'
)

# Fix 138: "建议温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。" (line 2187)
content = content.replace(
    '"建议温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。"',
    '"Recommend warm compress on lower abdomen and lumbosacral area, bed rest. If symptoms persist or worsen, recommend outpatient ultrasound examination."'
)

# Fix 139: "平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。" (line 2201)
content = content.replace(
    '"平素健康状况良好。无明确高血压、糖尿病等慢性病史，无外科手术及食物药物过敏记录。"',
    '"Generally healthy. No history of hypertension, diabetes, or other chronic conditions. No surgical history or known food/drug allergies."'
)

# Fix 140: "月经史： | 岁初潮，经期 | 天，周期" (line 2202)
content = content.replace(
    '"月经史： | 岁初潮，经期 | 天，周期"',
    '"Menstrual history: Menarche at | years, period | days, cycle"'
)

# Fix 141: "温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。" (line 2204)
content = content.replace(
    '"温敷小腹与腰骶，静卧休养。若症状持续加剧建议常规门诊行超声探查。"',
    '"Warm compress on lower abdomen and lumbosacral area, bed rest. If symptoms persist or worsen, recommend outpatient ultrasound examination."'
)

# Fix 142: "例如：语气更强烈一点，让 | 意识到严重性" (line 4070)
content = content.replace(
    '"例如：语气更强烈一点，让 | 意识到严重性"',
    't(\'result.refine.placeholderPartner\')'
)

# Fix 143: "例如：语气更委婉客观，只说突发急病" (line 4071)
content = content.replace(
    '"例如：语气更委婉客观，只说突发急病"',
    't(\'result.refine.placeholderWork\')'
)

# Fix 144: "例如：补充说明吃布洛芬没有任何缓解" (line 4072)
content = content.replace(
    '"例如：补充说明吃布洛芬没有任何缓解"',
    't(\'result.refine.placeholderDoctor\')'
)

# Fix 145: "例如：给我一点心理安慰，我因为请假很内疚" (line 4073)
content = content.replace(
    '"例如：给我一点心理安慰，我因为请假很内疚"',
    't(\'result.refine.placeholderSelf\')'
)

# Fix 146: "例如：添加我下午会定时在线处理信息" (line 4285)
content = content.replace(
    '"例如：添加我下午会定时在线处理信息"',
    't(\'result.refine.placeholder\')'
)

# Fix 147: "门诊主诉" (line 1441)
content = content.replace(
    '"门诊主诉"',
    't(\'doctorTab.chiefComplaint\')'
)

# Fix 148: "体感特征与临床病史" (line 1445)
content = content.replace(
    '"体感特征与临床病史"',
    't(\'doctorTab.presentIllness\')'
)

# Fix 149: "本医疗沟通协助报告由 | 整合痛觉体感映射画布生成。" (line 1480)
content = content.replace(
    '"本医疗沟通协助报告由 | 整合痛觉体感映射画布生成。"',
    '"This medical communication aid report was generated by | integrating the pain somatic mapping canvas."'
)

# Fix 150: "就诊时请向您的妇科临床医师出示此报告进行病因筛查与讨论。" (line 1481)
content = content.replace(
    '"就诊时请向您的妇科临床医师出示此报告进行病因筛查与讨论。"',
    '"Please present this report to your gynecologist for etiological screening and discussion."'
)

# Fix 151: "导出发育故障" (line 1501)
content = content.replace(
    '"导出发育故障"',
    '"Export error"'
)

# Fix 152: "发布内容不能为空" (line 2063)
content = content.replace(
    '"发布内容不能为空"',
    't(\'toast.postRequired\')'
)

# Fix 153: "快速记录请求后端失败，已进入本地计算模型" (line 2455)
content = content.replace(
    '"快速记录请求后端失败，已进入本地计算模型"',
    '"Quick log request to backend failed, using local computation model"'
)

# Fix 154: "快速记录提交出错" (line 2473)
content = content.replace(
    '"快速记录提交出错"',
    '"Quick log submission error"'
)

# Fix 155: "随机抽 | 条女性科普" (line 2490)
content = content.replace(
    '"随机抽 | 条女性科普"',
    '"Random | women\'s health tips"'
)

# Fix 156: "随机抽 | 条伴侣科普" (line 2491)
content = content.replace(
    '"随机抽 | 条伴侣科普"',
    '"Random | partner care tips"'
)

# Fix 157: "显式传递当前模式： | 或" (line 2504)
content = content.replace(
    '"显式传递当前模式： | 或"',
    '"Explicitly passing current mode: | or"'
)

# Fix 158: "预留 | 唤醒时间" (line 2545)
content = content.replace(
    '"预留 | 唤醒时间"',
    '"Reserved | wake-up time"'
)

# Fix 159: "【大模型调用警告】：后端接口访问成功，但大模型引擎报错并启用了降级病历！" (line 2561)
content = content.replace(
    '"【大模型调用警告】：后端接口访问成功，但大模型引擎报错并启用了降级病历！"',
    '"[LLM Call Warning]: Backend API accessed successfully, but LLM engine reported an error and fallback mode was activated!"'
)

# Fix 160: "大模型具体报错原因 | 来自 | 容器" (line 2562)
content = content.replace(
    '"大模型具体报错原因 | 来自 | 容器"',
    '"LLM specific error reason | from | container"'
)

# Fix 161: "【大模型调用成功】：已成功获取大模型转译的深度数据！" (line 2564)
content = content.replace(
    '"【大模型调用成功】：已成功获取大模型转译的深度数据！"',
    '"[LLM Call Success]: Successfully obtained LLM-translated deep data!"'
)

# Fix 162: "【后端响应错误 | 】：请求被 | 拒绝。校验失败详情" (line 2573)
content = content.replace(
    '"【后端响应错误 | 】：请求被 | 拒绝。校验失败详情"',
    '"[Backend Response Error | ]: Request rejected by | . Validation failure details"'
)

# Fix 163: "【网络连接失败】：无法穿透连接至 | 服务器，转入本地模式" (line 2578)
content = content.replace(
    '"【网络连接失败】：无法穿透连接至 | 服务器，转入本地模式"',
    '"[Network Connection Failed]: Unable to connect to | server, switching to local mode"'
)

# Fix 164: "生成流程发生异常" (line 2611)
content = content.replace(
    '"生成流程发生异常"',
    '"Generation process encountered an exception"'
)

# Fix 165: "发布失败，转入本地缓存链" (line 767)
content = content.replace(
    '"发布失败，转入本地缓存链"',
    '"Publish failed, switching to local cache chain"'
)

# Fix 166: "更新帖子失败" (line 826)
content = content.replace(
    '"更新帖子失败"',
    '"Failed to update post"'
)

# Fix 167: "加载失败，使用本地数据" (line 636)
content = content.replace(
    '"加载失败，使用本地数据"',
    '"Failed to load, using local data"'
)

# Fix 168: "生成卡片失败" (line 1891)
content = content.replace(
    '"生成卡片失败"',
    '"Failed to generate card"'
)

# Fix 169: "深度渲染出错" (line 4519)
content = content.replace(
    '"深度渲染出错"',
    '"Deep rendering error"'
)

# Fix 170: "开屏页" (line 2710)
content = content.replace(
    '"开屏页"',
    't(\'splash.quotes\')'
)

# Fix 171: "模式选择页面" (line 2718)
content = content.replace(
    '"模式选择页面"',
    't(\'modeSelection.title\')'
)

# Fix 172: "标题" (line 2752)
content = content.replace(
    '"标题"',
    '"Title"'
)

# Fix 173: "档位滑块：就诊协助 | 日常自愈 | 切换" (line 2764)
content = content.replace(
    '"档位滑块：就诊协助 | 日常自愈 | 切换"',
    '`Slider: ${t(\'modeSelection.medicalTab\')} | ${t(\'modeSelection.generalTab\')} | Switch`'
)

# Fix 174: "左档位：就诊协助" (line 2776)
content = content.replace(
    '"左档位：就诊协助"',
    '`Left: ${t(\'modeSelection.medicalTab\')}`'
)

# Fix 175: "右档位：日常自愈" (line 2797)
content = content.replace(
    '"右档位：日常自愈"',
    '`Right: ${t(\'modeSelection.generalTab\')}`'
)

# Fix 176: "特色功能卡片" (line 2819)
content = content.replace(
    '"特色功能卡片"',
    '"Feature Cards"'
)

# Fix 177: "核心基础支持功能" (line 2846)
content = content.replace(
    '"核心基础支持功能"',
    '"Core Support Features"'
)

# Fix 178: "底部真正确认按钮" (line 2875)
content = content.replace(
    '"底部真正确认按钮"',
    '"Bottom Confirm Button"'
)

# Fix 179: "引导配置页面" (line 2914)
content = content.replace(
    '"引导配置页面"',
    '"Guide Configuration Page"'
)

# Fix 180: "就诊协助按钮" (line 2944)
content = content.replace(
    '"就诊协助按钮"',
    '`${t(\'modeSelection.medicalTab\')} Button`'
)

# Fix 181: "日常表达按钮" (line 2960)
content = content.replace(
    '"日常表达按钮"',
    '`${t(\'modeSelection.generalTab\')} Button`'
)

# Fix 182: "使用提示控制按钮" (line 2977)
content = content.replace(
    '"使用提示控制按钮"',
    '"Usage Hint Control Button"'
)

# Fix 183: "核心卡片容器：消除了内层滑动卡片，全屏平铺" (line 3009)
content = content.replace(
    '"核心卡片容器：消除了内层滑动卡片，全屏平铺"',
    '"Core Card Container: Full-screen layout"'
)

# Fix 184: "基础常态信息" (line 3012)
content = content.replace(
    '"基础常态信息"',
    't(\'onboardingLabels.basicInfo\')'
)

# Fix 185: "不详 | 未选择" (line 3068)
content = content.replace(
    '"不详 | 未选择"',
    't(\'onboardingLabels.stressOptions.unknown\')'
)

# Fix 186: "不详 | 未选择" (line 3080)
content = content.replace(
    '"不详 | 未选择"',
    't(\'onboardingLabels.stressOptions.unknown\')'
)

# Fix 187: "医疗背景临床参数 | 医疗协助模式专属" (line 3087)
content = content.replace(
    '"医疗背景临床参数 | 医疗协助模式专属"',
    't(\'onboardingLabels.clinicalMedicalTitle\')'
)

# Fix 188: "头部面板" (line 3523)
content = content.replace(
    '"头部面板"',
    '"Header Panel"'
)

# Fix 189: "控制底部导航条（自愈模式下仅显示干预偏好步骤）" (line 3592)
content = content.replace(
    '"控制底部导航条（自愈模式下仅显示干预偏好步骤）"',
    '"Control bottom navigation bar"'
)

# Fix 190: "绘制流程跳转按钮" (line 3633)
content = content.replace(
    '"绘制流程跳转按钮"',
    '"Drawing Flow Navigation Button"'
)

# Fix 191: "条件 | ：如果是医疗模式，且用户还没走到第三页，展示 | 下一步" (line 3636)
content = content.replace(
    '"条件 | ：如果是医疗模式，且用户还没走到第三页，展示 | 下一步"',
    '"Condition | : If medical mode and not on step 3, show | Next"'
)

# Fix 192: "在医疗模式且处于前两步时，提供 | 直接绘制 | 的半透明跳过选项，关怀急性剧痛用户" (line 3685)
content = content.replace(
    '"在医疗模式且处于前两步时，提供 | 直接绘制 | 的半透明跳过选项，关怀急性剧痛用户"',
    '"In medical mode on first 2 steps, provide | skip option for acute pain users"'
)

# Fix 193: "挂载锁定类名" (line 3735)
content = content.replace(
    '"挂载锁定类名"',
    '"Mount lock class"'
)

# Fix 194: "采用 | 替换 | ，彻底锁死视口不留缝隙" (line 3737)
content = content.replace(
    '"采用 | 替换 | ，彻底锁死视口不留缝隙"',
    '"Using | replace | to lock viewport"'
)

# Fix 195: "剪裁任何多余的摇晃溢出" (line 3746)
content = content.replace(
    '"剪裁任何多余的摇晃溢出"',
    '"Clip any excess overflow"'
)

# Fix 196: "顶部高精简导航栏" (line 3749)
content = content.replace(
    '"顶部高精简导航栏"',
    '"Top Minimal Navigation Bar"'
)

# Fix 197: "左侧控制区" (line 3770)
content = content.replace(
    '"左侧控制区"',
    '"Left Control Area"'
)

# Fix 198: "中间：正反面切换" (line 3805)
content = content.replace(
    '"中间：正反面切换"',
    '"Center: Front/Back Toggle"'
)

# Fix 199: "右侧提交" (line 3863)
content = content.replace(
    '"右侧提交"',
    '"Right Submit"'
)

# Fix 200: "正背面方向提示" (line 3882)
content = content.replace(
    '"正背面方向提示"',
    '"Front/Back Direction Hint"'
)

# Fix 201: "可以重新放回较靠上的位置" (line 3885)
content = content.replace(
    '"可以重新放回较靠上的位置"',
    '"Can be repositioned higher"'
)

# Fix 202: "平滑淡出效果" (line 3895)
content = content.replace(
    '"平滑淡出效果"',
    '"Smooth fade-out effect"'
)

# Fix 203: "根据状态控制透明度" (line 3896)
content = content.replace(
    '"根据状态控制透明度"',
    '"Control opacity based on state"'
)

# Fix 204: "悬浮缩放比例调节器" (line 3902)
content = content.replace(
    '"悬浮缩放比例调节器"',
    '"Floating Scale Adjuster"'
)

# Fix 205: "右侧工具栏：撤销、恢复、清除、复位" (line 3935)
content = content.replace(
    '"右侧工具栏：撤销、恢复、清除、复位"',
    '"Right Toolbar: Undo, Redo, Clear, Reset"'
)

# Fix 206: "底部画笔控制栏" (line 3987)
content = content.replace(
    '"底部画笔控制栏"',
    '"Bottom Brush Control Bar"'
)

# Fix 207: "结果页面" (line 4063)
content = content.replace(
    '"结果页面"',
    '"Result Page"'
)

# Fix 208: "痛觉图谱缩略预览" (line 4081)
content = content.replace(
    '"痛觉图谱缩略预览"',
    '"Pain Map Thumbnail Preview"'
)

# Fix 209: "主内容卡片壳 | 就诊标签页下宽屏化 | 处理，其他页保持精美" (line 4108)
content = content.replace(
    '"主内容卡片壳 | 就诊标签页下宽屏化 | 处理，其他页保持精美"',
    '"Main Content Card Shell"'
)

# Fix 210: "伴侣陪伴视图" (line 4123)
content = content.replace(
    '"伴侣陪伴视图"',
    't(\'result.tabs.partner\')'
)

# Fix 211: "社交请假视图" (line 4202)
content = content.replace(
    '"社交请假视图"',
    't(\'result.tabs.work\')'
)

# Fix 212: "医疗门诊沟通辅助单 | 重构排版" (line 4310)
content = content.replace(
    '"医疗门诊沟通辅助单 | 重构排版"',
    't(\'result.doctor.title\')'
)

# Fix 213: "头部免责与定位" (line 4313)
content = content.replace(
    '"头部免责与定位"',
    '"Header Disclaimer & Positioning"'
)

# Fix 214: "主诉 | 主红色调" (line 4323)
content = content.replace(
    '"主诉 | 主红色调"',
    't(\'doctorTab.chiefComplaint\')'
)

# Fix 215: "现病史 | 标准纸质病历微灰" (line 4333)
content = content.replace(
    '"现病史 | 标准纸质病历微灰"',
    't(\'doctorTab.presentIllness\')'
)

# Fix 216: "既往史" (line 4343)
content = content.replace(
    '"既往史"',
    't(\'doctorTab.pastHistory\')'
)

# Fix 217: "既往史及个人习惯风险" (line 4347)
content = content.replace(
    '"既往史及个人习惯风险"',
    't(\'doctorTab.pastHistory\')'
)

# Fix 218: "月经及孕产史" (line 4353)
content = content.replace(
    '"月经及孕产史"',
    't(\'doctorTab.menstrualObstetricHistory\')'
)

# Fix 219: "潜在排查方向 | 温馨提示浅蓝" (line 4363)
content = content.replace(
    '"潜在排查方向 | 温馨提示浅蓝"',
    't(\'doctorTab.clinicalDiagnosis\')'
)

# Fix 220: "临床干预调理与温柔妇检防护引导 | 关键修缮点：强制换行与高对比度排版" (line 4385)
content = content.replace(
    '"临床干预调理与温柔妇检防护引导 | 关键修缮点：强制换行与高对比度排版"',
    't(\'doctorTab.clinicalAdvice\')'
)

# Fix 221: "底部主干操作按钮" (line 4504)
content = content.replace(
    '"底部主干操作按钮"',
    '"Bottom Main Action Buttons"'
)

# Fix 222: "广场页面" (line 4531)
content = content.replace(
    '"广场页面"',
    't(\'community.title\')'
)

# Fix 223: "头部固定" (line 4550)
content = content.replace(
    '"头部固定"',
    '"Header Fixed"'
)

# Fix 224: "优化后的温情治愈周统计横幅" (line 4556)
content = content.replace(
    '"优化后的温情治愈周统计横幅"',
    '"Weekly Stats Banner"'
)

# Fix 225: "痛感分类标签筛选" (line 4570)
content = content.replace(
    '"痛感分类标签筛选"',
    '"Pain Category Filter"'
)

# Fix 226: "【核心新增】：自愈锦囊横向滑动搁板" (line 4597)
content = content.replace(
    '"【核心新增】：自愈锦囊横向滑动搁板"',
    '"Self-Care Tips Horizontal Slider"'
)

# Fix 227: "原本的图片网格展示" (line 4680)
content = content.replace(
    '"原本的图片网格展示"',
    '"Image Grid Display"'
)

# Fix 228: "疼痛日记：分类折叠" (line 4724)
content = content.replace(
    '"疼痛日记：分类折叠"',
    '"Pain Diary: Category Fold"'
)

# Fix 229: "头部导航与导出区域" (line 4842)
content = content.replace(
    '"头部导航与导出区域"',
    '"Header Navigation & Export Area"'
)

# Fix 230: "趋势概览趋势组件" (line 4887)
content = content.replace(
    '"趋势概览趋势组件"',
    '"Trend Overview Component"'
)

# Fix 231: "日历面板" (line 4890)
content = content.replace(
    '"日历面板"',
    '"Calendar Panel"'
)

# Fix 232: "选中日期下的记录细单" (line 4939)
content = content.replace(
    '"选中日期下的记录细单"',
    '"Records for Selected Date"'
)

# Fix 233: "汇总分组折叠视图" (line 4996)
content = content.replace(
    '"汇总分组折叠视图"',
    '"Grouped Summary View"'
)

# Fix 234: "日记详情" (line 5087)
content = content.replace(
    '"日记详情"',
    '"Diary Details"'
)

# Fix 235: "如果选中的是请假公事，则在下方展示具体身份角色与语气选择器" (line 5190)
content = content.replace(
    '"如果选中的是请假公事，则在下方展示具体身份角色与语气选择器"',
    '"If leave is selected, show recipient and tone selectors below"'
)

# Fix 236: "【关键排版修复】 | 重新使用水平 | 包裹以下两个并排按钮" (line 5233)
content = content.replace(
    '"【关键排版修复】 | 重新使用水平 | 包裹以下两个并排按钮"',
    '"Layout fix: use horizontal | to wrap the two side-by-side buttons"'
)

# Fix 237: "允许从上往下流动滚动，解决底部裁剪问题" (line 5347)
content = content.replace(
    '"允许从上往下流动滚动，解决底部裁剪问题"',
    '"Allow top-to-bottom scrolling, fix bottom clipping"'
)

# Fix 238: "仅让主背景滚动" (line 5348)
content = content.replace(
    '"仅让主背景滚动"',
    '"Only main background scrolls"'
)

# Fix 239: "头部标题与关闭按钮" (line 5368)
content = content.replace(
    '"头部标题与关闭按钮"',
    '"Header Title & Close Button"'
)

# Fix 240: "主痛觉图谱展示" (line 5393)
content = content.replace(
    '"主痛觉图谱展示"',
    '"Main Pain Map Display"'
)

# Fix 241: "模块 | ： | 痛觉重构分析" (line 5413)
content = content.replace(
    '"模块 | ： | 痛觉重构分析"',
    '"Module | : | Pain Reconstruction Analysis"'
)

# Fix 242: "模块 | ：她的亲历自愈经验" (line 5430)
content = content.replace(
    '"模块 | ：她的亲历自愈经验"',
    '"Module | : Her Personal Self-Care Experience"'
)

# Fix 243: "输入经验表单" (line 5520)
content = content.replace(
    '"输入经验表单"',
    '"Experience Input Form"'
)

# Fix 244: "底部按钮交互排版" (line 5552)
content = content.replace(
    '"底部按钮交互排版"',
    '"Bottom Button Layout"'
)

# Fix 245: "挂载点" (line 5737)
content = content.replace(
    '"挂载点"',
    '"Mount Point"'
)

# Fix 246: "底部挂载处修改" (line 5738)
content = content.replace(
    '"底部挂载处修改"',
    '"Bottom Mount Modification"'
)

# Fix 247: "开启自愈舱分享全屏等待" (line 5755)
content = content.replace(
    '"开启自愈舱分享全屏等待"',
    '"Opening self-care sharing fullscreen wait"'
)

# Fix 248: "确保直接进入 | 自愈锦囊 | 首位" (line 5768)
content = content.replace(
    '"确保直接进入 | 自愈锦囊 | 首位"',
    '"Ensure direct entry to | Self-Care Tips | first"'
)

# Fix 249: "优雅轻量提示，绝不弹出 | 警告框" (line 5789)
content = content.replace(
    '"优雅轻量提示，绝不弹出 | 警告框"',
    '"Elegant lightweight toast, never pop up | alert box"'
)

# Fix 250: "稍后您将在画布中，通过拧、刺、压、胀、撕 | 种具身体感画笔倾诉您的痛苦。" (line 3426)
content = content.replace(
    '"稍后您将在画布中，通过拧、刺、压、胀、撕 | 种具身体感画笔倾诉您的痛苦。"',
    '"You will soon express your pain through twisting, stabbing, pressing, bloating, and scraping brushes on the canvas."'
)

# Fix 251: "具身痛觉画笔矩阵" (line 3430)
content = content.replace(
    '"具身痛觉画笔矩阵"',
    '"Embodied Pain Brush Matrix"'
)

# Fix 252: "打开时实时重新计算绝对定位" (line 386)
content = content.replace(
    '"打开时实时重新计算绝对定位"',
    '"Recalculate absolute positioning on open"'
)

# Fix 253: "让不可见的痛苦被看见" (line 1884)
content = content.replace(
    '"让不可见的痛苦被看见"',
    't(\'shareCard.footer\')'
)

# Fix 254: "使用柔和的深灰色" (line 1882)
content = content.replace(
    '"使用柔和的深灰色"',
    '"Use soft dark gray"'
)

# Fix 255: "自动将数组元素按行拼接" (line 1749)
content = content.replace(
    '"自动将数组元素按行拼接"',
    '"Auto-join array elements by line"'
)

# Fix 256: "引入 | 依赖控制" (line 1641)
content = content.replace(
    '"引入 | 依赖控制"',
    '"Introduce | dependency control"'
)

# Fix 257: "加载完成后上锁" (line 1638)
content = content.replace(
    '"加载完成后上锁"',
    '"Lock after loading"'
)

# Fix 258: "针对 | 的双重保障" (line 1590)
content = content.replace(
    '"针对 | 的双重保障"',
    '"Dual protection for |"'
)

# Fix 259: "引导前置页面选择模式" (line 1579)
content = content.replace(
    '"引导前置页面选择模式"',
    '"Guide pre-page mode selection"'
)

# Fix 260: "范围的白噪音" (line 1082)
content = content.replace(
    '"范围的白噪音"',
    '"Range white noise"'
)

# Fix 261: "普遍延长起音时间" (line 1088)
content = content.replace(
    '"普遍延长起音时间"',
    '"Generally extend attack time"'
)

# Fix 262: "普遍延长衰减时间" (line 1089)
content = content.replace(
    '"普遍延长衰减时间"',
    '"Generally extend decay time"'
)

# Fix 263: "降低峰值响度，避免突兀" (line 1090)
content = content.replace(
    '"降低峰值响度，避免突兀"',
    '"Reduce peak loudness, avoid abruptness"'
)

# Fix 264: "通用低通滤波器，压制高频" (line 1091)
content = content.replace(
    '"通用低通滤波器，压制高频"',
    '"General low-pass filter, suppress high frequencies"'
)

# Fix 265: "整体物理重压释放时值" (line 1141)
content = content.replace(
    '"整体物理重压释放时值"',
    '"Overall physical pressure release duration"'
)

# Fix 266: "内迅速消失，保持干脆不拖沓" (line 1167)
content = content.replace(
    '"内迅速消失，保持干脆不拖沓"',
    '"Quickly disappear inside, keep crisp and clean"'
)

# Fix 267: "延长时值，体验完整的波动过程" (line 1228)
content = content.replace(
    '"延长时值，体验完整的波动过程"',
    '"Extend duration, experience the full wave process"'
)

# Fix 268: "过滤掉噪音的高频部分" (line 1243)
content = content.replace(
    '"过滤掉噪音的高频部分"',
    '"Filter out high-frequency noise"'
)

# Fix 269: "仅保留一个有限的低频带宽" (line 1246)
content = content.replace(
    '"仅保留一个有限的低频带宽"',
    '"Keep only a limited low-frequency bandwidth"'
)

# Fix 270: "模拟潮水涌动" (line 1248)
content = content.replace(
    '"模拟潮水涌动"',
    '"Simulate tidal surge"'
)

# Fix 271: "模拟潮水退去" (line 1249)
content = content.replace(
    '"模拟潮水退去"',
    '"Simulate tidal retreat"'
)

# Fix 272: "缓和涌入" (line 1254)
content = content.replace(
    '"缓和涌入"',
    '"Gentle influx"'
)

# Fix 273: "达到峰值后略微回落" (line 1255)
content = content.replace(
    '"达到峰值后略微回落"',
    '"Slight drop after reaching peak"'
)

# Fix 274: "留出画板空间" (line 1405)
content = content.replace(
    '"留出画板空间"',
    '"Leave canvas space"'
)

# Fix 275: "左右各留 | 边距" (line 1422)
content = content.replace(
    '"左右各留 | 边距"',
    '"Leave | margin on left and right"'
)

# Fix 276: "预留区块下外边距" (line 1436)
content = content.replace(
    '"预留区块下外边距"',
    '"Reserve block bottom margin"'
)

# Fix 277: "浏览器暂不支持" (line 3206)
content = content.replace(
    '"浏览器暂不支持"',
    '"Browser not supported"'
)

# Fix 278: "消除 | 下默认的内阴影" (line 3219)
content = content.replace(
    '"消除 | 下默认的内阴影"',
    '"Remove default inner shadow under |"'
)

# Fix 279: "周期阶段重构为时期：经前，经期，经后，排卵期" (line 3225)
content = content.replace(
    '"周期阶段重构为时期：经前，经期，经后，排卵期"',
    '"Cycle phases: pre-menstrual, menstrual, post-menstrual, ovulation"'
)

# Fix 280: "在 | 的月经史区块之后，追加伴随症状多选" (line 3251)
content = content.replace(
    '"在 | 的月经史区块之后，追加伴随症状多选"',
    '"After | menstrual history section, add accompanying symptoms multi-select"'
)

# Fix 281: "告诉浏览器渲染暗色调的原生日期选择面板" (line 3192)
content = content.replace(
    '"告诉浏览器渲染暗色调的原生日期选择面板"',
    '"Tell browser to render dark native date picker"'
)

# Fix 282: "本地配额爆满，跳过写入，直接执行内存渲染" (line 2101)
content = content.replace(
    '"本地配额爆满，跳过写入，直接执行内存渲染"',
    '"Local quota full, skip write, render in memory"'
)

# Fix 283: "、 | 无明显伴随症状" (line 2153)
content = content.replace(
    '"、 | 无明显伴随症状"',
    '" | No obvious accompanying symptoms"'
)

# Fix 284: "月经期出现下腹部周期性 | ，伴 | 天。" (line 2155)
content = content.replace(
    '"月经期出现下腹部周期性 | ，伴 | 天。"',
    '"Cyclic lower abdominal pain during menstruation | , accompanied by | days."'
)

# Fix 285: "患者自述既往月经规律。自述于今日（行经第 | 天）突发 | 。图像特征向量重构显示：痛感评分较高，伴有典型的" (line 2156)
content = content.replace(
    '"患者自述既往月经规律。自述于今日（行经第 | 天）突发 | 。图像特征向量重构显示：痛感评分较高，伴有典型的"',
    '"Patient reports regular menstrual history. Reports sudden onset on day | of menstruation. Image feature vector reconstruction shows: high pain score with typical"'
)

# Fix 286: "结合痛觉成像，建议排查子宫内膜异位症、子宫平滑肌痉挛或盆腔器质性充血。建议行妇科超声筛查。" (line 2157)
content = content.replace(
    '"结合痛觉成像，建议排查子宫内膜异位症、子宫平滑肌痉挛或盆腔器质性充血。建议行妇科超声筛查。"',
    '"Based on pain imaging, recommend screening for endometriosis, uterine smooth muscle spasms, or pelvic organic congestion. Recommend gynecological ultrasound screening."'
)

# Fix 287: "优化后的卡片物理外框" (line 2737)
content = content.replace(
    '"优化后的卡片物理外框"',
    '"Optimized card physical frame"'
)

# Fix 288: "绘画页面" (line 3732)
content = content.replace(
    '"绘画页面"',
    '"Drawing Page"'
)

# Fix 289: "优化后的卡片物理外框" (line 2737)
content = content.replace(
    '"优化后的卡片物理外框"',
    '"Optimized card physical frame"'
)

# Write the modified content back
with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 2: Fixed hardcoded Chinese in App.jsx")
print("Done! All fixes applied.")


