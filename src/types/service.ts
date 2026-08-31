// 理疗服务类型定义

export interface ServiceItem {
  id: string;
  name: string; // 服务名称
  category: string; // 分类：刮痧/拔罐/艾灸/推拿/针灸
  cover: string; // 封面图
  price: number; // 价格
  originalPrice?: number; // 原价
  duration: number; // 时长（分钟）
  intro: string; // 简介
  efficacy: string[]; // 功效说明
  suitable: string[]; // 适用人群
  caution: string[]; // 注意事项
  steps: { title: string; desc: string }[]; // 流程
  popular: boolean; // 是否热门
}

// 门店信息
export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number; // 距离 km
  businessHours: string;
  cover: string;
}

// 预约订单
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface BookingOrder {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCover: string;
  price: number;
  storeId: string;
  storeName: string;
  storeAddress: string;
  date: string; // 预约日期 YYYY-MM-DD
  time: string; // 预约时段
  customerName: string;
  customerPhone: string;
  remark: string;
  status: OrderStatus;
  createdAt: string;
}
