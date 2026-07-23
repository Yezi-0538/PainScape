import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all t('...') calls
t_calls = re.findall(r"t\('([^']*?)'\)", content)
for tc in sorted(set(t_calls)):
    print(tc)

print(f"\n--- Total unique t() keys: {len(set(t_calls))} ---")
