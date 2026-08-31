// 健康档案类型定义

export interface HealthRecord {
  id: string;
  date: string; // ISO 时间
  type: 'condition' | 'treatment' | 'medical' | 'constitution';
  title: string;
  content: string;
  details?: Record<string, string>;
}

// 个人健康档案
export interface UserProfile {
  name: string;
  gender: 'male' | 'female' | 'unknown';
  age: number;
  height: number;
  weight: number;
  bloodType: string;
  allergy: string;
  chronicDisease: string;
  updatedAt: string;
}
