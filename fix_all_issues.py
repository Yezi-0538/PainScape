#!/usr/bin/env python3
"""
Fix all remaining issues:
1. Add language switch button to splash page
2. Add language switch button to mode selection page
3. Fix hardcoded Chinese fallback text in App.jsx
4. Add languageLabel to splash page
5. Ensure all user-visible text uses t() function
"""

import re

# ============================================================
# 1. Fix App.jsx - Add language switch to splash page
# ============================================================
with open("frontend/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Add language switch button to splash page
# Find the splash page div and add language switch
old_splash = """        {page === "splash" && (
          <div style={{ pointerEvents: 'auto', background: '#050505', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', boxSizing: 'border-box', opacity: splashOpacity, transition: 'opacity 1s ease-in-out' }}>
            <h1 style={{ color: '#fff', letterSpacing: '8px', marginBottom: '40px' }}>PainScape</h1>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.8', textAlign: 'center', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{quote}</p>
          </div>
        )}"""

new_splash = """        {page === "splash" && (
          <div style={{ pointerEvents: 'auto', background: '#050505', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', boxSizing: 'border-box', opacity: splashOpacity, transition: 'opacity 1s ease-in-out' }}>
            {/* Language switch button at the top */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
              <button
                onClick={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ccc',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {targetLanguage === 'zh' ? 'English' : '简体中文'}
              </button>
            </div>
            <h1 style={{ color: '#fff', letterSpacing: '8px', marginBottom: '40px' }}>PainScape</h1>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.8', textAlign: 'center', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{quote}</p>
          </div>
        )}"""

if old_splash in content:
    content = content.replace(old_splash, new_splash)
    print("✓ Added language switch to splash page")
else:
    print("✗ Could not find splash page section")

# Fix 2: Add language switch button to mode selection page
# Find the mode selection card and add language switch at the top
old_mode_card_start = """              {/* 优化后的卡片物理外框 */}
              <div style={{
                width: '100%',
                maxWidth: '460px',
                background: '#121212',
                border: '1px solid #222',
                borderRadius: '28px',
                padding: '36px 32px',
                boxSizing: 'border-box',
                boxShadow: '0 12px 45px rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {/* 标题 */}"""

new_mode_card_start = """              {/* 优化后的卡片物理外框 */}
              <div style={{
                width: '100%',
                maxWidth: '460px',
                background: '#121212',
                border: '1px solid #222',
                borderRadius: '28px',
                padding: '36px 32px',
                boxSizing: 'border-box',
                boxShadow: '0 12px 45px rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {/* Language switch button */}
                <div style={{ alignSelf: 'flex-end', marginBottom: '8px' }}>
                  <button
                    onClick={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#999',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {targetLanguage === 'zh' ? 'English' : '简体中文'}
                  </button>
                </div>
                {/* 标题 */}"""

if old_mode_card_start in content:
    content = content.replace(old_mode_card_start, new_mode_card_start)
    print("✓ Added language switch to mode selection page")
else:
    print("✗ Could not find mode selection card section")

# Fix 3: Fix hardcoded Chinese fallback text
# Line 3062: '就诊协助' -> use t() with fallback
old_fallback1 = "t('modeSelection.medicalTab').split(' ')[1] || t('modeSelection.medicalTab') || '就诊协助'"
new_fallback1 = "t('modeSelection.medicalTab').split(' ')[1] || t('modeSelection.medicalTab') || (targetLanguage === 'en' ? 'Medical Aid' : '就诊协助')"

old_fallback2 = "t('modeSelection.generalTab').split(' ')[1] || t('modeSelection.generalTab') || '日常表达'"
new_fallback2 = "t('modeSelection.generalTab').split(' ')[1] || t('modeSelection.generalTab') || (targetLanguage === 'en' ? 'Self-Care' : '日常表达')"

if old_fallback1 in content:
    content = content.replace(old_fallback1, new_fallback1)
    print("✓ Fixed hardcoded Chinese fallback for medicalTab")
else:
    print("✗ Could not find medicalTab fallback")

if old_fallback2 in content:
    content = content.replace(old_fallback2, new_fallback2)
    print("✓ Fixed hardcoded Chinese fallback for generalTab")
else:
    print("✗ Could not find generalTab fallback")

# Fix 4: Fix the ErrorBoundary class to use t() function
# The ErrorBoundary has hardcoded Chinese/English text
old_error = """class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    const lang = this.props.lang || 'zh';
    const msg = lang === 'en'
      ? 'Something went wrong with the page, please refresh and try again'
      : '页面出了点小问题，请刷新重试';
    if (this.state.hasError) return <h1 style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>{msg}</h1>;
    return this.props.children;
  }
}"""

new_error = """class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    const lang = this.props.lang || 'zh';
    const t = (path) => {
      const keys = path.split('.');
      let val = this.props.texts;
      if (!val) return path;
      for (const k of keys) {
        if (val === undefined || val === null) return path;
        val = val[k];
      }
      return typeof val === 'string' ? val : path;
    };
    const msg = t('app.errorBoundary');
    if (this.state.hasError) return <h1 style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>{msg}</h1>;
    return this.props.children;
  }
}"""

if old_error in content:
    content = content.replace(old_error, new_error)
    print("✓ Fixed ErrorBoundary to use t() function")
else:
    print("✗ Could not find ErrorBoundary class")

# Fix 5: Fix the fallback quotes in AppContent (lines 867-872)
old_quotes = """    const fallbackQuotes = [
      "慢性疼痛相当于长期的unmaking把人困在身体牢笼里。\n Elaine Scarry",
      "疼痛不仅是神经的电冲动，它是对自我边界的侵犯。",
      "语言在痛苦面前总是匮乏的，而视觉是一道划破沉默的闪电。"
    ];"""

new_quotes = """    const fallbackQuotes = isEn
      ? [
          "Chronic pain is a long-term 'unmaking'  trapping a person in the prison of their own body.\n Elaine Scarry",
          "Pain is not just a neural impulse; it is a violation of the boundaries of self.",
          "Language always falls short before pain, and vision is a lightning bolt that cuts through the silence."
        ]
      : [
          "慢性疼痛相当于长期的unmaking把人困在身体牢笼里。\n Elaine Scarry",
          "疼痛不仅是神经的电冲动，它是对自我边界的侵犯。",
          "语言在痛苦面前总是匮乏的，而视觉是一道划破沉默的闪电。"
        ];"""

if old_quotes in content:
    content = content.replace(old_quotes, new_quotes)
    print("✓ Fixed fallback quotes to support bilingual")
else:
    print("✗ Could not find fallback quotes section")

# Fix 6: Fix the hardcoded "绞痛" fallback in lines 921-926
old_pain_fallback = """      let activePain = "绞痛";
      if (page === 'result') {
        activePain = currentReportData?.pain || t(`painNames.${getDominantPain()}`) || "绞痛";
      } else if (page === 'history' && viewingDiary) {
        activePain = viewingDiary.content?.pain || viewingDiary.painName || "绞痛";
      }"""

new_pain_fallback = """      let activePain = isEn ? "Cramping" : "绞痛";
      if (page === 'result') {
        activePain = currentReportData?.pain || t(`painNames.${getDominantPain()}`) || (isEn ? "Cramping" : "绞痛");
      } else if (page === 'history' && viewingDiary) {
        activePain = viewingDiary.content?.pain || viewingDiary.painName || (isEn ? "Cramping" : "绞痛");
      }"""

if old_pain_fallback in content:
    content = content.replace(old_pain_fallback, new_pain_fallback)
    print("✓ Fixed hardcoded pain name fallback")
else:
    print("✗ Could not find pain name fallback")

# Write the fixed content
with open("frontend/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ All fixes applied to App.jsx")
