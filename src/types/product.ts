// 商品类型定义

export interface ProductSpec {
  id: string;
  name: string; // 规格名，如 "30g"
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  category: string; // 茶饮/艾灸/膏方/药材
  cover: string;
  price: number;
  originalPrice?: number;
  unit: string; // 单位：盒/瓶/包
  sales: number; // 销量
  tags: string[];
  description: string;
  specs: ProductSpec[];
  detailImages: string[];
  efficacy: string; // 功效
  usage: string; // 用法
  hot: boolean;
}

// 购物车商品
export interface CartItem {
  productId: string;
  productName: string;
  productCover: string;
  specId: string;
  specName: string;
  price: number;
  quantity: number;
}

// 商品订单状态
export type ProductOrderStatus = 'unpaid' | 'paid' | 'shipped' | 'completed' | 'cancelled';

export interface ProductOrder {
  id: string;
  items: CartItem[];
  totalAmount: number;
  status: ProductOrderStatus;
  address: string;
  receiver: string;
  phone: string;
  remark: string;
  createdAt: string;
}
