import type { ServiceItem, Store } from '@/types/service'

export let SERVICE_CATEGORIES: { id: string; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'guasha', name: '刮痧' },
  { id: 'cupping', name: '拔罐' },
  { id: 'moxibustion', name: '艾灸' },
  { id: 'tuina', name: '推拿' },
  { id: 'acupuncture', name: '针灸' }
]

export let SERVICES: ServiceItem[] = [
  {
    id: 's001',
    name: '背部循经刮痧',
    category: '刮痧',
    cover: 'https://picsum.photos/id/326/750/500',
    price: 168,
    originalPrice: 218,
    duration: 60,
    intro: '运用刮痧器具在背部循经络走向刮拭，疏通腠理、调和气血，改善颈肩腰背酸痛与疲劳。',
    efficacy: ['疏通经络', '活血化瘀', '祛湿排寒', '缓解酸痛', '改善睡眠'],
    suitable: ['颈肩腰背酸痛者', '长期久坐办公族', '湿气重困乏者', '压力大失眠者'],
    caution: ['皮肤破损者忌用', '孕妇腹腰骶禁刮', '过饥过饱不宜', '凝血障碍者慎用'],
    steps: [
      { title: '体质评估', desc: '专业理疗师评估体质与适应症' },
      { title: '局部清洁', desc: '清洁背部皮肤并涂抹刮痧油' },
      { title: '循经刮痧', desc: '沿膀胱经、督脉走向刮拭约 30 分钟' },
      { title: '舒缓调理', desc: '刮痧后局部热敷并饮温水调养' }
    ],
    popular: true
  },
  {
    id: 's002',
    name: '肩颈舒压刮痧',
    category: '刮痧',
    cover: 'https://picsum.photos/id/312/750/500',
    price: 138,
    duration: 45,
    intro: '针对肩颈部位进行刮痧调理，缓解颈肩僵硬、头痛头晕，改善上肢酸麻。',
    efficacy: ['舒缓颈肩', '改善头痛', '疏通气血', '提神醒脑'],
    suitable: ['长期伏案工作者', '颈肩僵硬者', '手机党低头族', '头痛头晕者'],
    caution: ['皮肤过敏者慎用', '颈椎急性损伤忌用'],
    steps: [
      { title: '评估问诊', desc: '了解颈肩不适部位与病史' },
      { title: '热敷松解', desc: '肩颈部位热敷 10 分钟' },
      { title: '循经刮痧', desc: '肩井、大椎、风池等穴位刮拭' },
      { title: '拉伸调理', desc: '指导颈部拉伸动作' }
    ],
    popular: true
  },
  {
    id: 's003',
    name: '传统走罐拔罐',
    category: '拔罐',
    cover: 'https://picsum.photos/id/431/750/500',
    price: 128,
    originalPrice: 168,
    duration: 45,
    intro: '采用传统火罐走罐手法，疏通经络、祛湿排毒，改善肌肉酸痛与体寒。',
    efficacy: ['祛湿排毒', '温通经络', '行气活血', '消肿止痛'],
    suitable: ['湿气重困乏者', '肌肉酸痛者', '体寒怕冷者', '感冒初起者'],
    caution: ['皮肤过敏破损禁用', '水肿患者慎用', '孕妇禁用', '过饥不宜'],
    steps: [
      { title: '体质评估', desc: '辨体质并选穴位' },
      { title: '局部润滑', desc: '背部涂润肤油便于走罐' },
      { title: '走罐留罐', desc: '沿膀胱经走罐并留罐 10 分钟' },
      { title: '调理收尾', desc: '取罐清洁并饮温水' }
    ],
    popular: false
  },
  {
    id: 's004',
    name: '温灸艾灸调理',
    category: '艾灸',
    cover: 'https://picsum.photos/id/570/750/500',
    price: 188,
    originalPrice: 258,
    duration: 60,
    intro: '采用陈年艾条温和灸，温通经络、培补元气，适合阳虚体寒人群调理。',
    efficacy: ['温阳散寒', '培补元气', '调理脾胃', '增强免疫'],
    suitable: ['阳虚怕冷者', '脾胃虚寒者', '易感冒者', '宫寒痛经者'],
    caution: ['阴虚火旺慎用', '孕妇腰腹禁灸', '过饥过饱不宜', '皮肤破损忌灸'],
    steps: [
      { title: '辨证选穴', desc: '辨体质选定中脘、神阙、足三里等' },
      { title: '艾灸调理', desc: '温和灸每穴 10 分钟' },
      { title: '温补收功', desc: '按摩拍打帮助吸收' },
      { title: '饮食指导', desc: '配以温补食疗建议' }
    ],
    popular: true
  },
  {
    id: 's005',
    name: '古法推拿舒压',
    category: '推拿',
    cover: 'https://picsum.photos/id/401/750/500',
    price: 158,
    duration: 60,
    intro: '融合中医经络推拿与脏腑调理手法，缓解全身疲劳、舒展筋骨。',
    efficacy: ['舒筋活络', '行气活血', '缓解疲劳', '调理脏腑'],
    suitable: ['全身疲劳者', '久坐久站者', '亚健康人群', '运动后恢复'],
    caution: ['急性外伤忌用', '骨折部位禁用', '皮肤破损禁用'],
    steps: [
      { title: '问诊评估', desc: '了解疲劳部位与不适' },
      { title: '头部按摩', desc: '舒压放松头部经络 10 分钟' },
      { title: '全身推拿', desc: '循经推拿颈肩背腰四肢 40 分钟' },
      { title: '收功调理', desc: '点穴收功并指导调养' }
    ],
    popular: true
  },
  {
    id: 's006',
    name: '针刺调理',
    category: '针灸',
    cover: 'https://picsum.photos/id/625/750/500',
    price: 198,
    originalPrice: 268,
    duration: 50,
    intro: '由执业中医师操作，循经取穴针刺调理，针对常见亚健康与慢性问题。',
    efficacy: ['疏通经络', '调和阴阳', '扶正祛邪', '调理脏腑'],
    suitable: ['慢性疼痛者', '失眠焦虑者', '脾胃虚弱者', '亚健康调理'],
    caution: ['孕妇慎用', '过饥过饱不宜', '凝血障碍者禁用', '情绪激动不宜'],
    steps: [
      { title: '中医辨证', desc: '医师辨证论治选穴' },
      { title: '消毒施针', desc: '严格消毒并施以毫针' },
      { title: '留针调理', desc: '留针 30 分钟行针调气' },
      { title: '起针收功', desc: '起针按压并叮嘱事项' }
    ],
    popular: false
  },
  {
    id: 's007',
    name: '面部美容刮痧',
    category: '刮痧',
    cover: 'https://picsum.photos/id/580/750/500',
    price: 168,
    duration: 45,
    intro: '运用玉石刮痧板沿面部经络刮拭，提亮肤色、淡化细纹、改善气色。',
    efficacy: ['提亮肤色', '淡化细纹', '紧致提升', '改善气色'],
    suitable: ['面色黯沉者', '初老细纹者', '气色不佳者', '压力大面容憔悴者'],
    caution: ['面部过敏禁用', '严重痤疮忌用', '皮肤破损禁用'],
    steps: [
      { title: '清洁卸妆', desc: '面部深层清洁' },
      { title: '精油按摩', desc: '精油面部按摩 10 分钟' },
      { title: '循经刮痧', desc: '沿面部胃经、大肠经刮拭' },
      { title: '面膜修护', desc: '敷面膜修护收尾' }
    ],
    popular: false
  },
  {
    id: 's008',
    name: '节气三伏贴',
    category: '艾灸',
    cover: 'https://picsum.photos/id/835/750/500',
    price: 88,
    duration: 30,
    intro: '夏季三伏时节贴敷特定穴位，冬病夏治，调理阳虚易感人群。',
    efficacy: ['冬病夏治', '温阳补肺', '增强免疫', '调理体寒'],
    suitable: ['阳虚怕冷者', '易感冒者', '过敏性鼻炎者', '哮喘缓解期者'],
    caution: ['阴虚火旺慎用', '皮肤过敏慎用', '发热期间禁用', '孕妇禁用'],
    steps: [
      { title: '体质辨识', desc: '评估体质判定适应症' },
      { title: '选穴贴敷', desc: '选大椎、肺俞、膏肓等贴敷' },
      { title: '留贴观察', desc: '留贴 1-2 小时观察反应' },
      { title: '指导调养', desc: '饮食起居指导' }
    ],
    popular: false
  }
]

export let STORES: Store[] = [
  {
    id: 'st001',
    name: '润泉养元·城西旗舰店',
    address: '杭州市西湖区文三路 88 号润泉养元大厦 3 楼',
    phone: '0571-88888001',
    distance: 1.2,
    businessHours: '09:00 - 21:00',
    cover: 'https://picsum.photos/id/1082/750/400'
  },
  {
    id: 'st002',
    name: '润泉养元·武林银泰店',
    address: '杭州市下城区体育场路 333 号银泰百货 5 楼',
    phone: '0571-88888002',
    distance: 3.8,
    businessHours: '10:00 - 22:00',
    cover: 'https://picsum.photos/id/1039/750/400'
  },
  {
    id: 'st003',
    name: '润泉养元·滨江星光店',
    address: '杭州市滨江区江南大道 666 号星光时代广场 2 楼',
    phone: '0571-88888003',
    distance: 5.5,
    businessHours: '09:30 - 21:30',
    cover: 'https://picsum.photos/id/1044/750/400'
  },
  {
    id: 'st004',
    name: '润泉养元·钱江新城店',
    address: '杭州市江干区钱江新城丹桂街 1 号来福士广场 4 楼',
    phone: '0571-88888004',
    distance: 7.9,
    businessHours: '10:00 - 22:00',
    cover: 'https://picsum.photos/id/1036/750/400'
  }
]

export function getServiceById(id: string): ServiceItem | undefined {
  return SERVICES.find((s) => s.id === id)
}

export function getStoreById(id: string): Store | undefined {
  return STORES.find((s) => s.id === id)
}

// 预约时间槽
export let BOOKING_TIME_SLOTS: string[] = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '19:00-20:00',
  '20:00-21:00'
]

// ============ 服务器目录同步 setter（后台管理修改后覆盖本地默认值，ESM live binding） ============
export function setServiceCategories(list: { id: string; name: string }[]) {
  SERVICE_CATEGORIES = list
}
export function setServices(list: ServiceItem[]) {
  SERVICES = list
}
export function setStores(list: Store[]) {
  STORES = list
}
export function setTimeSlots(list: string[]) {
  BOOKING_TIME_SLOTS = list
}
