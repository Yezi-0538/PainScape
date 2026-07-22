# -*- coding: utf-8 -*-
import os
import re

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'App.jsx')
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find lines with hardcoded Chinese text (not in comments)
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    # Skip comments
    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
        continue
    
    # Find Chinese characters in string literals
    if any('\u4e00' <= c <= '\u9fff' for c in line):
        # Extract the Chinese parts
        chinese_parts = re.findall(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+', line)
        if chinese_parts:
            print(f"Line {i}: {' | '.join(chinese_parts[:3])}")
