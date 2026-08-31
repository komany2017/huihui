// 中医九种体质类型定义

export type ConstitutionType =
  | 'pinghe' // 平和质
  | 'qixu' // 气虚质
  | 'yangxu' // 阳虚质
  | 'yinxu' // 阴虚质
  | 'tanshi' // 痰湿质
  | 'shire' // 湿热质
  | 'xueyu' // 血瘀质
  | 'qiyu' // 气郁质
  | 'tebing'; // 特禀质

// 体质题目选项
export interface QuizOption {
  label: string; // 选项文字
  value: number; // 分值 1-5
}

// 体质测试题目
export interface QuizQuestion {
  id: number;
  category: ConstitutionType; // 该题对应体质
  question: string; // 题干
  options: QuizOption[]; // 5个选项
}

// 体质描述
export interface ConstitutionInfo {
  type: ConstitutionType;
  name: string; // 中文名
  score: number; // 转化分 0-100
  rank: number; // 排名 1=主要体质
  description: string; // 体质特征描述
  symptoms: string[]; // 典型表现
  causes: string[]; // 形成原因
  advice: {
    diet: string[]; // 饮食建议
    exercise: string[]; // 运动建议
    lifestyle: string[]; // 起居建议
    therapy: string[]; // 理疗建议
  };
}

// 体质测试结果
export interface ConstitutionResult {
  id: string;
  date: string; // ISO 时间
  scores: Record<ConstitutionType, number>; // 各体质转化分
  primary: ConstitutionType; // 主倾向体质
  secondary?: ConstitutionType; // 兼夹体质
  infos: ConstitutionInfo[]; // 排序后的体质详情
}
