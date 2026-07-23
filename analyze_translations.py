import re

with open('frontend/src/i18n/translations.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find zh onboarding section
zh_start = content.find('zh: {')
zh_onboarding = content.find('onboarding: {', zh_start)

# Find en onboarding section
en_start = content.find('en: {')
en_onboarding = content.find('onboarding: {', en_start)

def extract_keys(text, start_pos):
    """Extract all top-level keys from an onboarding section"""
    depth = 0
    i = start_pos
    in_str = False
    while i < len(text):
        ch = text[i]
        if ch == '"' and (i == 0 or text[i-1] != '\\'):
            in_str = not in_str
        if not in_str:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    i += 1
                    break
        i += 1
    section = text[start_pos:i]
    
    # Extract all keys (simple key: value pairs, not nested objects)
    keys = set()
    for m in re.finditer(r'^\s+(\w+):\s+"', section, re.MULTILINE):
        keys.add(m.group(1))
    for m in re.finditer(r'^\s+"([^"]+)":\s+"', section, re.MULTILINE):
        keys.add(m.group(1))
    return keys, section

zh_keys, zh_section = extract_keys(content, zh_onboarding)
en_keys, en_section = extract_keys(content, en_onboarding)

print("=== ZH onboarding keys ===")
for k in sorted(zh_keys):
    print(f"  {k}")

print("\n=== EN onboarding keys ===")
for k in sorted(en_keys):
    print(f"  {k}")

print("\n=== Keys in ZH but NOT in EN ===")
for k in sorted(zh_keys - en_keys):
    print(f"  {k}")

print("\n=== Keys in EN but NOT in ZH ===")
for k in sorted(en_keys - zh_keys):
    print(f"  {k}")

# Now check for the specific required keys
required_keys = [
    "basicPhysiologicalTitle",
    "ageGroupLabel",
    "activityLevelLabel",
    "lifestyleHabitsLabel",
    "clinicalMedicalTitle",
    "gynecologicalDiagnosisTitle",
    "menarcheAgeLabel",
    "cycleRegularityLabel",
    "periodDurationLabel",
    "lmpLabel",
    "reproductiveHistoryLabel",
    "familyHistoryLabel",
    "surgicalHistoryLabel",
]

print("\n=== Checking required keys ===")
for k in required_keys:
    zh_has = k in zh_keys
    en_has = k in en_keys
    status = "✓" if zh_has and en_has else "✗ MISSING"
    print(f"  {k}: zh={zh_has}, en={en_has} {status}")
