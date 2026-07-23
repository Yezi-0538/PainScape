import re, sys

content = open('frontend/src/i18n/translations.js', 'r', encoding='utf-8').read()

zh_start = content.find('zh: {')
en_start = content.find('en: {')
zh = content[zh_start:en_start]
en = content[en_start:]

# Find onboarding in zh
onb_start = zh.find('onboarding: {')
depth = 0
onb_end = onb_start
for i in range(onb_start, len(zh)):
    if zh[i] == '{': depth += 1
    elif zh[i] == '}': 
        depth -= 1
        if depth == 0:
            onb_end = i + 1
            break
zh_onb = zh[onb_start:onb_end]

# Find onboarding in en
onb_start_en = en.find('onboarding: {')
depth = 0
onb_end_en = onb_start_en
for i in range(onb_start_en, len(en)):
    if en[i] == '{': depth += 1
    elif en[i] == '}': 
        depth -= 1
        if depth == 0:
            onb_end_en = i + 1
            break
en_onb = en[onb_start_en:onb_end_en]

# Check specific fields
fields = ['basicPhysiologicalTitle', 'ageGroupLabel', 'activityLevelLabel', 'lifestyleHabitsLabel', 'clinicalMedicalTitle', 'gynecologicalDiagnosisTitle', 'menarcheAgeLabel', 'cycleRegularityLabel', 'periodDurationLabel', 'lmpLabel', 'reproductiveHistoryLabel', 'familyHistoryLabel', 'surgicalHistoryLabel']
for f in fields:
    in_zh = f in zh_onb
    in_en = f in en_onb
    sys.stdout.write(f'{f}: zh={in_zh}, en={in_en}\n')

sys.stdout.flush()
