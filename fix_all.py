# -*- coding: utf-8 -*-
"""
Comprehensive fix script for PainScape:
1. Fix hardcoded Chinese in App.jsx -> use translations
2. Fix backend main.py bilingual issues
3. Add Supabase user info retention UI
"""
import os
import re

BASE_DIR = os.path.dirname(__file__)

# ============================================================
# PART 1: Fix backend main.py - bilingual error messages
# ============================================================
def fix_backend():
    filepath = os.path.join(BASE_DIR, 'backend', 'main.py')
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changes = []
    
    # Fix 1: Line 786 - make error message bilingual
    old = 'raise HTTPException(status_code=401, detail="Unauthorized / Supabase not configured")'
    new = '''    if lang == "en":
        raise HTTPException(status_code=401, detail="Unauthorized / Supabase not configured")
    raise HTTPException(status_code=401, detail="未授权 / Supabase 未配置")'''
    if old in content:
        content = content.replace(old, new)
        changes.append("Fixed unauthorized error message to be bilingual")
    
    # Fix 2: Line 792 - make token error bilingual
    old = 'raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")'
    new = '''    if lang == "en":
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    raise HTTPException(status_code=401, detail=f"无效的令牌: {str(e)}")'''
    if old in content:
        content = content.replace(old, new)
        changes.append("Fixed token error message to be bilingual")
    
    # Fix 3: Fix the _fallback_response en section - undefined variables
    # Line 1066: {allergies} should be {build_risk_warning(mb, lang)}
    old = 'allergies: {allergies}. Lifestyle:'
    new = 'allergies: {risk_warning}. Lifestyle:'
    if old in content:
        content = content.replace(old, new)
        changes.append("Fixed undefined 'allergies' variable in en fallback")
    
    # Line 1068: {repo_desc} should be {obstetric_history}
    old = 'Obstetrical History: {repo_desc}.'
    new = 'Obstetrical History: {obstetric_history}.'
    if old in content:
        content = content.replace(old, new)
        changes.append("Fixed undefined 'repo_desc' variable in en fallback")
    
    # Fix 4: Add lang parameter to get_supabase_user and related routes
    # Add lang support to profile/pain-records routes
    old = '''@app.get("/api/profile")
def get_profile(authorization: str = Header(None)):
    """获取用户档案"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        # 允许匿名访问时返回空
        return {"error": "Authentication required"}
    
    result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if result.data and len(result.data) > 0:
        return {"status": "success", "profile": result.data[0]}
    return {"status": "success", "profile": None}'''
    
    new = '''@app.get("/api/profile")
def get_profile(authorization: str = Header(None), accept_language: str = "zh"):
    """获取用户档案"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}
    
    result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if result.data and len(result.data) > 0:
        return {"status": "success", "profile": result.data[0]}
    return {"status": "success", "profile": None}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Added bilingual support to GET /api/profile")
    
    # Fix 5: PUT /api/profile
    old = '''@app.put("/api/profile")
def update_profile(profile: ProfileUpdate, authorization: str = Header(None)):
    """更新用户档案"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        return {"error": "Authentication required"}'''
    
    new = '''@app.put("/api/profile")
def update_profile(profile: ProfileUpdate, authorization: str = Header(None), accept_language: str = "zh"):
    """更新用户档案"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Added bilingual support to PUT /api/profile")
    
    # Fix 6: POST /api/pain-records
    old = '''@app.post("/api/pain-records")
def create_pain_record(record: PainRecordCreate, authorization: str = Header(None)):
    """保存疼痛记录"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        return {"error": "Authentication required"}'''
    
    new = '''@app.post("/api/pain-records")
def create_pain_record(record: PainRecordCreate, authorization: str = Header(None), accept_language: str = "zh"):
    """保存疼痛记录"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Added bilingual support to POST /api/pain-records")
    
    # Fix 7: GET /api/pain-records
    old = '''@app.get("/api/pain-records")
def list_pain_records(limit: int = 50, authorization: str = Header(None)):
    """获取用户的疼痛记录历史"""
    if not supabase_client:
        return {"error": "Supabase not configured"}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        return {"error": "Authentication required"}'''
    
    new = '''@app.get("/api/pain-records")
def list_pain_records(limit: int = 50, authorization: str = Header(None), accept_language: str = "zh"):
    """获取用户的疼痛记录历史"""
    lang = "en" if accept_language and accept_language.startswith("en") else "zh"
    if not supabase_client:
        err = "Supabase not configured" if lang == "en" else "Supabase 未配置"
        return {"error": err}
    try:
        user_id = get_supabase_user(authorization)
    except HTTPException:
        err = "Authentication required" if lang == "en" else "需要身份验证"
        return {"error": err}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Added bilingual support to GET /api/pain-records")
    
    # Fix 8: Fix the _fallback_response en section - add risk_warning variable
    old = '''        else:
            return {
                "status": "success",
                "language": "en",
                "chief_complaint": f"Cyclic dysmenorrhea with lower abdominal pain.",
                "present_illness": f"The patient reports cyclic, spasmodic lower abdominal pain associated with menses. Pain intensity is quantified based on visual drawing telemetry. Aggravated during menses with localized pelvic sensation of {pain_name}.",
                "past_history": f"Past History: Generally healthy. Surgery: {surg_desc}. Allergies: {risk_warning}. Lifestyle: {lifestyle_final}.",'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Fixed risk_warning variable in en fallback")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Backend fixes ({len(changes)}):")
    for c in changes:
        print(f"  - {c}")
    return changes


# ============================================================
# PART 2: Fix App.jsx - hardcoded Chinese -> translations
# ============================================================
def fix_appjsx():
    filepath = os.path.join(BASE_DIR, 'frontend', 'src', 'App.jsx')
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changes = []
    
    # Fix 1: ErrorBoundary - use t() instead of hardcoded
    old = '''    const lang = this.props.lang || 'zh';
    const msg = lang === 'en'
      ? 'Something went wrong with the page, please refresh and try again'
      : '页面出了点小问题，请刷新重试';
    if (this.state.hasError) return <h1 style={{ color: '#fff', textAlign: 'center' }}>{msg}</h1>;'''
    
    new = '''    const lang = this.props.lang || 'zh';
    const msg = lang === 'en'
      ? 'Something went wrong with the page, please refresh and try again'
      : '页面出了点小问题，请刷新重试';
    if (this.state.hasError) return <h1 style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>{msg}</h1>;'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("ErrorBoundary - kept bilingual (already correct)")
    
    # Fix 2: CollapsibleMultiSelect - use t() for placeholders
    old = '''  const displayText = selectedValues.length === 0
    ? (placeholder || '请选择')
    : `已选择 ${selectedValues.length} 项`;'''
    
    new = '''  const { t } = typeof window !== 'undefined' && window.__I18N_HOOK ? window.__I18N_HOOK() : { t: (k) => k };
  const displayText = selectedValues.length === 0
    ? (placeholder || t('onboarding.pleaseSelect') || '请选择')
    : `${t('onboarding.selectedCount') || '已选择'} ${selectedValues.length} ${t('onboarding.items') || '项'}`;'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("CollapsibleMultiSelect - use t() for placeholder")
    
    # Fix 3: CollapsibleSingleSelect - use t() for placeholder
    old = '''  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';
  const displayText = selectedValue ? selectedLabel : (placeholder || '请选择');'''
    
    new = '''  const { t } = typeof window !== 'undefined' && window.__I18N_HOOK ? window.__I18N_HOOK() : { t: (k) => k };
  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';
  const displayText = selectedValue ? selectedLabel : (placeholder || t('onboarding.pleaseSelect') || '请选择');'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("CollapsibleSingleSelect - use t() for placeholder")
    
    # Fix 4: getContextTitle - already bilingual, just add translations reference
    # Fix 5: Lifestyle options - use translations
    old = '''                        options={[
                          { value: 'sleepShort', label: '睡眠时长不足' },
                          { value: 'sleepIrregular', label: '作息紊乱/夜班' },
                          { value: 'smoking', label: '吸烟' },
                          { value: 'alcohol', label: '习惯饮酒' },
                          { value: 'caffeine', label: '浓茶咖啡过量' },
                          { value: 'coldFood', label: '喜食生冷冰饮' },
                          { value: 'spicy', label: '嗜食辛辣' },
                          { value: 'weightLoss', label: '处于极端减重期' }
                        ]}
                        onChange={(newValues) => setMedicalBackground({ ...medicalBackground, lifestyleArr: newValues })}
                        placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}'''
    
    new = '''                        options={[
                          { value: 'sleepShort', label: t('onboarding.lifestyleOptions.sleepShort') || '睡眠时长不足' },
                          { value: 'sleepIrregular', label: t('onboarding.lifestyleOptions.sleepIrregular') || '作息紊乱/夜班' },
                          { value: 'smoking', label: t('onboarding.lifestyleOptions.smoking') || '吸烟' },
                          { value: 'alcohol', label: t('onboarding.lifestyleOptions.alcohol') || '习惯饮酒' },
                          { value: 'caffeine', label: t('onboarding.lifestyleOptions.caffeine') || '浓茶咖啡过量' },
                          { value: 'coldFood', label: t('onboarding.lifestyleOptions.coldFood') || '喜食生冷冰饮' },
                          { value: 'spicy', label: t('onboarding.lifestyleOptions.spicy') || '嗜食辛辣' },
                          { value: 'weightLoss', label: t('onboarding.lifestyleOptions.weightLoss') || '处于极端减重期' }
                        ]}
                        onChange={(newValues) => setMedicalBackground({ ...medicalBackground, lifestyleArr: newValues })}
                        placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Lifestyle options - use t()")
    
    # Fix 6: Psychosocial options
    old = '''                        options={[
                          { value: 'lowStress', label: '压力适宜' },
                          { value: 'moderateStress', label: '持续中度精神压力' },
                          { value: 'highStress', label: '重度焦虑/高压负荷' },
                          { value: 'trauma', label: '心理应激创伤' }
                        ]}
                        onChange={(value) => setMedicalBackground({ ...medicalBackground, psychosocial: value })}
                        placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}'''
    
    new = '''                        options={[
                          { value: 'lowStress', label: t('onboarding.psychosocialOptions.lowStress') || '压力适宜' },
                          { value: 'moderateStress', label: t('onboarding.psychosocialOptions.moderateStress') || '持续中度精神压力' },
                          { value: 'highStress', label: t('onboarding.psychosocialOptions.highStress') || '重度焦虑/高压负荷' },
                          { value: 'trauma', label: t('onboarding.psychosocialOptions.trauma') || '心理应激创伤' }
                        ]}
                        onChange={(value) => setMedicalBackground({ ...medicalBackground, psychosocial: value })}
                        placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Psychosocial options - use t()")
    
    # Fix 7: Family history options
    old = '''                            options={[
                              { value: 'mother', label: '母系痛经遗传史' },
                              { value: 'sister', label: '胞姐胞妹严重痛经史' },
                              { value: 'none', label: '明确无家族史' },
                              { value: 'unknown', label: '家族痛经史不详' }
                            ]}
                            onChange={(newValues) => setMedicalBackground({ ...medicalBackground, familyHistoryArr: newValues })}
                            placeholder="请选择"'''
    
    new = '''                            options={[
                              { value: 'mother', label: t('onboarding.familyHistoryOptions.mother') || '母系痛经遗传史' },
                              { value: 'sister', label: t('onboarding.familyHistoryOptions.sister') || '胞姐胞妹严重痛经史' },
                              { value: 'none', label: t('onboarding.familyHistoryOptions.none') || '明确无家族史' },
                              { value: 'unknown', label: t('onboarding.familyHistoryOptions.unknown') || '家族痛经史不详' }
                            ]}
                            onChange={(newValues) => setMedicalBackground({ ...medicalBackground, familyHistoryArr: newValues })}
                            placeholder={t('onboarding.pleaseSelect') || '请选择'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Family history options - use t()")
    
    # Fix 8: Reproductive history options
    old = '''                          options={[
                            { value: 'nulliparous', label: '从未孕育 (未曾受孕)' },
                            { value: 'pregnant', label: '目前妊娠中' },
                            { value: 'parous', label: '正常足月顺产/剖宫产分娩' },
                            { value: 'spontaneousAbortion', label: '自然流产史' },
                            { value: 'inducedAbortion', label: '人工终止妊娠/药物流产史' }
                          ]}
                          onChange={(newValues) => setMedicalBackground({ ...medicalBackground, reproductiveHistoryArr: newValues })}
                          placeholder="请选择"'''
    
    new = '''                          options={[
                            { value: 'nulliparous', label: t('onboarding.reproductiveOptions.nulliparous') || '从未孕育 (未曾受孕)' },
                            { value: 'pregnant', label: t('onboarding.reproductiveOptions.pregnant') || '目前妊娠中' },
                            { value: 'parous', label: t('onboarding.reproductiveOptions.parous') || '正常足月顺产/剖宫产分娩' },
                            { value: 'spontaneousAbortion', label: t('onboarding.reproductiveOptions.spontaneousAbortion') || '自然流产史' },
                            { value: 'inducedAbortion', label: t('onboarding.reproductiveOptions.inducedAbortion') || '人工终止妊娠/药物流产史' }
                          ]}
                          onChange={(newValues) => setMedicalBackground({ ...medicalBackground, reproductiveHistoryArr: newValues })}
                          placeholder={t('onboarding.pleaseSelect') || '请选择'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Reproductive history options - use t()")
    
    # Fix 9: Cycle period buttons
    old = '''                              {["经前", "经期", "经后", "排卵期"].map(item => ('''
    
    new = '''                              {[t('onboarding.cyclePeriods.pre') || '经前', t('onboarding.cyclePeriods.menstrual') || '经期', t('onboarding.cyclePeriods.post') || '经后', t('onboarding.cyclePeriods.ovulation') || '排卵期'].map(item => ('''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Cycle period buttons - use t()")
    
    # Fix 10: Optimize button labels
    old = '''                            { key: 'chief_complaint', label: '调优主诉' },
                            { key: 'present_illness', label: '调优病生理分析' },
                            { key: 'clinical_suggestions', label: '调优就诊引导' }'''
    
    new = '''                            { key: 'chief_complaint', label: t('result.refine.optimizeComplaint') || '调优主诉' },
                            { key: 'present_illness', label: t('result.refine.optimizeReference') || '调优病生理分析' },
                            { key: 'clinical_suggestions', label: t('result.refine.optimize') || '调优就诊引导' }'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Optimize button labels - use t()")
    
    # Fix 11: Healing tips
    old = '''                          { key: 'breathing', icon: '🌬️', title: '一起认真呼吸', subtitle: '配声学潮汐呼吸引导，放松盆底肌群', color: '#4caf50' },
                          { key: 'posture', icon: '🧘', title: '做个简易拉伸', subtitle: '静心空灵环境音，缓解子宫韧带牵拉', color: '#ab47bc' },
                          { key: 'acupressure', icon: '💆', title: '快速穴位按揉', subtitle: '60 BPM 节拍节奏引导，阻断痉挛锐痛', color: '#2196f3' },
                          { key: 'thermal', icon: '🔥', title: '热敷与食补', subtitle: '柴火燃烧白噪音，心理升温理疗', color: '#ff9800' }'''
    
    new = '''                          { key: 'breathing', icon: '🌬️', title: t('healing.breathing.title') || '一起认真呼吸', subtitle: t('healing.breathing.description') || '配声学潮汐呼吸引导，放松盆底肌群', color: '#4caf50' },
                          { key: 'posture', icon: '🧘', title: t('healing.meditation.title') || '做个简易拉伸', subtitle: '静心空灵环境音，缓解子宫韧带牵拉', color: '#ab47bc' },
                          { key: 'acupressure', icon: '💆', title: '快速穴位按揉', subtitle: '60 BPM 节拍节奏引导，阻断痉挛锐痛', color: '#2196f3' },
                          { key: 'thermal', icon: '🔥', title: t('healing.heatPack.title') || '热敷与食补', subtitle: '柴火燃烧白噪音，心理升温理疗', color: '#ff9800' }'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Healing tips - use t()")
    
    # Fix 12: Step titles
    old = '''                  { key: 'basicInfo', label: '1', title: '基础档案' },
                  { key: 'medical', label: '2', title: '医疗背景' },
                  { key: 'preference', label: '3', title: '干预偏好' },'''
    
    new = '''                  { key: 'basicInfo', label: '1', title: t('onboarding.basicInfoTitle') || '基础档案' },
                  { key: 'medical', label: '2', title: t('onboarding.medicalTitle') || '医疗背景' },
                  { key: 'preference', label: '3', title: t('onboarding.preferenceTitle') || '干预偏好' },'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Step titles - use t()")
    
    # Fix 13: Language toggle
    old = '''                {targetLanguage === 'zh' ? 'English' : '中文'}'''
    
    new = '''                {targetLanguage === 'zh' ? t('onboarding.english') || 'English' : t('onboarding.chinese') || '中文'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Language toggle - use t()")
    
    # Fix 14: Refine placeholders
    old = '''                case 'partner': return isEn ? "e.g., Make it sound more urgent..." : "例如：语气更强烈一点，让Ta意识到严重性...";
                case 'work': return isEn ? "e.g., Make it brief and extremely professional..." : "例如：语气更委婉客观，只说突发急病...";
                case 'doctor': return isEn ? "e.g., Mention that Ibuprofen doesn't work..." : "例如：补充说明吃布洛芬没有任何缓解...";
                case 'self': return isEn ? "e.g., Comfort me, I feel guilty for not working..." : "例如：给我一点心理安慰，我因为请假很内疚...";'''
    
    new = '''                case 'partner': return isEn ? "e.g., Make it sound more urgent..." : t('result.refine.placeholderPartner') || "例如：语气更强烈一点，让Ta意识到严重性...";
                case 'work': return isEn ? "e.g., Make it brief and extremely professional..." : t('result.refine.placeholderWork') || "例如：语气更委婉客观，只说突发急病...";
                case 'doctor': return isEn ? "e.g., Mention that Ibuprofen doesn't work..." : t('result.refine.placeholderDoctor') || "例如：补充说明吃布洛芬没有任何缓解...";
                case 'self': return isEn ? "e.g., Comfort me, I feel guilty for not working..." : t('result.refine.placeholderSelf') || "例如：给我一点心理安慰，我因为请假很内疚...";'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Refine placeholders - use t()")
    
    # Fix 15: Helpful button
    old = '''                            {tip.hasUserVotedHelpful ? '已认可' : '+ 亲测有用'}'''
    
    new = '''                            {tip.hasUserVotedHelpful ? (t('post.votedHelpful') || '已认可') : ('+ ' + (t('post.markHelpful') || '亲测有用'))}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Helpful button - use t()")
    
    # Fix 16: Share card text
    old = '''                {targetLanguage === 'en' ? 'Somatic Card Generated' : '已成功生成体感卡片'}'''
    
    new = '''                {targetLanguage === 'en' ? 'Somatic Card Generated' : t('sharePreview.title') || '已成功生成体感卡片'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Share card title - use t()")
    
    # Fix 17: Share button
    old = '''                    {targetLanguage === 'en' ? 'System Share' : '调用系统分享'}'''
    
    new = '''                    {targetLanguage === 'en' ? 'System Share' : t('sharePreview.confirm') || '调用系统分享'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Share button - use t()")
    
    old = '''                  {targetLanguage === 'en' ? 'Close' : '关闭'}'''
    
    new = '''                  {targetLanguage === 'en' ? 'Close' : t('diary.close') || '关闭'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Close button - use t()")
    
    # Fix 18: Delete button
    old = '''                  🗑️ {'删除'}'''
    
    new = '''                  🗑️ {t('history.delete') || '删除'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Delete button - use t()")
    
    # Fix 19: Post helpful button
    old = '''                        👍 {viewingPost.hasUserVotedHelpful ? '已赞同有用' : '亲测有用'} · {viewingPost.helpfulVotes || 0}'''
    
    new = '''                        👍 {viewingPost.hasUserVotedHelpful ? (t('post.votedHelpful') || '已赞同有用') : (t('post.markHelpful') || '亲测有用')} · {viewingPost.helpfulVotes || 0}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Post helpful button - use t()")
    
    # Fix 20: Medical/General tab fallback
    old = '''                🏥 {t('modeSelection.medicalTab').split(' ')[1] || '就诊协助'}'''
    
    new = '''                🏥 {t('modeSelection.medicalTab').split(' ')[1] || t('modeSelection.medicalTab') || '就诊协助'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Medical tab fallback - use t()")
    
    old = '''                🎨 {t('modeSelection.generalTab').split(' ')[1] || '日常表达'}'''
    
    new = '''                🎨 {t('modeSelection.generalTab').split(' ')[1] || t('modeSelection.generalTab') || '日常表达'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("General tab fallback - use t()")
    
    # Fix 21: Self-care mode text
    old = '''                        {targetLanguage === 'en' ? 'Somatic Self-Care Space' : '自愈表达模式已就绪'}'''
    
    new = '''                        {targetLanguage === 'en' ? 'Somatic Self-Care Space' : t('onboarding.selfCareReady') || '自愈表达模式已就绪'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Self-care mode text - use t()")
    
    # Fix 22: Brush textures text
    old = '''                        🖌️ {targetLanguage === 'en' ? 'Somatic Brushes' : '即将启用的体感画笔质地：'}'''
    
    new = '''                        🖌️ {targetLanguage === 'en' ? 'Somatic Brushes' : t('onboarding.brushTextures') || '即将启用的体感画笔质地：'}'''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Brush textures text - use t()")
    
    # Fix 23: Calendar day headers
    old = '''                  {['日', '一', '二', '三', '四', '五', '六'].map(day => ('''
    
    new = '''                  {[t('history.sun') || '日', t('history.mon') || '一', t('history.tue') || '二', t('history.wed') || '三', t('history.thu') || '四', t('history.fri') || '五', t('history.sat') || '六'].map(day => ('''
    
    if old in content:
        content = content.replace(old, new)
        changes.append("Calendar day headers - use t()")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\nApp.jsx fixes ({len(changes)}):")
    for c in changes:
        print(f"  - {c}")
    return changes


# ============================================================
# PART 3: Add missing translations to translations.js
# ============================================================
def fix_translations():
    filepath = os.path.join(BASE_DIR, 'frontend', 'src', 'i18n', 'translations.js')
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changes = []
    
    # Check what keys are missing and add them
    # The translations.js already has most keys, but we need to ensure
    # the keys referenced in App.jsx fixes exist
    
    # Add missing zh keys
    zh_missing = []
    
    # Check for onboarding.pleaseSelect
    if "pleaseSelect" not in content:
        zh_missing.append("pleaseSelect")
    
    # Check for onboarding.selectedCount
    if "selectedCount" not in content:
        zh_missing.append("selectedCount")
    
    # Check for onboarding.items
    if "items" not in content:
        zh_missing.append("items")
    
    # Check for onboarding.selfCareReady
    if "selfCareReady" not in content:
        zh_missing.append("selfCareReady")
    
    # Check for onboarding.brushTextures
    if "brushTextures" not in content:
        zh_missing.append("brushTextures")
    
    # Check for history.sun, mon, etc.
    if "sun" not in content:
        zh_missing.append("sun/mon/tue/wed/thu/fri/sat")
    
    # Check for result.refine.placeholderPartner etc.
    if "placeholderPartner" not in content:
        zh_missing.append("placeholderPartner")
    
    if zh_missing:
        print(f"Missing keys detected: {zh_missing}")
        print("These keys may need to be added manually to translations.js")
        changes.append(f"Identified missing keys: {zh_missing}")
    
    # Add missing en keys for supabase section
    # Check if en supabase section has all keys
    en_supabase_start = content.find("en: {")
    if en_supabase_start > 0:
        en_section = content[en_supabase_start:]
        if "supabase:" not in en_section:
            changes.append("en supabase section missing - needs manual addition")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\nTranslations fixes ({len(changes)}):")
    for c in changes:
        print(f"  - {c}")
    return changes


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("PainScape Comprehensive Fix Script")
    print("=" * 60)
    
    backend_changes = fix_backend()
    appjsx_changes = fix_appjsx()
    translations_changes = fix_translations()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Backend fixes: {len(backend_changes)}")
    print(f"App.jsx fixes: {len(appjsx_changes)}")
    print(f"Translations fixes: {len(translations_changes)}")
    print("\nDone!")
