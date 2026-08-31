import type { Product } from '@/types/product'

export const PRODUCT_CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'tea', name: '养生茶饮' },
  { id: 'moxa', name: '艾灸用品' },
  { id: 'paste', name: '滋补膏方' },
  { id: 'herb', name: '道地药材' },
  { id: 'tool', name: '理疗器具' }
]

export const PRODUCTS: Product[] = [
  {
    id: 'p001',
    name: '九蒸九晒黑芝麻丸',
    category: '滋补膏方',
    cover: 'https://picsum.photos/id/431/300/300',
    price: 88,
    originalPrice: 128,
    unit: '盒',
    sales: 3286,
    tags: ['补益肝肾', '古法炮制', '非遗工艺'],
    description: '采用道地黑芝麻经九蒸九晒古法炮制，搭配黑豆、黑米、蜂蜜制成，补益肝肾、养血润燥，适合肝肾不足、须发早白、便秘人群日常调理。',
    specs: [
      { id: 'sp1', name: '30粒装', price: 88, stock: 100 },
      { id: 'sp2', name: '60粒装', price: 158, stock: 80 },
      { id: 'sp3', name: '90粒装', price: 228, stock: 50 }
    ],
    detailImages: ['https://picsum.photos/id/431/750/500', 'https://picsum.photos/id/401/750/500'],
    efficacy: '补益肝肾、养血润燥、润肠通便',
    usage: '每日 1-2 粒，温开水送服',
    hot: true
  },
  {
    id: 'p002',
    name: '陈年艾草条三年陈',
    category: '艾灸用品',
    cover: 'https://picsum.photos/id/570/300/300',
    price: 38,
    originalPrice: 58,
    unit: '盒',
    sales: 5821,
    tags: ['三年陈艾', '热力温和', '渗透力强'],
    description: '精选伏牛山南阳野生艾草，自然陈放三年，艾绒细腻，热力温和渗透，适合日常居家艾灸调理。',
    specs: [
      { id: 'sp1', name: '10支装', price: 38, stock: 200 },
      { id: 'sp2', name: '20支装', price: 68, stock: 150 },
      { id: 'sp3', name: '50支装', price: 158, stock: 80 }
    ],
    detailImages: ['https://picsum.photos/id/570/750/500', 'https://picsum.photos/id/580/750/500'],
    efficacy: '温通经络、散寒除湿、培补元气',
    usage: '点燃后距皮肤 2-3cm 温和灸，每穴 5-10 分钟',
    hot: true
  },
  {
    id: 'p003',
    name: '红枣枸杞桂圆茶',
    category: '养生茶饮',
    cover: 'https://picsum.photos/id/326/300/300',
    price: 49,
    originalPrice: 68,
    unit: '盒',
    sales: 4289,
    tags: ['补气养血', '即冲即饮', '独立包装'],
    description: '精选新疆若羌红枣、宁夏中宁枸杞、广西博白桂圆，科学配比，独立小袋包装，即冲即饮，补气养血、安神助眠。',
    specs: [
      { id: 'sp1', name: '20包/盒', price: 49, stock: 300 },
      { id: 'sp2', name: '40包/盒', price: 88, stock: 200 }
    ],
    detailImages: ['https://picsum.photos/id/326/750/500', 'https://picsum.photos/id/312/750/500'],
    efficacy: '补气养血、安神助眠、调理气色',
    usage: '每日 1-2 包，沸水冲泡 5 分钟后饮用',
    hot: true
  },
  {
    id: 'p004',
    name: '玫瑰花冠茶',
    category: '养生茶饮',
    cover: 'https://picsum.photos/id/312/300/300',
    price: 68,
    unit: '盒',
    sales: 2865,
    tags: ['疏肝解郁', '平阴玫瑰', '美容养颜'],
    description: '甄选山东平阴重瓣红玫瑰，半开花蕾手工采摘，低温烘焙，疏肝解郁、理气活血、美容养颜。',
    specs: [
      { id: 'sp1', name: '30朵装', price: 68, stock: 150 },
      { id: 'sp2', name: '60朵装', price: 128, stock: 100 }
    ],
    detailImages: ['https://picsum.photos/id/312/750/500'],
    efficacy: '疏肝解郁、理气活血、美容养颜',
    usage: '每日 3-5 朵，沸水冲泡饮用',
    hot: false
  },
  {
    id: 'p005',
    name: '道地黄芪片',
    category: '道地药材',
    cover: 'https://picsum.photos/id/431/300/300',
    price: 59,
    originalPrice: 88,
    unit: '罐',
    sales: 1928,
    tags: ['内蒙黄芪', '补气之长', '切片均匀'],
    description: '源自内蒙古武川道地黄芪，主根切片，豆香浓郁，补气之长，适合气虚乏力、易感冒人群日常调理。',
    specs: [
      { id: 'sp1', name: '250g罐装', price: 59, stock: 100 },
      { id: 'sp2', name: '500g罐装', price: 108, stock: 80 }
    ],
    detailImages: ['https://picsum.photos/id/431/750/500'],
    efficacy: '补气升阳、固表止汗、利水消肿',
    usage: '每日 6-15g，泡水或煲汤',
    hot: false
  },
  {
    id: 'p006',
    name: '养生艾灸盒',
    category: '理疗器具',
    cover: 'https://picsum.photos/id/570/300/300',
    price: 128,
    originalPrice: 168,
    unit: '个',
    sales: 1538,
    tags: ['多穴同灸', '安全便携', '热力均匀'],
    description: '木质艾灸盒设计，可同时施灸多穴，热力均匀安全，适合居家日常艾灸调理，操作简便。',
    specs: [
      { id: 'sp1', name: '单孔', price: 128, stock: 80 },
      { id: 'sp2', name: '三孔', price: 168, stock: 60 },
      { id: 'sp3', name: '六孔', price: 248, stock: 40 }
    ],
    detailImages: ['https://picsum.photos/id/570/750/500'],
    efficacy: '配合艾条使用，温通经络、调理气血',
    usage: '点燃艾条置入盒中，放于穴位施灸',
    hot: false
  },
  {
    id: 'p007',
    name: '山楂陈皮茶',
    category: '养生茶饮',
    cover: 'https://picsum.photos/id/401/300/300',
    price: 39,
    unit: '盒',
    sales: 3142,
    tags: ['健脾消食', '理气化痰', '饭后再喝'],
    description: '选用山东沂蒙山楂、广东新会陈皮，健脾消食、理气化痰，适合久坐少动、消化不佳人群。',
    specs: [{ id: 'sp1', name: '20包/盒', price: 39, stock: 200 }],
    detailImages: ['https://picsum.photos/id/401/750/500'],
    efficacy: '健脾消食、理气化痰、行气散瘀',
    usage: '饭后饮用，每日 1-2 包',
    hot: false
  },
  {
    id: 'p008',
    name: '阿胶糕',
    category: '滋补膏方',
    cover: 'https://picsum.photos/id/580/300/300',
    price: 198,
    originalPrice: 268,
    unit: '盒',
    sales: 2867,
    tags: ['东阿阿胶', '补血养颜', '即食'],
    description: '以东阿阿胶为主，配以黑芝麻、核桃仁、红枣、冰糖熬制而成，补血养颜、滋阴润燥，适合女性日常调理。',
    specs: [
      { id: 'sp1', name: '250g装', price: 198, stock: 120 },
      { id: 'sp2', name: '500g装', price: 368, stock: 80 }
    ],
    detailImages: ['https://picsum.photos/id/580/750/500'],
    efficacy: '补血养颜、滋阴润燥、安神助眠',
    usage: '每日 1-2 片，空腹或睡前食用',
    hot: true
  },
  {
    id: 'p009',
    name: '牛角刮痧板',
    category: '理疗器具',
    cover: 'https://picsum.photos/id/835/300/300',
    price: 48,
    unit: '个',
    sales: 1923,
    tags: ['天然牛角', '圆润不伤肤', '便携'],
    description: '采用天然黄牛角制成，边缘圆润不伤肤，造型符合人体工学，适合居家刮痧日常保健。',
    specs: [
      { id: 'sp1', name: '鱼形', price: 48, stock: 150 },
      { id: 'sp2', name: '水滴形', price: 52, stock: 100 }
    ],
    detailImages: ['https://picsum.photos/id/835/750/500'],
    efficacy: '配合刮痧油使用，疏通经络、活血化瘀',
    usage: '搭配刮痧油沿经络刮拭',
    hot: false
  },
  {
    id: 'p010',
    name: '酸枣仁百合膏',
    category: '滋补膏方',
    cover: 'https://picsum.photos/id/1080/300/300',
    price: 158,
    originalPrice: 198,
    unit: '瓶',
    sales: 2248,
    tags: ['安神助眠', '古法熬制', '即冲即饮'],
    description: '精选酸枣仁、百合、莲子、龙眼等古法慢熬而成，养心安神、滋阴润燥，适合失眠多梦人群。',
    specs: [
      { id: 'sp1', name: '300g瓶装', price: 158, stock: 100 },
      { id: 'sp2', name: '600g瓶装', price: 288, stock: 60 }
    ],
    detailImages: ['https://picsum.photos/id/1080/750/500'],
    efficacy: '养心安神、滋阴润燥、改善睡眠',
    usage: '每日 1-2 勺，温水冲服',
    hot: false
  }
]

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}
