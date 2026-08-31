import type { QuizQuestion, ConstitutionInfo, ConstitutionType } from '@/types/constitution'

// 中医九种体质详情库
export const CONSTITUTION_INFOS: ConstitutionInfo[] = [
  {
    type: 'pinghe',
    name: '平和质',
    score: 0,
    rank: 0,
    description: '体形匀称健壮，面色红润，精力充沛，脏腑功能状态强健壮实',
    symptoms: ['面色润泽', '头发稠密有光泽', '目光有神', '嗅觉通利', '睡眠安和', '胃纳良好', '二便通调', '舌色淡红苔薄白'],
    causes: ['先天禀赋良好', '后天调养得当'],
    advice: {
      diet: ['饮食均衡', '粗细搭配', '不偏食', '少食辛辣'],
      exercise: ['规律运动', '太极', '散步', '瑜伽'],
      lifestyle: ['作息规律', '劳逸结合', '顺应四时'],
      therapy: ['四季均可艾灸足三里', '日常保健推拿']
    }
  },
  {
    type: 'qixu',
    name: '气虚质',
    score: 0,
    rank: 0,
    description: '元气不足，气息低弱，机体脏腑功能状态低下',
    symptoms: ['气短懒言', '容易疲乏', '精神不振', '易出汗', '舌淡红舌体胖大边有齿痕', '脉弱'],
    causes: ['先天禀赋不足', '久病伤气', '年老体衰', '过度劳累'],
    advice: {
      diet: ['多食益气健脾食物', '如黄豆、白扁豆、鸡肉、香菇、大枣、桂圆', '少食耗气食物如生萝卜'],
      exercise: ['柔缓运动', '散步、太极拳、八段锦', '避免剧烈运动'],
      lifestyle: ['作息规律', '避免熬夜', '注意保暖', '避免过度劳累'],
      therapy: ['艾灸足三里、气海、关元', '推拿按摩中脘', '刮痧宜轻柔']
    }
  },
  {
    type: 'yangxu',
    name: '阳虚质',
    score: 0,
    rank: 0,
    description: '阳气不足，失于温煦，以形寒肢冷为主要特征',
    symptoms: ['手足不温', '喜温饮食', '精神不振', '面色柔白', '大便溏薄', '小便清长', '舌淡胖嫩'],
    causes: ['先天禀赋不足', '过食寒凉', '久病伤阳', '年老阳衰'],
    advice: {
      diet: ['多食温阳食物', '如羊肉、牛肉、生姜、桂圆、韭菜、核桃', '忌食生冷寒凉'],
      exercise: ['可进行较大强度运动', '如慢跑、球类', '冬练三九'],
      lifestyle: ['注意保暖', '尤其是腰背腹部', '避免空调直吹', '夏不贪凉'],
      therapy: ['艾灸关元、命门、神阙', '督脉刮痧', '三伏贴']
    }
  },
  {
    type: 'yinxu',
    name: '阴虚质',
    score: 0,
    rank: 0,
    description: '体内津液精血等阴液亏少，以阴虚内热为主要特征',
    symptoms: ['手足心热', '口燥咽干', '鼻微干', '喜冷饮', '大便干燥', '舌红少津', '脉细数'],
    causes: ['先天不足', '久病伤阴', '过食温燥', '熬夜伤阴'],
    advice: {
      diet: ['多食滋阴食物', '如鸭肉、绿豆、银耳、百合、莲子、枸杞', '少食温燥食物'],
      exercise: ['适合中小强度运动', '如太极拳、八段锦', '避免剧烈出汗运动'],
      lifestyle: ['避免熬夜', '中午小憩', '避免剧烈运动', '保持心情平和'],
      therapy: ['推拿按摩太溪、三阴交', '不宜过度艾灸刮痧', '可针刺涌泉']
    }
  },
  {
    type: 'tanshi',
    name: '痰湿质',
    score: 0,
    rank: 0,
    description: '水液内停而痰湿凝聚，以粘滞重浊为主要特征',
    symptoms: ['形体肥胖', '腹部松软', '面部油脂较多', '多汗且粘', '胸闷痰多', '舌苔厚腻'],
    causes: ['过食肥甘', '久坐少动', '脾虚不运', '先天禀赋'],
    advice: {
      diet: ['饮食清淡', '少食肥甘厚味', '多食薏苡仁、白萝卜、海带、紫菜', '忌酒'],
      exercise: ['坚持有氧运动', '慢跑、游泳、爬山', '循序渐进', '每天至少30分钟'],
      lifestyle: ['规律作息', '避免潮湿环境', '减轻体重'],
      therapy: ['艾灸脾俞、足三里、丰隆', '背部膀胱经刮痧', '拔罐调理']
    }
  },
  {
    type: 'shire',
    name: '湿热质',
    score: 0,
    rank: 0,
    description: '湿热内蕴，以湿滞、热扰为主要特征',
    symptoms: ['面垢油光', '易生痤疮', '口苦口干', '身重困倦', '大便燥结或粘滞', '舌红苔黄腻'],
    causes: ['过食辛辣油腻', '嗜烟酒', '久居湿地', '脾虚湿蕴化热'],
    advice: {
      diet: ['饮食清淡', '多食苦瓜、绿豆、薏苡仁、冬瓜、芹菜', '少食辛辣肥甘', '戒酒'],
      exercise: ['适合大中强度运动', '跑步、爬山、武术', '夏季运动出汗为宜'],
      lifestyle: ['避免潮湿环境', '保持二便通畅', '少熬夜', '保持心情舒畅'],
      therapy: ['刮痧督脉、膀胱经', '拔罐背部', '避免艾灸过度']
    }
  },
  {
    type: 'xueyu',
    name: '血瘀质',
    score: 0,
    rank: 0,
    description: '体内有血液运行不畅的潜在倾向或瘀血内阻',
    symptoms: ['面色晦暗', '口唇颜色偏暗', '皮肤易有瘀斑', '易患疼痛', '女性多见痛经', '舌暗或有瘀点'],
    causes: ['七情不畅', '寒凝血瘀', '气滞血瘀', '外伤', '久病入络'],
    advice: {
      diet: ['多食活血食物', '如山楂、桃仁、当归、玫瑰花、黑豆、醋', '少食寒凉收敛食物'],
      exercise: ['适合有氧运动', '健美操、太极拳、舞蹈', '促进气血运行'],
      lifestyle: ['保持心情愉悦', '避免久坐', '注意保暖', '规律作息'],
      therapy: ['刮痧首选', '背部膀胱经拔罐', '针灸膈俞、血海、三阴交']
    }
  },
  {
    type: 'qiyu',
    name: '气郁质',
    score: 0,
    rank: 0,
    description: '长期情志不畅、气机郁滞，以情绪低落为主要特征',
    symptoms: ['情绪低沉', '敏感多虑', '胸胁胀满', '善太息', '咽部异物感', '舌淡红苔薄白'],
    causes: ['情志不畅', '思虑过度', '压力大', '肝气郁结'],
    advice: {
      diet: ['多食疏肝食物', '如佛手、橙子、柑皮、荞麦、高粱', '可饮玫瑰花茶、菊花茶'],
      exercise: ['增加户外运动', '跑步、登山、游泳、集体运动', '有助于肝气条达'],
      lifestyle: ['保持心情愉悦', '多社交', '培养兴趣', '听音乐', '避免独处'],
      therapy: ['推拿按摩太冲、期门', '刮痧肝胆经', '避免过度艾灸']
    }
  },
  {
    type: 'tebing',
    name: '特禀质',
    score: 0,
    rank: 0,
    description: '先天禀赋异常，以过敏反应为主要特征',
    symptoms: ['过敏性鼻炎', '哮喘', '荨麻疹', '湿疹', '对药物食物敏感', '花粉症'],
    causes: ['先天禀赋异常', '遗传因素', '肺气不足'],
    advice: {
      diet: ['饮食清淡均衡', '避免过敏食物', '少食腥发之物', '多食补益肺气食物'],
      exercise: ['适度运动', '增强体质', '太极拳、八段锦', '避免剧烈运动'],
      lifestyle: ['避免过敏原', '保持居室清洁', '注意保暖', '顺应四时'],
      therapy: ['艾灸肺俞、大椎、足三里', '调理体质', '避免过度刮痧拔罐']
    }
  }
]

// 体质测试题库（中医九种体质标准问卷，约60题，本系统精简为40题）
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // 平和质（5题）
  {
    id: 1,
    category: 'pinghe',
    question: '您精力充沛吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 2,
    category: 'pinghe',
    question: '您容易疲乏吗？（反向题）',
    options: [
      { label: '从不', value: 5 },
      { label: '较少', value: 4 },
      { label: '有时', value: 3 },
      { label: '经常', value: 2 },
      { label: '总是', value: 1 }
    ]
  },
  {
    id: 3,
    category: 'pinghe',
    question: '您说话声音低弱无力吗？（反向题）',
    options: [
      { label: '从不', value: 5 },
      { label: '较少', value: 4 },
      { label: '有时', value: 3 },
      { label: '经常', value: 2 },
      { label: '总是', value: 1 }
    ]
  },
  {
    id: 4,
    category: 'pinghe',
    question: '您面色红润、有光泽吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 5,
    category: 'pinghe',
    question: '您的性格开朗、乐观吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 气虚质（5题）
  {
    id: 6,
    category: 'qixu',
    question: '您容易气短，呼吸短促吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 7,
    category: 'qixu',
    question: '您容易心慌吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 8,
    category: 'qixu',
    question: '您容易头晕或站起时晕眩吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 9,
    category: 'qixu',
    question: '您比别人容易感冒吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 10,
    category: 'qixu',
    question: '您喜欢安静、懒得说话吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 阳虚质（5题）
  {
    id: 11,
    category: 'yangxu',
    question: '您手脚发凉吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 12,
    category: 'yangxu',
    question: '您胃脘部、背部或腰膝怕冷吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 13,
    category: 'yangxu',
    question: '您感到怕冷、衣服比别人穿得多吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 14,
    category: 'yangxu',
    question: '您比一般人耐受不了寒冷吗（冬天的寒冷、夏天的冷空调）？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 15,
    category: 'yangxu',
    question: '您吃凉东西容易腹泻吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 阴虚质（5题）
  {
    id: 16,
    category: 'yinxu',
    question: '您感到手脚心发热吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 17,
    category: 'yinxu',
    question: '您感觉身体、面部发热吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 18,
    category: 'yinxu',
    question: '您皮肤或口唇干燥吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 19,
    category: 'yinxu',
    question: '您口唇的颜色比正常人红吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 20,
    category: 'yinxu',
    question: '您容易便秘或大便干燥吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 痰湿质（5题）
  {
    id: 21,
    category: 'tanshi',
    question: '您感到胸闷或腹部胀满吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 22,
    category: 'tanshi',
    question: '您感到身体沉重不轻松或不爽快吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 23,
    category: 'tanshi',
    question: '您腹部肥满松软吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 24,
    category: 'tanshi',
    question: '您有额部油脂分泌多的现象吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 25,
    category: 'tanshi',
    question: '您上眼睑比别人肿（轻微隆起）吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 湿热质（5题）
  {
    id: 26,
    category: 'shire',
    question: '您面部或鼻部有油腻感或油亮发光吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 27,
    category: 'shire',
    question: '您易生痤疮或疮疖吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 28,
    category: 'shire',
    question: '您口苦或嘴里有异味吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 29,
    category: 'shire',
    question: '您大便黏滞不爽、有解不尽感吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 30,
    category: 'shire',
    question: '您小便时尿道有发热感、尿色浓吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 血瘀质（4题）
  {
    id: 31,
    category: 'xueyu',
    question: '您的皮肤在不知不觉中会出现青紫瘀斑吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 32,
    category: 'xueyu',
    question: '您两颧部有细微红丝吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 33,
    category: 'xueyu',
    question: '您身体上有哪里疼痛吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 34,
    category: 'xueyu',
    question: '您面色晦黯或容易出现褐斑吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 气郁质（4题）
  {
    id: 35,
    category: 'qiyu',
    question: '您感到闷闷不乐、情绪低沉吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 36,
    category: 'qiyu',
    question: '您容易精神紧张、焦虑不安吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 37,
    category: 'qiyu',
    question: '您多愁善感、感情脆弱吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 38,
    category: 'qiyu',
    question: '您胁肋部或乳房胀痛吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },

  // 特禀质（2题）
  {
    id: 39,
    category: 'tebing',
    question: '您没有感冒时也会打喷嚏吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  },
  {
    id: 40,
    category: 'tebing',
    question: '您没有感冒时也会鼻塞、流鼻涕吗？',
    options: [
      { label: '总是', value: 5 },
      { label: '经常', value: 4 },
      { label: '有时', value: 3 },
      { label: '较少', value: 2 },
      { label: '从不', value: 1 }
    ]
  }
]

export const CONSTITUTION_NAME_MAP: Record<ConstitutionType, string> = {
  pinghe: '平和质',
  qixu: '气虚质',
  yangxu: '阳虚质',
  yinxu: '阴虚质',
  tanshi: '痰湿质',
  shire: '湿热质',
  xueyu: '血瘀质',
  qiyu: '气郁质',
  tebing: '特禀质'
}
