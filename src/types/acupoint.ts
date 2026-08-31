// 穴位类型定义

export type BodyPart = 'head' | 'neck' | 'back' | 'chest' | 'abdomen' | 'limb';

export interface BodyPartInfo {
  key: BodyPart;
  name: string;
  icon: string;
}

export interface Acupoint {
  id: string;
  name: string; // 穴位名
  alias?: string; // 别名
  part: BodyPart; // 所属部位
  meridian: string; // 所属经络
  location: string; // 定位
  effect: string[]; // 功效
  massage: string; // 按摩方法
  indication: string[]; // 主治
  caution?: string; // 注意事项
  cover: string;
}
