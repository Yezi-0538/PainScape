import re, sys

content = open('frontend/src/App.jsx', 'r', encoding='utf-8').read()

# Find all Chinese characters in JSX text content (between > and <)
# This regex finds Chinese characters that appear between > and < (text content)
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    # Skip comments
    if line.strip().startswith('//') or line.strip().startswith('/*') or line.strip().startswith('*'):
        continue
    # Skip console.log, console.warn, console.error
    if 'console.' in line:
        continue
    # Find Chinese characters in string literals
    # Look for patterns like >"中文"< or >'中文'< or just >中文<
    chinese_pattern = re.findall(r'[\u4e00-\u9fff]{2,}', line)
    if chinese_pattern:
        # Check if it's inside a t() call
        if 't(' in line or 't(`' in line:
            continue
        # Check if it's inside a comment
        if '//' in line:
            comment_part = line.split('//')[1]
            if any(c in comment_part for c in chinese_pattern[0]):
                continue
        # Print the line with Chinese text
        sys.stdout.write(f'Line {i}: {line.strip()}\n')

sys.stdout.flush()
