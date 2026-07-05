# main.py
# ═══════════════════════════════════════════════════════════
# PainScape 后端服务网关 (规范、体感、防错与周期指南终极融合版)
# ═══════════════════════════════════════════════════════════

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import os
import json
import re
import uuid
import requests
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "vivo").lower()

PROVIDER_CONFIG = {
    "dashscope": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "api_key_env": "DASHSCOPE_API_KEY",
        "model": "qwen-plus",
        "model_quick": "qwen-turbo",
        "model_refine": "qwen-turbo",
        "max_tokens": 4096,
        "display_name": "通义千问 Qwen-Plus",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "api_key_env": "DEEPSEEK_API_KEY",
        "model": "deepseek-chat",
        "model_quick": "deepseek-chat",
        "model_refine": "deepseek-chat",
        "max_tokens": 4096,
        "display_name": "DeepSeek-V3",
    },
    "zhipu": {
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "api_key_env": "ZHIPU_API_KEY",
        "model": "glm-4-plus",
        "model_quick": "glm-4-flash",
        "model_refine": "glm-4-flash",
        "max_tokens": 4096,
        "display_name": "智谱 GLM-4-Plus",
    },
    "vivo": {
        "base_url": "https://api-ai.vivo.com.cn/v1",
        "api_key_env": "VIVO_API_KEY",
        "model": "Volc-DeepSeek-V3.2",
        "model_quick": "Doubao-Seed-2.0-mini",
        "model_refine": "Doubao-Seed-2.0-mini",
        "max_tokens": 4096,
        "display_name": "Vivo蓝心大模型",
    },
}

config = PROVIDER_CONFIG[LLM_PROVIDER]
api_key = os.getenv(config["api_key_env"])

client = OpenAI(api_key=api_key or "EMPTY", base_url=config["base_url"])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Pydantic 宽松数据校验模型
# ─────────────────────────────────────────────

class SpatialMapModel(BaseModel):
    abdomen: Optional[float] = 0.5
    lowerBack: Optional[float] = 0.5
    upperBody: Optional[float] = 0.0

class IntensityProfileModel(BaseModel):
    avgSpeed: Optional[float] = 5.0
    peakSpeed: Optional[float] = 10.0
    avgPressure: Optional[float] = 0.5

class TimeRhythmModel(BaseModel):
    morning: Optional[float] = 0.33
    afternoon: Optional[float] = 0.33
    night: Optional[float] = 0.34
    dominantPeriod: Optional[str] = "morning"

class MedicalBackgroundModel(BaseModel):
    diagnosed: Optional[Any] = ""
    allergies: Optional[Any] = ""
    age: Optional[Any] = ""
    lifestyle: Optional[Any] = ""
    activityLevel: Optional[Any] = ""
    familyHistory: Optional[Any] = ""
    psychosocial: Optional[Any] = ""
    reproductiveHistory: Optional[Any] = ""
    height: Optional[Any] = ""
    weight: Optional[Any] = ""
    otherDiagnosis: Optional[Any] = ""
    otherAllergies: Optional[Any] = ""
    surgicalHistory: Optional[Any] = ""
    menarcheAge: Optional[Any] = ""
    cycleRegular: Optional[Any] = ""
    periodDuration: Optional[Any] = ""
    lastPeriod: Optional[Any] = ""
    familyHistoryArr: Optional[List[Any]] = Field(default_factory=list)
    lifestyleArr: Optional[List[Any]] = Field(default_factory=list)
    reproductiveHistoryArr: Optional[List[Any]] = Field(default_factory=list)
    accompanyingSymptomsArr: Optional[List[Any]] = Field(default_factory=list)

class PainData(BaseModel):
    appMode: Optional[str] = "medical"
    dominantPain: str
    userPref: str
    painScore: int
    brushCounts: Optional[Dict[str, int]] = None
    spatialMap: Optional[SpatialMapModel] = None
    intensityProfile: Optional[IntensityProfileModel] = None
    timeRhythm: Optional[TimeRhythmModel] = None
    colorPalette: Optional[str] = None
    bodyMode: Optional[str] = None
    medicalBackground: Optional[MedicalBackgroundModel] = None
    tonePreference: Optional[str] = "gentle"
    cycleDay: Optional[str] = "未提供"
    targetLanguage: Optional[str] = "zh"
    isQuickLog: Optional[bool] = False
    accompanyingSymptoms: Optional[List[str]] = Field(default_factory=list)

PAIN_MAP = {
    "zh": {
        "twist": "下腹部痉挛性收缩绞痛",
        "pierce": "局部阵发性放射刺痛",
        "heavy": "下腹坠胀重压钝痛",
        "wave": "弥漫酸胀痛",
        "scrape": "撕裂样剥脱拉扯痛"
      },
    "en": {
        "twist": "spasmodic cramping compression pain",
        "pierce": "paroxysmal radiating sharp stabbing",
        "heavy": "heavy pelvic dragging and pressure",
        "wave": "diffuse dull aching fullness",
        "scrape": "tearing and localized scraping tension"
    }
}

# ─────────────────────────────────────────────
# 辅助解析与转换器
# ─────────────────────────────────────────────
def build_pain_location_desc(spatial_map: Optional[SpatialMapModel], lang: str) -> str:
    if not spatial_map:
        return "下腹部" if lang == "zh" else "lower pelvis"
    parts = []
    abd = getattr(spatial_map, 'abdomen', 0.0) or 0.0
    lb = getattr(spatial_map, 'lowerBack', 0.0) or 0.0
    if abd > 0.1:
        parts.append(f"下腹部({int(abd*100)}%)" if lang == "zh" else f"Abdomen ({int(abd*100)}%)")
    if lb > 0.1:
        parts.append(f"腰骶部({int(lb*100)}%)" if lang == "zh" else f"Lower Back ({int(lb*100)}%)")
    return "、".join(parts) if parts else ("下腹部" if lang == "zh" else "lower pelvis")

def translate_vectors_to_clinical(data: PainData, lang: str) -> str:
    ip = data.intensityProfile or IntensityProfileModel()
    pressure_val = ip.avgPressure or 0.5
    speed_val = ip.avgSpeed or 5.0
    
    depth = "深层内脏痛（带有一种深沉、缓慢且推不开的压榨质感）" if pressure_val > 0.6 else "浅表外周感觉敏化（带有一过性、游走性的局部刺痒）"
    speed_desc = "发作呈高度阵发突发性，极易引起全身防御性肌肉紧绷" if speed_val > 12.0 else "呈慢性低频潮汐式波动，具有较强的痛觉物理惰性"
    return f"【画笔物理轨迹分析】：绘图重压强度（{pressure_val:.2f}）指向{depth}；绘图游走速度（{speed_val:.1f}）指向{speed_desc}。"

def get_color_somatic_meaning(color: Optional[str], lang: str) -> str:
    color_key = str(color or "crimson").lower()
    if lang == "zh":
        meanings = {
            "crimson": "有一种热热的、胀胀的涌动感，与体内经血的流注直接关联。这在生理上对应盆腔局部小血管高度扩张、主动充血引起的物理胀满感与搏动张力。",
            "dark": "一种闷闷的、抑郁的坠落不适感。痛楚中伴随着心下一沉的严重无力与深度疲惫，小腹局部痛感深重却又发麻，仿佛那块组织失去了原有的代谢温度与生命活性。",
            "blue": "伴随明显的寒冷、眩晕以及冰凉感。四肢末梢逐渐发凉，小腹无论如何也无法暖热。感觉有一种不属于自己身体的、异质的冷缩力量在干扰盆腔，在生理上对应着重度局部缺血、血管骤紧以及机体失温应激。",
            "purple": "一种难以形容的黏滞性酸楚与不适，非尖锐剧痛但绵延不绝。伴随全身酸胀、绵软无力，直击内心，具有深层盆腔神经敏化特征，极易引发想哭、情绪崩溃等交感神经高度脆弱状态。"
        }
    else:
        meanings = {
            "crimson": "A warm, surging, and bloated sensation, directly associated with active blood flow. Physiologically corresponds to active pelvic congestion, hyper-perfusion, and throbbing vascular tension.",
            "dark": "A heavy, depressed, and sinking discomfort. Accompanied by profound weakness and deep fatigue, where the painful area feels numb, stagnant, and temporarily lacks vital metabolic temperature.",
            "blue": "Chills, vertigo, and a freezing sensation. Extremities cool down and the abdomen cannot be warmed, feeling as if an alien, non-biological freezing force is interfering with the pelvis. Physiologically corresponds to acute localized ischemia and severe vascular constriction.",
            "purple": "An indescribable, faint yet persistent ache; not a sharp peak pain, but a deep, sticky discomfort accompanied by profound weakness, exhaustion, and intense emotional vulnerability (a weeping state, highly linked to neuropathic pelvic sensitivities)."
        }
    return meanings.get(color_key, meanings["crimson"])

# ═══════════════════════════════════════════════════════════
# 主力 POST 生成接口
# ═══════════════════════════════════════════════════════════
@app.post("/api/generate")
async def generate_pain_report(data: PainData):
    try:
        lang = str(data.targetLanguage or "zh")
        app_mode = str(data.appMode or "medical").lower()
        mb = data.medicalBackground

        pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
        vector_analysis = translate_vectors_to_clinical(data, lang)

        # 1. 止痛药红线 Python 前置校验
        raw_allergies = ""
        if mb:
            raw_allergies = f"{getattr(mb, 'allergies', '')} {getattr(mb, 'otherAllergies', '')}"
        allergy_text = raw_allergies.lower()
        allergy_list = ["布洛芬", "阿司匹林", "双氯芬酸", "酮洛芬", "萘普生", "ibuprofen", "aspirin", "diclofenac", "naproxen", "nsaids"]
        has_nsaid_allergy = any(term in allergy_text for term in allergy_list)

        forbidden_drugs = "布洛芬 (Ibuprofen)、阿司匹林 (Aspirin)、双氯芬酸钠等所有非甾体抗炎药(NSAIDs)" if has_nsaid_allergy else "无"
        safe_recommendation = "对乙酰氨基酚 (Acetaminophen)" if has_nsaid_allergy else "布洛芬 (Ibuprofen) 或 萘普生 (Naproxen)"
        
        if lang == "en":
            drug_safety_instruction = f"""
[CRITICAL DRUG SAFETY CONSTRAINT]:
- The patient HAS an allergy to NSAIDs/Ibuprofen: {has_nsaid_allergy}
- Recommended painkiller: {safe_recommendation}
- STRICTLY FORBIDDEN painkillers (DO NOT suggest): {forbidden_drugs}
"""
        else:
            drug_safety_instruction = f"""
【用药安全红线硬约束】：
- 检测到患者对布洛芬/NSAIDs类药物过敏：{"是（已激活红线）" if has_nsaid_allergy else "否"}
- 允许推荐的口服止痛药：{safe_recommendation}
- 绝对禁止推荐/出现的止痛药：{forbidden_drugs}
"""

        # 2. Python 侧生理周期阶段精准定位
        cycle_day_str = str(data.cycleDay or "").lower()
        active_phase_zh = "月经期 (Day 1-7)"
        active_phase_en = "Menstrual Phase (Day 1-7)"
        
        if any(x in cycle_day_str for x in ["前", "pre"]):
            active_phase_zh = "黄体期 (Day 22-28)"
            active_phase_en = "Luteal Phase (Day 22-28)"
        elif any(x in cycle_day_str for x in ["后", "after"]):
            active_phase_zh = "卵泡期 (Day 8-14)"
            active_phase_en = "Follicular Phase (Day 8-14)"
        elif any(x in cycle_day_str for x in ["排卵", "ovulat"]):
            active_phase_zh = "排卵期 (Day 15-21)"
            active_phase_en = "Ovulation Phase (Day 15-21)"
            
        active_phase = active_phase_zh if lang == "zh" else active_phase_en

        # 3. 格式化解析患者真实健康背景（阻止 AI 跨界编造）
        pain_location_desc = build_pain_location_desc(data.spatialMap, lang)
        accompanying_symptoms = data.accompanyingSymptoms or []
        accompanying_desc = "、".join(accompanying_symptoms) if accompanying_symptoms else "无明显伴随症状"
        
        diagnosed_history = "无明确妇科疾病确诊史"
        surgical_history = "无盆腔及腹部手术史"
        obstetric_history = "未生育"
        family_history = "无已知家族遗传及相关肿瘤病史"
        age_cohort = "成年女性"
        
        if mb:
            if getattr(mb, "age", "") and getattr(mb, "age") not in ["", "none"]:
                age_cohort = f"年龄处于 {getattr(mb, 'age')} 阶段"
            
            if getattr(mb, "diagnosed", "") and getattr(mb, "diagnosed") not in ["none", "unchecked", ""]:
                diagnosed_history = f"曾确诊患有 {getattr(mb, 'diagnosed')}"
                if getattr(mb, "otherDiagnosis", ""):
                    diagnosed_history += f"、{getattr(mb, 'otherDiagnosis')}"
            
            if getattr(mb, "surgicalHistory", "") and getattr(mb, "surgicalHistory") not in ["none", ""]:
                surg_map = {"abdominal": "腹部手术史", "pelvic": "盆腔手术史", "other": "其他手术史"}
                surgical_history = surg_map.get(getattr(mb, "surgicalHistory"), "有手术史")

            reprod_arr = getattr(mb, "reproductiveHistoryArr", []) or []
            if reprod_arr:
                reprod_map = {
                    "nulliparous": "未生育", "pregnant": "已孕未生产", "parous": "已生育",
                    "spontaneousAbortion": "自然流产史", "inducedAbortion": "人工终止妊娠/人流史"
                }
                obstetric_history = "，".join([reprod_map.get(x, x) for x in reprod_arr])

            fam_arr = getattr(mb, "familyHistoryArr", []) or []
            if fam_arr and "none" not in fam_arr:
                fam_map = {"mother": "母亲有痛经史", "sister": "姐妹有痛经史", "unknown": "家族史不详"}
                family_history = "，".join([fam_map.get(x, x) for x in fam_arr])

        # ─────────────────────────────────────────────
        # 🛡️ 【System Prompt】：融入多维硬约束与月经阶段指南
        # ─────────────────────────────────────────────
        if app_mode == "medical":
            sys_prompt = f"""
你是一名在三甲医院妇产科门诊工作、具有极高专业素养和规范化病历书写标准的主治医师助理。你需要将患者填写的档案和痛觉通感指标，重构为符合规范的住院/门诊病历档案。

【强制规则 - 必须严格遵守】
1. 绝对禁止编造任何用户未提供的信息！
   - 如果年龄未提供：绝对禁止写“患者X岁”，可写“成年女性”。
   - 如果家族史为“无”或未提供：绝对禁止在病历正文中出现“母亲/姐妹有痛经史”！
   - 字段为空或“未提供”：完全跳过，病历中绝不要提及。
   - 严格防范 Few-Shot 范例污染：范例中提到的具体病史、手术及人流次数（如剖宫产2次、G10P2等）仅供排版和语气参考，绝对不能代入到当前患者病历中！
2. 严禁在病历正文（chief_complaint, present_illness, past_history, menstrual_history, clinical_diagnosis）中出现任何如“画笔”、“画布”、“特征向量”、“偏好按钮”等软件设计词汇，必须将其转译为规范的医学表述。
3. 严格写入鉴别诊断所需的阴性症状（如：“无肛门坠胀感，无尿频尿急...起病以来精神可，二便正常，体重无明显变化”）。
4. 月经史与婚育史采用临床标准化对齐：初潮年龄 (经期天数/周期天数) LMP: yyyy-mm-dd 格式。婚育史必须采用 G_xP_y 公式，未提供则如实写未生育。

【月经周期阶段自愈参考指南（重要：必须依据当前判定生理阶段融入 selfCare 建议）】
- 月经期 (Day 1-7): 重点在于休息、充足保暖、避免剧烈运动。自愈推荐：局部热敷、恢复性抱膝拉伸、温热补铁补血饮品。
- 卵泡期 (Day 8-14): 身体与代谢能量回升，适合开展高效高强度工作和高专注度脑力活动。
- 排卵期 (Day 15-21): 社交与日常精力的高能量顶峰阶段，后期能量逐渐平缓下降。
- 黄体期 (Day 22-28): PMS（经前综合征）高发时段，情绪易波动或伴盆腔坠沉。自愈推荐：轻柔拉伸、散步、限制高糖高碳欲望。

【输出各字段硬性指标要求】
- "chief_complaint": 极简，核心体感+部位+时间，字数严格控制在 20 字以内。
- "clinical_diagnosis": 必须使用鉴别诊断语气，表述为“需重点筛查和鉴别排查的方向”，严禁确诊。
- "analogy": 极具画面感的具身通感比喻，必须与画笔痛感性质（如酸胀、痉挛绞榨等）高度吻合，且绝对避免恐怖、撕裂、破碎等容易引起患者恐慌的极端字眼（将撕裂描述为组织拉扯，绞榨描述为平滑肌周期性挤压）。
- "selfCare": 提供 4-5 条温和且简单的自愈建议。**必须包含至少一个特定的疼痛缓解姿势（如“侧卧婴儿式蜷缩，双膝间夹枕头”），必须简单可行（确保用户在剧痛中愿意做、能做到），且必须包含一句旨在消除经期病耻感或请假内疚心理的共情安慰话语。**
- "action": 提供 3-4 条具体的伴侣/照护者实操动作，必须与患者当前主导痛感类型强关联。严禁推荐任何过敏药物。
- "work": 高度接地气的假条文本。**字数必须严格限制在 40 字以内（包含标点符号），确保用户能直接一键复制到微信/Slack。**
- "clinical_suggestions": 包含复查化验建议，以及一段温柔、客观，能打消患者对妇科检查（如阴道彩超、内诊）耻感与边界暴露恐惧的心理抚慰文案（字数饱满，不少于300字）。

【纯 JSON schema 格式输出（只返回纯 JSON，严禁 Markdown 包装）】
{{
  "chief_complaint": "主诉",
  "present_illness": "现病史（学术规范，深度剖析病生理，字数饱满）",
  "past_history": "既往史、个人史及家族史风险（严格基于输入，无则写无，严禁捏造）",
  "menstrual_history": "月经史与婚育史（标准公式，严禁套用范例）",
  "clinical_diagnosis": "临床重点筛查及鉴别诊断方向（使用待排、建议筛查语气）",
  "clinical_suggestions": "复查建议与温柔妇检防护引导（字数饱满，不少于300字）",
  "analogy": "痛觉具身通感隐喻（去恐慌化，高共鸣度）",
  "work": "请假或社交推约文本（严格控制在40字以内）",
  "action": ["实操建议1", "实操建议2", "实操建议3"],
  "selfCare": ["温和自愈建议1", "温和自愈建议2", "消除病耻感安慰"]
}}
"""
        else:
            # 🎨 日常自愈模式 System Prompt
            sys_prompt = f"""
你是一名温柔、共情的经期身体自愈与通感疗愈导师。
你的任务是将用户绘制的痛觉特征转化为温暖、科学的“骨盆复位与能量释放日志”。

【🚫 语言红线与自愈硬约束】
1. 绝对禁止使用任何令人焦虑的临床术语。将临床诊断替换为“骨盆力学与交感放松状态评估”。
2. 严禁使用极端、恐怖化字眼，采用“牵拉、温冷、牵坠、呼吸阻抗”等触觉词。
3. "selfCare" 必须包含至少一个特定的疼痛缓解姿势（如双膝微屈抱枕），简单易做，且必须有一句消除病耻感、允许自己今天休息的温暖安慰。
4. "work" 部分必须是严格限制在 40 字以内的社交推推辞/推约短文本。
5. 提示：任何自愈方案若引起额外不适，请立即停止。
"""

        # 3. 极严苛的 User Prompt
        user_prompt = f"""
【🚨 真实当前患者数据输入 - 绝对禁区！只能使用以下提供的数据进行处理】

1. 基础生物及痛觉矢量特征：
   - 当前患者年龄段：{age_cohort}
   - 主导痛感质感：{pt_dict.get(data.dominantPain, data.dominantPain)}
   - 累积痛觉负荷（评分）：{data.painScore}/100
   - 痛感空间定位描述：{pain_location_desc}
   - 判定当前生理阶段：{active_phase} (请基于此阶段，融合系统提示词中的“月经周期阶段参考指南”定制你的 selfCare 运动、自愈与生活饮食建议)
   - 伴随躯体症状：{accompanying_desc}
   - 前端绘图物理动力学特征推演：{vector_analysis}

2. 导入的患者真实健康背景（若显示为“无/未提供”，相关病历部分必须输出为无，严禁抄袭 Few-Shot 范例！）：
   - 身高/体重：{f"{getattr(mb, 'height', '')}cm / {getattr(mb, 'weight', '')}kg" if mb and getattr(mb, 'height', '') else "未提供"}
   - 既往诊断病史：{diagnosed_history}
   - 外科手术史：{surgical_history_val if (surgical_history_val := surgical_history) else "无"}
   - 生育/孕产史：{obstetric_history} (警告：若显示为“未生育”，月经孕产史中绝不能出现 G10P2 或剖宫产2次)
   - 家族遗传/痛经史：{family_history}
   - 初潮年龄：{getattr(mb, 'menarcheAge', '13') if mb else '13'}岁
   - 月经周期规律性：{getattr(mb, 'cycleRegular', '规律') if mb else '规律'}
   - 经期天数：{getattr(mb, 'periodDuration', '5') if mb else '5'}天
   - 末次月经第一天（LMP）：{getattr(mb, 'lastPeriod', '未提供') if mb else '未提供'}
   - 个人生活作息：{', '.join(getattr(mb, 'lifestyleArr', [])) if mb else '无'}

3. 语气及文案偏好：
   - 沟通偏好语调：{data.tonePreference}

{drug_safety_instruction}

请仅基于上述真实数据，直接输出一个纯 JSON 对象（不要有 markdown 包装）：
"""

        model_name = config["model_quick"] if data.isQuickLog else config["model"]

        print(f"🤖 正在请求服务提供商: {config['display_name']} ({model_name})...")

        # 4. 执行零温调用（彻底锁死大模型随机性，消灭套模模板幻觉）
        if LLM_PROVIDER == "vivo":
            url = f"{config['base_url']}/chat/completions"
            headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {api_key}",
            }
            params = {"request_id": str(uuid.uuid4())}
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.0,  # 🌟 零温
                "max_tokens": config["max_tokens"],
                "stream": False,
            }
            response = requests.post(url, headers=headers, params=params, json=payload, timeout=90)
            response.raise_for_status()
            raw_text = response.json()["choices"][0]["message"]["content"]
        else:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,  # 🌟 零温
                response_format={"type": "json_object"},
            )
            raw_text = completion.choices[0].message.content

        # 5. 安全清理 Markdown
        cleaned_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE | re.IGNORECASE)
        cleaned_text = re.sub(r"```\s*$", "", cleaned_text, flags=re.MULTILINE).strip()
        start, end = cleaned_text.find("{"), cleaned_text.rfind("}")
        if start != -1 and end != -1:
            cleaned_text = cleaned_text[start : end + 1]

        parsed_json = json.loads(cleaned_text, strict=False)
        fb = _fallback_response(lang, painkiller, app_mode)

        def get_safe_field(json_data, key, fallback_val):
            val = json_data.get(key) if isinstance(json_data, dict) else None
            return val if val and str(val).strip() else fallback_val

        # 6. 返回前端数据字典
        return {
            "status": "success",
            "language": lang,
            "appMode": app_mode,
            "chief_complaint": get_safe_field(parsed_json, "chief_complaint", fb["chief_complaint"]),
            "present_illness": get_safe_field(parsed_json, "present_illness", fb["present_illness"]),
            "past_history": get_safe_field(parsed_json, "past_history", fb["past_history"]),
            "menstrual_history": get_safe_field(parsed_json, "menstrual_history", fb["menstrual_history"]),
            "clinical_diagnosis": get_safe_field(parsed_json, "clinical_diagnosis", fb["clinical_diagnosis"]),
            "clinical_suggestions": get_safe_field(parsed_json, "clinical_suggestions", fb["clinical_suggestions"]),
            "analogy": get_safe_field(parsed_json, "analogy", fb["analogy"]),
            "work": get_safe_field(parsed_json, "work", fb["work"]),
            "action": get_safe_field(parsed_json, "action", fb["action"]),
            "selfCare": get_safe_field(parsed_json, "selfCare", fb["selfCare"]),
            "pain_location": pain_location_desc,
            "accompanying_symptoms": accompanying_desc,
            "risk_warning": risk_warning,
            "triage_advice": triage_advice if app_mode == "medical" else "居家自愈修整中",
            "exam_advice": exam_advice if app_mode == "medical" else None,
            "health_tips_link": f"https://health-edu.org/dysmenorrhea/{data.dominantPain}"
        }

    except Exception as e:
        print(f"❌ 运行发生异常，进入安全降级保护: {e}")
        fallback = _fallback_response(lang, painkiller, app_mode)
        fallback.update({
            "is_fallback": True,
            "error_detail": str(e),
            "pain_location": pain_location_desc,
            "accompanying_symptoms": accompanying_desc,
            "risk_warning": risk_warning,
            "triage_advice": triage_advice if app_mode == "medical" else "居家自愈修整中",
            "exam_advice": exam_advice if app_mode == "medical" else None,
            "health_tips_link": f"https://health-edu.org/dysmenorrhea/{data.dominantPain}"
        })
        return fallback

# ─────────────────────────────────────────────
# 降级备用模版 (完全同步)
# ─────────────────────────────────────────────
def _fallback_response(lang: str, painkiller: str = "布洛芬", app_mode: str = "medical") -> dict:
    is_general = app_mode == "general"
    if lang == "zh":
        if is_general:
            return {
                "chief_complaint": "【身体感知】小腹酸胀不适伴腰部酸痛感。",
                "present_illness": "平滑肌轻度痉挛收缩，伴骨盆局部血管微滞与坠重。静态久坐会阻碍骨盆血流，建议配合温热热敷与舒缓长呼吸，松弛盆底肌肉阻抗。",
                "past_history": "习惯性久坐少动（静态时间较长）。日常作息偶尔不规律。",
                "menstrual_history": "月经周期规律，目前处于月经行经期第1-2天。",
                "clinical_diagnosis": "【骨盆感知】：盆底肌群紧张度微增。",
                "clinical_suggestions": "建议温敷腹部，采用侧卧抱膝姿势放松腰骶，配合4-7-8呼吸法调节神经张力。⚠️注意：任何自愈方案或体位调节若引起您额外的不适或痛感，请立即停止，回归最舒服的姿势并保持静卧休养。",
                "analogy": "小腹内像塞入了一个温热胀满的小气球，发胀发酸。",
                "work": "因今天经期不适状态不佳，特申请居家修整，紧急事务随时保持文字沟通。",
                "action": ["☑️ 准备热敷袋放于小腹", "☑️ 递一杯热饮或温水"],
                "selfCare": ["✨ 允许自己静卧，今天无需保持高产出", "✨ 缓慢深呼吸，放松紧绷的臀部肌肉"]
            }
        else:
            return {
                "chief_complaint": "主诉：周期性下腹痛经伴剧烈绞痛1天。",
                "present_illness": "患者当前主诉下腹部疼痛，详情请参考原始填报。",
                "past_history": "平素健康状况一般，否认重大慢性病史及过敏史。",
                "menstrual_history": "月经初潮13岁，周期规律，LMP未填。",
                "clinical_diagnosis": "原发性痛经（痉挛性痛）",
                "clinical_suggestions": "建议妇科常规超声探查以排除内异症。常规超声属于无创排查，探头极其细小，表面会覆盖一次性无菌橡胶套并涂抹足量的温润耦合剂，探入过程中请配合医生深吸气-呼气动作。放松盆底括约肌，检查仅会产生短暂异物顶胀感。医生会提供充分的屏风和隐私防护，保护您的边界和检查尊严。请放心配合医生，尽早明确病灶原因。",
                "analogy": "像有人把你的子宫深处拧成一股麻绳，再用粗糙的砂纸反复拉磨打磨。",
                "work": "因今天经期突发急性坠胀严重绞痛且无法站立，申请病假休整一天，特此交接工作。",
                "action": [
                    f"☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。",
                    f"☑️ 帮她倒一杯温热的饮用水，并准备好安全的止痛药{painkiller}。"
                ],
                "selfCare": [
                    "✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。",
                    "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"
                ]
            }
    else:
        # English Fallback
        if is_general:
            return {
                "chief_complaint": "Somatic Reflection: Today the lower pelvis feels compressed with continuous heavy waves of bloating.",
                "present_illness": "Somatic assessment indicates mild spasmodic uterine contractions accompanied by localized pelvic congestion. Long sedentary habits can impede microvascular circulation. Mindful breathing and warmth are recommended to pacify pelvic floor myofascial tension.",
                "past_history": "Generally healthy. Denies significant past chronic conditions or surgery.",
                "menstrual_history": "Menstrual cycle is documented, currently in active menstruation.",
                "clinical_diagnosis": "Somatic State: Pelvic myofascial congestion & elevated autonomic tone.",
                "clinical_suggestions": "Holistic Pelvic Restoration Guide:\n1. Constructive Rest Position: Lie down with knees bent and elevated on a pillow to gently redirect pelvic blood pooling.\n2. Guided Body Scan: Focus awareness on your lower abdomen (Guanyuan acupoint). Inhale for 4 seconds, exhale slowly for 8 seconds, releasing localized tension. ⚠️ NOTICE: Please stop any self-care method or physical adjustment immediately if it causes you additional discomfort or pain! Return to your most comfortable resting position and remain still.",
                "analogy": "Like a heavy stone sinking deep into your lower pelvis, radiating continuous stiffness to your lower back.",
                "work": "Hi Manager,\nI am writing to request a sick leave / work-from-home accommodation today due to sudden and severe menstrual pelvic bloating. I will catch up on any outstanding items as soon as I recover. Thank you for your kind understanding.\n\nSincerely,\n[Your Name]",
                "action": [
                    "☑️ Rub your palms warm and place them flat on her lower abdomen to gently encourage circulation.",
                    "☑️ Ensure a quiet, dark environment to reduce autonomic over-sensitivity."
                ],
                "selfCare": [
                    "✨ You are allowed to rest. Pain is a real physical state. Resting is active recovery.",
                    "✨ Practice diaphragmatic breathing to pacify the hyperactive pelvic floor muscle group."
                ]
            }
        else:
            return {
                "chief_complaint": "Paroxysmal lower abdominal cramping for 1 day, worsening with cold sweats for 1 hour.",
                "present_illness": "Patient reports regular menstrual baseline. Sudden onset of severe spasmodic cramping in lower abdomen, peak VAS score 7/10, radiating to lower back. No rectal pressure, no fever. Oral ibuprofen provided minimal relief. Admitted for further diagnostic workup.",
                "past_history": "Past History: Generally healthy. Denies significant past chronic conditions or surgery.",
                "menstrual_history": "13 (5/28 days) LMP: Not provided. Dysmenorrhea: Yes. Obstetrical History: Nulliparous (G0P0).",
                "clinical_diagnosis": "1. Secondary spasmodic dysmenorrhea (possible pelvic adhesion / adenomyosis)\n2. Post-operative status (surgical history denied/none)",
                "clinical_suggestions": "【Points to discuss with your doctor】:\n1. Discuss the risk of pelvic tissue adhesions and localized lesions with your gynecologist during your pelvic ultrasound.\n2. Ask whether CA125 / CA199 tumor marker screening is appropriate.\n\n🔬 【Pelvic Examination Reassurance Guide】:\nPelvic examinations and Doppler ultrasounds are routine non-invasive screening procedures. The ultrasound probe is highly slender, covered with a sterile sleeve, and fully lubricated with warm medical gel. Practice slow deep breathing during insertion to relax pelvic floor muscles. The physician operates behind private screens to fully respect your physical boundaries and preserve patient dignity.",
                "analogy": "Like an iron clamp twisting tightly inside the deep pelvis, sending paroxysms of acute stiffness straight up the spine.",
                "work": "Dear Manager/HR,\nI am writing to request sick leave for today as I am experiencing severe spasmodic dysmenorrhea (acute lower abdominal cramping). Urgent tasks have been delegated. Thank you for your support and understanding.\n\nSincerely,\n[Your Name]",
                "action": [
                    "☑️ Apply a warm compress or heating pad (40-45°C) to her lower back and lower abdomen.",
                    "☑️ Prepare warm water and have her non-NSAIDs pain reliever (e.g. Acetaminophen) ready, keeping her away from allergens."
                ],
                "selfCare": [
                    "✨ Lie down in a fetal position, placing a soft pillow between your knees to reduce uterine pelvic strain.",
                    "✨ Avoid any cold beverages. Sip warm water slowly to encourage blood perfusion."
                ]
            }