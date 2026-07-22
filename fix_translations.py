# -*- coding: utf-8 -*-
import os
import re

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'i18n', 'translations.js')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if content.rstrip().endswith('};'):
    print("File looks complete")
    print(f"Total lines: {content.count(chr(10))}")
else:
    print("File is truncated, fixing...")
    lines = content.split('\n')
    print(f"Current lines: {len(lines)}")
    
    # Find the last non-empty line
    last_content = ''
    for line in reversed(lines):
        if line.strip():
            last_content = line
            break
    print(f"Last content line: {repr(last_content[-80:])}")
    
    # The file is truncated in the middle of the EN painTemplates.twist.selfCare string
    # We need to complete it. Use raw strings to avoid surrogate issues.
    
    remaining = r"""C) for 15-20 minutes. Warming the lower limbs reflexively dilates lower abdominal vessels, relieving ischemic pelvic cramping."
      },
      pierce: {
        analogy: "Imagine having a root canal without anesthesia\u2014that electric, drilling sharp pain suddenly stabbing into your lower abdomen, numbing and stinging, as if someone is stirring a needle in your pelvis.",
        med: "Patient reports sharp stabbing pain in the lower abdomen, brief drilling sensation radiating to the inner thigh, sudden onset and offset, with cold sweats. Recommend evaluation for neuropathic pain and endometriosis.",
        selfCare: "\u2728 Immediately lie on your side during an attack, avoiding any pressure points.\n\u2728 Use warm (not hot) compresses\u2014sensitive nerve endings react strongly to extreme heat.\n\u2728 Use white noise or soothing ambient music to distract.\n\u2728 Keep warm water nearby, sip slowly to stabilize autonomic body temperature.\n\u2728 Gently rotate or move your ankles during intervals to promote lower pelvic circulation.\n\u2728 Progressive Muscle Relaxation (PMR): Consciously tense your leg and gluteal muscles for 10 seconds, then fully relax. This helps break the defensive muscle-locking cycle triggered by sudden stabbing pain.\n\u2728 Tactile Gating: Gently stroke the skin in a wide area around the stabbing pain (avoiding the direct pain center). This activates non-nociceptive A-beta sensory fibers, physically blocking sharp pain signals at the spinal cord level."
      },
      heavy: {
        analogy: "Like having a 5kg sandbag tied to your abdomen\u2014standing makes you want to squat, sitting makes you want to lie down. That heavy dragging sensation sinking from your uterus all the way to your knees.",
        med: "Patient reports severe dragging and heavy sensation in the lower abdomen, worsening when standing, slightly relieved when lying flat, with lumbosacral soreness. Recommend evaluation for pelvic congestion and possible adenomyosis.",
        selfCare: "\u2728 Elevated hip position: use a pillow to elevate hips 15-20cm while lying flat.\n\u2728 Minimize standing or walking, absolutely avoid lifting heavy objects.\n\u2728 Wear high-waisted seamless loose underwear to avoid abdominal compression.\n\u2728 Drink warm ginger tea or red date tea.\n\u2728 Tell yourself: you've worked hard today, rest is not laziness.\n\u2728 Legs-Up-The-Wall Pose (Viparita Karani): lie flat and raise your legs vertically against the wall for 10-15 minutes. Gravity helps drain pooled venous blood and fluid from the pelvis, quickly relieving heavy pelvic congestion.\n\u2728 Bedside Pelvic Tilt: lie flat with knees bent, feet flat on the bed. Gently arch your lower back away from the bed on inhale, press your lower back flat against the bed on exhale. This relaxes the uterosacral ligaments without leaving the bed."
      },
      wave: {
        analogy: "Like having a balloon inside your belly that keeps inflating and deflating\u2014waves of fullness spreading through your entire abdomen, making even breathing feel suffocating.",
        med: "Patient reports diffuse bloating pain in the abdomen, episodic exacerbation with gas sensation, pain location not fixed. Recommend evaluation for pelvic edema, intestinal gas, and pelvic inflammation.",
        selfCare: "\u2728 Wear the loosest clothes possible, completely loosen your belt.\n\u2728 Gentle clockwise abdominal massage (with feather-light, extremely gentle pressure on the skin).\n\u2728 Avoid gas-producing foods: beans, dairy, carbonated drinks, cold foods.\n\u2728 Place a heat pack over the entire abdomen, wrap yourself in a warm blanket.\n\u2728 Slow everything down\u2014when you slow down, the sensory volume of pain decreases.\n\u2728 Wind-Relieving Pose (Pavanamuktasana): lie flat, hug both knees tightly to your chest, gently rock side to side. This gently massages the colon to release trapped gas, reducing intra-abdominal pressure.\n\u2728 Acupressure: Press and massage the ST36 (Zusanli) acupoint (located 4 finger-widths below the kneecap, 1 finger-width lateral to the shin bone). This regulates gastrointestinal motility to relieve bloating and cramping."
      },
      scrape: {
        analogy: "Like an unripe fruit being forcibly peeled\u2014that scraping, tearing sensation from the inside of your uterus outward. Every movement feels like sandpaper rubbing against raw flesh.",
        med: "Patient reports severe tearing sharp pain in the lower abdomen, worsening with movement, with tenesmus. Recommend urgent evaluation for tissue adhesions and possible endometrioma rupture.",
        selfCare: "\u2728 This is the most exhausting type of pain\u2014prioritize absolute stillness and rest.\n\u2728 Absolutely avoid any abdominal rubbing or massage, minimize all position changes.\n\u2728 Sip warm honey water for energy (avoid taking painkillers on an empty stomach).\n\u2728 Comfort yourself with a gentle, compassionate inner voice.\n\u2728 Record pain dynamics once intensity subsides.\n\u2728 Intercostal (chest) breathing: expand your ribcage laterally on inhale, keeping your lower abdomen completely still. This reduces sliding friction of abdominal organs, preventing irritation of sensitive tissue.\n\u2728 Pillow-Supported Child's Pose: place a thick bolster or pillow between your thighs, drape your torso completely over it. Knees apart, hips sitting back. This uses gravity to suspend abdominal organs forward, preventing them from pressing against painful pelvic adhesion sites."
      }
    },
    healing: {
      breathing: {
        title: "\U0001f32c\ufe0f Breathing Therapy",
        description: "Deep abdominal breathing helps the body relax and alleviates tension caused by pain.",
        steps: "\u2460 Find a quiet, comfortable place to sit or lie down\n\u2461 Place one hand on your abdomen to feel its movement\n\u2462 Inhale for 4 seconds, feeling your abdomen rise like a balloon\n\u2463 Hold for 4 seconds, letting oxygen enter your bloodstream\n\u2464 Exhale for 6 seconds, feeling your abdomen fall\n\u2465 Repeat 10-15 times, feeling your body relax"
      },
      heatPack: {
        title: "\U0001f525 Heat Therapy",
        description: "Warmth promotes local circulation and relieves muscle spasms, one of the most effective remedies for dysmenorrhea.",
        steps: "\u2460 Prepare a hot water bottle or heating pad (40-45\u00b0C)\n\u2461 Wrap in a towel to avoid direct skin contact\n\u2462 Apply to lower abdomen or lower back\n\u2463 Each session 15-20 minutes\n\u2464 Can be applied 3-4 times daily\n\u2465 Stay hydrated, drink plenty of water"
      },
      meditation: {
        title: "\U0001f9d8 Mindfulness Meditation",
        description: "Shift attention away from pain, accept the present moment without judgment, reducing the psychological burden of pain.",
        steps: "\u2460 Find a quiet place to sit comfortably\n\u2461 Close your eyes, focus on your breath\n\u2462 When thoughts wander, gently bring them back to your breath\n\u2463 Feel the pain without judging it\n\u2464 Imagine the pain passing like clouds\n\u2465 Start with 5-10 minutes, gradually increase"
      },
      warmDrink: {
        title: "\U0001f375 Warm Drink Therapy",
        description: "Warm beverages not only warm the body but also soothe the mind, an important part of self-care.",
        steps: "\u2460 Ginger tea: 3 slices ginger + 1 spoon brown sugar + hot water\n\u2461 Longan red date tea: 5 longans + 3 red dates\n\u2462 Warm milk with honey\n\u2463 Avoid cold drinks and caffeine\n\u2464 Sip slowly, feel the warmth\n\u2465 2-3 cups daily"
      },
      steps: "Steps",
      close: "Close",
    },

    partnerActions: {
      alone: [
        "\u2611\ufe0f Pour her a glass of warm water, prepare {{med}}.",
        "\u2611\ufe0f Dim the lights, close the door, don't check in too often.",
      ],
      care: [
        "\u2611\ufe0f Warm your palms and place them on her lower belly or back. Take over household chores.",
      ],
      comfort: [
        "\u2611\ufe0f Sit beside her, hold her hand without speaking\u2014accompany her with a sense of safety.",
      ],
    },

    workTemplate: "Dear Manager/HR: I am experiencing a severe primary dysmenorrhea episode ({{pain}}), accompanied by extreme physical exhaustion and cold sweats, unable to maintain normal focus. I am requesting to work from home/take sick leave today. Urgent matters have been delegated. Thank you for your understanding.",

    examDatabase: {
      "pelvic ultrasound": {
        prep: "Full bladder required: drink 500-800ml water 1 hour before the exam.",
        purpose: "Evaluate uterine morphology, endometrial thickness, rule out fibroids, adenomyosis, or ovarian cysts.",
      },
      "transvaginal ultrasound": {
        prep: "Empty bladder before exam. Inform doctor if no sexual history for abdominal ultrasound alternative.",
        purpose: "Clearer visualization of endometriosis lesions and pelvic adhesions. Recommended 3-7 days after period ends.",
      },
      "hormone panel": {
        prep: "Blood draw on day 2-3 of menstruation, early morning fasting. Sit quietly for 10 minutes before draw.",
        purpose: "Evaluate endocrine status, rule out hormone-related pain (e.g., PCOS).",
      },
      laparoscopy: {
        prep: "Minimally invasive surgery requires hospitalization. Pre-operative fasting required.",
        purpose: "Gold standard for endometriosis diagnosis, allows simultaneous lesion removal.",
      },
    },

    shareCard: {
      titles: {
        partner: "Synesthesia Guide",
        work: "Invisible Pain Statement",
        doctor: "Medical Aid Report",
        self: "Self-care Tips",
      },
      footer: "PainScape - Making invisible pain visible",
    },

    pdf: {
      title: "PainScape",
      subtitle: "Patient Pain Archive",
      reportRange: "Report Range: {{start}} - {{end}}",
      totalRecords: "Total Records: {{count}}",
      disclaimer1: "This document is AI-generated based on the patient's visual drawing, for reference only",
      disclaimer2: "Please submit this report to your gynecologist.",
      recordLabel: "Record {{index}}: {{date}}",
      dominantPain: "Dominant Pain: {{pain}}",
      medicalComplaint: "Medical Complaint:",
      medicalReference: "Medical Reference:",
      footer: "PainScape - Generated Report",
    },
  },
};

export default translations;
"""

    # Fix surrogate pairs - replace \uD83C\uDF2C with \U0001f32c etc.
    # Actually, let's just write the raw string directly
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write(remaining)
    
    print("File fixed successfully!")
    
    # Verify
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if content.rstrip().endswith('};'):
        print("Verification: File is now complete!")
        print(f"Total lines: {content.count(chr(10))}")
    else:
        print("Verification: File still has issues")
        print(f"Last 100 chars: {repr(content[-100:])}")
