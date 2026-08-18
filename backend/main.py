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

# ============================================================
# 疾病与检查映射库
# ============================================================

# 疾病症状匹配规则
DISEASE_RULES = {
    "endometriosis": {
        "keywords": {
            "zh": ["内异症", "子宫内膜异位", "腺肌症", "子宫腺肌", "放射痛", "大腿", "腰骶", "刺痛"],
            "en": ["endometriosis", "adenomyosis", "radiating", "thigh", "lumbosacral", "stabbing", "sharp"]
        },
        "condition_zh": "子宫内膜异位症 / 子宫腺肌症",
        "condition_en": "Endometriosis / Adenomyosis",
        "exam_zh": "盆腔超声（建议月经结束后3-7天复查）\nCA-125血液检查（辅助参考）",
        "exam_en": "Pelvic ultrasound (preferably 3-7 days after menstruation)\nCA-125 blood test (auxiliary reference)",
        "reassurance_zh": "内异症是常见的妇科良性疾病，多数通过药物或微创手术即可有效控制。早发现早干预，对生育能力和生活质量的影响是可控的。",
        "reassurance_en": "Endometriosis is a common benign gynecological condition that can be effectively managed with medication or minimally invasive surgery. Early detection and intervention can significantly reduce its impact on fertility and quality of life.",
    },
    "pcos": {
        "keywords": {
            "zh": ["多囊", "pcos", "痤疮", "多毛", "月经稀发", "肥胖", "高雄"],
            "en": ["pcos", "polycystic", "acne", "hirsutism", "irregular", "obesity", "androgen"]
        },
        "condition_zh": "多囊卵巢综合征（PCOS）",
        "condition_en": "Polycystic Ovary Syndrome (PCOS)",
        "exam_zh": "性激素六项（月经第2-5天抽血）\n盆腔超声（评估卵巢形态）\n空腹血糖及胰岛素（排除胰岛素抵抗）",
        "exam_en": "Hormone panel (days 2-5 of menstruation)\nPelvic ultrasound (ovarian morphology)\nFasting blood glucose and insulin (rule out insulin resistance)",
        "reassurance_zh": "PCOS是育龄期女性最常见的内分泌问题之一，通过生活方式调整和规范治疗，绝大多数人都可以正常生活、生育。您不需要为此感到焦虑。",
        "reassurance_en": "PCOS is one of the most common endocrine conditions in women of reproductive age. With lifestyle modifications and proper treatment, the vast majority of women can live normal lives and have healthy pregnancies. There is no need to feel anxious.",
    },
    "pelvic_congestion": {
        "keywords": {
            "zh": ["坠胀", "沉重", "充血", "久坐", "经前", "站立加重"],
            "en": ["heavy", "dragging", "congestion", "sedentary", "premenstrual", "standing"]
        },
        "condition_zh": "盆腔静脉淤血 / 器质性充血",
        "condition_en": "Pelvic Venous Congestion / Organic Congestion",
        "exam_zh": "盆腔彩色多普勒超声（评估血流情况）\n必要时行盆腔静脉造影",
        "exam_en": "Pelvic color Doppler ultrasound (blood flow assessment)\nPelvic venography if needed",
        "reassurance_zh": "盆腔充血多与久坐、缺乏运动有关。通过改善生活方式和针对性的康复训练，绝大多数情况都能得到很好的改善。",
        "reassurance_en": "Pelvic congestion is often related to sedentary lifestyle and lack of exercise. Most cases improve significantly with lifestyle changes and targeted rehabilitation exercises.",
    },
    "fibroids": {
        "keywords": {
            "zh": ["肌瘤", "子宫肌瘤", "经量过多", "经期延长", "腹部包块"],
            "en": ["fibroid", "myoma", "heavy bleeding", "prolonged", "mass"]
        },
        "condition_zh": "子宫肌瘤",
        "condition_en": "Uterine Fibroids",
        "exam_zh": "盆腔超声（评估肌瘤大小、位置、数量）\n必要时行MRI进一步明确",
        "exam_en": "Pelvic ultrasound (size, location, number of fibroids)\nMRI if further characterization is needed",
        "reassurance_zh": "子宫肌瘤是女性最常见的良性肿瘤之一，绝大多数为良性，恶变率极低。治疗方案因人而异，可以是观察、药物或手术，选择非常多。",
        "reassurance_en": "Uterine fibroids are one of the most common benign tumors in women. The vast majority are benign with an extremely low malignancy rate. Treatment options range from observation to medication to surgery — there are many choices.",
    },
    "ovarian_cyst": {
        "keywords": {
            "zh": ["囊肿", "卵巢囊肿", "突发剧痛", "扭转", "破裂"],
            "en": ["cyst", "ovarian", "sudden", "torsion", "rupture"]
        },
        "condition_zh": "卵巢囊肿（需排除扭转/破裂等急症）",
        "condition_en": "Ovarian Cyst (rule out torsion/rupture)",
        "exam_zh": "急诊盆腔超声\n必要时行急诊CT或MRI\n急症指标：血常规、CRP",
        "exam_en": "Emergency pelvic ultrasound\nCT or MRI if needed\nEmergency lab: CBC, CRP",
        "reassurance_zh": "绝大多数卵巢囊肿是生理性的、良性的，会随月经周期自行消退。只有少数情况需要医疗干预。如果有突发剧烈疼痛，及时就医是最安全的选择。",
        "reassurance_en": "The vast majority of ovarian cysts are physiological and benign, and will resolve on their own with the menstrual cycle. Only a small percentage require medical intervention. If you experience sudden severe pain, seeking medical attention promptly is the safest choice.",
    },
    "infection": {
        "keywords": {
            "zh": ["发热", "异常分泌物", "异味", "瘙痒", "盆腔炎", "pid", "白带"],
            "en": ["fever", "discharge", "odor", "itching", "pelvic inflammatory", "pid"]
        },
        "condition_zh": "盆腔炎性疾病 / 生殖道感染",
        "condition_en": "Pelvic Inflammatory Disease / Reproductive Tract Infection",
        "exam_zh": "妇科检查（双合诊）\n阴道分泌物常规及培养\n血常规、CRP\n衣原体/支原体检测",
        "exam_en": "Pelvic examination\nVaginal swab and culture\nCBC, CRP\nChlamydia/Mycoplasma testing",
        "reassurance_zh": "生殖道感染和盆腔炎是可治愈的。及时规范的抗感染治疗可以完全清除病原体，避免远期并发症。不要因为尴尬而拖延就医。",
        "reassurance_en": "Reproductive tract infections and PID are treatable. Prompt and appropriate antibiotic therapy can fully clear the infection and prevent long-term complications. Please don't delay seeking care due to embarrassment.",
    },
}

def match_diseases(dominant_pain: str, symptoms_list: list, accompanying_other: str, spatial_map, lang: str) -> list:
    """根据症状匹配可能的疾病"""
    matched = []
    is_en = lang == 'en'
    symptom_text = " ".join(symptoms_list or []) + " " + (accompanying_other or "")
    
    # 从 spatial_map 提取部位信息
    location_hints = []
    if spatial_map:
        if getattr(spatial_map, 'lowerBack', 0) > 0.3:
            location_hints.append("腰骶" if not is_en else "lumbosacral")
        if getattr(spatial_map, 'abdomen', 0) > 0.3:
            location_hints.append("腹部" if not is_en else "abdomen")
    
    for disease_key, rules in DISEASE_RULES.items():
        keywords = rules["keywords"]["zh" if not is_en else "en"]
        # 检查痛感类型匹配
        pain_match = dominant_pain and any(k in dominant_pain for k in keywords)
        # 检查症状匹配
        symptom_match = any(k in symptom_text.lower() for k in keywords)
        # 检查部位匹配
        location_match = any(k in "".join(location_hints) for k in keywords)
        if pain_match or symptom_match or location_match:
            matched.append(disease_key)
    
    # 按优先级排序：内异症 > 囊肿 > 肌瘤 > PCOS > 盆腔充血 > 感染
    priority = ["endometriosis", "ovarian_cyst", "fibroids", "pcos", "pelvic_congestion", "infection"]
    matched.sort(key=lambda x: priority.index(x) if x in priority else 99)
    
    # 最多返回3个，避免太多
    return matched[:3]

def build_diagnosis_items_fallback(dominant_pain: str, symptoms_list: list, accompanying_other: str, spatial_map, lang: str) -> str:
    """构建诊断项（降级版）"""
    is_en = lang == 'en'
    matched_diseases = match_diseases(dominant_pain, symptoms_list, accompanying_other, spatial_map, lang)
    
    items = []
    # 1. 原发性痛经（始终存在）
    items.append(
        "1. Primary dysmenorrhea (functional) — uterine smooth muscle spasm associated with the menstrual cycle"
        if is_en else
        "1. 原发性痛经（功能性）—— 与月经周期相关的子宫平滑肌痉挛"
    )
    
    # 2. 匹配到的疾病
    for i, disease_key in enumerate(matched_diseases, start=2):
        rules = DISEASE_RULES[disease_key]
        condition = rules["condition_en"] if is_en else rules["condition_zh"]
        items.append(
            f"{i}. {condition} (待排除)"
            if not is_en else
            f"{i}. {condition} (rule out)"
        )
    
    return "\n".join(items)

def build_exam_suggestions_fallback(matched_diseases: list, lang: str) -> str:
    """构建检查建议（降级版）"""
    is_en = lang == 'en'
    suggestions = []
    
    # 默认检查
    suggestions.append("Routine gynecological ultrasound" if is_en else "常规妇科超声")
    
    for disease_key in matched_diseases:
        rules = DISEASE_RULES[disease_key]
        exam = rules["exam_en"] if is_en else rules["exam_zh"]
        # 拆分多条建议
        for line in exam.split('\n'):
            if line.strip() and line.strip() not in suggestions:
                suggestions.append(line.strip())
    
    # 去重并限制数量
    seen = set()
    unique_suggestions = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            unique_suggestions.append(s)
    
    return "\n".join(unique_suggestions) if is_en else "\n".join(unique_suggestions)

def build_reassurance_fallback(matched_diseases: list, lang: str) -> str:
    """构建安抚文字（降级版）"""
    is_en = lang == 'en'
    
    base_reassurance = (
        "Please do not be overly anxious. While your pain does affect your quality of life, clinical statistics show that the vast majority of similar symptoms ultimately point to benign functional dysmenorrhea rather than serious organic disease. Even if further investigation is needed, modern gynecological medicine has very well-established diagnostic and interventional pathways. Your pain is real, but it does not necessarily mean danger — the fact that you are actively recording and confronting it now is itself the most important step."
        if is_en else
        "请不必过度焦虑。您描述的疼痛虽然确实影响了生活质量，但从临床统计来看，绝大多数类似症状最终都指向良性的功能性痛经，而非严重的器质性疾病。即便需要进一步排查，现代妇科医学也有非常成熟的诊断和干预路径。疼痛是真实的，但不等于危险——您现在主动记录和面对它，本身就是最重要的一步。"
    )
    
    # 如果有匹配到的疾病，添加针对性的安抚
    specific_reassurances = []
    for disease_key in matched_diseases:
        rules = DISEASE_RULES[disease_key]
        specific = rules["reassurance_en"] if is_en else rules["reassurance_zh"]
        specific_reassurances.append(specific)
    
    if specific_reassurances:
        return base_reassurance + "\n\n" + "\n".join(specific_reassurances)
    return base_reassurance

def build_exam_info_fallback(lang: str) -> str:
    """构建检查科普（降级版）"""
    return (
        "Cost: Gynecological ultrasound is a routine medical insurance item, typically covered by insurance.\nRadiation: Absolutely none. Ultrasound uses sound wave imaging — no ionizing radiation, completely non-invasive and harmless.\nProcess: Takes about 10-15 minutes. You lie flat, gel is applied, and the probe glides gently over the area — completely painless. You can resume normal activities immediately after. Transvaginal ultrasound (if needed) is performed with strict privacy protection."
        if lang == 'en' else
        "费用：妇科超声属于医保常规项目，费用约100-300元，绝大多数地区均可医保报销。\n辐射：完全没有。超声检查利用声波成像，不含电离辐射，对人体无创无害。\n过程：约10-15分钟。平躺、涂耦合凝胶、探头轻轻滑动探查，全程无痛。检查结束后即可正常活动。经阴道超声（如有需要）也有严格隐私保护。"
    )

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
  "menstrual_history": "月经史与生育史——必须使用User Prompt中的周期描述。",
  "clinical_diagnosis": "诊断方向——必须包含以下结构：\n1. 列出2-3个需要排查的方向（具体方向根据患者症状动态判断）\n2. 建议检查项目\n3. 【重要】必须包含安抚文字（参考下方格式）",
  "clinical_suggestions": "必须包含以下四个模块（使用【】标记）：\n【缓解期自我照护】\n【供您与医生讨论】\n【给您的提醒】\n【关于检查，您可能想知道的】",
  "analogy": "伴侣通感隐喻",
  "work": "请假短信——40字以内",
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

{
  "chief_complaint": "Brief chief complaint — under 20 words.",
  "present_illness": "Detailed HPI based on patient data. NO numeric scores. NO software terminology.",
  "past_history": "Past medical, surgical, and family history. DO NOT include menstrual history.",
  "menstrual_history": "Menstrual and obstetric history. MUST use exact phase from User Prompt.",
  "clinical_diagnosis": "Diagnosis direction — must include:\n1. 2-3 potential directions to rule out (dynamically determined based on symptoms)\n2. Recommended examinations\n3. 【Important】Must include reassurance text (see format below)",
  "clinical_suggestions": "Must include four sections with 【】 markers:\n【Self-Care During Recovery】\n【Questions for Your Doctor】\n【A Note to You】\n【What You May Want to Know About the Exam】",
  "analogy": "Vivid physical metaphor for support person",
  "work": "Workplace/school leave message — under 40 words, professional.",
  "action": ["Actionable suggestion 1", "Actionable suggestion 2", "Actionable suggestion 3"],
  "selfCare": ["Evidence-based self-care 1", "Self-care 2", "Stigma-reducing reassurance"]
}
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
  "chief_complaint": "月经期出现下腹部绞痛，伴恶心1天。",
  "present_illness": "患者26岁，165cm / 55kg。自述月经规律（周期28-30天，经期5天）。本次于月经期第2天出现下腹部持续性绞痛，阵发性加重，向腰骶部放射，伴轻度酸胀感。无肛门坠胀感，无尿频尿急，无发热。起病以来精神可，二便正常，体重无明显变化。日常活动负荷：轻度活动。",
  "past_history": "平素健康状况良好。无明确高血压、糖尿病等慢性病史。无腹部及盆腔手术史。无明确药物过敏史。生活作息方面，偶有睡眠不足。家族史：母亲有痛经史。生育史：未生育。心理社会评估：低压力。",
  "menstrual_history": "13岁初潮，经期5天，周期28-30天，规律。LMP：2026-08-10。当前处于月经期第2天。痛经：有。生育史：G0P0。",
  "clinical_diagnosis": "结合痛觉成像特征及周期性发作规律，需考虑以下方向：\n\n1. 原发性痛经（功能性）—— 与月经周期相关的子宫平滑肌痉挛\n2. 子宫内膜异位症（待排除）—— 腰骶部受累、刺痛性质为典型指向\n\n建议检查：常规妇科超声、盆腔超声（建议月经结束后3-7天复查）。\n\n请不必过度焦虑。您描述的疼痛虽然确实影响了生活质量，但从临床统计来看，绝大多数类似症状最终都指向良性的功能性痛经，而非严重的器质性疾病。即便需要进一步排查，现代妇科医学也有非常成熟的诊断和干预路径。疼痛是真实的，但不等于危险——您现在主动记录和面对它，本身就是最重要的一步。",
  "clinical_suggestions": "【缓解期自我照护】\n• 温敷下腹部及腰骶部，每次15-20分钟，每日2-3次\n• 静卧休养，采取侧卧胎儿位减轻盆腔张力\n• 适量饮用温热水或姜枣茶，避免生冷、辛辣饮食\n\n【供您与医生讨论】\n• 疼痛是否与月经周期相关？每次持续多久？\n• 疼痛主要集中在下腹部，还是向腰骶部或大腿放射？\n• 是否伴有恶心、腹泻等其他症状？\n• 日常作息、睡眠、饮食、压力情况如何？\n• 既往是否做过妇科检查？结果如何？\n\n【给您的提醒】\n请不必过度焦虑。您的疼痛是真实的，它确实影响了您的生活质量。但从临床统计来看，绝大多数类似症状最终都指向良性的功能性痛经，而非严重的器质性疾病。您主动记录和面对它，本身就是最重要的一步。\n\n【关于检查，您可能想知道的】\n费用：妇科超声属于医保常规项目，费用约100-300元，绝大多数地区均可医保报销。\n辐射：完全没有。超声检查利用声波成像，不含电离辐射，对人体无创无害。\n过程：约10-15分钟。平躺、涂耦合凝胶、探头轻轻滑动探查，全程无痛。检查结束后即可正常活动。经阴道超声（如有需要）也有严格隐私保护。",
  "analogy": "子宫内像藏着一个上紧了发条的金属夹子，在不断收缩拧动，冷意带着尖锐的酸麻感直窜后脊，疼得根本站不直身子。",
  "work": "因今天生理期不适/痛经，特申请请假休息一天，望批准。",
  "action": ["☑️ 准备一个温热的热水袋，帮她放置在下腹部或后腰处进行物理热敷理疗。", "☑️ 帮她倒一杯温热的饮用水，并准备好安全的止痛药。"],
  "selfCare": ["✨ 采用侧卧婴儿蜷缩式，膝盖之间夹枕头，放松紧绷的盆腔肌肉。", "✨ 尽量拉长呼吸，吸气4秒、平稳呼气8秒，能帮过度兴奋的盆底肌肉尽快放松下来。"]
}
"""

FEW_SHOT_EXAMPLE_EN = """
[EXAMPLE — FOR REFERENCE ONLY]
{
  "chief_complaint": "Lower abdominal cramping during menstruation, accompanied by nausea for 1 day.",
  "present_illness": "Patient is 26 years old, 165cm / 55kg. Reports regular menstrual cycles (28-30 days, 5-day duration). Developed persistent lower abdominal cramping with paroxysmal exacerbations on Day 2 of menstruation, radiating to the lumbosacral region with mild soreness. No rectal pressure, no urinary urgency, no fever. Vital signs are stable. Bowel and bladder functions are normal. No significant weight change. Activity level: light.",
  "past_history": "Generally healthy. No history of hypertension or diabetes. No abdominal or pelvic surgery. No known drug allergies. Lifestyle: occasional sleep deprivation. Family history: maternal history of dysmenorrhea. Obstetric history: Nulliparous. Psychosocial assessment: low stress.",
  "menstrual_history": "Menarche at 13, 5-day duration, 28-30 day cycles, regular. LMP: 2026-08-10. Currently on Day 2 of menstruation. Dysmenorrhea: Present. Obstetric history: G0P0.",
  "clinical_diagnosis": "Based on pain imaging characteristics and cyclical patterns, the following should be considered:\n\n1. Primary dysmenorrhea (functional) — uterine smooth muscle spasm associated with the menstrual cycle\n2. Endometriosis (rule out) — lumbosacral involvement and sharp pain quality are typical indicators\n\nRecommended examinations: Routine gynecological ultrasound, Pelvic ultrasound (preferably 3-7 days after menstruation).\n\nPlease do not be overly anxious. While your pain does affect your quality of life, clinical statistics show that the vast majority of similar symptoms ultimately point to benign functional dysmenorrhea rather than serious organic disease. Even if further investigation is needed, modern gynecological medicine has very well-established diagnostic and interventional pathways. Your pain is real, but it does not necessarily mean danger — the fact that you are actively recording and confronting it now is itself the most important step.",
  "clinical_suggestions": "【Self-Care During Recovery】\n• Apply warm compress to lower abdomen and lumbosacral area, 15-20 minutes at a time, 2-3 times daily\n• Rest in a side-lying fetal position to reduce pelvic tension\n• Drink warm water or ginger/date tea; avoid cold, raw, and spicy foods\n\n【Questions for Your Doctor】\n• Is your pain related to your menstrual cycle? How long does each episode last?\n• Is the pain mainly in your lower abdomen, or does it radiate to your lower back or thighs?\n• Do you experience any other symptoms like nausea or diarrhea?\n• What is your daily routine like — sleep, diet, stress levels?\n• Have you had any gynecological exams before? What were the results?\n\n【A Note to You】\nPlease do not be overly anxious. Your pain is real, and it does affect your quality of life. However, clinical statistics show that the vast majority of similar symptoms ultimately point to benign functional dysmenorrhea rather than serious organic disease. The fact that you are actively recording and confronting it now is itself the most important step.\n\n【What You May Want to Know About the Exam】\nCost: Gynecological ultrasound is a routine medical insurance item, typically covered by insurance.\nRadiation: Absolutely none. Ultrasound uses sound wave imaging — no ionizing radiation, completely non-invasive and harmless.\nProcess: Takes about 10-15 minutes. You lie flat, gel is applied, and the probe glides gently over the area — completely painless. You can resume normal activities immediately after. Transvaginal ultrasound (if needed) is performed with strict privacy protection.",
  "analogy": "A deep, heavy pressure in the pelvis — like a constant, intense muscle cramp that makes it hard to stand or sit comfortably.",
  "work": "Taking a sick day today. Work is covered.",
  "action": ["Apply a heating pad to your lower abdomen for 15-20 minutes to relieve muscle tension.", "Stay hydrated with warm beverages. Consider over-the-counter pain relief (e.g., ibuprofen) if appropriate for you."],
  "selfCare": ["Rest in a comfortable position with your legs elevated.", "Try slow, deep breathing — 4 seconds in, 8 seconds out — to relax your pelvic floor.", "Rest is not weakness — your body is doing important work right now."]
}
"""

FEW_SHOT_EXAMPLE_ZH_GENERAL = """
[示例 — 仅作参考]
{
  "chief_complaint": "月经期出现下腹部绞痛，伴恶心。",
  "present_illness": "患者25岁，165cm / 55kg。自述月经规律。于月经期出现下腹部绞痛，伴恶心。日常活动负荷：轻度活动。",
  "past_history": "生活作息方面，睡眠不足、喜食生冷。生育史：未生育。心理社会评估提示低压力。",
  "menstrual_history": "月经史：13岁初潮，经期5天，周期规律。末次月经：2026-08-17。",
  "clinical_diagnosis": "结合痛觉成像特征及周期性发作规律，需考虑以下方向：\n\n1. 原发性痛经（功能性）—— 与月经周期相关的子宫平滑肌痉挛\n\n建议检查：常规妇科超声。\n\n请不必过度焦虑。您描述的疼痛虽然确实影响了生活质量，但从临床统计来看，绝大多数类似症状最终都指向良性的功能性痛经，而非严重的器质性疾病。即便需要进一步排查，现代妇科医学也有非常成熟的诊断和干预路径。疼痛是真实的，但不等于危险——您现在主动记录和面对它，本身就是最重要的一步。",
  "clinical_suggestions": "【缓解期自我照护】\n• 温敷下腹部及腰骶部，每次15-20分钟，每日2-3次\n• 静卧休养，采取侧卧胎儿位减轻盆腔张力\n• 适量饮用温热水或姜枣茶，避免生冷、辛辣饮食\n\n【供您与医生讨论】\n• 疼痛是否与月经周期相关？每次持续多久？\n• 是否伴有恶心、腹泻等其他症状？\n• 日常作息、睡眠、饮食、压力情况如何？\n• 既往是否做过妇科检查？结果如何？\n\n【给您的提醒】\n请不必过度焦虑。您的疼痛是真实的，它确实影响了您的生活质量。但从临床统计来看，绝大多数类似症状最终都指向良性的功能性痛经，而非严重的器质性疾病。您主动记录和面对它，本身就是最重要的一步。\n\n【关于检查，您可能想知道的】\n费用：妇科超声属于医保常规项目，费用约100-300元，绝大多数地区均可医保报销。\n辐射：完全没有。超声检查利用声波成像，不含电离辐射，对人体无创无害。\n过程：约10-15分钟。平躺、涂耦合凝胶、探头轻轻滑动探查，全程无痛。检查结束后即可正常活动。经阴道超声（如有需要）也有严格隐私保护。",
  "analogy": "深层沉重的压迫感——像持续的肌肉收缩。",
  "work": "今天身体不适，请假休息一天。明天恢复。",
  "action": ["下腹部热敷", "舒适姿势休息"],
  "selfCare": ["抬高双腿休息", "缓慢深呼吸——吸气4秒，呼气8秒", "休息是身体的需要，不是软弱。"]
}
"""

FEW_SHOT_EXAMPLE_EN_GENERAL = """
[EXAMPLE — FOR REFERENCE ONLY]
{
  "chief_complaint": "Lower abdominal cramping during menstruation, accompanied by nausea.",
  "present_illness": "Patient is 25 years old, 165cm / 55kg. Reports regular menstrual cycles. Developed lower abdominal cramping during menstruation, accompanied by nausea. Activity level: light.",
  "past_history": "Lifestyle: sleep deprivation, prefers cold foods. Obstetric history: Nulliparous. Psychosocial assessment: low stress.",
  "menstrual_history": "Menstrual history: Menarche at 13, 5-day cycles, regular. LMP: 2026-08-17.",
  "clinical_diagnosis": "Based on pain imaging characteristics and cyclical patterns, the following should be considered:\n\n1. Primary dysmenorrhea (functional) — uterine smooth muscle spasm associated with the menstrual cycle\n\nRecommended examinations: Routine gynecological ultrasound.\n\nPlease do not be overly anxious. While your pain does affect your quality of life, clinical statistics show that the vast majority of similar symptoms ultimately point to benign functional dysmenorrhea rather than serious organic disease. Even if further investigation is needed, modern gynecological medicine has very well-established diagnostic and interventional pathways. Your pain is real, but it does not necessarily mean danger — the fact that you are actively recording and confronting it now is itself the most important step.",
  "clinical_suggestions": "【Self-Care During Recovery】\n• Apply warm compress to lower abdomen and lumbosacral area, 15-20 minutes at a time, 2-3 times daily\n• Rest in a side-lying fetal position to reduce pelvic tension\n• Drink warm water or ginger/date tea; avoid cold, raw, and spicy foods\n\n【Questions for Your Doctor】\n• Is your pain related to your menstrual cycle? How long does each episode last?\n• Do you experience any other symptoms like nausea or diarrhea?\n• What is your daily routine like — sleep, diet, stress levels?\n• Have you had any gynecological exams before? What were the results?\n\n【A Note to You】\nPlease do not be overly anxious. Your pain is real, and it does affect your quality of life. However, clinical statistics show that the vast majority of similar symptoms ultimately point to benign functional dysmenorrhea rather than serious organic disease. The fact that you are actively recording and confronting it now is itself the most important step.\n\n【What You May Want to Know About the Exam】\nCost: Gynecological ultrasound is a routine medical insurance item, typically covered by insurance.\nRadiation: Absolutely none. Ultrasound uses sound wave imaging — no ionizing radiation, completely non-invasive and harmless.\nProcess: Takes about 10-15 minutes. You lie flat, gel is applied, and the probe glides gently over the area — completely painless. You can resume normal activities immediately after. Transvaginal ultrasound (if needed) is performed with strict privacy protection.",
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
        else:
            past_history_raw = f"既往史：{diagnosed_cn}。手术史：{surg_cn}。过敏史：{allergy_cn}。生活作息：{lifestyle_cn}。"
        past_history_marked = mark_user_data_in_text(past_history_raw, user_data_cn, lang)
        menstrual_marked = f"<user>{menstrual_full}</user>"
    else:
        if is_general:
            past_history_raw = f"Past: {diagnosed_en}. Surgery: {surg_en}. Allergies: {allergy_en}. Lifestyle: {lifestyle_en}."
        else:
            past_history_raw = f"Past History: {diagnosed_en}. Surgery: {surg_en}. Allergies: {allergy_en}. Lifestyle: {lifestyle_en}."
        past_history_marked = mark_user_data_in_text(past_history_raw, user_data_en, lang)
        menstrual_marked = f"<user>{menstrual_full}</user>"
    
    # ---- 构建诊断和建议（使用 matched diseases） ----
    matched = match_diseases(
        data.dominantPain,
        symptoms or [],
        getattr(mb, 'accompanyingOther', '') if mb else '',
        data.spatialMap,
        lang
    )
    
    diagnosis_items = build_diagnosis_items_fallback(
        data.dominantPain,
        symptoms or [],
        getattr(mb, 'accompanyingOther', '') if mb else '',
        data.spatialMap,
        lang
    )
    
    exam_suggestions = build_exam_suggestions_fallback(matched, lang)
    reassurance = build_reassurance_fallback(matched, lang)
    exam_info = build_exam_info_fallback(lang)
    
    # ---- 构建自我照护建议 ----
    self_care_items = []
    self_care_items.append(
        "Apply warm compress to lower abdomen and lumbosacral area, 15-20 minutes at a time, 2-3 times daily"
        if lang == 'en' else
        "温敷下腹部及腰骶部，每次15-20分钟，每日2-3次"
    )
    self_care_items.append(
        "Rest in a side-lying fetal position to reduce pelvic tension"
        if lang == 'en' else
        "静卧休养，采取侧卧胎儿位减轻盆腔张力"
    )
    if data.dominantPain in ['heavy', 'sink']:
        self_care_items.append(
            "Elevate hips with a pillow to promote venous return from the pelvis"
            if lang == 'en' else
            "用枕头垫高臀部，促进盆腔静脉回流"
        )
    else:
        self_care_items.append(
            "Drink warm water or ginger/date tea; avoid cold, raw, and spicy foods"
            if lang == 'en' else
            "适量饮用温热水或姜枣茶，避免生冷、辛辣饮食"
        )
    
    self_care_text = "\n".join(["• " + item for item in self_care_items])
    
    # ---- 构建医生讨论问题 ----
    discussion_items = []
    discussion_items.append(
        "Is your pain related to your menstrual cycle? How long does each episode last?"
        if lang == 'en' else
        "疼痛是否与月经周期相关？每次持续多久？"
    )
    if symptoms and len(symptoms) > 0:
        discussion_items.append(
            f"Do you experience any other symptoms like {', '.join(symptoms)}?"
            if lang == 'en' else
            f"是否伴有{'、'.join(symptoms)}等其他症状？"
        )
    else:
        discussion_items.append(
            "Do you experience any other symptoms like constipation, diarrhea, or nausea?"
            if lang == 'en' else
            "是否伴有便秘、腹泻、恶心等其他症状？"
        )
    discussion_items.append(
        "What is your daily routine like — sleep, diet, stress levels?"
        if lang == 'en' else
        "日常作息、睡眠、饮食、压力情况如何？"
    )
    discussion_items.append(
        "Have you had any gynecological exams before? What were the results?"
        if lang == 'en' else
        "既往是否做过妇科检查？结果如何？"
    )
    discussion_text = "\n".join(["• " + item for item in discussion_items])
    
    # ---- 组装返回 ----
    if lang == 'zh':
        if is_general:
            return {
                "chief_complaint": f"{pain_desc_cn}。",
                "present_illness": f"您目前处于{cycle_cn}，{location_cn}有{intensity_cn}{pain_type_cn}，伴随{symptoms_cn}。建议适当休息、注意保暖。",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": f"{diagnosis_items}\n\n建议检查：\n{exam_suggestions}\n\n{reassurance}",
                "clinical_suggestions": f"【缓解期自我照护】\n{self_care_text}\n\n【供您与医生讨论】\n{discussion_text}\n\n【给您的提醒】\n{reassurance}\n\n【关于检查，您可能想知道的】\n{exam_info}",
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
            return {
                "chief_complaint": f"{pain_desc_cn}。",
                "present_illness": f"患者处于{cycle_cn}，{location_cn}有{intensity_cn}{pain_type_cn}，伴{symptoms_cn}。",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": f"{diagnosis_items}\n\n建议检查：\n{exam_suggestions}\n\n{reassurance}",
                "clinical_suggestions": f"【缓解期自我照护】\n{self_care_text}\n\n【供您与医生讨论】\n{discussion_text}\n\n【给您的提醒】\n{reassurance}\n\n【关于检查，您可能想知道的】\n{exam_info}",
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
        # 英文版
        if is_general:
            return {
                "chief_complaint": f"{pain_desc_en}.",
                "present_illness": f"You are currently in {cycle_en}, experiencing {intensity_en} {pain_type_en} in the {location_en}, with {symptoms_en}. Consider resting and staying warm.",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": f"{diagnosis_items}\n\nRecommended examinations:\n{exam_suggestions}\n\n{reassurance}",
                "clinical_suggestions": f"【Self-Care During Recovery】\n{self_care_text}\n\n【Questions for Your Doctor】\n{discussion_text}\n\n【A Note to You】\n{reassurance}\n\n【What You May Want to Know About the Exam】\n{exam_info}",
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
            return {
                "chief_complaint": f"{pain_desc_en}.",
                "present_illness": f"The patient is in {cycle_en}, experiencing {intensity_en} {pain_type_en} in the {location_en}, with {symptoms_en}.",
                "past_history": past_history_marked,
                "menstrual_history": menstrual_marked,
                "clinical_diagnosis": f"{diagnosis_items}\n\nRecommended examinations:\n{exam_suggestions}\n\n{reassurance}",
                "clinical_suggestions": f"【Self-Care During Recovery】\n{self_care_text}\n\n【Questions for Your Doctor】\n{discussion_text}\n\n【A Note to You】\n{reassurance}\n\n【What You May Want to Know About the Exam】\n{exam_info}",
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
        # 获取预设的伴随症状
        accompanying_symptoms = data.accompanyingSymptoms or []

        # ✅ 获取用户自定义的伴随症状（从 medicalBackground 中读取）
        custom_symptoms = []
        if mb and hasattr(mb, 'accompanyingOther') and mb.accompanyingOther:
            # 按逗号、顿号或空格分割
            custom = [s.strip() for s in re.split(r'[，,、\s]+', mb.accompanyingOther) if s.strip()]
            custom_symptoms.extend(custom)
        # 合并所有伴随症状
        all_symptoms = accompanying_symptoms + custom_symptoms
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

        # 获取 LLM 返回的原始字段
        chief_complaint = get_safe_field(parsed_json, "chief_complaint", fb["chief_complaint"])
        present_illness = get_safe_field(parsed_json, "present_illness", fb["present_illness"])
        past_history_raw = get_safe_field(parsed_json, "past_history", fb["past_history"])
        menstrual_history_raw = get_safe_field(parsed_json, "menstrual_history", fb["menstrual_history"])
        clinical_diagnosis_raw = get_safe_field(parsed_json, "clinical_diagnosis", fb["clinical_diagnosis"])
        clinical_suggestions_raw = get_safe_field(parsed_json, "clinical_suggestions", fb["clinical_suggestions"])
        analogy = get_safe_field(parsed_json, "analogy", fb["analogy"])
        work = get_safe_field(parsed_json, "work", fb["work"])
        action = get_safe_field(parsed_json, "action", fb["action"])
        selfCare = get_safe_field(parsed_json, "selfCare", fb["selfCare"])

        # ============================================================
        # ✅ 对 clinical_diagnosis 和 clinical_suggestions 进行后处理
        # ============================================================

        def build_diagnosis_items(dominant_pain, mb, symptoms_list, spatial_map, cycle_day, lang):
            """动态构建诊断项列表"""
            items = []
            is_en = lang == 'en'
            has_lower_back = False
            if spatial_map:
                has_lower_back = getattr(spatial_map, 'lowerBack', 0) or 0 > 0.3
            
            # 1. 原发性痛经（始终存在）
            items.append(
                "1. Primary dysmenorrhea (functional) — uterine smooth muscle spasm associated with the menstrual cycle"
                if is_en else
                "1. 原发性痛经（功能性）—— 与月经周期相关的子宫平滑肌痉挛"
            )
            
            # 2. 内异症提示
            endo_reasons = []
            if dominant_pain in ['pierce', 'scrape']:
                endo_reasons.append("sharp/stabbing pain quality" if is_en else "刺痛/刮痛性质")
            if has_lower_back:
                endo_reasons.append("lumbosacral involvement" if is_en else "腰骶部受累")
            if symptoms_list and 'lumbosacral' in symptoms_list:
                endo_reasons.append("lumbosacral pain" if is_en else "腰骶痛")
            
            mb_dict = mb.dict() if hasattr(mb, 'dict') else (mb or {})
            accompanying_other = mb_dict.get('accompanyingOther', '') if isinstance(mb_dict, dict) else ''
            if '放射' in accompanying_other or '大腿' in accompanying_other:
                endo_reasons.append("radiating pain" if is_en else "放射痛")
            
            if endo_reasons:
                items.append(
                    f"2. Endometriosis (rule out) — {', '.join(endo_reasons)} are typical indicators"
                    if is_en else
                    f"2. 子宫内膜异位症（待排除）—— {'、'.join(endo_reasons)}为典型指向"
                )
            
            # 3. 盆腔充血提示
            congestion_reasons = []
            if dominant_pain in ['heavy', 'sink']:
                congestion_reasons.append("heavy dragging sensation" if is_en else "坠胀/沉重感")
            if cycle_day and ('经前' in cycle_day or 'pre' in cycle_day.lower()):
                congestion_reasons.append("premenstrual timing" if is_en else "经前期")
            
            activity = mb_dict.get('activityLevel', '') if isinstance(mb_dict, dict) else ''
            if activity == 'sedentary':
                congestion_reasons.append("sedentary lifestyle" if is_en else "久坐生活方式")
            
            if congestion_reasons:
                items.append(
                    f"3. Pelvic congestion (rule out) — {', '.join(congestion_reasons)} are contributing factors"
                    if is_en else
                    f"3. 盆腔器质性充血（待排除）—— {'、'.join(congestion_reasons)}为可能诱因"
                )
            
            return '\n'.join(items)

        def build_exam_suggestions(dominant_pain, lang):
            """构建检查建议"""
            is_en = lang == 'en'
            suggestions = []
            suggestions.append("Routine gynecological ultrasound" if is_en else "常规妇科超声")
            if dominant_pain in ['pierce', 'scrape']:
                suggestions.append(
                    "Pelvic ultrasound (preferably 3-7 days after menstruation)"
                    if is_en else
                    "盆腔超声（建议月经结束后3-7天）"
                )
            return ', '.join(suggestions) if is_en else '、'.join(suggestions)

        def get_reassurance(lang):
            """获取安抚文字"""
            return (
                "Please do not be overly anxious. While your pain does affect your quality of life, clinical statistics show that the vast majority of similar symptoms ultimately point to benign functional dysmenorrhea rather than serious organic disease. Even if further investigation is needed, modern gynecological medicine has very well-established diagnostic and interventional pathways. Your pain is real, but it does not necessarily mean danger — the fact that you are actively recording and confronting it now is itself the most important step."
                if lang == 'en' else
                "请不必过度焦虑。您描述的疼痛虽然确实影响了生活质量，但从临床统计来看，绝大多数类似症状最终都指向良性的功能性痛经，而非严重的器质性疾病。即便需要进一步排查，现代妇科医学也有非常成熟的诊断和干预路径。疼痛是真实的，但不等于危险——您现在主动记录和面对它，本身就是最重要的一步。"
            )

        def get_exam_info(lang):
            """获取检查科普信息"""
            return (
                "Cost: Gynecological ultrasound is a routine medical insurance item, typically covered by insurance.\nRadiation: Absolutely none. Ultrasound uses sound wave imaging — no ionizing radiation, completely non-invasive and harmless.\nProcess: Takes about 10-15 minutes. You lie flat, gel is applied, and the probe glides gently over the area — completely painless. You can resume normal activities immediately after. Transvaginal ultrasound (if needed) is performed with strict privacy protection."
                if lang == 'en' else
                "费用：妇科超声属于医保常规项目，费用约100-300元，绝大多数地区均可医保报销。\n辐射：完全没有。超声检查利用声波成像，不含电离辐射，对人体无创无害。\n过程：约10-15分钟。平躺、涂耦合凝胶、探头轻轻滑动探查，全程无痛。检查结束后即可正常活动。经阴道超声（如有需要）也有严格隐私保护。"
            )

        # 构建增强版的 clinical_diagnosis 和 clinical_suggestions
        reassurance_text = get_reassurance(lang)
        exam_info_text = get_exam_info(lang)

        # 如果 LLM 返回的内容已经是完整的，则直接使用；否则用动态构建的
        if clinical_diagnosis_raw and len(clinical_diagnosis_raw) > 50:
            # LLM 返回了完整内容，直接使用
            clinical_diagnosis_final = clinical_diagnosis_raw
        else:
            # 动态构建
            diagnosis_items = build_diagnosis_items(
                data.dominantPain, 
                mb, 
                data.accompanyingSymptoms or [], 
                data.spatialMap, 
                data.cycleDay, 
                lang
            )
            exam_suggestions = build_exam_suggestions(data.dominantPain, lang)
            clinical_diagnosis_final = f"{diagnosis_items}\n\n建议检查：{exam_suggestions}。\n\n{reassurance_text}"

        # 对 clinical_suggestions 做同样处理
        if clinical_suggestions_raw and len(clinical_suggestions_raw) > 50:
            clinical_suggestions_final = clinical_suggestions_raw
        else:
            # 构建结构化内容
            self_care_items = "\n".join([
                "• " + ("Apply warm compress to lower abdomen and lumbosacral area, 15-20 minutes at a time, 2-3 times daily" if lang == 'en' else "温敷下腹部及腰骶部，每次15-20分钟，每日2-3次"),
                "• " + ("Rest in a side-lying fetal position to reduce pelvic tension" if lang == 'en' else "静卧休养，采取侧卧胎儿位减轻盆腔张力"),
                "• " + ("Drink warm water or ginger/date tea; avoid cold, raw, and spicy foods" if lang == 'en' else "适量饮用温热水或姜枣茶，避免生冷、辛辣饮食"),
            ])
            
            discussion_items = "\n".join([
                "• " + ("Is your pain related to your menstrual cycle? How long does each episode last?" if lang == 'en' else "疼痛是否与月经周期相关？每次持续多久？"),
                "• " + ("Do you experience any other symptoms like constipation, diarrhea, or nausea?" if lang == 'en' else "是否伴有便秘、腹泻、恶心等其他症状？"),
                "• " + ("What is your daily routine like — sleep, diet, stress levels?" if lang == 'en' else "日常作息、睡眠、饮食、压力情况如何？"),
                "• " + ("Have you had any gynecological exams before? What were the results?" if lang == 'en' else "既往是否做过妇科检查？结果如何？"),
            ])
            
            clinical_suggestions_final = (
                f"【Self-Care During Recovery】\n{self_care_items}\n\n【Questions for Your Doctor】\n{discussion_items}\n\n【A Note to You】\n{reassurance_text}\n\n【What You May Want to Know About the Exam】\n{exam_info_text}"
                if lang == 'en' else
                f"【缓解期自我照护】\n{self_care_items}\n\n【供您与医生讨论】\n{discussion_items}\n\n【给您的提醒】\n{reassurance_text}\n\n【关于检查，您可能想知道的】\n{exam_info_text}"
            )

            # 返回时使用处理后的内容
        return {
            "status": "success",
            "language": lang,
            "appMode": app_mode,
            "chief_complaint": chief_complaint,
            "present_illness": present_illness,
            "past_history": past_history_raw,
            "menstrual_history": menstrual_history_raw,
            "clinical_diagnosis": clinical_diagnosis_final,  # ✅ 使用处理后的
            "clinical_suggestions": clinical_suggestions_final,  # ✅ 使用处理后的
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