# main.py
# ═══════════════════════════════════════════════════════════
# PainScape 后端服务网关
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
from datetime import datetime

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

client = None
if LLM_PROVIDER != "vivo":
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
#  Pydantic数据模型（防止 422 报错）
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

# 双语对照
PAIN_MAP = {
    "zh": {
        "twist": "下腹痉挛性绞痛",
        "pierce": "局部反射性锐利刺痛",
        "heavy": "下腹部重压坠胀感",
        "wave": "弥漫性酸胀不适",
        "scrape": "撕裂样剥脱感"
    },
    "en": {
        "twist": "spasmodic lower abdominal cramping",
        "pierce": "localized radiating sharp stabbing pain",
        "heavy": "lower abdominal dragging heaviness",
        "wave": "diffuse lower pelvic bloating",
        "scrape": "tearing and scraping sensation"
    }
}

# ─────────────────────────────────────────────
# 辅助安全处理器
# ─────────────────────────────────────────────
def build_pain_location_desc(spatial_map: Optional[SpatialMapModel], lang: str) -> str:
    if not spatial_map:
        return "未提供"
    parts = []
    abd = getattr(spatial_map, 'abdomen', 0.0) or 0.0
    lb = getattr(spatial_map, 'lowerBack', 0.0) or 0.0
    if abd > 0.1:
        parts.append(f"下腹盆腔前壁区({int(abd*100)}%)")
    if lb > 0.1:
        parts.append(f"腰骶部背面区({int(lb*100)}%)")
    return "、".join(parts) if parts else "下腹部"

def build_risk_warning(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    if not mb:
        return "目前未见特异性药物过敏风险提示" if lang == "zh" else "No specific medication risks"
    allergy = getattr(mb, "allergies", "") or ""
    if "ibuprofen" in str(allergy).lower():
        return "⚠️ 明确非甾体抗炎药（NSAIDs/布洛芬）过敏史。临床诊疗时请勿推荐处方布洛芬，建议遵医嘱替换为对乙酰氨基酚。" if lang == "zh" else "⚠️ Documented Ibuprofen (NSAIDs) allergy. Avoid prescribing Ibuprofen; consider Acetaminophen."
    return "无已知药物过敏" if lang == "zh" else "No known drug allergies"

def build_triage_advice(pain_score: int, symptoms: Optional[List[str]], lang: str) -> str:
    s_list = symptoms or []
    if pain_score > 70 or any(s in ["呕吐", "晕倒", "faint", "vomit"] for s in s_list):
        return "🏥 建议急门诊评估：伴随自主神经反射受损（面色苍白/冷汗），请尽快前往急诊排查继发盆腔急腹症。" if lang == "zh" else "🏥 Urgent Gynecological Visit Recommended."
    return "🏠 居家自愈观察" if lang == "zh" else "🏠 Home Self-Care"

def build_exam_advice(mb: Optional[MedicalBackgroundModel], lang: str) -> Dict:
    exam = {
        "name": "妇科盆腔超声检查（彩色多普勒超声）" if lang == "zh" else "Pelvic Color Doppler Ultrasound",
        "preparation": "经阴道彩超需在检查前排空小便（无性生活史者禁用）；经腹部彩超需提前憋尿，可在检查前1小时内饮水500-800ml。" if lang == "zh" else "Empty bladder for transvaginal; full bladder for abdominal.",
        "note": "💡 临床首选无创初筛方案，具体检查组合需由接诊医生评估决定。",
        "alternative": ""
    }
    return exam

def translate_vectors_to_clinical(data: PainData, lang: str) -> str:
    ip = data.intensityProfile or IntensityProfileModel()
    sm = data.spatialMap or SpatialMapModel()
    pressure_val = ip.avgPressure or 0.5
    speed_val = ip.avgSpeed or 5.0
    
    depth = "深层内脏痛（平滑肌微血管缺血）" if pressure_val > 0.6 else "浅表外周敏感"
    speed_desc = "阵发性爆发" if speed_val > 12.0 else "持续性钝性"
    return f"绘制压力（{pressure_val:.2f}）指向{depth}；绘制速度（{speed_val:.1f}）指向{speed_desc}痛感。"

# ═══════════════════════════════════════════════════════════
# 核心生成 API（外层 Try-Catch 全面封堵任何 500 崩溃）
# ═══════════════════════════════════════════════════════════
@app.post("/api/generate")
async def generate_pain_report(data: PainData):
    try:
        lang = str(data.targetLanguage or "zh")
        app_mode = str(data.appMode or "medical").lower()
        mb = data.medicalBackground

        pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
        vector_analysis = translate_vectors_to_clinical(data, lang)

        # 止痛药红线
        allergy = getattr(mb, 'allergies', '') if mb else ''
        painkiller = "对乙酰氨基酚" if allergy in ["ibuprofen", "aspirin", "nsaids"] else "布洛芬"

        pain_location_desc = build_pain_location_desc(data.spatialMap, lang)
        accompanying_symptoms = data.accompanyingSymptoms or []
        accompanying_desc = "、".join(accompanying_symptoms) if accompanying_symptoms else "无特殊伴随症状"
        
        risk_warning = build_risk_warning(mb, lang)
        triage_advice = build_triage_advice(data.painScore, accompanying_symptoms, lang)
        exam_advice = build_exam_advice(mb, lang)

        # ─────────────────────────────────────────────
        # 🏥 【 System Prompt】：临床级严谨规范重构
        # ─────────────────────────────────────────────
        if app_mode == "medical":
            sys_prompt = f"""
You are an expert clinical gynecological intake specialist. You write gynecological admission records (住院/入院记录) for medical consultations.
Your output must be strictly written in the tone, style, and structure of a real Class-A tertiary hospital medical record (参考三甲医院妇科病历书写规范).

【CRITICAL GUIDELINES】
1. NO SOFTWARE JARGON: Never output words like "brush", "canvas", "vectors", "pain score", "frontend" in the medical fields.
2. SYSTEMATIC HISTORY TAKING:
   - "chief_complaint" (主诉): Limit to 20 words. State the core symptom and duration (e.g., "下腹阵发性痉挛性绞痛1天，加重伴冷汗1小时").
   - "present_illness" (现病史): Write a comprehensive clinical paragraph. Begin with the patient's typical menstrual baseline. Detail the onset, trigger, location, radiation, and progression of the current pain. ALWAYS state key NEGATIVE symptoms for differential diagnosis (e.g., "无肛门坠胀感，无异常阴道流血，无尿频尿急..."). Conclude with "病来精神可，食眠正常，大小便无特殊，体重无明显变化。"
   - "past_history" (既往史及个人家族史): Integrate past conditions, psychiatric history, surgeries, allergies, personal stasis habits (long sitting), and genetic risk. Use standardized clinical terms (e.g., "有剖宫产2次个人史").
   - "menstrual_history" (月经史与婚育史): ALWAYS use the standard clinical menstrual formula format:
     初潮年龄 (经期天数/周期天数) 末次月经(LMP)
     Example: 13岁 (7/30天) LMP: 2025-12-01.
     Ob/Gyn history must use the standard formula: G_xP_y (G=Gestation, P=Parturition), indicating details of cesarean deliveries, induced/spontaneous abortions (e.g., "G10P2，剖宫产2次，人工流产8次").
   - "clinical_diagnosis" (初步诊断): Format as a numbered list.
   - "clinical_suggestions" (诊疗讨论及体检心理防护): Provide 2 sections. First, clinical workup discussion (CA125, pelvic ultrasound, etc.). Second, a supportive and deeply reassuring explanation of the pelvic examination (PV/ultrasound) to address and eliminate patient anxiety and dread of clinical boundaries breach (>300 words).
3. The output MUST be a strictly formatted JSON.

【FEW-SHOT ADMISSION RECORD EXAMPLE (ZH)】
{{
  "chief_complaint": "周期性下腹痉挛性绞痛1天，加重伴冷汗、四肢厥冷2小时。",
  "present_illness": "患者既往月经规律，7/30天，量中，无痛经。今日突发经期下腹部痉挛性绞痛，呈阵发性剧烈收缩，VAS评分达8分，痛灶主要位于下腹前壁，呈深层压榨感，向腰骶部及双大腿内侧呈放射性酸胀不适，起病急。伴四肢厥冷、浑身虚脱。无肛门坠胀，无发热，无尿频尿急，无非经期异常流血。口服布洛芬后痛感无明显好转。现为求进一步诊治，以“痛经原因待查（子宫腺肌病可能）”收入院。自发病以来，精神较差，食欲下降，大小便无特殊，体重无明显变化。",
  "past_history": "既往史：健康状况一般。诊断“抑郁状态”5年，规律口服舍曲林、劳拉西泮治疗，病情稳定。手术史：有“剖宫产”术后2次、腹腔镜下子宫肌瘤剔除术后1次。无药物及食物过敏史。个人史：长期久坐少动（工作静态时间>8小时），生活规律。家族史：父亲患肺癌，母亲患乳腺癌，否认家族传染及遗传性疾病史。",
  "menstrual_history": "13 (7/30天) 2025-12-01. 痛经：有，进行性加重。生育史：适龄结婚，G10P2，剖宫产2次，人工流产8次，配偶及子女健康。",
  "clinical_diagnosis": "1. 继发性痛经（子宫内膜异位症并子宫腺肌病可能）\\n2. 子宫平滑肌术后\\n3. 剖宫产个人史\\n4. 抑郁状态",
  "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\\n1. 鉴于患者有多次盆腔手术史（剖宫产及肌瘤剔除），就诊时应请医生评估是否存在慢性盆腔粘连，及是否需要加做血清 CA125 / CA199 联合检测。\\n2. 建议常规预约妇科盆腔多普勒彩超探查。\\n\\n🔬 【妇科专科检查心理防护与引导（致患者）】：\\n妇科专科物理检查（如双合诊、经阴道彩超）是临床明确诊断的首要一步。我们深知检查时身体隐私边界的暴露常带来心理上的紧张、羞耻感和不适。临床医生在进行阴道检查时会严格遵循医疗伦理，于独立屏风后进行操作。检查所用探头十分细小，并使用足量温热的无菌医用耦合剂进行充分润滑。检查开始时，请尝试进行缓慢的深腹式呼吸，主动放松您的盆底肌群（如同排尿时的松弛感），随着气流呼出，探头的探入仅会有轻微的顶胀感。请信任并放心配合接诊医师，保护您的尊严与健康是医学的基本原则。",
  "analogy": "子宫里仿佛有一只铁手，在紧紧拧榨平滑肌，每榨干一次，冷意就直往骨髓里钻，连呼吸都带着冰凉的颤抖。",
  "work": "尊敬的领导/HR您好：\\n本人今日突发重度痉挛性痛经（下腹阵发性痉挛性绞痛），伴冷汗及轻度虚脱。目前体力状态已无法维持正常的专注工作，特申请今日病假/居家休息一天。紧急业务已安排同事协助，望予批准。\\n\n申请人：[您的姓名]",
  "action": [
    "☑️ 准备一个40-45℃的热水袋或保暖暖贴，轻轻敷在她的小腹和后腰处进行物理热敷。",
    "☑️ 倒一杯温开水，备好非NSAIDs类的处方镇痛药（对乙酰氨基酚等），避开过敏源。"
  ],
  "selfCare": [
    "✨ 采用侧卧婴儿式蜷缩，双膝微弯并抱向胸口，释放盆腔深处肌肉张力。",
    "✨ 缓慢深腹式呼吸（吸气4秒，呼气8秒），给高度应激的骨盆血管提供充足的氧气输送。"
  ]
}}
"""
        else:
            # 🎨 【System Prompt】：日常自愈舒缓模式重构
            sys_prompt = f"""
You are a warm, empathetic period self-care companion and somatic guide (经期身体自愈与通感疗愈导师).
Your output must be comforting, highly gentle, and focused on self-healing, emotional breathing, and companion guidance.
The terminology must be easy to read, eliminating any clinical distress or complex medical nomenclature.

【GUIDELINES】
1. Comforting and gentle tone. Give the patient deep reassurance.
2. Structure the output as a clean JSON with fields matching the fallback.
3. Replace clinical diagnoses with somatic and energy-flow terms (e.g., "骨盆血液循环微滞，自主神经张力增高").
"""

        user_prompt = f"""
【前端提交的真实特征向量与基础档案数据（严禁在此范围外编造任何信息）】
- 模式：{app_mode}
- 痛觉主导特征：{pt_dict.get(data.dominantPain)}
- 痛觉累积负荷评分：{data.painScore}/100
- 解剖图谱定位：{pain_location_desc}
{vector_analysis}

【临床/生活背景采集】
- 既往诊断：{get_val_from_mb(mb, "diagnosed")}
- 药物过敏：{get_val_from_mb(mb, "allergies")}
- 初潮年龄：{getattr(mb, 'menarcheAge', '13') if mb else '13'}
- 月经规律：{getattr(mb, 'cycleRegular', '规律') if mb else '规律'}
- 经期天数：{getattr(mb, 'periodDuration', '5') if mb else '5'}
- 末次月经(LMP)：{getattr(mb, 'lastPeriod', '未提供') if mb else '未提供'}
- 伴随症状：{accompanying_desc}
- 生育史背景：{', '.join(getattr(mb, 'reproductiveHistoryArr', [])) if mb else '未生育'}
- 个人久坐/作息背景：{', '.join(getattr(mb, 'lifestyleArr', [])) if mb else '无'}

【生成语境及语气优先偏好】：{data.tonePreference}

请根据以上真实数据特征，直接输出一个完整且字数饱满的 JSON 结果（不要有 markdown ``` 包装，只返回 JSON）：
"""

        model_name = config["model_quick"] if data.isQuickLog else config["model"]

        # 请求大模型
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
                "temperature": 0.2,
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
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            raw_text = completion.choices[0].message.content

        # 解析与提取 JSON
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
        print(f"⚠️ 触发安全降级保护: {e}")
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
# 降级备用模版
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
                "clinical_diagnosis": "【骨盆感知】：交感神经紧张度增高、盆腔静脉微淤。",
                "clinical_suggestions": "【自愈释压指南】：\\n1. 【抱膝放松法】：侧卧婴儿式，用手微抱双膝，使后部腰骶自然弯曲伸展，缓解腰椎后群肌压力。\\n2. 【意念身体扫描】：将手覆在关元穴（腹部中线脐下三寸），吸气4秒，深长呼气8秒，释放盆腔内压。",
                "analogy": "小腹内像藏着一个不断微弱充气的酸热气球，发胀、微木，沉甸甸地牵坠着后腰。",
                "work": "您好：\\n本人今日突发严重的生理期酸胀坠痛，身体状况不佳，精力无法集中。特申请今日请假/居家休息一天。紧急工作会在恢复后及时处理。\\n\n申请人：[您的姓名]",
                "action": [
                    "☑️ 将手掌合十搓热，平敷于她小腹下方的关元穴，通过体温传导温和舒缓充血坠胀。",
                    "☑️ 备好42℃左右温热水，尽量保持卧室光线柔和避光，减少感官刺激。"
                ],
                "selfCare": [
                    "✨ 允许自己安静静卧。身体的痛楚是真实的生理重塑，今天休息也是有价值的治疗。",
                    "✨ 配合深长吸气，将氧气送入盆腔深处，温和缓解缺氧痉挛。"
                ]
            }
        else:
            return {
                "chief_complaint": "下腹部阵发性痉挛性绞痛1天，加重伴下腹坠痛1小时。",
                "present_illness": "患者既往月经规律。今日突发月经期下腹部痉挛性绞痛，阵发加剧，VAS评分最高达7分，痛感深在，向腰骶部及左大腿放射。无肛门坠胀感，无发热，无尿频尿急。自行口服布洛芬后痛感缓解有限。现为求进一步诊治求诊。患者病来精神一般，大小便无特殊，体重无异常变化。",
                "past_history": "既往史：身体状况良好。无胃溃疡及其他慢性躯体疾病史。手术史：剖宫产2次个人史。过敏史：否认已知食物、药物过敏。",
                "menstrual_history": "13 (5/28天) LMP: 2026-03-11. 痛经：有。生育史：G2P2，剖宫产2次，无人工流产史。",
                "clinical_diagnosis": "1. 原发性痉挛性痛经（子宫内膜平滑肌痉挛）\\n2. 剖宫产术后",
                "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\\n1. 结合剖宫产既往手术病史，请医生在行盆腔超声检查时评估是否存在局部微粘连或腺肌症局灶病灶。\\n2. 讨论口服镇痛抗炎药物的针对性调节。\\n\\n🔬 【妇科专科检查消除恐惧指南】：\\n妇科超声（彩超）及妇检检查是极基础的无创初筛排查方法。检查探头极其细小，表面会覆盖一次性无菌橡胶套并涂抹足量的温润耦合剂，探入过程中请配合医生深吸气-呼气动作。放松盆底括约肌，检查仅会产生短暂异物顶胀感。医生会提供充分的屏风和隐私防护，保护您的边界和检查尊严。请放心配合医生，尽早明确病灶原因。",
                "analogy": "小腹内像藏着一个上紧了发条的金属夹子，在不断收缩拧动，冷意带着尖锐的酸麻感直窜后脊。",
                "work": "尊敬的领导/HR您好：\\n本人今日经期急性痛经（下腹阵发性痉挛性绞痛）发作，目前身体状况欠佳，无法支持正常的专注工作。特申请病假一天，紧急事务已向部门同事进行交接，非常感谢您的准允。\\n\n申请人：[您的姓名]",
                "action": [
                    f"☑️ 准备好温热热水袋或暖贴，敷于其下腹关元穴或后腰骶区进行温和理疗。",
                    f"☑️ 倒一杯温热开水，备好非NSAIDs类的处方镇痛药（如{painkiller}），避开已知药物过敏原。"
                ],
                "selfCare": [
                    "✨ 采用侧卧婴儿蜷缩式躺下，在双膝间夹小靠枕，释放盆腔微血管压力。",
                    "✨ 禁食生冷冰冻饮品，小口慢饮热水或热红枣姜茶促进盆腔血液灌注。"
                ]
            }
    else:
        # English Mirror Fallback
        if is_general:
            return {
                "chief_complaint": "Somatic Reflection: Today the lower pelvis feels compressed with continuous heavy waves of bloating.",
                "present_illness": "Somatic assessment indicates mild spasmodic uterine contractions accompanied by localized pelvic congestion. Long sedentary habits can impede microvascular circulation. Mindful breathing and warmth are recommended to pacify pelvic floor myofascial tension.",
                "past_history": "Sedentary routine with occasional sleep irregularity. Pelvic circulation can be enhanced through localized stretching during intermenstrual periods.",
                "menstrual_history": "Menstrual cycle is documented, currently in active menstruation.",
                "clinical_diagnosis": "Somatic State: Pelvic myofascial congestion & elevated autonomic tone.",
                "clinical_suggestions": "Holistic Pelvic Restoration Guide:\n1. Constructive Rest Position: Lie down with knees bent and elevated on a pillow to gently redirect pelvic blood pooling.\n2. Guided Body Scan: Focus awareness on your lower abdomen (Guanyuan acupoint). Inhale for 4 seconds, exhale slowly for 8 seconds, releasing localized tension.",
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
                "present_illness": "Patient reports regular menstrual baseline (7/30 days). Sudden onset of severe spasmodic cramping in lower abdomen, peak VAS score 7/10, radiating to lower back. No rectal pressure, no fever. Oral ibuprofen provided minimal relief. Admitted for further diagnostic workup. Appetite and sleep generally poor since onset, bowel movements normal.",
                "past_history": "Past History: Generally healthy. No chronic gastrointestinal or organic diseases. Surgical history: Cesarean delivery × 2. Allergies: Denies known food or drug allergies.",
                "menstrual_history": "13 (5/28 days) LMP: 2026-03-11. Dysmenorrhea: Yes. Obstetrical History: G2P2 (Cesarean section × 2).",
                "clinical_diagnosis": "1. Secondary spasmodic dysmenorrhea (possible pelvic adhesion / adenomyosis)\n2. Cesarean section status post",
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