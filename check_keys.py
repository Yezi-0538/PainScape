import re

with open('frontend/src/i18n/translations.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find zh and en sections
zh_start = content.find('zh: {')
en_start = content.find('en: {')

zh_section = content[zh_start:en_start]
en_section = content[en_start:]

# Extract onboarding sections
zh_onboarding_start = zh_section.find('onboarding: {')
depth = 0
zh_onboarding_end = zh_onboarding_start
for i in range(zh_onboarding_start, len(zh_section)):
    if zh_section[i] == '{':
        depth += 1
    elif zh_section[i] == '}':
        depth -= 1
        if depth == 0:
            zh_onboarding_end = i + 1
            break
zh_onboarding = zh_section[zh_onboarding_start:zh_onboarding_end]

en_onboarding_start = en_section.find('onboarding: {')
depth = 0
en_onboarding_end = en_onboarding_start
for i in range(en_onboarding_start, len(en_section)):
    if en_section[i] == '{':
        depth += 1
    elif en_section[i] == '}':
        depth -= 1
        if depth == 0:
            en_onboarding_end = i + 1
            break
en_onboarding = en_section[en_onboarding_start:en_onboarding_end]

# Extract all top-level keys
zh_keys = set(re.findall(r'^\s+(\w[\w]*):', zh_onboarding, re.MULTILINE))
en_keys = set(re.findall(r'^\s+(\w[\w]*):', en_onboarding, re.MULTILINE))

missing_in_en = zh_keys - en_keys
extra_in_en = en_keys - zh_keys

print('zh keys count:', len(zh_keys))
print('en keys count:', len(en_keys))
print()
print('=== Keys in zh but missing in en ===')
for k in sorted(missing_in_en):
    print('  ' + k)
print()
print('=== Keys in en but not in zh ===')
for k in sorted(extra_in_en):
    print('  ' + k)
