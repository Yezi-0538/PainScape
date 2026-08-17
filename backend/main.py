# main.py
# ═══════════════════════════════════════════════════════════
# PainScape 后端服务网关 (已对齐防篡改、翻译字典、数值脱敏与温情引导红线)
# ═══════════════════════════════════════════════════════════

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any, Tuple
import os
import json
import re
import uuid
import requests
import traceback
from dotenv import load_dotenv
from openai import OpenAI
from datetime import datetime, date

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
        "display_name": "Vivo蓝心大模型网关",
    },
}

PAIN_MAP = {
    "zh": {
        "spasmodic": "痉挛性收缩感",
        "dull": "持续性沉闷感",
        "bloating": "坠胀性轻度不适",
        "sharp": "表浅局部酸痛",
    },
    "en": {
        "spasmodic": "spasmodic contraction sensation",
        "dull": "persistent dull sensation",
        "bloating": "mild bloating discomfort",
        "sharp": "localized surface soreness",
    },
}

CYCLE_PHASE_MAP = {
    "zh": {
        "menstrual": "月经期",
        "pre": "经前期（黄体期）",
        "post": "经后期（卵泡期）",
        "ovulation": "排卵期",
        "unknown": "未指定",
    },
    "en": {
        "menstrual": "Menstrual Phase",
        "pre": "Premenstrual Phase (Luteal Phase)",
        "post": "Postmenstrual Phase (Follicular Phase)",
        "ovulation": "Ovulation Phase",
        "unknown": "Not Specified",
    },
}

CYCLE_PHASE_PHYSIOLOGY = {
    "zh": {
        "menstrual": "患者处于月经期第{day}天，盆腔微循环处于自然生理充血状态。",
        "pre": "患者处于经前期（黄体期），盆腔血管张力处于周期性峰值状态。",
        "post": "患者处于经后期（卵泡期），盆腔微循环处于修复重建期。",
        "ovulation": "患者处于排卵期，盆腔神经末梢敏感度处于周期性高点。",
        "unknown": "患者处于月经周期的某个阶段。",
    },
    "en": {
        "menstrual": "The patient is on Day {day} of her menstrual cycle, with pelvic microcirculation in its natural physiological congestion state.",
        "pre": "The patient is in the premenstrual (luteal) phase, with pelvic vascular tone at its cyclical peak.",
        "post": "The patient is in the postmenstrual (follicular) phase, with pelvic microcirculation in a repair and remodeling state.",
        "ovulation": "The patient is in the ovulation phase, with pelvic nerve endings at a cyclical peak of sensitivity.",
        "unknown": "The patient is at an unspecified phase of the menstrual cycle.",
    },
}

CYCLE_PHASE_MENSTRUAL_HISTORY = {
    "zh": {
        "menstrual": "当前处于月经期第{day}天。痛经：有。",
        "pre": "当前处于经前期（黄体期），预计{day}天后月经来潮。痛经：有（经前综合征表现）。",
        "post": "当前处于经后期（卵泡期），距末次月经已{day}天。痛经：有。",
        "ovulation": "当前处于排卵期（月经周期中期）。痛经：有（排卵痛可能）。",
        "unknown": "周期阶段未详述。痛经：有。",
    },
    "en": {
        "menstrual": "Currently on Day {day} of menstruation. Dysmenorrhea: Present.",
        "pre": "Currently in the premenstrual (luteal) phase, with menses expected in approximately {day} days. Dysmenorrhea: Present (PMS manifestation).",
        "post": "Currently in the postmenstrual (follicular) phase, {day} days since last menstrual period (LMP). Dysmenorrhea: Present.",
        "ovulation": "Currently in the ovulation phase (mid-cycle). Dysmenorrhea: Present (possible ovulatory pain).",
        "unknown": "Cycle phase not specified. Dysmenorrhea: Present.",
    },
}

LIFESTYLE_DICT = {
    "zh": {
        "sleepShort": "睡眠时长不足/熬夜",
        "sleepIrregular": "作息紊乱/夜班",
        "smoking": "有吸烟习惯",
        "alcohol": "有饮酒习惯",
        "caffeine": "过量咖啡因摄入",
        "coldFood": "喜食生冷冰饮",
        "spicy": "嗜食辛辣刺激食物",
        "weightLoss": "处于极端减重/节食期",
    },
    "en": {
        "sleepShort": "sleep deprivation/insufficient sleep",
        "sleepIrregular": "irregular sleep schedule/night shifts",
        "smoking": "smoking habit",
        "alcohol": "alcohol consumption",
        "caffeine": "excessive caffeine intake",
        "coldFood": "preference for cold/iced drinks",
        "spicy": "preference for spicy food",
        "weightLoss": "currently on extreme diet/weight loss",
    },
}

FAMILY_HISTORY_DICT = {
    "zh": {
        "mother": "母亲有痛经史",
        "sister": "胞姐/胞妹有痛经史",
        "none": "明确无家族史",
        "unknown": "家族痛经史不详",
    },
    "en": {
        "mother": "Maternal history of dysmenorrhea",
        "sister": "Sister with severe dysmenorrhea",
        "none": "No family history of dysmenorrhea",
        "unknown": "Family history unknown",
    },
}

REPRODUCTIVE_DICT = {
    "zh": {
        "nulliparous": "未生育（无怀孕史，无生育史）",
        "pregnant": "已孕未生产",
        "parous": "有分娩史（已生育）",
        "spontaneousAbortion": "既往自然流产史",
        "inducedAbortion": "既往人工终止妊娠/流产史",
    },
    "en": {
        "nulliparous": "Nulliparous (no pregnancy or birth history)",
        "pregnant": "Currently pregnant",
        "parous": "Parous (has given birth)",
        "spontaneousAbortion": "History of spontaneous abortion",
        "inducedAbortion": "History of induced/medical abortion",
    },
}

WORK_SCENARIOS = {
    "zh": {
        "manager": {
            "label": "向领导/上级请假",
            "formal": "因身体不适，申请今天休假一天。紧急事务已交接，明天恢复正常工作。",
            "neutral": "今天身体不适，请假一天。工作已安排妥当。",
            "casual": "身体不太舒服，今天请假休息一天，不好意思。",
        },
        "teacher": {
            "label": "向老师/教授请假",
            "formal": "因身体不适，今日无法到课。已安排同学代为记录课堂内容。",
            "neutral": "今天身体不适，请假缺席课程。会及时补上学习内容。",
            "casual": "老师好，今天身体不舒服，请一天假。后续会补上笔记。",
        },
        "friend": {
            "label": "向朋友推约",
            "formal": "今天身体不适，需取消本次见面。改日再约，抱歉。",
            "neutral": "今天不太舒服，咱们改天再约吧。",
            "casual": "身体有点扛不住了，今天先鸽了，回头约！",
        },
        "client": {
            "label": "向客户/合作伙伴改约",
            "formal": "因突发身体不适，需将今日会议改期。已协调同事代为对接，给您带来不便深表歉意。",
            "neutral": "今天身体不适，需要将会议改期。已安排同事协助对接。",
            "casual": "今天临时身体不适，会议改天再约。相关问题已同步给同事。",
        },
        "partner": {
            "label": "向伴侣/家人说明",
            "formal": "今天身体不适，需要安静休息。晚间事宜需请你代为处理。",
            "neutral": "今天不太舒服，想好好休息一下。家里的事麻烦你多担待。",
            "casual": "今天疼得厉害，想躺平一天。辛苦你照顾啦。",
        },
    },
    "en": {
        "manager": {
            "label": "To Manager/Supervisor",
            "formal": "Requesting sick leave today. Urgent matters have been delegated. Expected return tomorrow.",
            "neutral": "Taking a sick day today. Work is covered.",
            "casual": "Not feeling well today — taking the day off. Will catch up tomorrow.",
        },
        "teacher": {
            "label": "To Professor/Teacher",
            "formal": "Unable to attend class today due to a health condition. Arranged for notes to be shared.",
            "neutral": "Can't make it to class today — health flare-up. Will catch up on materials.",
            "casual": "Professor — not feeling well today. Will get notes from a classmate.",
        },
        "friend": {
            "label": "To Friend (Cancel Plans)",
            "formal": "Need to cancel today's plans due to a health issue. Let's reschedule soon.",
            "neutral": "Not feeling great today — let's reschedule.",
            "casual": "Feeling rough today — gonna have to rain check. Let's catch up soon!",
        },
        "client": {
            "label": "To Client/Partner (Reschedule)",
            "formal": "Due to a sudden health matter, I need to reschedule today's meeting. A colleague will handle urgent matters. Apologies for the inconvenience.",
            "neutral": "Need to reschedule today's meeting due to a health issue. A colleague is briefed and available.",
            "casual": "Not feeling well today — need to push our meeting. Colleague is up to speed if anything urgent.",
        },
        "partner": {
            "label": "To Partner/Family",
            "formal": "Need to rest today due to a health condition. Would appreciate your support with household matters.",
            "neutral": "Not feeling great today. Need some quiet rest — could use your help around the house.",
            "casual": "Feeling awful today — going to be horizontal. Thanks for taking care of things.",
        },
    },
}


def calculate_cycle_day_from_lmp(lmp_str: Optional[str], reference_date: Optional[date] = None) -> Tuple[Optional[int], str]:
    if not lmp_str:
        return None, "unknown"
    if reference_date is None:
        reference_date = date.today()
    try:
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%m/%d/%Y", "%d/%m/%Y"]:
            try:
                lmp_date = datetime.strptime(lmp_str.strip(), fmt).date()
                break
            except ValueError:
                continue
        else:
            return None, "unknown"
    except Exception:
        return None, "unknown"
    delta = (reference_date - lmp_date).days
    if delta < 0:
        return None, "unknown"
    day_in_cycle = delta % 28
    if day_in_cycle == 0:
        day_in_cycle = 28
    if 1 <= day_in_cycle <= 7:
        phase = "menstrual"
    elif 8 <= day_in_cycle <= 14:
        phase = "post"
    elif 15 <= day_in_cycle <= 21:
        phase = "ovulation"
    else:
        phase = "pre"
    if phase == "pre":
        days_until_menses = 28 - day_in_cycle
        return days_until_menses, phase
    else:
        return day_in_cycle, phase


def get_cycle_description(lmp_str: Optional[str], lang: str) -> dict:
    day_count, phase_key = calculate_cycle_day_from_lmp(lmp_str)
    if phase_key == "unknown" or day_count is None:
        return {
            "phase_key": "unknown",
            "phase_display": CYCLE_PHASE_MAP[lang]["unknown"],
            "phase_physiology": CYCLE_PHASE_PHYSIOLOGY[lang]["unknown"],
            "menstrual_history": CYCLE_PHASE_MENSTRUAL_HISTORY[lang]["unknown"],
            "day_count": None,
        }
    phase_display = CYCLE_PHASE_MAP[lang].get(phase_key, CYCLE_PHASE_MAP[lang]["unknown"])
    physiology_template = CYCLE_PHASE_PHYSIOLOGY[lang].get(phase_key, CYCLE_PHASE_PHYSIOLOGY[lang]["unknown"])
    if phase_key == "menstrual":
        phase_physiology = physiology_template.format(day=day_count)
    elif phase_key == "pre":
        phase_physiology = physiology_template.format(day=day_count)
    elif phase_key == "post":
        phase_physiology = physiology_template.format(day=day_count)
    elif phase_key == "ovulation":
        phase_physiology = physiology_template
    else:
        phase_physiology = physiology_template
    menstrual_template = CYCLE_PHASE_MENSTRUAL_HISTORY[lang].get(phase_key, CYCLE_PHASE_MENSTRUAL_HISTORY[lang]["unknown"])
    if phase_key == "menstrual":
        menstrual_history = menstrual_template.format(day=day_count)
    elif phase_key == "pre":
        menstrual_history = menstrual_template.format(day=day_count)
    elif phase_key == "post":
        menstrual_history = menstrual_template.format(day=day_count)
    elif phase_key == "ovulation":
        menstrual_history = menstrual_template
    else:
        menstrual_history = menstrual_template
    return {
        "phase_key": phase_key,
        "phase_display": phase_display,
        "phase_physiology": phase_physiology,
        "menstrual_history": menstrual_history,
        "day_count": day_count,
    }


def detect_cycle_phase(cycle_day_input: Optional[str]) -> str:
    if not cycle_day_input:
        return "unknown"
    val = str(cycle_day_input).lower()
    if any(x in val for x in ["月经", "menstrual", "menstruation", "day"]):
        return "menstrual"
    elif any(x in val for x in ["前", "pre", "luteal", "pms"]):
        return "pre"
    elif any(x in val for x in ["后", "post", "follicular", "after"]):
        return "post"
    elif any(x in val for x in ["排卵", "ovulat", "mid"]):
        return "ovulation"
    return "unknown"


def extract_cycle_day_from_input(cycle_day_input: Optional[str]) -> Optional[int]:
    if not cycle_day_input:
        return None
    match = re.search(r'(\d+)', str(cycle_day_input))
    if match:
        return int(match.group(1))
    return None


def call_llm(payload: dict, provider: str, config: dict, api_key: str) -> str:
    url = f"{config['base_url']}/chat/completions"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {api_key}",
    }
    request_payload = payload.copy()
    if provider == "vivo":
        model_name = request_payload.get("model", "")
        is_deepseek = "deepseek" in model_name.lower() or "Volc-DeepSeek" in model_name
        is_doubao = "doubao" in model_name.lower()
        if "qwen" in model_name.lower():
            request_payload["enable_thinking"] = False
        else:
            request_payload["thinking"] = {"type": "disabled"}
        if is_deepseek:
            request_payload["reasoning_effort"] = "minimal"
        if is_deepseek:
            request_payload["response_format"] = {"type": "json_object"}
        else:
            request_payload.pop("response_format", None)
        params = {"request_id": str(uuid.uuid4())}
        response = requests.post(
            url, headers=headers, params=params, json=request_payload, timeout=90
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    else:
        request_payload["response_format"] = {"type": "json_object"}
        response = requests.post(
            url, headers=headers, json=request_payload, timeout=90
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


def build_work_messages(lang: str, tone: str, scenario: str = "manager") -> dict:
    scene_dict = WORK_SCENARIOS.get(lang, WORK_SCENARIOS["en"])
    if scenario not in scene_dict:
        scenario = "manager"
    if tone not in ["formal", "neutral", "casual"]:
        tone = "neutral"
    return {
        "selected": scene_dict[scenario].get(tone, scene_dict[scenario]["neutral"]),
        "all": scene_dict,
    }


config = PROVIDER_CONFIG.get(LLM_PROVIDER, PROVIDER_CONFIG["vivo"])
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


def get_val_from_mb(mb: Optional[Any], key: str, fallback: str = "未详述") -> str:
    if not mb:
        return fallback
    val = getattr(mb, key, "")
    if not val or val in ["none", "unchecked", "unknown", ""]:
        return fallback
    return str(val)


def get_surgical_desc(mb: Optional[Any], lang: str) -> str:
    surg_val = getattr(mb, "surgicalHistory", "") if mb else ""
    if lang == "zh":
        surgical_map = {
            "none": "无明确大型外科手术史",
            "abdominal": "有腹部手术史（如阑尾切除术等）",
            "pelvic": "有盆腔手术史（如卵巢囊肿切除术等）",
            "other": "有其他手术史",
        }
        return surgical_map.get(str(surg_val).lower(), "无明确大型外科手术史")
    else:
        surgical_map = {
            "none": "No significant surgical history",
            "abdominal": "History of abdominal surgery",
            "pelvic": "History of pelvic surgery",
            "other": "History of other surgery",
        }
        return surgical_map.get(str(surg_val).lower(), "No significant surgical history")


def get_reproductive_desc(mb: Optional[Any], lang: str) -> str:
    repo_list = getattr(mb, "reproductiveHistoryArr", []) if mb else []
    rep_dict = REPRODUCTIVE_DICT.get(lang, REPRODUCTIVE_DICT["zh"])
    desc_list = [rep_dict.get(str(r), str(r)) for r in repo_list if r]
    if lang == "zh":
        return "、".join(desc_list) if desc_list else "未婚未育（无怀孕史，无生育史）"
    else:
        return ", ".join(desc_list) if desc_list else "Nulliparous (no pregnancy or birth history)"


def get_cycle_regular_desc(mb: Optional[Any], lang: str) -> str:
    val = getattr(mb, "cycleRegular", "") if mb else ""
    if lang == "zh":
        reg_map = {
            "regular": "规律（周期稳定）",
            "irregular": "不规律",   
            "xirregular":"周期非常紊乱",
            "unsure": "不确定",
        }
        return reg_map.get(str(val).lower(), "未详述")
    else:
        reg_map = {"regular": "Regular", "irregular": "Irregular", "unsure": "Unsure"}
        return reg_map.get(str(val).lower(), "Unspecified")


def get_period_duration_desc(mb: Optional[Any], lang: str) -> str:
    val = getattr(mb, "periodDuration", "") if mb else ""
    if not val or str(val).lower() in ["none", "unchecked", "unknown", ""]:
        return "未详述" if lang == "zh" else "Unspecified"
    if str(val) == "over7":
        return "超过7天" if lang == "zh" else "Over 7 days"
    return f"{val}天" if lang == "zh" else f"{val} days"


def build_pain_location_desc(spatial_map: Optional[Any], lang: str) -> str:
    if not spatial_map:
        return "下腹部" if lang == "zh" else "lower pelvis"
    parts = []
    abd = getattr(spatial_map, "abdomen", 0.0) or 0.0
    lb = getattr(spatial_map, "lowerBack", 0.0) or 0.0
    if abd > 0.1:
        parts.append(
            f"下腹部({int(abd*100)}%)" if lang == "zh" else f"Abdomen ({int(abd*100)}%)"
        )
    if lb > 0.1:
        parts.append(
            f"腰骶部({int(lb*100)}%)" if lang == "zh" else f"Lower Back ({int(lb*100)}%)"
        )
    return "、".join(parts) if parts else ("下腹部" if lang == "zh" else "lower pelvis")


def build_risk_warning(mb: Optional[Any], lang: str) -> str:
    if not mb:
        return "目前未见特异性药物过敏风险提示" if lang == "zh" else "No specific medication risks"
    allergy = getattr(mb, "allergies", "") or ""
    if "ibuprofen" in str(allergy).lower():
        return "⚠️ 明确非甾体抗炎药（NSAIDs/布洛芬）过敏史。请勿推荐处方布洛芬，建议遵医嘱替换为对乙酰氨基酚。" if lang == "zh" else "⚠️ Documented Ibuprofen (NSAIDs) allergy. Avoid prescribing Ibuprofen; consider Acetaminophen."
    return "无已知药物过敏" if lang == "zh" else "No known drug allergies"


def build_triage_advice(pain_score: int, symptoms: Optional[List[str]], lang: str) -> str:
    s_list = symptoms or []
    if pain_score > 70 or any(s in ["呕吐", "晕倒", "faint", "vomit"] for s in s_list):
        return "🏥 建议急门诊评估：伴随自主神经反射受损（面色苍白/冷汗），请尽快前往急诊排查继发盆腔急腹症。" if lang == "zh" else "🏥 Urgent Gynecological Visit Recommended."
    return "🏠 居家自愈观察" if lang == "zh" else "🏠 Home Self-Care"


def build_exam_advice(mb: Optional[Any], lang: str) -> Dict:
    return {
        "name": "妇科盆腔超声检查（彩色多普勒超声）" if lang == "zh" else "Pelvic Color Doppler Ultrasound",
        "preparation": "经阴道彩超需在检查前排空小便（无性生活史者禁用）；经腹部彩超需提前憋尿，可在检查前1小时内饮水500-800ml。" if lang == "zh" else "Empty bladder for transvaginal; full bladder for abdominal.",
        "note": "💡 临床常规、低成本排除方案（多数可在医保范围内全额报销），检查过程无创无痛，用于排除器质病变让您心里踏实，不用担心有财务负担。",
        "alternative": "",
    }


def get_color_somatic_meaning(color: Optional[str], lang: str) -> str:
    color_key = str(color or "crimson").lower()
    if lang == "zh":
        meanings = {
            "crimson": "局部微循环暂时性温热充盈。属于生理期盆腔血管扩张、血流天然汇聚的正常生理现象，通常伴随微微的温热与饱满感。",
            "dark": "小腹伴随轻微的沉闷与下坠感，提示局部微循环血流流速有所放缓。这种被动性的微循环变化，通过舒缓拉伸或适度走动即可得到温和改善。",
            "blue": "提示局部温度感知稍凉，对外界寒冷刺激较为敏感。生理上属于微血管一过性收缩带来的清凉与紧绷感，通常可通过局部热敷理疗轻松恢复暖意。",
            "purple": "局部痛觉敏感度暂时性有所提升，伴随轻微的酸胀与疲惫感。这属于盆腔神经末梢一过性对应激比较敏感的状态，适合配合深长呼吸来进行全身心交感放松。",
        }
    else:
        meanings = {
            "crimson": "A temporary warm sensation in local microcirculation. This is a natural physiological phenomenon of localized blood pooling during the menstrual phase, usually accompanied by mild warmth.",
            "dark": "A slight heavy or dull sensation in the lower abdomen, indicating a temporary slowing of localized microcirculation. This passive congestion is easily relieved by gentle stretching or slow walking.",
            "blue": "Indicates temporary coolness and sensitivity to environmental cold. Physiologically associated with transient localized vasoconstriction, which can be easily comforted and warmed with local heat therapy.",
            "purple": "A temporary increase in local somatic sensitivity, accompanied by a mild dull ache and tiredness. Suggests transient hypersensitivity of local pelvic nerve endings, ideal for full-body relaxation with deep breathing.",
        }
    return meanings.get(color_key, meanings["crimson"])


def mark_user_data_in_text(text: str, user_data: Dict[str, str], lang: str) -> str:
    """
    在文本中用 <user> 标签标记用户填写的数据
    """
    if not text:
        return text

    # 收集所有非空、非默认值的用户数据
    user_parts = []
    for key, value in user_data.items():
        if not value:
            continue
        # 跳过默认值
        default_values = ["未详述", "无明确确诊史", "无明确妇科疾病确诊史", "未提供", "不详", 
                          "Not specified", "No confirmed conditions", "Unspecified", "Not provided"]
        if value in default_values:
            continue
        # 跳过太短的值（可能是无意义数据）
        if len(str(value)) < 2:
            continue
        user_parts.append(str(value))

    if not user_parts:
        return text

    # 在文本中查找并标记用户数据
    result = text
    for part in user_parts:
        # 使用正则确保精确匹配（避免部分匹配）
        escaped_part = re.escape(part)
        # 检查是否已被标记
        if f"<user>{part}</user>" in result:
            continue
        # 替换纯文本部分为标记版本
        pattern = r'(?<!<user>)' + escaped_part + r'(?!</user>)'
        result = re.sub(pattern, f'<user>{part}</user>', result, count=1)
    
    return result


MEDICAL_SYSTEM_PROMPT_ZH = """
[角色定义]
你是一名三甲医院妇科住院医师，负责撰写规范的妇科入院记录（大病历）。你的输出必须严格遵循三甲医院病历书写规范。

[硬性约束 - 必须遵守]

1. 【严禁软件术语】病历正文中【绝对不允许】出现"画笔"、"画布"、"轨迹"、"粒子"、"评分"、"痛觉矢量"、"绘图"、"前端"等任何软件专有名词。必须全部转译为标准医学词汇。

2. 【阴性症状写入】在`present_illness`（现病史）中必须清晰写入阴性症状用于鉴别诊断（如："无肛门坠胀感，无尿频尿急，无发热。起病以来精神可，二便正常，体重无明显变化。"）。

3. 【月经史公式化】在`menstrual_history`中使用标准月经史公式格式："14 (5/28天) LMP: 2026-07-01. 当前阶段：... 痛经：有/无. 生育史：..."

4. 【严禁数值评分】绝对禁止在现病史、主诉和任何临床字段中出现任何数值评分（如"26/100"、"3.5分"、"VAS 7"）。痛觉强度必须仅使用临床描述语言："轻度胀痛"、"中度一过性痉挛"、"重度盆腔压迫感"。

5. 【严禁无证据下器质性诊断】绝对禁止在没有既往确诊史的情况下断言器质性诊断（如"子宫内膜异位症"、"盆腔炎性疾病"）。必须使用待排措辞："待排除"、"可能"、"疑似"。clinical_diagnosis中必须附带安抚文字："请放心：上述筛查方向仅为常规鉴别排除项。根据您的体征，病理性器质病变的概率极低，绝大部分情况属于生理期暂时性的平滑肌应激敏感，无需过度担忧。"

6. 【检查引导面向患者】所有检查引导必须直接面向【患者本人】，不得出现"供接诊医生参考"等模块。绝对禁止使用第一人称"我们"。必须使用中立表述："医护人员会"、"检查过程中"。

7. 【检查费用安抚】检查引导必须明确安抚患者费用顾虑："盆腔超声检查是性价比极高、极其常规的初筛检查，多属于医保报销范畴，无需担心昂贵开支，旨在作为排除项让您心里踏实。"

8. 【伴侣通感拒绝美化】`analogy`字段写给患者伴侣。绝对禁止诗化美化（"海浪轻拍"、"温柔低语"）。必须使用真实、硬性物理压迫感词汇："铁手攥紧拧绞"、"冷铅沉坠"、"钢针钻刺"、"粗糙锉刀刮擦"。

9. 【请假文本日常化】`work`字段必须在40字以内，自然得体。绝对禁止戏剧化描述。示例："因生理期痛经，身体严重不适，请假一天。望批准。"

10. 【月经史使用提供描述】`menstrual_history`必须严格使用User Prompt中提供的周期阶段描述，不得自行根据LMP重新推算。

[输出格式]
严格输出纯JSON对象（不要markdown包装）：

{
  "chief_complaint": "主诉——部位+体感。20字以内。",
  "present_illness": "现病史——学术规范，基于患者数据，含阴性症状。无数值评分。无软件术语。",
  "past_history": "既往史——基于提供数据。无则写'未详述'。绝对不含月经史。",
  "menstrual_history": "月经史与生育史——必须使用User Prompt中的周期描述。格式：'14 (5/28天) LMP: 2026-07-01. 当前阶段：... 痛经：有。生育史：...'",
  "clinical_diagnosis": "重点筛查方向——温和、去病理化。必须含安抚文字。",
  "clinical_suggestions": "两个段落，双换行分隔：建议就诊时与医生讨论的要点：... 妇科专科检查消除恐惧指南：...",
  "analogy": "伴侣通感隐喻——物理压迫感，拒绝美化。",
  "work": "请假短信——40字以内，自然得体。",
  "action": ["实操建议1", "实操建议2", "实操建议3"],
  "selfCare": ["自愈建议1", "自愈建议2", "消除病耻感安慰"]
}
"""

MEDICAL_SYSTEM_PROMPT_EN = """
[ROLE]
You are a clinical gynecological intake specialist writing a SOAP-style medical record for a healthcare provider. Your output should follow the tone, style, and structure of a real US/UK hospital medical record.

[HARD CONSTRAINTS]

1. 【NO SOFTWARE TERMINOLOGY】ABSOLUTELY FORBIDDEN to use: "canvas", "brush", "trajectory", "particle", "score", "pain vector", "drawing", "stroke count", "frontend". All drawing-derived data must be translated into clinical language.

2. 【INCLUDE NEGATIVE SYMPTOMS】In `present_illness`, include pertinent negatives for differential diagnosis.

3. 【MENSTRUAL HISTORY】Use standard US medical record format: "Menarche at X, cycles every Y days, lasting Z days. LMP: MM/DD/YYYY. Current phase: [phase]. Dysmenorrhea: Present/Absent. Obstetric history: G_P_."

4. 【NO NUMERIC SCORES】ABSOLUTELY FORBIDDEN to include any numeric pain scores in clinical fields.

5. 【NO UNSUPPORTED DIAGNOSIS】ABSOLUTELY FORBIDDEN to assert organic diagnoses without prior confirmed history. Use tentative language.

6. 【PATIENT-FACING EXAM GUIDANCE】Examination guidance should be written FOR THE PATIENT. DO NOT use first-person.

7. 【WORKPLACE MESSAGE - UNDER 40 WORDS】The `work` field MUST be under 40 WORDS.

8. 【PARTNER ANALOGY - VIVID BUT NOT VIOLENT】Use language that is visceral and evocative but NOT violent.

[OUTPUT FORMAT]
Strictly output a pure JSON object.
"""

GENERAL_SYSTEM_PROMPT_ZH = """
[角色定义]
你是一位温暖、共情的经期自愈陪伴导师。你用温和、实用、令人安心的方式帮助用户度过经期体验。你不是医生——你不做诊断、不开处方、不替代专业医疗。

[硬性约束]

1. 【不做诊断】绝对禁止提供任何诊断性陈述。使用描述性、体验性语言。

2. 【不推荐剂量】绝对禁止推荐具体药物剂量。可提及通用类别但必须建议咨询药师或医生。

3. 【不用恐慌语言】使用平静、接地气的语言。避免"严重"、"危险"、"危急"。

4. 【温和术语】使用易懂、非临床语言。

5. 【请假文本40字以内】`work`字段必须为自然得体的社交推辞，40字以内。

6. 【自愈建议要求】`selfCare`数组必须包含：至少一个具体易做的物理姿势、至少一个呼吸或放松技巧、至少一句消除病耻感的安慰。

[输出格式]
严格输出纯JSON对象。
"""

GENERAL_SYSTEM_PROMPT_EN = """
[ROLE]
You are a warm, empathetic menstrual self-care companion and somatic guide. You are NOT a doctor — you do not diagnose, prescribe, or replace professional medical care.

[HARD CONSTRAINTS]

1. 【NO DIAGNOSIS】ABSOLUTELY FORBIDDEN to provide diagnostic statements.

2. 【NO MEDICATION DOSAGES】ABSOLUTELY FORBIDDEN to recommend specific medication dosages.

3. 【NO ALARMIST LANGUAGE】Use calming, grounded language.

4. 【GENTLE TERMINOLOGY】Use accessible, non-clinical language.

5. 【WORK MESSAGE - UNDER 40 WORDS】The `work` field MUST be under 40 words.

6. 【SELFCARE - EVIDENCE-BASED】Include: physical comfort measure, relaxation practice, gentle movement suggestion, stigma-reducing reassurance.

[OUTPUT FORMAT]
Strictly output a pure JSON object.
"""

FEW_SHOT_EXAMPLE_ZH = """
[示例 — 仅作参考]
{
  "chief_complaint": "周期性下腹部痉挛性收缩感。",
  "present_illness": "患者既往月经规律。今日处于生理期第2天，盆腔微循环处于自然生理充血状态。感下腹部持续性收紧痛，痛感中等，伴阵发性收缩，向腰骶部有轻度酸胀感。无肛门坠胀感，无尿频尿急，无发热。起病以来精神可，二便正常，体重无明显变化。",
  "past_history": "既往史：平素健康。无特殊慢性病史。手术史：无腹部及盆腔手术史。过敏史：无明确药物过敏史。",
  "menstrual_history": "13 (5/28天) LMP: 2026-06-27. 当前处于月经期第2天。痛经：有。生育史：G0P0。",
  "clinical_diagnosis": "1. 周期性子宫平滑肌痉挛（生理期功能性痛觉高敏可能）\\n\\n💡 请放心：上述筛查仅为临床常规排除项，器质性病变的概率极低，多为一过性敏感，请勿惊慌。",
  "clinical_suggestions": "【建议就诊时与医生讨论的要点】：\\n1. 结合既往健康档案及痛觉表现，建议请医生在行盆腔超声检查（高性价比、常规无创初筛，多属于医保报销范畴）时评估是否存在局部痉挛或潜在功能性不协调。\\n2. 讨论口服抗炎镇痛药物的针对性调节。\\n\\n【妇科专科检查消除恐惧指南】：\\n妇科超声及妇检检查是极基础的无创初筛排查方法。如果推荐您进行相关检查，请配合医生进行深慢呼吸，主动放松盆底括约肌。医生会提供充分的屏风和隐私防护以保护您的隐私边界与检查尊严。请放心配合医生，尽早明确痛因。",
  "analogy": "子宫内像藏着一个上紧了发条的金属夹子，在不断收缩拧动，冷意带着尖锐的酸麻感直窜后脊，疼得根本站不直身子。",
  "work": "因今天生理期不适/痛经，特申请请假休息一天，望批准。",
  "action": ["☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。", "☑️ 帮她倒一杯温热的饮用水，并准备好安全的止痛药。"],
  "selfCare": ["✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。", "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"]
}
"""

FEW_SHOT_EXAMPLE_EN = """
[EXAMPLE — FOR REFERENCE ONLY]
{
  "chief_complaint": "Cyclic lower abdominal cramping for 2 days.",
  "present_illness": "The patient reports cyclic, spasmodic lower abdominal pain associated with menses. Pain is moderate in intensity, with paroxysmal exacerbations radiating to the lumbosacral region. No relief from rest. No rectal pressure, no urinary urgency, no fever. Vital signs are stable. Bowel and bladder functions are normal. No significant weight change.",
  "past_history": "Past Medical History: Generally healthy. No chronic conditions. Surgical History: No abdominal or pelvic surgery. Allergies: No known drug allergies. Family History: Maternal history of dysmenorrhea.",
  "menstrual_history": "Menarche at 13, cycles every 28 days, lasting 5 days. LMP: 06/27/2026. Currently on Day 2 of menstruation. Dysmenorrhea: Present. Obstetric history: G0P0.",
  "clinical_diagnosis": "1. Primary spasmodic dysmenorrhea (rule out). 2. Pelvic congestion (possible). Please note: these are routine differential considerations. Based on the presentation, organic pathology is unlikely.",
  "clinical_suggestions": "【Discussion points for your provider】:\\n1. Discuss with your gynecologist the possibility of a pelvic ultrasound (a routine, non-invasive screening test, typically covered by insurance) to evaluate for localized spasm or functional incoordination.\\n2. Discuss appropriate anti-inflammatory or analgesic medication tailored to your needs and allergy profile.\\n\\n【Examination preparation guide】:\\nPelvic ultrasound and gynecological examinations are routine, non-invasive screening procedures. If recommended, please cooperate with your physician by taking slow, deep breaths and consciously relaxing your pelvic floor muscles. Medical staff will provide full privacy screens throughout the procedure.",
  "analogy": "A deep, heavy pressure in the pelvis — like a constant, intense muscle cramp that makes it hard to stand or sit comfortably.",
  "work": "Taking a sick day today. Work is covered.",
  "action": ["Apply a heating pad to your lower abdomen for 15-20 minutes to relieve muscle tension.", "Stay hydrated with warm beverages. Consider over-the-counter pain relief (e.g., ibuprofen) if appropriate for you."],
  "selfCare": ["Rest in a comfortable position with your legs elevated.", "Try slow, deep breathing — 4 seconds in, 8 seconds out — to relax your pelvic floor.", "Rest is not weakness — your body is doing important work right now."]
}
"""

FEW_SHOT_EXAMPLE_ZH_GENERAL = """
[示例 — 仅作参考]
{
  "chief_complaint": "下腹部痉挛和胀满感。",
  "present_illness": "下腹部中度痉挛，伴随沉重胀满感。疼痛呈阵发性。精力低下。",
  "past_history": "身体健康。偶有作息不规律。",
  "menstrual_history": "当前月经期第2天。痛经：有。",
  "clinical_diagnosis": "身体正在响应激素变化，这是正常的生理过程。",
  "clinical_suggestions": "用暖水袋热敷下腹部休息。温热饮品补水。温和拉伸可能有帮助。",
  "analogy": "深层沉重的压迫感——像持续的肌肉收缩。",
  "work": "今天身体不适，请假休息一天。明天恢复。",
  "action": ["下腹部热敷", "舒适姿势休息"],
  "selfCare": ["抬高双腿休息", "缓慢深呼吸——吸气4秒，呼气8秒", "休息是身体的需要，不是软弱。"]
}
"""

FEW_SHOT_EXAMPLE_EN_GENERAL = """
[EXAMPLE — FOR REFERENCE ONLY]
{
  "chief_complaint": "Lower abdominal cramping and bloating.",
  "present_illness": "Experiencing moderate cramping in the lower pelvis. The pain comes in waves and is accompanied by a heavy, bloated sensation. Energy levels are low.",
  "past_history": "Generally healthy. Sometimes have irregular sleep patterns.",
  "menstrual_history": "Currently on Day 2 of menstruation. Dysmenorrhea: Present.",
  "clinical_diagnosis": "Your body is responding to hormonal shifts. This is a normal physiological process.",
  "clinical_suggestions": "Rest with a heating pad on your lower abdomen. Stay hydrated with warm beverages. Gentle stretching may help.",
  "analogy": "A deep, heavy pressure — like a constant internal muscle contraction.",
  "work": "Taking a sick day today. Will be back tomorrow.",
  "action": ["Apply heat to your lower abdomen", "Rest in a comfortable position"],
  "selfCare": ["Rest with legs elevated", "Try slow breathing — 4 in, 8 out", "You're allowed to rest. Your body is doing important work."]
}
"""


def get_few_shot(lang: str, app_mode: str) -> str:
    if app_mode == "medical":
        return FEW_SHOT_EXAMPLE_EN if lang == "en" else FEW_SHOT_EXAMPLE_ZH
    else:
        return FEW_SHOT_EXAMPLE_EN_GENERAL if lang == "en" else FEW_SHOT_EXAMPLE_ZH_GENERAL


def build_user_prompt_zh(
    pain_quality: str,
    pain_location_desc: str,
    pain_level_desc: str,
    pain_pattern: str,
    somatic_sensation: str,
    cycle_phase_display: str,
    phase_physiology: str,
    menstrual_history_constraint: str,
    accompanying_desc: str,
    height_weight: str,
    diagnosed_history: str,
    surgical_history: str,
    obstetric_history: str,
    family_history: str,
    lifestyle: str,
    allergy_history: str,
    menarche: str,
    cycle_reg: str,
    period_dur: str,
    lmp: str,
    tone_preference: str,
    app_mode: str,
    has_nsaid_allergy: bool,
    safe_drugs: str,
    forbidden_drugs: str,
    work_default: str,
    work_scenario: str,
    work_tone: str,
    include_few_shot: bool = True,
) -> str:
    few_shot = get_few_shot("zh", app_mode) if include_few_shot else ""
    scenario_labels = {
        "manager": "向领导/上级请假",
        "teacher": "向老师/教授请假",
        "friend": "向朋友推约",
        "client": "向客户/合作伙伴改约",
        "partner": "向伴侣/家人说明",
    }
    tone_labels = {
        "formal": "正式",
        "neutral": "中性",
        "casual": "轻松",
    }
    scenario_display = scenario_labels.get(work_scenario, work_scenario)
    tone_display = tone_labels.get(work_tone, work_tone)

    data_section = f"""
【指令】
仅基于以下提供的数据生成输出。未提供的信息写"未详述"。严禁捏造或推断。

═══════════════════════════════════════════════════════════════
患者数据
═══════════════════════════════════════════════════════════════

1. 痛觉特征
   - 痛感性质：{pain_quality}
   - 痛感部位：{pain_location_desc}
   - 痛觉强度（临床转译——非分数）：{pain_level_desc}
   - 痛觉模式：{pain_pattern}
   - 体感（温热/清凉/沉重）：{somatic_sensation}

2. 当前周期
   - 阶段：{cycle_phase_display}
   - 阶段描述：{phase_physiology}
   - 【严格使用】menstrual_history字段输出：{menstrual_history_constraint}

3. 伴随症状
   {accompanying_desc}

4. 健康背景
   - 身高/体重：{height_weight}
   - 确诊疾病：{diagnosed_history}
   - 手术史：{surgical_history}
   - 生育史：{obstetric_history}
   - 家族史：{family_history}
   - 生活方式：{lifestyle}
   - 过敏史：{allergy_history}

5. 月经史
   - 初潮年龄：{menarche}
   - 周期规律：{cycle_reg}
   - 经期天数：{period_dur}
   - LMP：{lmp}
   - 【提醒】输出时使用上方第2节的阶段描述，而非这些原始值。

6. 偏好
   - 语气偏好：{tone_preference or "neutral"}
   - 应用模式：{app_mode or "medical"}
   - 请假/推约场景：{scenario_display}
   - 请假/推约语气：{tone_display}

7. 请假/推约消息参考
   - 【参考】该场景和语气下的建议消息："{work_default}"
   - 你可以以此为基础，根据患者上下文进行微调。

═══════════════════════════════════════════════════════════════
用药安全 — 必须遵守
═══════════════════════════════════════════════════════════════

- NSAIDs过敏：{"是（已激活红线）" if has_nsaid_allergy else "否"}
- 可推荐止痛药：{safe_drugs}
- 禁止推荐：{forbidden_drugs}

现在生成JSON。记住：
- 临床字段无数值评分
- 无软件术语（画笔、画布、评分、轨迹）
- 请假消息40字以内，适用于{scenario_display}场景，{tone_display}语气
- 使用上方提供的精确月经史描述
- 严禁捏造信息
"""
    return f"{few_shot}\n\n{data_section}" if few_shot else data_section


def build_user_prompt_en(
    pain_quality: str,
    pain_location_desc: str,
    pain_level_desc: str,
    pain_pattern: str,
    somatic_sensation: str,
    cycle_phase_display: str,
    phase_physiology: str,
    menstrual_history_constraint: str,
    accompanying_desc: str,
    height_weight: str,
    diagnosed_history: str,
    surgical_history: str,
    obstetric_history: str,
    family_history: str,
    lifestyle: str,
    allergy_history: str,
    menarche: str,
    cycle_reg: str,
    period_dur: str,
    lmp: str,
    tone_preference: str,
    app_mode: str,
    has_nsaid_allergy: bool,
    safe_drugs: str,
    forbidden_drugs: str,
    work_default: str,
    work_scenario: str,
    work_tone: str,
    include_few_shot: bool = True,
) -> str:
    few_shot = get_few_shot("en", app_mode) if include_few_shot else ""

    data_section = f"""
[INSTRUCTION]
Base ALL output SOLELY on the data provided below. For missing information, write "Not specified". DO NOT fabricate or infer from external sources.

═══════════════════════════════════════════════════════════════
PATIENT DATA
═══════════════════════════════════════════════════════════════

1. PAIN CHARACTERISTICS
   - Pain quality: {pain_quality}
   - Pain location: {pain_location_desc}
   - Pain intensity (clinical translation — NOT a score): {pain_level_desc}
   - Pain pattern: {pain_pattern}
   - Body sensation (warm/cool/heavy): {somatic_sensation}

2. CURRENT CYCLE
   - Phase: {cycle_phase_display}
   - Phase description: {phase_physiology}
   - 【USE EXACTLY】For menstrual_history field: {menstrual_history_constraint}

3. ACCOMPANYING SYMPTOMS
   {accompanying_desc}

4. HEALTH BACKGROUND
   - Height/Weight: {height_weight}
   - Diagnosed conditions: {diagnosed_history}
   - Surgical history: {surgical_history}
   - Pregnancy history: {obstetric_history}
   - Family history: {family_history}
   - Lifestyle factors: {lifestyle}
   - Allergies: {allergy_history}

5. MENSTRUAL HISTORY
   - Menarche: {menarche}
   - Cycle regularity: {cycle_reg}
   - Period duration: {period_dur}
   - LMP: {lmp}
   - 【REMINDER】Use the phase description from section 2 above — NOT these raw values.

6. PREFERENCES
   - Preferred tone: {tone_preference or "neutral"}
   - Application mode: {app_mode or "medical"}
   - Work message scenario: {work_scenario}
   - Work message tone: {work_tone}

7. WORK MESSAGE DEFAULT
   - 【REFERENCE】A suggested work message for this scenario/tone: "{work_default}"
   - You may use this as a starting point or refine it based on the patient's context.

═══════════════════════════════════════════════════════════════
DRUG SAFETY — MUST OBEY
═══════════════════════════════════════════════════════════════

- NSAID allergy: {has_nsaid_allergy}
- Safe analgesics to recommend: {safe_drugs}
- FORBIDDEN analgesics: {forbidden_drugs}

Generate JSON now. Remember:
- NO numeric scores in clinical fields
- NO software terminology (canvas, brush, score, trajectory)
- Workplace message under 40 words, appropriate for {work_scenario} with {work_tone} tone
- Use the EXACT menstrual_history description provided above
- DO NOT fabricate information
"""
    return f"{few_shot}\n\n{data_section}" if few_shot else data_section


def _fallback_response(lang: str, painkiller: str, app_mode: str, data: Any) -> dict:
    """当 LLM 调用失败时使用前端真实数据生成保底输出"""
    is_general = app_mode == "general"
    mb = data.medicalBackground

    pain_type_map = {
        "twist": ("痉挛性绞痛", "spasmodic cramping"),
        "pierce": ("刺痛", "stabbing pain"),
        "sink": ("坠胀痛", "heavy dragging pain"),
        "swell": ("胀痛", "bloating pressure"),
        "scrape": ("磨扯痛", "abrasive soreness"),
    }
    pain_type_cn, pain_type_en = pain_type_map.get(
        data.dominantPain, ("不适", "discomfort")
    )

    location_cn = build_pain_location_desc(data.spatialMap, "zh")
    location_en = build_pain_location_desc(data.spatialMap, "en")

    symptoms = data.accompanyingSymptoms or []
    symptoms_cn = "、".join(symptoms) if symptoms else "无明显伴随不适"
    symptoms_en = ", ".join(symptoms) if symptoms else "No other significant symptoms"

    cycle_cn = data.cycleDay or "月经期"
    cycle_en = data.cycleDay or "menstrual phase"

    menarche = getattr(mb, "menarcheAge", "14") if mb else "14"
    period_dur = getattr(mb, "periodDuration", "5") if mb else "5"
    lmp = getattr(mb, "lastPeriod", "未提供") if mb else "未提供"

    surg_cn = get_surgical_desc(mb, "zh")
    surg_en = get_surgical_desc(mb, "en")

    repo_cn = get_reproductive_desc(mb, "zh")
    repo_en = get_reproductive_desc(mb, "en")

    allergy_cn = build_risk_warning(mb, "zh")
    allergy_en = build_risk_warning(mb, "en")

    lifestyle_cn = "无特殊不良作息"
    lifestyle_en = "No significant lifestyle factors"
    if mb:
        ls_dict = LIFESTYLE_DICT.get("zh", LIFESTYLE_DICT["zh"])
        ls_list = [ls_dict.get(str(x), str(x)) for x in getattr(mb, "lifestyleArr", []) or [] if x]
        lifestyle_cn = "、".join(ls_list) if ls_list else "无特殊不良作息"
        ls_dict_en = LIFESTYLE_DICT.get("en", LIFESTYLE_DICT["en"])
        ls_list_en = [ls_dict_en.get(str(x), str(x)) for x in getattr(mb, "lifestyleArr", []) or [] if x]
        lifestyle_en = ", ".join(ls_list_en) if ls_list_en else "No significant lifestyle factors"

    diagnosed_cn = "无明确确诊史"
    diagnosed_en = "No confirmed conditions"
    if mb and getattr(mb, "diagnosed", "") and getattr(mb, "diagnosed") not in ["none", "unchecked", ""]:
        diagnosed_cn = f"曾确诊：{getattr(mb, 'diagnosed')}"
        diagnosed_en = f"Diagnosed: {getattr(mb, 'diagnosed')}"
        if getattr(mb, "otherDiagnosis", ""):
            diagnosed_cn += f"、{getattr(mb, 'otherDiagnosis')}"
            diagnosed_en += f", {getattr(mb, 'otherDiagnosis')}"

    if data.painScore < 30:
        intensity_cn = "轻度"
        intensity_en = "mild"
    elif data.painScore < 60:
        intensity_cn = "中度"
        intensity_en = "moderate"
    else:
        intensity_cn = "重度"
        intensity_en = "severe"

    pain_desc_cn = f"{location_cn}出现{intensity_cn}{pain_type_cn}"
    pain_desc_en = f"{intensity_en} {pain_type_en} in the {location_en}"

    if lang == "zh":
        cycle_desc = f"当前处于{cycle_cn}"
        menarche_full = f"{menarche}岁初潮，经期{period_dur}天"
        lmp_display = lmp if lmp and lmp != "未提供" else "未提供"
        menstrual_full = f"{menarche_full}。LMP：{lmp_display}。痛经：有。生育史：{repo_cn}。"
    else:
        cycle_desc = f"Currently in {cycle_en}"
        menarche_full = f"Menarche at {menarche}, {period_dur}-day cycles"
        lmp_display = lmp if lmp and lmp != "未提供" else "Not provided"
        menstrual_full = f"{menarche_full}. LMP: {lmp_display}. Dysmenorrhea: Present. Obstetric: {repo_en}."

    # 收集用户数据用于标记
    user_data_cn = {
        "diagnosed": diagnosed_cn,
        "surgical": surg_cn,
        "allergy": allergy_cn,
        "lifestyle": lifestyle_cn,
        "menstrual": menstrual_full,
    }
    user_data_en = {
        "diagnosed": diagnosed_en,
        "surgical": surg_en,
        "allergy": allergy_en,
        "lifestyle": lifestyle_en,
        "menstrual": menstrual_full,
    }

    if lang == "zh":
        if is_general:
            past_history_raw = f"既往：{diagnosed_cn}。手术史：{surg_cn}。过敏：{allergy_cn}。作息：{lifestyle_cn}。"
            past_history_marked = mark_user_data_in_text(past_history_raw, user_data_cn, lang)
            menstrual_marked = f"<user>{menstrual_full}</user>"
            return {
                "chief_complaint": f"{pain_desc_cn}。",
                "present_illness": f"您目前处于{cycle_cn}，{location_cn}有{intensity_cn}{pain_type_cn}，伴随{symptoms_cn}。建议适当休息、注意保暖。",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": "生理期常见的子宫收缩性不适。多数情况属于正常生理反应，不必过度紧张。",
                "clinical_suggestions": "【给您的建议】\n• 注意保暖，可用热水袋敷在下腹部\n• 适当休息，避免劳累\n• 如疼痛持续加重，建议及时就医咨询",
                "analogy": f"感觉{location_cn}像被什么东西紧紧攥住，一阵一阵地抽着疼。",
                "work": "今天身体不适，申请休息一天。",
                "action": [
                    "☑️ 用热水袋或暖宝宝敷在腹部，帮助放松肌肉",
                    "☑️ 喝点温热的水或姜茶，促进血液循环",
                    "☑️ 找个舒服的姿势躺下，膝盖微屈",
                    "☑️ 如需要可考虑适量服用止痛药（请确认无过敏史）"
                ],
                "selfCare": [
                    "✨ 允许自己慢下来，今天可以适当休息。",
                    "✨ 试着做几次深长呼吸，帮助身体放松。",
                    "✨ 保持心情平和，焦虑会让身体更紧张。"
                ],
            }
        else:
            past_history_raw = f"既往史：{diagnosed_cn}。手术史：{surg_cn}。过敏史：{allergy_cn}。生活作息：{lifestyle_cn}。"
            past_history_marked = mark_user_data_in_text(past_history_raw, user_data_cn, lang)
            menstrual_marked = f"<user>{menstrual_full}</user>"
            return {
                "chief_complaint": f"{pain_desc_cn}。",
                "present_illness": f"患者处于{cycle_cn}，{location_cn}有{intensity_cn}{pain_type_cn}，伴{symptoms_cn}。无发热，无恶心呕吐。二便正常。",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": "1. 原发性痛经（功能性）\n2. 盆腔充血（待排除）\n\n💡 请放心：上述仅为常规筛查方向，器质性病变的可能性很低。",
                "clinical_suggestions": "【就诊建议】\n• 建议与医生沟通疼痛规律，便于判断\n• 必要时可考虑盆腔超声检查（常规无创筛查）\n\n【检查提醒】\n盆腔超声是常规检查，全程无痛。医护人员会保护您的隐私。",
                "analogy": f"感觉{location_cn}有持续的{intensity_cn}牵拉和收缩感。",
                "work": "因身体不适，申请今天休假一天。",
                "action": [
                    "☑️ 腹部热敷，每次15-20分钟",
                    "☑️ 注意休息，避免剧烈运动",
                    "☑️ 多喝温水，清淡饮食",
                    "☑️ 如疼痛剧烈请及时就医"
                ],
                "selfCare": [
                    "✨ 休息是对身体最好的照顾。",
                    "✨ 保持深呼吸，放松身心。",
                    "✨ 疼痛是真实存在的，不需要硬撑。"
                ],
            }
    else:
        if is_general:
            past_history_raw = f"Past: {diagnosed_en}. Surgery: {surg_en}. Allergies: {allergy_en}. Lifestyle: {lifestyle_en}."
            past_history_marked = mark_user_data_in_text(past_history_raw, user_data_en, lang)
            menstrual_marked = f"<user>{menstrual_full}</user>"
            return {
                "chief_complaint": f"{pain_desc_en}.",
                "present_illness": f"You are currently in {cycle_en}, experiencing {intensity_en} {pain_type_en} in the {location_en}, with {symptoms_en}. Consider resting and staying warm.",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": "Common menstrual cramping. Usually a normal physiological response. No need for excessive concern.",
                "clinical_suggestions": "【Suggestions】\n• Apply a heating pad to your lower abdomen\n• Rest and avoid strenuous activity\n• If pain worsens, consider consulting a healthcare provider",
                "analogy": f"A constant pulling and cramping sensation in the {location_en}.",
                "work": "Requesting a sick day today due to a health condition.",
                "action": [
                    "☑️ Apply heat to your abdomen to help relax muscles",
                    "☑️ Drink warm fluids like water or herbal tea",
                    "☑️ Rest in a comfortable position with knees slightly bent",
                    "☑️ Consider over-the-counter pain relief if suitable for you"
                ],
                "selfCare": [
                    "✨ Give yourself permission to slow down today.",
                    "✨ Take slow, deep breaths to help your body relax.",
                    "✨ Your pain is real — rest is not weakness."
                ],
            }
        else:
            past_history_raw = f"Past History: {diagnosed_en}. Surgery: {surg_en}. Allergies: {allergy_en}. Lifestyle: {lifestyle_en}."
            past_history_marked = mark_user_data_in_text(past_history_raw, user_data_en, lang)
            menstrual_marked = f"<user>{menstrual_full}</user>"
            return {
                "chief_complaint": f"{pain_desc_en}.",
                "present_illness": f"The patient is in {cycle_en}, experiencing {intensity_en} {pain_type_en} in the {location_en}, with {symptoms_en}. No fever. Bowel and bladder functions normal.",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": "1. Primary dysmenorrhea (functional)\n2. Pelvic congestion (rule out)\n\n💡 Please note: These are routine screening considerations. Organic pathology is unlikely.",
                "clinical_suggestions": "【Discussion points】\n• Consider discussing pain patterns with your provider\n• Pelvic ultrasound may be considered for screening (routine, non-invasive)\n\n【Examination reminder】\nPelvic ultrasound is a routine procedure, painless and non-invasive. Medical staff will protect your privacy.",
                "analogy": f"Continuous pulling and cramping sensation in the {location_en}.",
                "work": "Requesting sick leave today due to a health condition.",
                "action": [
                    "☑️ Apply a heating pad to the lower abdomen for 15-20 minutes",
                    "☑️ Rest and avoid strenuous activity",
                    "☑️ Stay hydrated with warm fluids",
                    "☑️ Consult a healthcare provider if pain persists"
                ],
                "selfCare": [
                    "✨ Rest is essential for recovery.",
                    "✨ Take slow, deep breaths to help relax.",
                    "✨ Your pain is valid — you don't have to push through it."
                ],
            }


@app.post("/api/generate")
def generate_pain_report(data: PainData):
    """
    PainScape 核心生成接口
    """
    lang = "zh"
    app_mode = "medical"
    painkiller = "布洛芬"

    try:
        lang = str(data.targetLanguage or "zh")
        app_mode = str(data.appMode or "medical").lower()
        mb = data.medicalBackground

        # 周期阶段计算
        lmp_str = getattr(mb, "lastPeriod", None) if mb else None
        cycle_info = get_cycle_description(lmp_str, lang)

        if data.cycleDay and str(data.cycleDay).strip():
            user_phase_key = detect_cycle_phase(data.cycleDay)
            if user_phase_key != "unknown":
                day_num = extract_cycle_day_from_input(data.cycleDay)
                cycle_info["phase_key"] = user_phase_key
                cycle_info["phase_display"] = CYCLE_PHASE_MAP[lang].get(
                    user_phase_key, CYCLE_PHASE_MAP[lang]["unknown"]
                )
                physiology_map = CYCLE_PHASE_PHYSIOLOGY.get(lang, CYCLE_PHASE_PHYSIOLOGY["en"])
                menstrual_map = CYCLE_PHASE_MENSTRUAL_HISTORY.get(lang, CYCLE_PHASE_MENSTRUAL_HISTORY["en"])

                if user_phase_key == "menstrual" and day_num:
                    cycle_info["phase_physiology"] = physiology_map["menstrual"].format(day=day_num)
                    cycle_info["menstrual_history"] = menstrual_map["menstrual"].format(day=day_num)
                elif user_phase_key == "pre" and day_num:
                    cycle_info["phase_physiology"] = physiology_map["pre"].format(day=day_num)
                    cycle_info["menstrual_history"] = menstrual_map["pre"].format(day=day_num)
                elif user_phase_key == "post" and day_num:
                    cycle_info["phase_physiology"] = physiology_map["post"].format(day=day_num)
                    cycle_info["menstrual_history"] = menstrual_map["post"].format(day=day_num)
                elif user_phase_key == "ovulation":
                    cycle_info["phase_physiology"] = physiology_map["ovulation"]
                    cycle_info["menstrual_history"] = menstrual_map["ovulation"]
                else:
                    cycle_info["phase_physiology"] = physiology_map["unknown"]
                    cycle_info["menstrual_history"] = menstrual_map["unknown"]

        active_phase_display = cycle_info["phase_display"]
        phase_physiology = cycle_info["phase_physiology"]
        menstrual_phase_description = cycle_info["menstrual_history"]

        # 痛觉特征转译
        pt_dict = PAIN_MAP.get(lang, PAIN_MAP["zh"])
        pain_quality = pt_dict.get(data.dominantPain, data.dominantPain)

        raw_score = data.painScore
        scaled_score = min(100, int(raw_score / 8)) if raw_score > 100 else max(10, raw_score)
        if scaled_score < 30:
            pain_level_desc = "轻度不适" if lang == "zh" else "mild discomfort"
        elif scaled_score < 60:
            pain_level_desc = "中度不适" if lang == "zh" else "moderate discomfort"
        else:
            pain_level_desc = "重度不适" if lang == "zh" else "severe discomfort"

        ip = data.intensityProfile
        speed_val = getattr(ip, "avgSpeed", 5.0) if ip else 5.0
        if speed_val > 12.0:
            pain_pattern = "阵发性波动" if lang == "zh" else "paroxysmal, fluctuating"
        else:
            pain_pattern = "持续性平缓" if lang == "zh" else "continuous, gradual"

        somatic_sensation = get_color_somatic_meaning(data.colorPalette, lang)

        # 空间定位 & 伴随症状
        pain_location_desc = build_pain_location_desc(data.spatialMap, lang)
        accompanying_symptoms = data.accompanyingSymptoms or []
        accompanying_desc = (
            "、".join(accompanying_symptoms)
            if accompanying_symptoms
            else ("未诉其余明显伴随异常指征" if lang == "zh" else "No other significant symptoms reported")
        )

        # 健康背景解析
        lifestyle_final = "无特殊不良作息" if lang == "zh" else "No significant lifestyle factors"
        family_history_final = "无明确家族痛经遗传史" if lang == "zh" else "No known family history"
        reproductive_final = "未生育" if lang == "zh" else "Nulliparous"

        if mb:
            ls_dict = LIFESTYLE_DICT.get(lang, LIFESTYLE_DICT["zh"])
            ls_list = [ls_dict.get(str(x), str(x)) for x in getattr(mb, "lifestyleArr", []) or [] if x]
            lifestyle_final = "、".join(ls_list) if ls_list else lifestyle_final

            fam_dict = FAMILY_HISTORY_DICT.get(lang, FAMILY_HISTORY_DICT["zh"])
            fam_list = [fam_dict.get(str(x), str(x)) for x in getattr(mb, "familyHistoryArr", []) or [] if x]
            family_history_final = "、".join(fam_list) if fam_list else family_history_final

            rep_dict = REPRODUCTIVE_DICT.get(lang, REPRODUCTIVE_DICT["zh"])
            rep_list = [rep_dict.get(str(x), str(x)) for x in getattr(mb, "reproductiveHistoryArr", []) or [] if x]
            reproductive_final = "、".join(rep_list) if rep_list else reproductive_final

        diagnosed_history = "无明确妇科疾病确诊史" if lang == "zh" else "No confirmed gynecological conditions"
        if mb:
            if getattr(mb, "diagnosed", "") and getattr(mb, "diagnosed") not in ["none", "unchecked", ""]:
                diagnosed_history = f"曾确诊患有 {getattr(mb, 'diagnosed')}" if lang == "zh" else f"Diagnosed with {getattr(mb, 'diagnosed')}"
                if getattr(mb, "otherDiagnosis", ""):
                    diagnosed_history += f"、{getattr(mb, 'otherDiagnosis')}" if lang == "zh" else f", {getattr(mb, 'otherDiagnosis')}"

        surgical_history_val = get_surgical_desc(mb, lang)

        age_cohort = "成年女性" if lang == "zh" else "Adult female"
        if mb and getattr(mb, "age", "") and getattr(mb, "age") not in ["", "none"]:
            age_cohort = f"年龄处于 {getattr(mb, 'age')} 阶段" if lang == "zh" else f"Age: {getattr(mb, 'age')}"

        menarche_val = get_val_from_mb(mb, "menarcheAge", "未详述" if lang == "zh" else "Not specified")
        menarche_desc = f"{menarche_val} 岁" if lang == "zh" else f"{menarche_val} years"
        cycle_reg_desc = get_cycle_regular_desc(mb, lang)
        period_dur_desc = get_period_duration_desc(mb, lang)
        lmp_val = get_val_from_mb(mb, "lastPeriod", "未提供" if lang == "zh" else "Not provided")

        height_weight = (
            f"{getattr(mb, 'height', '')}cm / {getattr(mb, 'weight', '')}kg"
            if mb and getattr(mb, 'height', '')
            else ("未提供" if lang == "zh" else "Not provided")
        )
        allergy_history = build_risk_warning(mb, lang)

        # 用药安全红线
        raw_allergies = ""
        if mb:
            raw_allergies = f"{getattr(mb, 'allergies', '')} {getattr(mb, 'otherAllergies', '')}"
        allergy_text = raw_allergies.lower()
        allergy_list = ["布洛芬", "阿司匹林", "双氯芬酸", "酮洛芬", "萘普生", "ibuprofen", "aspirin", "diclofenac", "naproxen", "nsaids"]
        has_nsaid_allergy = any(term in allergy_text for term in allergy_list)

        forbidden_drugs = (
            "布洛芬 (Ibuprofen)、阿司匹林 (Aspirin)、双氯芬酸钠等所有非甾体抗炎药(NSAIDs)"
            if lang == "zh"
            else "ALL NSAIDs (Ibuprofen, Aspirin, Diclofenac, Naproxen)"
        ) if has_nsaid_allergy else ("无" if lang == "zh" else "None")

        safe_recommendation = (
            "对乙酰氨基酚 (Acetaminophen)" if has_nsaid_allergy
            else ("布洛芬 (Ibuprofen) 或 萘普生 (Naproxen)" if lang == "zh" else "Ibuprofen or Naproxen")
        )
        painkiller = "对乙酰氨基酚" if has_nsaid_allergy else "布洛芬"

        # Work 消息
        work_info = build_work_messages(
            lang=lang,
            tone=data.workTone or "neutral",
            scenario=data.workScenario or "manager"
        )
        work_default = work_info["selected"]

        # 选择 System Prompt
        if app_mode == "medical":
            sys_prompt = MEDICAL_SYSTEM_PROMPT_EN if lang == "en" else MEDICAL_SYSTEM_PROMPT_ZH
        else:
            sys_prompt = GENERAL_SYSTEM_PROMPT_EN if lang == "en" else GENERAL_SYSTEM_PROMPT_ZH

        # 构建 User Prompt
        if lang == "en":
            user_prompt = build_user_prompt_en(
                pain_quality=pain_quality,
                pain_location_desc=pain_location_desc,
                pain_level_desc=pain_level_desc,
                pain_pattern=pain_pattern,
                somatic_sensation=somatic_sensation,
                cycle_phase_display=active_phase_display,
                phase_physiology=phase_physiology,
                menstrual_history_constraint=menstrual_phase_description,
                accompanying_desc=accompanying_desc,
                height_weight=height_weight,
                diagnosed_history=diagnosed_history,
                surgical_history=surgical_history_val,
                obstetric_history=reproductive_final,
                family_history=family_history_final,
                lifestyle=lifestyle_final,
                allergy_history=allergy_history,
                menarche=menarche_desc,
                cycle_reg=cycle_reg_desc,
                period_dur=period_dur_desc,
                lmp=lmp_val,
                tone_preference=data.tonePreference or "neutral",
                app_mode=app_mode,
                has_nsaid_allergy=has_nsaid_allergy,
                safe_drugs=safe_recommendation,
                forbidden_drugs=forbidden_drugs,
                work_default=work_default,
                work_scenario=data.workScenario or "manager",
                work_tone=data.workTone or "neutral",
            )
        else:
            user_prompt = build_user_prompt_zh(
                pain_quality=pain_quality,
                pain_location_desc=pain_location_desc,
                pain_level_desc=pain_level_desc,
                pain_pattern=pain_pattern,
                somatic_sensation=somatic_sensation,
                cycle_phase_display=active_phase_display,
                phase_physiology=phase_physiology,
                menstrual_history_constraint=menstrual_phase_description,
                accompanying_desc=accompanying_desc,
                height_weight=height_weight,
                diagnosed_history=diagnosed_history,
                surgical_history=surgical_history_val,
                obstetric_history=reproductive_final,
                family_history=family_history_final,
                lifestyle=lifestyle_final,
                allergy_history=allergy_history,
                menarche=menarche_desc,
                cycle_reg=cycle_reg_desc,
                period_dur=period_dur_desc,
                lmp=lmp_val,
                tone_preference=data.tonePreference or "neutral",
                app_mode=app_mode,
                has_nsaid_allergy=has_nsaid_allergy,
                safe_drugs=safe_recommendation,
                forbidden_drugs=forbidden_drugs,
                work_default=work_default,
                work_scenario=data.workScenario or "manager",
                work_tone=data.workTone or "neutral",
            )

        # 调用 LLM
        model_name = config["model_quick"] if data.isQuickLog else config["model"]
        print(f"🤖 正在请求服务提供商: {config['display_name']} ({model_name})...")

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "max_tokens": config.get("max_tokens", 4096),
            "temperature": 0.1,
            "top_p": 0.7,
        }

        raw_text = call_llm(payload, LLM_PROVIDER, config, api_key)

        # 清理并解析 JSON
        cleaned_text = re.sub(
            r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE | re.IGNORECASE
        )
        cleaned_text = re.sub(r"```\s*$", "", cleaned_text, flags=re.MULTILINE).strip()
        start, end = cleaned_text.find("{"), cleaned_text.rfind("}")
        if start != -1 and end != -1:
            cleaned_text = cleaned_text[start: end + 1]

        parsed_json = json.loads(cleaned_text, strict=False)
        fb = _fallback_response(lang, painkiller, app_mode, data)

        def get_safe_field(json_data, key, fallback_val):
            val = json_data.get(key) if isinstance(json_data, dict) else None
            return val if val and str(val).strip() else fallback_val

        # 获取 LLM 返回的字段
        chief_complaint = get_safe_field(parsed_json, "chief_complaint", fb["chief_complaint"])
        present_illness = get_safe_field(parsed_json, "present_illness", fb["present_illness"])
        past_history_raw = get_safe_field(parsed_json, "past_history", fb["past_history"])
        menstrual_history_raw = get_safe_field(parsed_json, "menstrual_history", fb["menstrual_history"])
        clinical_diagnosis = get_safe_field(parsed_json, "clinical_diagnosis", fb["clinical_diagnosis"])
        clinical_suggestions = get_safe_field(parsed_json, "clinical_suggestions", fb["clinical_suggestions"])
        analogy = get_safe_field(parsed_json, "analogy", fb["analogy"])
        work = get_safe_field(parsed_json, "work", fb["work"])
        action = get_safe_field(parsed_json, "action", fb["action"])
        selfCare = get_safe_field(parsed_json, "selfCare", fb["selfCare"])

        # ============================================================
        # 【核心】对 past_history 和 menstrual_history 进行用户数据标记
        # ============================================================
        # 收集用户填写的原始数据
        user_data = {
            "diagnosed": diagnosed_history,
            "surgical": surgical_history_val,
            "allergy": allergy_history,
            "lifestyle": lifestyle_final,
            "menstrual": menstrual_phase_description,
        }

        # 对 past_history 进行标记
        past_history_marked = mark_user_data_in_text(past_history_raw, user_data, lang)

        # menstrual_history 直接使用用户数据（因为要求严格使用 User Prompt 中的描述）
        menstrual_history_marked = f"<user>{menstrual_phase_description}</user>"

        # 对 clinical_diagnosis 中的诊断名称也进行标记（如果有用户确诊史）
        clinical_diagnosis_marked = clinical_diagnosis
        # 如果用户有确诊史，在 clinical_diagnosis 中标记
        if diagnosed_history and diagnosed_history not in ["无明确妇科疾病确诊史", "无明确确诊史", "No confirmed gynecological conditions", "No confirmed conditions"]:
            clinical_diagnosis_marked = mark_user_data_in_text(clinical_diagnosis, user_data, lang)

        # 对 present_illness 中的用户数据也进行标记（如 LMP、周期等）
        present_illness_marked = present_illness
        # 如果 LMP 存在，在现病史中标记
        if lmp_val and lmp_val not in ["未提供", "Not provided"]:
            present_illness_marked = mark_user_data_in_text(present_illness_marked, {"lmp": lmp_val}, lang)
        # 如果周期天数存在，标记
        if menarche_val and menarche_val not in ["未详述", "Not specified"]:
            present_illness_marked = mark_user_data_in_text(present_illness_marked, {"menarche": menarche_val}, lang)

        return {
            "status": "success",
            "language": lang,
            "appMode": app_mode,
            "chief_complaint": chief_complaint,
            "present_illness": present_illness_marked,
            "past_history": past_history_marked,
            "menstrual_history": menstrual_history_marked,
            "clinical_diagnosis": clinical_diagnosis_marked,
            "clinical_suggestions": clinical_suggestions,
            "analogy": analogy,
            "work": work,
            "action": action,
            "selfCare": selfCare,
            "pain_location": pain_location_desc,
            "accompanying_symptoms": accompanying_desc,
            "risk_warning": build_risk_warning(mb, lang),
            "triage_advice": build_triage_advice(data.painScore, accompanying_symptoms, lang) if app_mode == "medical" else ("居家自愈修整中" if lang == "zh" else "Home self-care"),
            "exam_advice": build_exam_advice(mb, lang) if app_mode == "medical" else None,
            "health_tips_link": f"https://health-edu.org/dysmenorrhea/{data.dominantPain}",
        }

    except Exception as e:
        import traceback
        print(f"❌ 运行发生异常，进入安全降级保护: {e}")
        print(traceback.format_exc())
        fallback = _fallback_response(lang, painkiller, app_mode, data)
        fallback.update({"is_fallback": True, "error_detail": str(e)})
        return fallback