# -*- coding: utf-8 -*-
"""Fix App.jsx - replace hardcoded Chinese with t() calls"""
import os

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'App.jsx')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Fix 1: CollapsibleMultiSelect - use t() for placeholder
old = "  const displayText = selectedValues.length === 0\n    ? (placeholder || '请选择')\n    : `已选择 ${selectedValues.length} 项`;"
new = "  const displayText = selectedValues.length === 0\n    ? (placeholder || t('onboarding.pleaseSelect') || '请选择')\n    : `${t('onboarding.selectedCount') || '已选择'} ${selectedValues.length} ${t('onboarding.items') || '项'}`;"
if old in content:
    content = content.replace(old, new)
    changes.append("CollapsibleMultiSelect placeholder")

# Fix 2: CollapsibleSingleSelect - use t() for placeholder
old = "  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';\n  const displayText = selectedValue ? selectedLabel : (placeholder || '请选择');"
new = "  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';\n  const displayText = selectedValue ? selectedLabel : (placeholder || t('onboarding.pleaseSelect') || '请选择');"
if old in content:
    content = content.replace(old, new)
    changes.append("CollapsibleSingleSelect placeholder")

# Fix 3: Lifestyle options labels
old = "                          { value: 'sleepShort', label: '睡眠时长不足' },\n                          { value: 'sleepIrregular', label: '作息紊乱/夜班' },\n                          { value: 'smoking', label: '吸烟' },\n                          { value: 'alcohol', label: '习惯饮酒' },\n                          { value: 'caffeine', label: '浓茶咖啡过量' },\n                          { value: 'coldFood', label: '喜食生冷冰饮' },\n                          { value: 'spicy', label: '嗜食辛辣' },\n                          { value: 'weightLoss', label: '处于极端减重期' }"
new = "                          { value: 'sleepShort', label: t('onboarding.lifestyleOptions.sleepShort') || '睡眠时长不足' },\n                          { value: 'sleepIrregular', label: t('onboarding.lifestyleOptions.sleepIrregular') || '作息紊乱/夜班' },\n                          { value: 'smoking', label: t('onboarding.lifestyleOptions.smoking') || '吸烟' },\n                          { value: 'alcohol', label: t('onboarding.lifestyleOptions.alcohol') || '习惯饮酒' },\n                          { value: 'caffeine', label: t('onboarding.lifestyleOptions.caffeine') || '浓茶咖啡过量' },\n                          { value: 'coldFood', label: t('onboarding.lifestyleOptions.coldFood') || '喜食生冷冰饮' },\n                          { value: 'spicy', label: t('onboarding.lifestyleOptions.spicy') || '嗜食辛辣' },\n                          { value: 'weightLoss', label: t('onboarding.lifestyleOptions.weightLoss') || '处于极端减重期' }"
if old in content:
    content = content.replace(old, new)
    changes.append("Lifestyle options labels")

# Fix 4: Psychosocial options labels
old = "                          { value: 'lowStress', label: '压力适宜' },\n                          { value: 'moderateStress', label: '持续中度精神压力' },\n                          { value: 'highStress', label: '重度焦虑/高压负荷' },\n                          { value: 'trauma', label: '心理应激创伤' }"
new = "                          { value: 'lowStress', label: t('onboarding.psychosocialOptions.lowStress') || '压力适宜' },\n                          { value: 'moderateStress', label: t('onboarding.psychosocialOptions.moderateStress') || '持续中度精神压力' },\n                          { value: 'highStress', label: t('onboarding.psychosocialOptions.highStress') || '重度焦虑/高压负荷' },\n                          { value: 'trauma', label: t('onboarding.psychosocialOptions.trauma') || '心理应激创伤' }"
if old in content:
    content = content.replace(old, new)
    changes.append("Psychosocial options labels")

# Fix 5: Family history options labels
old = "                              { value: 'mother', label: '母系痛经遗传史' },\n                              { value: 'sister', label: '胞姐胞妹严重痛经史' },\n                              { value: 'none', label: '明确无家族史' },\n                              { value: 'unknown', label: '家族痛经史不详' }"
new = "                              { value: 'mother', label: t('onboarding.familyHistoryOptions.mother') || '母系痛经遗传史' },\n                              { value: 'sister', label: t('onboarding.familyHistoryOptions.sister') || '胞姐胞妹严重痛经史' },\n                              { value: 'none', label: t('onboarding.familyHistoryOptions.none') || '明确无家族史' },\n                              { value: 'unknown', label: t('onboarding.familyHistoryOptions.unknown') || '家族痛经史不详' }"
if old in content:
    content = content.replace(old, new)
    changes.append("Family history options labels")

# Fix 6: Reproductive history options labels
old = "                            { value: 'nulliparous', label: '从未孕育 (未曾受孕)' },\n                            { value: 'pregnant', label: '目前妊娠中' },\n                            { value: 'parous', label: '正常足月顺产/剖宫产分娩' },\n                            { value: 'spontaneousAbortion', label: '自然流产史' },\n                            { value: 'inducedAbortion', label: '人工终止妊娠/药物流产史' }"
new = "                            { value: 'nulliparous', label: t('onboarding.reproductiveOptions.nulliparous') || '从未孕育 (未曾受孕)' },\n                            { value: 'pregnant', label: t('onboarding.reproductiveOptions.pregnant') || '目前妊娠中' },\n                            { value: 'parous', label: t('onboarding.reproductiveOptions.parous') || '正常足月顺产/剖宫产分娩' },\n                            { value: 'spontaneousAbortion', label: t('onboarding.reproductiveOptions.spontaneousAbortion') || '自然流产史' },\n                            { value: 'inducedAbortion', label: t('onboarding.reproductiveOptions.inducedAbortion') || '人工终止妊娠/药物流产史' }"
if old in content:
    content = content.replace(old, new)
    changes.append("Reproductive history options labels")

# Fix 7: Cycle period buttons
old = '                              {["经前", "经期", "经后", "排卵期"].map(item => ('
new = '                              {[t(\'onboarding.cyclePeriods.pre\') || \'经前\', t(\'onboarding.cyclePeriods.menstrual\') || \'经期\', t(\'onboarding.cyclePeriods.post\') || \'经后\', t(\'onboarding.cyclePeriods.ovulation\') || \'排卵期\'].map(item => ('
if old in content:
    content = content.replace(old, new)
    changes.append("Cycle period buttons")

# Fix 8: Optimize button labels
old = "                            { key: 'chief_complaint', label: '调优主诉' },\n                            { key: 'present_illness', label: '调优病生理分析' },\n                            { key: 'clinical_suggestions', label: '调优就诊引导' }"
new = "                            { key: 'chief_complaint', label: t('result.refine.optimizeComplaint') || '调优主诉' },\n                            { key: 'present_illness', label: t('result.refine.optimizeReference') || '调优病生理分析' },\n                            { key: 'clinical_suggestions', label: t('result.refine.optimize') || '调优就诊引导' }"
if old in content:
    content = content.replace(old, new)
    changes.append("Optimize button labels")

# Fix 9: Healing tips
old = "                          { key: 'breathing', icon: '\U0001f32c\ufe0f', title: '一起认真呼吸', subtitle: '配声学潮汐呼吸引导，放松盆底肌群', color: '#4caf50' },\n                          { key: 'posture', icon: '\U0001f9d8', title: '做个简易拉伸', subtitle: '静心空灵环境音，缓解子宫韧带牵拉', color: '#ab47bc' },\n                          { key: 'acupressure', icon: '\U0001f486', title: '快速穴位按揉', subtitle: '60 BPM 节拍节奏引导，阻断痉挛锐痛', color: '#2196f3' },\n                          { key: 'thermal', icon: '\U0001f525', title: '热敷与食补', subtitle: '柴火燃烧白噪音，心理升温理疗', color: '#ff9800' }"
new = "                          { key: 'breathing', icon: '\U0001f32c\ufe0f', title: t('healing.breathing.title') || '一起认真呼吸', subtitle: t('healing.breathing.description') || '配声学潮汐呼吸引导，放松盆底肌群', color: '#4caf50' },\n                          { key: 'posture', icon: '\U0001f9d8', title: t('healing.meditation.title') || '做个简易拉伸', subtitle: '静心空灵环境音，缓解子宫韧带牵拉', color: '#ab47bc' },\n                          { key: 'acupressure', icon: '\U0001f486', title: '快速穴位按揉', subtitle: '60 BPM 节拍节奏引导，阻断痉挛锐痛', color: '#2196f3' },\n                          { key: 'thermal', icon: '\U0001f525', title: t('healing.heatPack.title') || '热敷与食补', subtitle: '柴火燃烧白噪音，心理升温理疗', color: '#ff9800' }"
if old in content:
    content = content.replace(old, new)
    changes.append("Healing tips")

# Fix 10: Step titles
old = "                  { key: 'basicInfo', label: '1', title: '基础档案' },\n                  { key: 'medical', label: '2', title: '医疗背景' },\n                  { key: 'preference', label: '3', title: '干预偏好' },"
new = "                  { key: 'basicInfo', label: '1', title: t('onboarding.basicInfoTitle') || '基础档案' },\n                  { key: 'medical', label: '2', title: t('onboarding.medicalTitle') || '医疗背景' },\n                  { key: 'preference', label: '3', title: t('onboarding.preferenceTitle') || '干预偏好' },"
if old in content:
    content = content.replace(old, new)
    changes.append("Step titles")

# Fix 11: Language toggle
old = "                {targetLanguage === 'zh' ? 'English' : '中文'}"
new = "                {targetLanguage === 'zh' ? t('onboarding.english') || 'English' : t('onboarding.chinese') || '中文'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Language toggle")

# Fix 12: Refine placeholders
old = "                case 'partner': return isEn ? \"e.g., Make it sound more urgent...\" : \"例如：语气更强烈一点，让Ta意识到严重性...\";\n                case 'work': return isEn ? \"e.g., Make it brief and extremely professional...\" : \"例如：语气更委婉客观，只说突发急病...\";\n                case 'doctor': return isEn ? \"e.g., Mention that Ibuprofen doesn't work...\" : \"例如：补充说明吃布洛芬没有任何缓解...\";\n                case 'self': return isEn ? \"e.g., Comfort me, I feel guilty for not working...\" : \"例如：给我一点心理安慰，我因为请假很内疚...\";"
new = "                case 'partner': return isEn ? \"e.g., Make it sound more urgent...\" : t('result.refine.placeholderPartner') || \"例如：语气更强烈一点，让Ta意识到严重性...\";\n                case 'work': return isEn ? \"e.g., Make it brief and extremely professional...\" : t('result.refine.placeholderWork') || \"例如：语气更委婉客观，只说突发急病...\";\n                case 'doctor': return isEn ? \"e.g., Mention that Ibuprofen doesn't work...\" : t('result.refine.placeholderDoctor') || \"例如：补充说明吃布洛芬没有任何缓解...\";\n                case 'self': return isEn ? \"e.g., Comfort me, I feel guilty for not working...\" : t('result.refine.placeholderSelf') || \"例如：给我一点心理安慰，我因为请假很内疚...\";"
if old in content:
    content = content.replace(old, new)
    changes.append("Refine placeholders")

# Fix 13: Helpful button
old = "                            {tip.hasUserVotedHelpful ? '已认可' : '+ 亲测有用'}"
new = "                            {tip.hasUserVotedHelpful ? (t('post.votedHelpful') || '已认可') : ('+ ' + (t('post.markHelpful') || '亲测有用'))}"
if old in content:
    content = content.replace(old, new)
    changes.append("Helpful button")

# Fix 14: Share card title
old = "                {targetLanguage === 'en' ? 'Somatic Card Generated' : '已成功生成体感卡片'}"
new = "                {targetLanguage === 'en' ? 'Somatic Card Generated' : t('sharePreview.title') || '已成功生成体感卡片'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Share card title")

# Fix 15: Share button
old = "                    {targetLanguage === 'en' ? 'System Share' : '调用系统分享'}"
new = "                    {targetLanguage === 'en' ? 'System Share' : t('sharePreview.confirm') || '调用系统分享'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Share button")

# Fix 16: Close button
old = "                  {targetLanguage === 'en' ? 'Close' : '关闭'}"
new = "                  {targetLanguage === 'en' ? 'Close' : t('diary.close') || '关闭'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Close button")

# Fix 17: Delete button
old = "                  \U0001f5d1\ufe0f {'删除'}"
new = "                  \U0001f5d1\ufe0f {t('history.delete') || '删除'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Delete button")

# Fix 18: Post helpful button
old = "                        \U0001f44d {viewingPost.hasUserVotedHelpful ? '已赞同有用' : '亲测有用'} \u00b7 {viewingPost.helpfulVotes || 0}"
new = "                        \U0001f44d {viewingPost.hasUserVotedHelpful ? (t('post.votedHelpful') || '已赞同有用') : (t('post.markHelpful') || '亲测有用')} \u00b7 {viewingPost.helpfulVotes || 0}"
if old in content:
    content = content.replace(old, new)
    changes.append("Post helpful button")

# Fix 19: Self-care mode text
old = "                        {targetLanguage === 'en' ? 'Somatic Self-Care Space' : '自愈表达模式已就绪'}"
new = "                        {targetLanguage === 'en' ? 'Somatic Self-Care Space' : t('onboarding.selfCareReady') || '自愈表达模式已就绪'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Self-care mode text")

# Fix 20: Brush textures text
old = "                        \U0001f58c\ufe0f {targetLanguage === 'en' ? 'Somatic Brushes' : '即将启用的体感画笔质地：'}"
new = "                        \U0001f58c\ufe0f {targetLanguage === 'en' ? 'Somatic Brushes' : t('onboarding.brushTextures') || '即将启用的体感画笔质地：'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Brush textures text")

# Fix 21: Calendar day headers
old = "                  {['日', '一', '二', '三', '四', '五', '六'].map(day => ("
new = "                  {[t('history.sun') || '日', t('history.mon') || '一', t('history.tue') || '二', t('history.wed') || '三', t('history.thu') || '四', t('history.fri') || '五', t('history.sat') || '六'].map(day => ("
if old in content:
    content = content.replace(old, new)
    changes.append("Calendar day headers")

# Fix 22: "年" / "月" in calendar
old = "                    {calendarDate.getFullYear()}年 {calendarDate.getMonth() + 1}月"
new = "                    {calendarDate.getFullYear()}{t('history.year') || '年'} {calendarDate.getMonth() + 1}{t('history.month') || '月'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Calendar year/month")

# Fix 23: "的记录" in selected date
old = "                    \U0001f4c5 {selectedDate} 的记录"
new = "                    \U0001f4c5 {selectedDate} {t('history.recordsOfDate') || '的记录'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Selected date records label")

# Fix 24: "收起" / "展开"
old = "                      {showGroupedView ? '\u25b2 收起' : '\u25bc 展开'}"
new = "                      {showGroupedView ? ('\u25b2 ' + (t('history.collapse') || '收起')) : ('\u25bc ' + (t('history.expand') || '展开'))}"
if old in content:
    content = content.replace(old, new)
    changes.append("Expand/collapse buttons")

# Fix 25: "条" in grouped history
old = "                          {records.length}条 {collapsedMonths[month] ? '\u25b6' : '\u25bc'}"
new = "                          {records.length}{t('history.recordsCount') || '条'} {collapsedMonths[month] ? '\u25b6' : '\u25bc'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Records count label")

# Fix 26: "查看详情"
old = "                            查看详情"
new = "                            {t('community.viewDetails') || '查看详情'}"
if old in content:
    content = content.replace(old, new)
    changes.append("View details button")

# Fix 27: "发送对象：" / "表达语气："
old = "                    <span style={{ color: '#888', fontSize: '11.5px', alignSelf: 'flex-start' }}>\U0001f4e2 发送对象：</span>"
new = "                    <span style={{ color: '#888', fontSize: '11.5px', alignSelf: 'flex-start' }}>\U0001f4e2 {t('diary.sendTarget') || '发送对象：'}</span>"
if old in content:
    content = content.replace(old, new)
    changes.append("Send target label")

old = "                    <span style={{ color: '#888', fontSize: '11.5px', alignSelf: 'flex-start', marginTop: '6px' }}>\U0001f3ad 表达语气：</span>"
new = "                    <span style={{ color: '#888', fontSize: '11.5px', alignSelf: 'flex-start', marginTop: '6px' }}>\U0001f3ad {t('diary.toneLabel') || '表达语气：'}</span>"
if old in content:
    content = content.replace(old, new)
    changes.append("Tone label")

# Fix 28: "基础生理档案" / "这些常态基础指标将被本地保存"
old = "                    <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>基础生理档案</h3>\n                    <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>这些常态基础指标将被本地保存，避免重复录入</p>"
new = "                    <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>{t('onboarding.basicInfoTitle') || '基础生理档案'}</h3>\n                    <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{t('onboarding.basicInfoHint') || '这些常态基础指标将被本地保存，避免重复录入'}</p>"
if old in content:
    content = content.replace(old, new)
    changes.append("Basic info section title")

# Fix 29: "您的年龄段"
old = "                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>您的年龄段</label>"
new = "                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.ageLabel') || '您的年龄段'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Age label")

# Fix 30: "日常活动负荷"
old = "                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>日常活动负荷</label>"
new = "                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.activityLabel') || '日常活动负荷'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Activity label")

# Fix 31: "临床医学信息调查" / "以下采集项有助于精准拟合"
old = "                        <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>临床医学信息调查</h3>\n                        <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>以下采集项有助于精准拟合专科门诊所需的现病史及既往主诉</p>"
new = "                        <h3 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontWeight: '500' }}>{t('onboarding.medicalTitle') || '临床医学信息调查'}</h3>\n                        <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{t('onboarding.medicalHint') || '以下采集项有助于精准拟合专科门诊所需的现病史及既往主诉'}</p>"
if old in content:
    content = content.replace(old, new)
    changes.append("Medical info section title")

# Fix 32: "初潮年龄"
old = "                              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>初潮年龄</label>"
new = "                              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.menarcheLabel') || '初潮年龄'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Menarche age label")

# Fix 33: "周期规律性"
old = "                              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>周期规律性</label>"
new = "                              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.cycleRegularLabel') || '周期规律性'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Cycle regular label")

# Fix 34: "经期持续天数"
old = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>经期持续天数</label>"
new = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.periodDurationLabel') || '经期持续天数'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Period duration label")

# Fix 35: "末次月经第一天 (LMP)"
old = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>\n                              末次月经第一天 (LMP)\n                            </label>"
new = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>\n                              {t('onboarding.lastPeriodLabel') || '末次月经第一天 (LMP)'}\n                            </label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Last period label")

# Fix 36: "当前处于什么时期"
old = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}>\n                              当前处于什么时期\n                            </label>"
new = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}>\n                              {t('onboarding.currentPeriodLabel') || '当前处于什么时期'}\n                            </label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Current period label")

# Fix 37: "妇科临床既往史诊断"
old = "                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>妇科临床既往史诊断</label>"
new = "                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.diagnosisLabel') || '妇科临床既往史诊断'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Diagnosis label")

# Fix 38: "特异性抗炎药/NSAIDs过敏史"
old = "                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>特异性抗炎药/NSAIDs过敏史</label>"
new = "                          <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.allergyLabel') || '特异性抗炎药/NSAIDs过敏史'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Allergy label")

# Fix 39: "外科手术史"
old = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>外科手术史</label>"
new = "                            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>{t('onboarding.surgicalLabel') || '外科手术史'}</label>"
if old in content:
    content = content.replace(old, new)
    changes.append("Surgical label")

# Fix 40: "一级亲属病史"
old = "                            label=\"一级亲属病史\""
new = "                            label={t('onboarding.familyHistoryLabel') || '一级亲属病史'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Family history label")

# Fix 41: "孕产/生育史"
old = "                          label=\"孕产/生育史\""
new = "                          label={t('onboarding.reproductiveHistoryLabel') || '孕产/生育史'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Reproductive history label")

# Fix 42: "临床病史已隐藏" / "您已选择日常表达"
old = "                      <h4 style={{ color: '#fff', marginTop: '10px' }}>临床病史已隐藏</h4>\n                      <p style={{ color: '#666', fontSize: '13px', lineHeight: '1.5' }}>您已选择日常表达/社群分享模式。无需搜集月经史等复杂背景，可直接在最后一步设置您的陪伴与自愈偏好。</p>"
new = "                      <h4 style={{ color: '#fff', marginTop: '10px' }}>{t('onboarding.clinicalHidden') || '临床病史已隐藏'}</h4>\n                      <p style={{ color: '#666', fontSize: '13px', lineHeight: '1.5' }}>{t('onboarding.clinicalHiddenHint') || '您已选择日常表达/社群分享模式。无需搜集月经史等复杂背景，可直接在最后一步设置您的陪伴与自愈偏好。'}</p>"
if old in content:
    content = content.replace(old, new)
    changes.append("Clinical hidden message")

# Fix 43: "例：" placeholder
old = "                                placeholder=\"例：13\""
new = "                                placeholder={t('onboarding.example') || '例：13'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Example placeholder")

# Fix 44: "请选择" in cycle regular select
old = '                                <option value="">请选择</option>'
new = "                                <option value=\"\">{t('onboarding.pleaseSelect') || '请选择'}</option>"
if old in content:
    content = content.replace(old, new)
    changes.append("Please select option")

# Fix 45: "高度规律" / "不规律" / "不确定"
old = '                                <option value="regular">高度规律 (波动 ≤ 5天)</option>\n                                <option value="irregular">不规律 (周期极度紊乱)</option>\n                                <option value="unsure">不确定</option>'
new = "                                <option value=\"regular\">{t('onboarding.cycleRegularOptions.regular') || '高度规律 (波动 ≤ 5天)'}</option>\n                                <option value=\"irregular\">{t('onboarding.cycleRegularOptions.irregular') || '不规律 (周期极度紊乱)'}</option>\n                                <option value=\"unsure\">{t('onboarding.cycleRegularOptions.unsure') || '不确定'}</option>"
if old in content:
    content = content.replace(old, new)
    changes.append("Cycle regular options")

# Fix 46: "重置视角" title
old = '                                title="重置视角"'
new = "                                title={t('canvas.resetView') || '重置视角'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Reset view title")

# Fix 47: "比例" label
old = "                                <span style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap' }}>\U0001f5fa\ufe0f 比例</span>"
new = "                                <span style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap' }}>\U0001f5fa\ufe0f {t('canvas.scale') || '比例'}</span>"
if old in content:
    content = content.replace(old, new)
    changes.append("Scale label")

# Fix 48: "经期陪伴指南" in result
old = "                          \U0001f534 经期陪伴指南"
new = "                          \U0001f534 {t('result.partner.title') || '经期陪伴指南'}"
if old in content:
    content = content.replace(old, new)
    changes.append("Partner guide title")

# Fix 49: "发送对象与场景："
old = "                        <span style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>\n                          \U0001f4e2 发送对象与场景：\n                        </span>"
new = "                        <span style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>\n                          \U0001f4e2 {t('diary.sendTarget') || '发送对象与场景：'}\n                        </span>"
if old in content:
    content = content.replace(old, new)
    changes.append("Send target section")

# Fix 50: "表达语气倾向："
old = "                        <span style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>\n                          \U0001f3ad 表达语气倾向：\n                        </span>"
new = "                        <span style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>\n                          \U0001f3ad {t('diary.toneLabel') || '表达语气倾向：'}\n                        </span>"
if old in content:
    content = content.replace(old, new)
    changes.append("Tone section")

# Fix 51: "例如：添加我下午会定时在线处理信息"
old = "                            placeholder={targetLanguage === 'en' ? \"e.g., add that I will check Slack in the afternoon...\" : \"例如：添加我下午会定时在线处理信息...\"}"
new = "                            placeholder={targetLanguage === 'en' ? \"e.g., add that I will check Slack in the afternoon...\" : (t('result.refine.placeholderWork') || \"例如：添加我下午会定时在线处理信息...\")}"
if old in content:
    content = content.replace(old, new)
    changes.append("Work refine placeholder")

# Fix 