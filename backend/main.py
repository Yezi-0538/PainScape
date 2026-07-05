# main.py
# ═══════════════════════════════════════════════════════════
# PainScape 后端服务网关 (已对齐防幻觉、防揣测、时序纠正与避责红线)
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
def get_val_from_mb(mb: Optional[MedicalBackgroundModel], key: str, fallback: str = "未详述") -> str:
    if not mb:
        return fallback
    val = getattr(mb, key, "")
    if not val or val in ["none", "unchecked", "unknown", ""]:
        return fallback
    return str(val)

def get_surgical_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    surg_val = getattr(mb, 'surgicalHistory', '') if mb else ''
    if lang == "zh":
        surgical_map = {
            "none": "无明确大型外科手术史",
            "abdominal": "有腹部手术史（如阑尾切除术等）",
            "pelvic": "有盆腔手术史（如卵巢囊肿切除术等）",
            "other": "有其他手术史"
        }
        return surgical_map.get(str(surg_val).lower(), "无明确大型外科手术史")
    else:
        surgical_map = {
            "none": "No significant surgical history",
            "abdominal": "History of abdominal surgery",
            "pelvic": "History of pelvic surgery",
            "other": "History of other surgery"
        }
        return surgical_map.get(str(surg_val).lower(), "No significant surgical history")

def get_reproductive_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    repo_list = getattr(mb, 'reproductiveHistoryArr', []) if mb else []
    if lang == "zh":
        repo_map = {
            "nulliparous": "未婚未育（无怀孕史，无生育史，G0P0）",
            "pregnant": "有妊娠史（孕中未生产）",
            "parous": "有分娩史（已生育）",
            "spontaneousAbortion": "既往自然流产史",
            "inducedAbortion": "既往人工/药物流产史",
            "multiple": "多次分娩史"
        }
        desc_list = [repo_map.get(str(r), str(r)) for r in repo_list if r]
        return "、".join(desc_list) if desc_list else "未婚未育（G0P0，无孕产史）"
    else:
        repo_map = {
            "nulliparous": "Nulliparous (G0P0, no pregnancy or birth history)",
            "pregnant": "Pregnant (currently pregnant, not yet delivered)",
            "parous": "Parous (has given birth)",
            "spontaneousAbortion": "History of spontaneous abortion",
            "inducedAbortion": "History of induced abortion",
            "multiple": "History of multiple births"
        }
        desc_list = [repo_map.get(str(r), str(r)) for r in repo_list if r]
        return ", ".join(desc_list) if desc_list else "Nulliparous (G0P0, no pregnancy or birth history)"

def get_cycle_regular_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    val = getattr(mb, 'cycleRegular', '') if mb else ''
    if lang == "zh":
        reg_map = {
            "regular": "规律（周期稳定）",
            "irregular": "不规律（周期波动大）",
            "unsure": "不太确定"
        }
        return reg_map.get(str(val).lower(), "未详述")
    else:
        reg_map = {
            "regular": "Regular",
            "irregular": "Irregular",
            "unsure": "Unsure"
        }
        return reg_map.get(str(val).lower(), "Unspecified")

def get_period_duration_desc(mb: Optional[MedicalBackgroundModel], lang: str) -> str:
    val = getattr(mb, 'periodDuration', '') if mb else ''
    if not val or str(val).lower() in ["none", "unchecked", "unknown", ""]:
        return "未详述" if lang == "zh" else "Unspecified"
    if str(val) == "over7":
        return "超过7天" if lang == "zh" else "Over 7 days"
    return f"{val}天" if lang == "zh" else f"{val} days"

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
# 核心生成 API
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
        accompanying_desc = "、".join(accompanying_symptoms) if accompanying_symptoms else "未诉异常伴随症状"
        
        risk_warning = build_risk_warning(mb, lang)
        triage_advice = build_triage_advice(data.painScore, accompanying_symptoms, lang)
        exam_advice = build_exam_advice(mb, lang)

        surg_desc = get_surgical_desc(mb, lang)
        repo_desc = get_reproductive_desc(mb, lang)
        cycle_reg_desc = get_cycle_regular_desc(mb, lang)
        period_dur_desc = get_period_duration_desc(mb, lang)

        menarche_val = get_val_from_mb(mb, 'menarcheAge', '未详述')
        menarche_desc = f"{menarche_val} 岁" if menarche_val != "未详述" else "未详述"

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
   - "present_illness" (现病史): Write a comprehensive clinical paragraph based ONLY on provided clinical data. Detail the onset, trigger, location, radiation, and progression of the current pain.
   - "past_history" (既往史及个人家族史): Integrate past conditions, psychiatric history, surgeries, allergies, personal stasis habits, and genetic risk. Use standardized clinical terms.
   - "menstrual_history" (月经史与婚育史): ALWAYS use the standard clinical menstrual formula format:
     初潮年龄 (经期天数/周期天数) 末次月经(LMP)
     Example: 13岁 (7/30天) LMP: 2025-12-01.
     Ob/Gyn history must use the standard formula: G_xP_y (G=Gestation, P=Parturition), indicating details of cesarean deliveries, induced/spontaneous abortions.
   - "clinical_diagnosis" (初步诊断): Format as a numbered list.
   - "clinical_suggestions" (诊疗讨论及体检心理防护): Provide 2 sections. First, clinical workup discussion. Second, a supportive explanation of the pelvic examination.
3. The output MUST be a strictly formatted JSON.
4. STRICT MATCHING OF PREGNANCY & SURGICAL HISTORY (孕产史与手术史绝对对齐红线):
   - You must strictly align "past_history", "menstrual_history", and "clinical_diagnosis" with the patient's actual "reproductiveHistoryArr" (生育史背景) and "surgicalHistory" (外科手术史) provided in the user prompt.
   - If the user has "nulliparous" or is never pregnant (未婚未育/G0P0), "menstrual_history" MUST state G0P0 (no pregnancy/delivery history). You are STRICTLY FORBIDDEN from mentioning "cesarean section" (剖宫产), "induced abortion" (人工流产), or "P2" (Parturition=2) in any field!
   - If the user has "none" or no surgical history, "clinical_diagnosis" and "past_history" MUST NOT contain "post-cesarean section status" (剖宫产术后), "post-operative state" or any surgical diagnosis!
   - The few-shot example contains "剖宫产2次" and "G10P2" as formatting references only. NEVER copy these values directly if the user's input is nulliparous or has no surgeries.
5. NO SPECULATION OR INVENTIONS (严禁无中生有与主观揣测):
   - Do NOT invent, assume, or speculate on any medical, physiological, or personal data. Only use what is explicitly provided.
   - NO SPECULATIVE NEGATIVE SYMPTOMS: Do NOT list standard negative symptoms (e.g., "无异常阴道流血", "无肛门坠胀感", "无发热寒战", "无恶心呕吐") unless they are derived from empty accompanying symptoms. If they are not in the input, do NOT claim them; instead, state "未诉其余伴随异常指征".
   - NO CHRONIC DISEASE FABRICATION: Do NOT write statements like "否认高血压、糖尿病、心脏病等" if the input does not mention them. Instead, write "既往躯体慢性病史未详述".
   - NO HABIT OR FAMILY HALLUCINATIONS: Do NOT assume or write that the patient denies smoking, drinking, mental illness, or family history of genetic disorders if they are not provided in the input. Write "个人史与家族史详见背景采集".
   - NO CONCLUDING CLINICAL PLATITUDES: Do NOT assume or output phrases like "病来精神可，食眠正常，大小便无特殊，体重无明显变化" if these were not provided. Instead, write "全身系统状况未详述".
6. LAST MENSTRUAL PERIOD (LMP) TEMPORAL ACCURACY (末次月经与当前发作时序红线):
   - LMP (末次月经) is the first day of the *previous* menstruation, which is already in the past (usually 20-30+ days ago).
   - The current dysmenorrhea is a *new, active episode* associated with the *current* menstrual phase (typically starting today, or 1 to 4 days ago based on the chief complaint).
   - NEVER write that the current pain has been continuous "since the LMP" (e.g., do NOT write "自末次月经起出现下腹痛至今"). Instead, state: "患者自本次行经/临近行经（或1天前/4天前起，根据主诉）出现下腹痛...末次月经（LMP）为XXXX...".
7. HEDGED CLINICAL ADVICE & LIABILITY MITIGATION (临床建议模糊化/避责红线):
   - To prevent medical liability risks, ALL clinical judgments, suspected screening directions, examination recommendations, and self-care/medication suggestions (except for the absolute drug allergy contraindications) MUST use non-definitive, tentative, and probabilistic language.
   - Use words like "可能" (possibly), "可以考虑" (could consider), "建议排查" (recommend screening for), "待排" (to be ruled out), "筛查方向" (screening direction), "评估" (evaluate), "探讨" (discuss/explore).
   - NEVER use absolute or deterministic phrasing like "确诊为", "首选检查是", "必须检查" etc.
8. GYNECOLOGICAL EXAM & CLINICAL PREPARATIONS GUIDELINES (就诊检查建议与准备红线):
   - In "clinical_suggestions", you must recommend specific examinations matching the patient's age and sexual history.
   - NO SEXUAL HISTORY/ADOLESCENT PROTECTION: If the patient is under 18, nulliparous, or has no history of sexual activity, DO NOT recommend "transvaginal ultrasound" or invasive exams! Instead, recommend "transabdominal pelvic ultrasound" and clearly note the preparation.

【FEW-SHOT EXAMPLE】
{{"chief_complaint": "行经期第2天突发急性下腹痉挛性绞痛，伴恶心呕吐与后背放射感1天。", "present_illness": "患者既往月经规律。今日处于行经期第2天，前列腺素水平达峰，子宫平滑肌呈高频强烈收缩，突发急性下腹部持续性收紧绞痛，呈阵发性剧烈加重。伴有乳房酸胀痛及腰骶部明显坠胀。今日未自行服用药物。由于患者既往对布洛芬过敏，本次发作未进行NSAIDs类药物镇痛。病期无发热、无休克、无昏厥。尚未进行本次急症超声定位检查。", "past_history": "既往确诊‘子宫内膜异位症’病史。既往行剖宫产术2次。否认高血压、心脑血管病史。明确对布洛芬（NSAIDs）类药物过敏。", "menstrual_history": "月经初潮13岁。经期持续5天，周期28-30天，规律。末次月经（LMP）为2026年6月1日。当前处于经期急性疼痛高发阶段。生育史：双胎剖宫产G2P2。", "clinical_diagnosis": "1. 原发性痛经（子宫内膜异位症引起可能）\n2. 剖宫产术后", "clinical_suggestions": "限制为：1. 讨论口服药物的选择。2. 建议常规预约盆腔多普勒彩超探查。\n🔬 【妇科专科检查心理防护与引导】：\n妇科专科检查是基础评估手段，操作过程会最大程度尊重患者隐私，在独立屏风后由医生操作。检查开始时，请尝试进行缓慢的深腹式呼吸，主动放松您的盆底肌群...", "analogy": "像是肚子里有一把冰冷的铁钳子，正用力夹住子宫死死拧绞，每拧一下，后腰就跟着一阵发木发胀，连呼吸都觉得被生生拽住。", "work": "因今日突发重度生理期绞痛及全身虚脱，无法支持工作，特申请病假休息一天，紧急事务已妥善交接。", "action": ["☑️ 搓热手掌贴在她小腹上轻轻捂热，或放置温热的热水袋，温度不可过高以免烫伤。", "☑️ 由于她布洛芬过敏，切勿擅自准备布洛芬！可以倒一杯温开水并准备好对乙酰氨基酚，督促她温服。"], "selfCare": ["✨ 痛经是身体内部平滑肌痉挛引起的切实物理伤害。请允许自己今天躺平，不生产任何价值也无需抱有任何愧疚感。", "✨ 采用侧卧婴儿蜷缩位，用松软枕头夹在双侧膝盖之间，能够最快释放盆腔及骶骨处的充血张力，缓解绞痛。", "✨ 缓慢腹式深吸气（4秒吸气，8秒拉长呼气），长呼气可以调动副交感神经，使子宫血管松弛缓解缺血。"]}}
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
- 年龄段：{get_val_from_mb(mb, "age", "未详述")}
- 既往诊断：{get_val_from_mb(mb, "diagnosed", "未详述")}
- 外科手术史：{surg_desc}
- 生育史背景：{repo_desc}
- 药物过敏：{get_val_from_mb(mb, "allergies", "未详述")}
- 初潮年龄：{menarche_desc}
- 月经规律：{cycle_reg_desc}
- 经期天数：{period_dur_desc}
- 末次月经(LMP)：{get_val_from_mb(mb, "lastPeriod", "未提供")}
- 伴随症状：{accompanying_desc}
- 个人久坐/作息背景：{', '.join(getattr(mb, 'lifestyleArr', [])) if mb and getattr(mb, 'lifestyleArr', None) else '无'}

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
        fb = _fallback_response(lang, painkiller, app_mode, data)

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
        fallback = _fallback_response(lang, painkiller, app_mode, data)
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
def _fallback_response(lang: str, painkiller: str, app_mode: str, data: PainData) -> dict:
    is_general = app_mode == "general"
    mb = data.medicalBackground
    
    diagnosed = get_val_from_mb(mb, "diagnosed", "无已知妇科诊断病史" if lang == "zh" else "No diagnosed Ob/Gyn history")
    allergies = get_val_from_mb(mb, "allergies", "无明确药物过敏史" if lang == "zh" else "No known drug allergies")
    menarche = getattr(mb, 'menarcheAge', '13') if mb else '13'
    
    cycle_reg_map = {"regular": "规律", "irregular": "不规律", "unsure": "不确定"} if lang == "zh" else {"regular": "regular", "irregular": "irregular", "unsure": "unsure"}
    cycle_reg = cycle_reg_map.get(getattr(mb, 'cycleRegular', ''), '规律' if lang == "zh" else "regular")
    
    period_dur = getattr(mb, 'periodDuration', '5') if mb else '5'
    lmp = getattr(mb, 'lastPeriod', '未提供' if lang == "zh" else "Not provided")
    
    surg_desc = get_surgical_desc(mb, lang)
    repo_desc = get_reproductive_desc(mb, lang)

    if lang == "zh":
        if is_general:
            return {
                "chief_complaint": "【身体感知】小腹酸胀不适伴腰部酸痛感。",
                "present_illness": "平滑肌轻度痉挛收缩，伴骨盆局部血管微滞与坠重。建议配合温热热敷与舒缓长呼吸，松弛盆底肌肉阻抗。",
                "past_history": f"既往健康状况一般。{surg_desc}。习惯性久坐少动。",
                "menstrual_history": f"月经周期{cycle_reg}，目前处于月经行经期第1-2天。",
                "clinical_diagnosis": "【骨盆感知】：交感神经紧张度增高、盆腔静脉微淤。",
                "clinical_suggestions": "【自愈释压指南】：\n1. 【抱膝放松法】：侧卧婴儿式，用手微抱双膝，使后部腰骶自然弯曲伸展，缓解腰椎后群肌压力。\n2. 【意念身体扫描】：将手覆在关元穴（腹部中线脐下三寸），吸气4秒，深长呼气8秒，释放盆腔内压。",
                "analogy": "小腹内像藏着一个不断微弱充气的酸热气球，发胀、微木，沉甸甸地牵坠着后腰。",
                "work": "您好：\n本人今日突发严重的生理期酸胀坠痛，身体状况不佳，精力无法集中。特申请今日请假/居家休息一天。紧急工作会在恢复后及时处理。\n\n申请人：[您的姓名]",
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
            diag_list = ["1. 原发性痉挛性痛经（子宫内膜平滑肌痉挛可能）"]
            surg_val = getattr(mb, 'surgicalHistory', '') if mb else ''
            if surg_val in ["pelvic", "abdominal", "other"]:
                diag_list.append(f"2. {surg_desc}")
            diag_desc = "\n".join(diag_list)

            return {
                "chief_complaint": "下腹部阵发性痉挛性绞痛1天，加重伴下腹坠痛1小时。",
                "present_illness": "患者既往月经规律。今日突发月经期下腹部痉挛性绞痛，阵发加剧，痛感深在，向腰骶部及左大腿放射。无肛门坠胀感，无发热，无尿频尿急。自行口服布洛芬后痛感缓解有限。现为求进一步诊治求诊。患者病来精神一般，大小便无特殊，体重无异常变化。",
                "past_history": f"既往史：健康状况良好。无胃溃疡及其他慢性躯体疾病史。手术史：{surg_desc}。过敏史：{allergies}。",
                "menstrual_history": f"{menarche} ({period_dur}/28天) LMP: {lmp}. 痛经：有。生育史：{repo_desc}。",
                "clinical_diagnosis": diag_desc,
                "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\n1. 结合既往健康档案及痛觉表现，建议请医生在行盆腔超声检查时评估是否存在局部痉挛或潜在病灶。\n2. 讨论口服镇痛抗炎药物的针对性调节。\n\n🔬 【妇科专科检查消除恐惧指南】：\n妇科超声及妇检检查是极基础的无创初筛排查方法。如果推荐您进行相关检查，请配合医生进行深慢呼吸，主动放松盆底括约肌。医生会提供充分的屏风和隐私防护以保护您的隐私边界与检查尊严。请放心配合医生，尽早明确病灶原因。",
                "analogy": "小腹内像藏着一个上紧了发条的金属夹子，在不断收缩拧动，冷意带着尖锐的酸麻感直窜后脊。",
                "work": "尊敬的领导/HR您好：\\n本人今日经期急性痛经（下腹阵发性痉挛性绞痛）发作，目前身体状况欠佳，无法支持正常的专注工作。特申请病假一天，紧急事务已向部门同事进行交接，非常感谢您的准允。\\n\n申请人：[您的姓名]",
                "action": [
                    f"☑️ 准备好温热热水袋或暖贴，敷于其下腹关元穴或后腰骶区进行温和理疗。",
                    f"☑️ 倒一杯温热开水，备好安全类镇痛药（如{painkiller}），避开已知药物过敏原。"
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
                "present_illness": "Somatic assessment indicates mild spasmodic uterine contractions accompanied by localized pelvic congestion. Mindful breathing and warmth may be considered to pacify pelvic floor myofcial tension.",
                "past_history": f"Generally healthy. {surg_desc}. Irregular schedule/night shifts.",
                "menstrual_history": f"Menarche at {menarche}. Cycle: {cycle_reg}. Duration: {period_dur} days. LMP: {lmp}.",
                "clinical_diagnosis": "Primary dysmenorrhea / Pelvic congestion screening required.",
                "clinical_suggestions": f"Rest, apply local heat therapy. Consult physician for pharmacological intervention. Recommended non-allergenic analgesic: {painkiller}.",
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
                "status": "success",
                "language": "en",
                "chief_complaint": f"Chief complaint: Cyclic dysmenorrhea with lower abdominal pain on menstrual day {data.cycleDay}.",
                "present_illness": f"The patient reports cyclic, spasmodic lower abdominal pain associated with menses. Pain intensity is quantified at {data.painScore}/100 based on visual drawing telemetry. Aggravated during menstruation with localized pelvic sensation.",
                "past_history": f"Past History: Generally healthy. Surgery: {surg_desc}. Allergies: {allergies}.",
                "menstrual_history": f"Menarche at {menarche} ({period_dur}/28 days) LMP: {lmp}. Dysmenorrhea: Yes. Obstetrical History: {repo_desc}.",
                "clinical_diagnosis": f"1. Primary spasmodic dysmenorrhea\n2. {surg_desc}",
                "clinical_suggestions": "【Points to discuss with your doctor】:\n1. Discuss the risk of pelvic tissue adhesions and localized lesions with your gynecologist during your pelvic ultrasound.\n2. Ask whether pelvic ultrasound screening is appropriate.\n\n🔬 【Pelvic Examination Reassurance Guide】:\nPelvic examinations and Doppler ultrasounds are routine non-invasive screening procedures. The physician operates behind private screens to fully respect your physical boundaries and preserve patient dignity. Please stay relaxed during the exam.",
                "analogy": "Like an iron clamp twisting tightly inside the deep pelvis, sending paroxysms of acute stiffness straight up the spine.",
                "work": "Dear Manager/HR,\nI am writing to request sick leave for today as I am experiencing severe spasmodic dysmenorrhea (acute lower abdominal cramping). Urgent tasks have been delegated. Thank you for your support and understanding.\n\nSincerely,\n[Your Name]",
                "action": [
                    "☑️ Apply a warm compress or heating pad (40-45°C) to her lower back and lower abdomen.",
                    f"☑️ Prepare warm water and have her safe pain reliever (e.g. {painkiller}) ready, keeping her away from allergens."
                ],
                "selfCare": [
                    "✨ Lie down in a fetal position, placing a soft pillow between your knees to reduce uterine pelvic strain.",
                    "✨ Avoid any cold beverages. Sip warm water slowly to encourage blood perfusion."
                ]
            }