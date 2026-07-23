import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ===== Canvas page =====
content = content.replace('负荷', '{t("canvas.load")}')

# ===== Result page =====
content = content.replace('📢 发送对象与场景：', '{t("resultLabels.sendTarget")}')
content = content.replace('🎭 表达语气倾向：', '{t("resultLabels.tonePreference")}')
content = content.replace('🔴 经期陪伴指南', '🔴 {t("resultLabels.companionGuide")}')

# ===== Doctor tab =====
content = content.replace('主诉 (Chief Complaint)', '{t("doctor.chiefComplaint")}')
content = content.replace('现病史及痛感机制分析', '{t("doctor.presentIllness")}')
content = content.replace('既往史及个人习惯风险', '{t("doctor.pastHistory")}')
content = content.replace('月经及孕产史', '{t("doctor.menstrualHistory")}')
content = content.replace('患者主诉与潜在筛查建议', '{t("doctor.clinicalDiagnosis")}')
content = content.replace('供您与医生讨论参考', '{t("doctor.examAdvice")}')
content = content.replace('临床调理参考与防护引导', '{t("doctor.clinicalSuggestions")}')
content = content.replace('检查前准备：', '{t("doctor.examPreparation")}:')
content = content.replace('参考科普知识库:', '{t("doctor.healthTipsLink")}:')

# ===== Refine buttons =====
content = content.replace('调优主诉', '{t("result.refine.optimizeComplaint")}')
content = content.replace('调优病生理分析', '{t("result.refine.optimizeReference")}')
content = content.replace('调优就诊引导', '{t("result.refine.optimize")}')

# ===== Post / Community =====
content = content.replace('查看详情', '{t("post.viewDetails")}')
content = content.replace('已认可', '{t("post.votedHelpful")}')
content = content.replace('亲测有用', '{t("post.markHelpful")}')
content = content.replace('已赞同有用', '{t("post.votedHelpful")}')
content = content.replace('具身痛觉图谱', '{t("community.painAtlas")}')

# ===== History =====
content = content.replace('的记录', '{t("history.records")}')
content = content.replace('条', '{t("history.items")}')
content = content.replace('发送对象：', '{t("resultLabels.sendTarget")}:')
content = content.replace('表达语气：', '{t("resultLabels.tonePreference")}:')
content = content.replace('收起', '{t("history.collapse")}')
content = content.replace('展开', '{t("history.expand")}')

# ===== Diary =====
content = content.replace('警告：确定要永久删除本条具身痛感档案吗？此操作将无法撤销。', '{t("diary.deleteConfirm")}')

# ===== Healing cards =====
content = content.replace('一起认真呼吸', '{t("healing.breathing.title")}')
content = content.replace('配声学潮汐呼吸引导，放松盆底肌群', '{t("healing.breathing.description")}')
content = content.replace('做个简易拉伸', '{t("healing.meditation.title")}')
content = content.replace('快速穴位按揉', '{t("healing.acupressure.title")}')
content = content.replace('60 BPM 节拍节奏引导，阻断痉挛锐痛', '{t("healing.acupressure.description")}')
content = content.replace('热敷与食补', '{t("healing.heatPack.title")}')
content = content.replace('柴火燃烧白噪音，心理升温理疗', '{t("healing.heatPack.description")}')
content = content.replace('静心空灵环境音，缓解子宫韧带牵拉', '{t("healing.meditation.description")}')

# ===== Check what changed =====
changes = []
for i, (a, b) in enumerate(zip(original, content)):
    if a != b:
        changes.append((i, a, b))

print(f"Total changes: {len(changes)}")
if changes:
    for idx, old, new in changes[:20]:
        ctx_start = max(0, idx-20)
        ctx_end = min(len(content), idx+20)
        print(f"\nPos {idx}: '{old}' -> '{new}'")
        print(f"  Context: ...{repr(content[ctx_start:ctx_end])}...")

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone writing file.")
