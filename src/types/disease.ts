// 疾病类型定义

export interface Disease {
  id: string;
  name: string;
  alias?: string; // 别名
  category: string; // 分类：内科/妇科/儿科/外科
  symptoms: string[]; // 主要症状
  tcmDiagnosis: string; // 中医辨证
  tcmTreatment: string[]; // 中医调理
  diet: string[]; // 食疗方案
  dietRecipes: { name: string; ingredients: string; method: string; effect: string }[];
  lifestyle: string[]; // 生活指导
  precautions: string[]; // 注意事项
  cover: string;
}
