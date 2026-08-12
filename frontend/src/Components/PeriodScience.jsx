// src/Components/PeriodScience.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/i18nContext'; // 🌟 引入双语 Hook

// ===== 经期生活类避坑与反常识科普内容库（中英双语） =====
const SCIENCE_KNOWLEDGE_BASE = [
  {
    id: 1,
    tag_zh: '破除误区',
    tag_en: 'Myth Busted',
    title_zh: '冰饮并非痛经直接元凶',
    title_en: 'Cold drinks are not the direct cause of dysmenorrhea',
    desc_zh: '痛经的主因是前列腺素（PGF2α）导致子宫平滑肌剧烈收缩。冷饮本身不直接引发痛经，仅血管对冷刺激较敏感、易收缩的人群需忌冷。',
    desc_en: 'Dysmenorrhea is mainly caused by prostaglandins (PGF2α) triggering uterine muscle contractions. Cold drinks do not directly cause pain, unless you are sensitive to cold stimulation.',
  },
  {
    id: 2,
    tag_zh: '用药常识',
    tag_en: 'Medication',
    title_zh: '布洛芬要在刚开始痛时服用',
    title_en: 'Take Ibuprofen at the onset of pain',
    desc_zh: '常规止痛药（如布洛芬）无成瘾性，其原理是阻断前列腺素合成，在疼痛刚出现或发作前服用效果最好，剧痛难忍时效果大打折扣。',
    desc_en: 'Painkillers like Ibuprofen are non-addictive. They work by blocking prostaglandin synthesis and work best when taken right at the start of pain.',
  },
  {
    id: 3,
    tag_zh: '生理真相',
    tag_en: 'Physiological Fact',
    title_zh: '经期腹泻属于正常生理反应',
    title_en: 'Diarrhea during period is a normal reaction',
    desc_zh: '经期子宫分泌的前列腺素会顺着血液扩散至肠道，刺激肠道平滑肌蠕动加速，导致经期前两天容易出现腹泻现象。',
    desc_en: 'Prostaglandins released by the uterus diffuse into nearby intestinal tract, stimulating smooth muscle contraction and causing loose stools.',
  },
  {
    id: 4,
    tag_zh: '卫生误区',
    tag_en: 'Hygiene Mistake',
    title_zh: '卫生巾不宜长期存放在卫生间',
    title_en: 'Do not store pads in humid bathrooms',
    desc_zh: '浴室潮湿不通风，卫生巾即使有外包装也容易吸潮滋生霉菌，建议存放在干燥通风的抽屉或衣柜中。',
    desc_en: 'Bathrooms are humid and poorly ventilated. Pads can absorb moisture and grow mold. Store them in dry, ventilated places like drawers.',
  },
  {
    id: 5,
    tag_zh: '破除误区',
    tag_en: 'Myth Busted',
    title_zh: '经期吃甜食狂吃不胖属于误区',
    title_en: 'Eating sweets without weight gain is a myth',
    desc_zh: '经期基础代谢率仅有微弱增加，大量摄入高糖高脂依然会转化为脂肪，且会导致血糖剧烈波动而加重烦躁情绪。',
    desc_en: 'Basal metabolic rate increases only slightly during menstruation. Excess calories still turn into fat, and sugar spikes can worsen mood swings.',
  },
  {
    id: 6,
    tag_zh: '生活要点',
    tag_en: 'Lifestyle Tip',
    title_zh: '经期可适量运动但需避开倒立',
    title_en: 'Moderate exercise is beneficial, avoid inversions',
    desc_zh: '低强度散步或伸展瑜伽能促进内啡呔分泌，缓解痛经与焦虑。但应避免剧烈无氧运动、腹压过高的动作及倒立。',
    desc_en: 'Low-intensity walking or stretching yoga promotes endorphins and reduces pain. Avoid intense workouts, heavy abdominal pressure, and inversions.',
  },
  {
    id: 7,
    tag_zh: '清洁误区',
    tag_en: 'Cleaning Tip',
    title_zh: '切勿冲洗阴道内部',
    title_en: 'Never douch or wash inside the vagina',
    desc_zh: '日常与经期只需用温水清洗外阴即可，使用妇科洗液或强行冲洗阴道内部会破坏阴道自净的弱酸性菌群平衡。',
    desc_en: 'Rinse only the vulva with warm water. Douching or using harsh feminine washes disrupts the vaginal self-cleaning micro-environment.',
  },
  {
    id: 8,
    tag_zh: '常识盲区',
    tag_en: 'Common Blindspot',
    title_zh: '经期体重增加 1 至 2 公斤多为水肿',
    title_en: 'Period weight gain of 1-2 kg is water retention',
    desc_zh: '受孕激素与雌激素影响，体液易在体内滞留（水钠潴留），经期体重微涨属于正常水肿，经期结束后会自然恢复。',
    desc_en: 'Hormonal changes cause fluid retention. Mild weight gain is normal water weight and will naturally fade after your period.',
  },
  {
    id: 9,
    tag_zh: '卫生要点',
    tag_en: 'Hygiene Essential',
    title_zh: '血量再少也需 2 至 3 小时更换卫生巾',
    title_en: 'Change pads every 2-3 hours even with light flow',
    desc_zh: '经血富含营养物质，在潮湿闷热环境下极易滋生细菌，即使经期末期血量极少也应保持定期更换。',
    desc_en: 'Menstrual blood easily breeds bacteria in warm and humid environments. Change pads every 2-3 hours regardless of flow volume.',
  },
  {
    id: 10,
    tag_zh: '生理真相',
    tag_en: 'Physiological Fact',
    title_zh: '经期偏头痛并非心理作用',
    title_en: 'Menstrual migraines are a real physiological symptom',
    desc_zh: '月经来潮前雌激素水平骤降会引发脑部血管舒缩异常，从而导致经期偏头痛，这属于明确的生理因素。',
    desc_en: 'A sharp drop in estrogen levels before menstruation causes cranial blood vessel fluctuations, triggering real physiological migraines.',
  },
  {
    id: 11,
    tag_zh: '常识盲区',
    tag_en: 'Common Blindspot',
    title_zh: '经血出现血块不代表体寒',
    title_en: 'Blood clots do not mean "body coldness"',
    desc_zh: '当月经量较大或长时间保持坐姿时，抗凝血酶来不及分解所有经血，就会形成凝固血块排出，属于正常生理现象。',
    desc_en: 'During heavy flow or prolonged sitting, anticoagulants cannot process blood quickly enough, forming small clots naturally.',
  },
  {
    id: 12,
    tag_zh: '健康警示',
    tag_en: 'Health Warning',
    title_zh: '剧烈痛经切勿盲目硬忍',
    title_en: 'Do not endure severe dysmenorrhea endlessly',
    desc_zh: '结婚生子能治愈痛经属于误区，若痛经持续加重或出现继发性痛经，可能是子宫内膜异位症等疾病，应及时就医诊治。',
    desc_en: 'Enduring progressive or severe pain is unsafe. It may indicate conditions like endometriosis and warrants medical evaluation.',
  },
];

export default function PeriodScience() {
  const { lang } = useI18n(); // 🌟 获取当前语言环境
  const isEn = lang === 'en';

  const [selectedCards, setSelectedCards] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 随机抽取 3 条
  const getRandomThree = useCallback(() => {
    const shuffled = [...SCIENCE_KNOWLEDGE_BASE].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, []);

  useEffect(() => {
    setSelectedCards(getRandomThree());
  }, [getRandomThree]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSelectedCards(getRandomThree());
      setIsRefreshing(false);
    }, 200);
  };

  return (
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #222' }}>
      {/* 头部标题与换一换按钮（双语） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h4
          style={{
            color: '#ef5350',
            fontSize: '15px',
            fontWeight: '700',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💡</span>
          <span>{isEn ? 'Period Science & Tips' : '经期知识科普'}</span>
        </h4>

        <button
          onClick={handleRefresh}
          style={{
            background: 'rgba(239, 83, 80, 0.1)',
            border: '1px solid rgba(239, 83, 80, 0.3)',
            color: '#ff8a80',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
            opacity: isRefreshing ? 0.5 : 1,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            ↻
          </span>
          <span>{isEn ? 'Refresh' : '换一换'}</span>
        </button>
      </div>

      {/* 随机 3 条科普卡片列表 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          opacity: isRefreshing ? 0.3 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {selectedCards.map((item) => (
          <div
            key={item.id}
            style={{
              background: '#161616',
              borderRadius: '14px',
              padding: '14px 16px',
              border: '1px solid #262626',
              borderLeft: '4px solid rgba(239, 83, 80, 0.8)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  letterSpacing: '0.2px',
                }}
              >
                {isEn ? item.title_en : item.title_zh}
              </span>

              <span
                style={{
                  fontSize: '10px',
                  color: '#ef5350',
                  background: 'rgba(239, 83, 80, 0.12)',
                  border: '1px solid rgba(239, 83, 80, 0.25)',
                  padding: '2px 7px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isEn ? item.tag_en : item.tag_zh}
              </span>
            </div>

            <p
              style={{
                color: '#aaa',
                fontSize: '12.5px',
                lineHeight: '1.6',
                margin: 0,
                textAlign: 'justify',
              }}
            >
              {isEn ? item.desc_en : item.desc_zh}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}