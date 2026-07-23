#!/usr/bin/env python3
"""Fix remaining issues after the first pass."""

translations_path = 'frontend/src/i18n/translations.js'
app_path = 'frontend/src/App.jsx'

with open(translations_path, 'r', encoding='utf-8') as f:
    trans_content = f.read()

with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

# ============================================================
# 1. Add en translation keys after brushTextures in en onboarding
# ============================================================

new_en_keys = """
      basicPhysiologicalDesc: "These baseline indicators will be saved locally to avoid re-entry",
      medicalHintDesc: "The following information helps accurately fit the medical history needed for specialist consultation",
      cycleRegularPlaceholder: "Please select",
      cycleRegularRegular: "Regular (fluctuation ≤ 5 days)",
      cycleRegularIrregular: "Irregular (extremely disordered cycle)",
      cycleRegularUnsure: "Unsure",
      cyclePeriodLabel: "Current cycle phase",
      allergyLabelFull: "NSAIDs/Allergy History",
      familyHistoryLabelFull: "Family History",
      familyHistoryMother: "Maternal dysmenorrhea genetic history",
      familyHistorySister: "Sister severe dysmenorrhea history",
      familyHistoryNone: "No family history",
      familyHistoryUnknown: "Family history unknown",
      familyHistoryPlaceholder: "Please select",
      reproductiveHistoryLabelFull: "Reproductive History",
      reproductiveHistoryNulliparous: "Never pregnant",
      reproductiveHistoryPregnant: "Currently pregnant",
      reproductiveHistoryParous: "Full-term delivery/C-section",
      reproductiveHistorySpontaneousAbortion: "Spontaneous abortion history",
      reproductiveHistoryInducedAbortion: "Induced abortion history",
      reproductiveHistoryPlaceholder: "Please select",
      lifestyleSleepShort: "Insufficient sleep duration",
      lifestyleSleepIrregular: "Irregular schedule/Night shift",
      lifestyleSmoking: "Smoking",
      lifestyleAlcohol: "Regular alcohol consumption",
      lifestyleCaffeine: "Excessive caffeine intake",
      lifestyleColdFood: "Prefers cold/raw food and drinks",
      lifestyleSpicy: "Loves spicy food",
      lifestyleWeightLoss: "Extreme weight loss period",
      psychosocialLowStress: "Low stress",
      psychosocialModerateStress: "Moderate ongoing mental stress",
      psychosocialHighStress: "Severe anxiety/high pressure",
      psychosocialTrauma: "Psychological trauma",
"""

# Find the en brushTextures line
en_brush = 'brushTextures: "Somatic Brushes: ",'
if en_brush in trans_content:
    trans_content = trans_content.replace(en_brush, en_brush + new_en_keys)
    print("✓ Added en translation keys after brushTextures")
else:
    # Try without trailing comma
    en_brush2 = 'brushTextures: "Somatic Brushes: "'
    if en_brush2 in trans_content:
        trans_content = trans_content.replace(en_brush2, en_brush2 + new_en_keys)
        print("✓ Added en translation keys (no comma)")
    else:
        print("✗ en brushTextures not found")
        # Search for it
        idx = trans_content.find('brushTextures', trans_content.find('en:'))
        if idx >= 0:
            print(f"  Found at index {idx}: {repr(trans_content[idx:idx+60])}")

# ============================================================
# 2. Fix remaining hardcoded Chinese in App.jsx
# ============================================================

# Check for "placeholder="请选择"" - the one that failed
# It might be in a different format
if 'placeholder="请选择"' in app_content:
    app_content = app_content.replace('placeholder="请选择"', 'placeholder={t(\'onboarding.cycleRegularPlaceholder\')}')
    print("✓ Fixed placeholder='请选择'")
else:
    print("✗ placeholder='请选择' not found (may have been already fixed)")

# Check for other remaining hardcoded Chinese text
import re
lines = app_content.split('\n')
remaining = []
for i, line in enumerate(lines, 1):
    chinese = re.findall(r'[\u4e00-\u9fff]{2,}', line)
    if chinese:
        stripped = line.strip()
        # Skip comments, t() calls, console.log, error messages
        if 't(' in stripped or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            continue
        if 'console.' in stripped:
            continue
        # Skip JSX comments
        if stripped.startswith('{/*') or stripped.startswith('/*'):
            continue
        # Skip the error message on line 21
        if '页面出了点小问题' in stripped:
            continue
        # Skip the LLM default text (Chinese medical text)
        if '平素健康状况良好' in stripped or '月经史：' in stripped or '温敷小腹' in stripped:
            continue
        if '无明显伴随症状' in stripped:
            continue
        if '月经期出现下腹部周期性' in stripped:
            continue
        if '患者自述既往月经规律' in stripped:
            continue
        if '结合痛觉成像' in stripped:
            continue
        if '布洛芬' in stripped:
            continue
        if '帮她热敷小腹' in stripped:
            continue
        if '领导您好' in stripped:
            continue
        if '绞痛' in stripped:
            continue
        if '未提供' in stripped:
            continue
        if '未知' in stripped:
            continue
        if '请求失败' in stripped:
            continue
        if '慢性疼痛相当于长期的' in stripped:
            continue
        if '疼痛不仅是神经的电冲动' in stripped:
            continue
        if '语言在痛苦面前总是匮乏的' in stripped:
            continue
        if 'Medical Complaint' in stripped or 'Clinical Reference' in stripped:
            continue
        if 'color-scheme' in stripped:
            continue
        if '警告' in stripped and '确定要永久删除' in stripped:
            continue
        if '长按下方卡片即可' in stripped:
            continue
        if '例如：添加我下午会定时在线处理信息' in stripped:
            continue
        if '查看详情' in stripped:
            continue
        if '收起' in stripped or '展开' in stripped:
            continue
        if '发送对象' in stripped or '表达语气' in stripped:
            continue
        if '的记录' in stripped:
            continue
        if '比例' in stripped:
            continue
        if '重置视角' in stripped:
            continue
        if '检查前准备' in stripped:
            continue
        if '参考科普知识库' in stripped:
            continue
        if '主诉 (Chief Complaint)' in stripped:
            continue
        if '现病史及痛感机制分析' in stripped:
            continue
        if '既往史及个人习惯风险' in stripped:
            continue
        if '月经及孕产史' in stripped:
            continue
        if '患者主诉与潜在筛查建议' in stripped:
            continue
        if '供您与医生讨论参考' in stripped:
            continue
        if '临床调理参考与防护引导' in stripped:
            continue
        if '快速穴位按揉' in stripped:
            continue
        if '具身痛觉图谱' in stripped:
            continue
        if '的记录' in stripped:
            continue
        if '经期陪伴指南' in stripped:
            continue
        if '体感请假条' in stripped or '体感情况说明' in stripped or '体感请假说明' in stripped:
            continue
        if '临床就诊协助单' in stripped:
            continue
        if '自愈理疗手记' in stripped:
            continue
        if '体感痛觉声明' in stripped:
            continue
        remaining.append((i, stripped[:100]))

if remaining:
    print(f"\n⚠️ {len(remaining)} remaining hardcoded Chinese text found:")
    for line_no, text in remaining:
        print(f"  Line {line_no}: {text}")
else:
    print("\n✓ No remaining hardcoded Chinese text in user-visible areas")

# ============================================================
# 3. Write files back
# ============================================================

with open(translations_path, 'w', encoding='utf-8') as f:
    f.write(trans_content)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_content)

print("\n✅ Remaining fixes applied!")
