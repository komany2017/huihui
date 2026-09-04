import type { Acupoint, BodyPartInfo } from '@/types/acupoint'

export const BODY_PARTS: BodyPartInfo[] = [
  { key: 'head', name: '头部', icon: '🎯' },
  { key: 'neck', name: '颈项', icon: '🔗' },
  { key: 'back', name: '背腰', icon: '🧍' },
  { key: 'chest', name: '胸胁', icon: '❤️' },
  { key: 'abdomen', name: '腹部', icon: '⭕' },
  { key: 'limb', name: '四肢', icon: '🦵' }
]

export const ACUPOINT_EFFECTS = [
  '全部',
  '头痛',
  '失眠',
  '颈肩酸痛',
  '腰背痛',
  '脾胃',
  '妇科',
  '感冒',
  '高血压',
  '疲劳'
]

export let ACUPOINTS: Acupoint[] = [
  {
    id: 'a001',
    name: '百会',
    alias: '三阳五会',
    part: 'head',
    meridian: '督脉',
    location: '在头部，前发际正中直上 5 寸，或两耳尖连线中点处',
    effect: ['醒脑开窍', '安神定志', '升提阳气', '头痛眩晕'],
    massage: '食指或中指指腹按压 1-3 分钟，力度适中，可顺时针揉按',
    indication: ['头痛', '眩晕', '失眠', '健忘', '脱肛'],
    caution: '孕妇及囟门未闭小儿禁用',
    cover: 'https://picsum.photos/id/64/750/500'
  },
  {
    id: 'a002',
    name: '风池',
    part: 'head',
    meridian: '足少阳胆经',
    location: '在颈后区，枕骨之下，胸锁乳突肌上端与斜方肌上端之间的凹陷中',
    effect: ['疏风清热', '解表散邪', '醒脑明目', '舒筋活络'],
    massage: '双手拇指向上方按揉 2-3 分钟，力度由轻到重',
    indication: ['感冒', '头痛', '颈项强痛', '眩晕', '目赤肿痛'],
    caution: '不宜重按，避免按压过深',
    cover: 'https://picsum.photos/id/91/750/500'
  },
  {
    id: 'a003',
    name: '太阳',
    part: 'head',
    meridian: '经外奇穴',
    location: '在头部，眉梢与目外眦之间，向后约一横指的凹陷处',
    effect: ['疏风清热', '通络止痛', '清肝明目'],
    massage: '双手中指或食指指腹按压 1-2 分钟，可顺时针揉按',
    indication: ['偏头痛', '目赤肿痛', '面瘫', '眩晕'],
    caution: '力度宜轻，避免重压',
    cover: 'https://picsum.photos/id/177/750/500'
  },
  {
    id: 'a004',
    name: '印堂',
    part: 'head',
    meridian: '经外奇穴',
    location: '在头部，两眉毛内侧端中间的凹陷中',
    effect: ['安神定志', '明目通鼻', '疏风清热'],
    massage: '食指或中指指腹按压 1-2 分钟，可向鼻部按揉',
    indication: ['失眠', '头痛', '眩晕', '鼻渊', '小儿惊风'],
    caution: '力度适中，避免过重',
    cover: 'https://picsum.photos/id/338/750/500'
  },
  {
    id: 'a005',
    name: '大椎',
    part: 'neck',
    meridian: '督脉',
    location: '在颈后区，第 7 颈椎棘突下凹陷中（低头时颈后最高骨下方）',
    effect: ['解表清热', '截疟止痫', '振奋阳气'],
    massage: '拇指或中指指腹按压 2-3 分钟，可点按或揉按',
    indication: ['感冒', '发热', '颈项强直', '咳嗽', '哮喘'],
    caution: '孕妇慎用，避免重按',
    cover: 'https://picsum.photos/id/1027/750/500'
  },
  {
    id: 'a006',
    name: '肩井',
    part: 'neck',
    meridian: '足少阳胆经',
    location: '在肩胛区，第 7 颈椎棘突与肩峰最外侧点连线的中点',
    effect: ['舒筋活络', '理气止痛', '祛风清热'],
    massage: '拇指或对侧四指拿揉 2-3 分钟，力度适中',
    indication: ['颈肩疼痛', '上肢不遂', '乳腺炎', '难产'],
    caution: '孕妇禁用',
    cover: 'https://picsum.photos/id/64/750/500'
  },
  {
    id: 'a007',
    name: '命门',
    part: 'back',
    meridian: '督脉',
    location: '在脊柱区，第 2 腰椎棘突下凹陷中（与肚脐前后相对）',
    effect: ['温肾壮阳', '强腰固肾', '培元固本'],
    massage: '掌心搓热后搓擦命门至发热，或拇指按揉 3 分钟',
    indication: ['腰痛', '阳痿', '遗精', '泄泻', '带下'],
    caution: '阴虚火旺者慎用重刺激',
    cover: 'https://picsum.photos/id/91/750/500'
  },
  {
    id: 'a008',
    name: '肾俞',
    part: 'back',
    meridian: '足太阳膀胱经',
    location: '在脊柱区，第 2 腰椎棘突下，后正中线旁开 1.5 寸',
    effect: ['温肾壮阳', '强腰固肾', '利水消肿'],
    massage: '双手叉腰，拇指按揉两侧肾俞 3-5 分钟',
    indication: ['腰痛', '遗精', '阳痿', '月经不调', '耳鸣'],
    caution: '孕妇慎用',
    cover: 'https://picsum.photos/id/177/750/500'
  },
  {
    id: 'a009',
    name: '肺俞',
    part: 'back',
    meridian: '足太阳膀胱经',
    location: '在脊柱区，第 3 胸椎棘突下，后正中线旁开 1.5 寸',
    effect: ['调理肺气', '宣肺解表', '滋阴润肺'],
    massage: '他人协助按揉或轻拍 3-5 分钟，可艾灸',
    indication: ['咳嗽', '气喘', '感冒', '骨蒸潮热', '盗汗'],
    caution: '孕妇慎用',
    cover: 'https://picsum.photos/id/338/750/500'
  },
  {
    id: 'a010',
    name: '膻中',
    part: 'chest',
    meridian: '任脉',
    location: '在胸部，前正中线上，横平第 4 肋间隙（两乳头连线中点）',
    effect: ['宽胸理气', '止咳平喘', '通乳散结'],
    massage: '中指指腹或掌根按揉 2-3 分钟，可上下推擦',
    indication: ['胸闷', '气短', '咳嗽', '乳少', '胸痹'],
    caution: '力度宜轻柔，避免过重',
    cover: 'https://picsum.photos/id/1027/750/500'
  },
  {
    id: 'a011',
    name: '中脘',
    part: 'abdomen',
    meridian: '任脉',
    location: '在上腹部，脐中上 4 寸，前正中线上（胸骨下端与肚脐连线中点）',
    effect: ['健脾和胃', '降逆利水', '消食化滞'],
    massage: '掌根顺时针揉按 3-5 分钟，饭后不宜立即按',
    indication: ['胃痛', '腹胀', '呕吐', '泄泻', '消化不良'],
    caution: '饭后 1 小时内不宜按揉',
    cover: 'https://picsum.photos/id/64/750/500'
  },
  {
    id: 'a012',
    name: '神阙',
    alias: '肚脐',
    part: 'abdomen',
    meridian: '任脉',
    location: '在脐区，脐中央（即肚脐眼）',
    effect: ['温阳救逆', '健脾和胃', '培元固本'],
    massage: '掌心搓热后捂肚脐 3-5 分钟，或艾灸 15 分钟',
    indication: ['腹痛', '泄泻', '脱肛', '虚脱', '痛经'],
    caution: '禁止针刺，孕妇禁用',
    cover: 'https://picsum.photos/id/91/750/500'
  },
  {
    id: 'a013',
    name: '关元',
    part: 'abdomen',
    meridian: '任脉',
    location: '在下腹部，脐中下 3 寸，前正中线上',
    effect: ['培元固本', '温阳益气', '调经止带'],
    massage: '食指或中指指腹按揉 3-5 分钟，可艾灸 20 分钟',
    indication: ['月经不调', '痛经', '阳痿', '遗尿', '泄泻'],
    caution: '孕妇禁用',
    cover: 'https://picsum.photos/id/177/750/500'
  },
  {
    id: 'a014',
    name: '足三里',
    part: 'limb',
    meridian: '足阳明胃经',
    location: '在小腿外侧，犊鼻下 3 寸，胫骨前缘一横指（外膝眼下 4 横指）',
    effect: ['健脾和胃', '扶正培元', '强身健体'],
    massage: '拇指按揉 5 分钟，每日可多次，可艾灸 15 分钟',
    indication: ['胃痛', '呕吐', '腹胀', '泄泻', '虚劳', '保健'],
    caution: '孕妇慎用，过饥不宜',
    cover: 'https://picsum.photos/id/338/750/500'
  },
  {
    id: 'a015',
    name: '三阴交',
    part: 'limb',
    meridian: '足太阴脾经',
    location: '在小腿内侧，内踝尖上 3 寸，胫骨内侧缘后际',
    effect: ['调补肝脾肾', '活血调经', '利湿通经'],
    massage: '拇指按揉 3-5 分钟，可配合艾灸',
    indication: ['月经不调', '痛经', '带下', '遗精', '失眠', '脾胃虚弱'],
    caution: '孕妇禁用',
    cover: 'https://picsum.photos/id/1027/750/500'
  },
  {
    id: 'a016',
    name: '涌泉',
    part: 'limb',
    meridian: '足少阴肾经',
    location: '在足底，足前部凹陷处，约足底前 1/3 与后 2/3 交界处',
    effect: ['滋阴降火', '醒脑开窍', '引火归元'],
    massage: '每晚睡前搓擦涌泉 100 次，至足心发热',
    indication: ['失眠', '头晕', '便秘', '高血压', '足心热'],
    caution: '力度适中，避免过重',
    cover: 'https://picsum.photos/id/64/750/500'
  },
  {
    id: 'a017',
    name: '太冲',
    part: 'limb',
    meridian: '足厥阴肝经',
    location: '在足背，第 1、2 跖骨间，跖骨基底交界处前凹陷',
    effect: ['疏肝理气', '平肝潜阳', '清肝明目'],
    massage: '拇指按揉 3 分钟，力度可稍重',
    indication: ['头痛', '眩晕', '月经不调', '痛经', '情志不畅'],
    caution: '孕妇慎用',
    cover: 'https://picsum.photos/id/91/750/500'
  },
  {
    id: 'a018',
    name: '合谷',
    alias: '虎口',
    part: 'limb',
    meridian: '手阳明大肠经',
    location: '在手背，第 1、2 掌骨间，第 2 掌骨桡侧中点处',
    effect: ['疏风解表', '镇痛安神', '通络开窍'],
    massage: '拇指对捏按揉 3-5 分钟，左右交替',
    indication: ['头痛', '牙痛', '咽喉肿痛', '感冒', '面瘫'],
    caution: '孕妇禁用',
    cover: 'https://picsum.photos/id/177/750/500'
  }
]

export function getAcupointById(id: string): Acupoint | undefined {
  return ACUPOINTS.find((a) => a.id === id)
}

export function filterAcupoints(opts: { part?: string; effect?: string; keyword?: string }): Acupoint[] {
  return ACUPOINTS.filter((a) => {
    if (opts.part && opts.part !== 'all' && a.part !== opts.part) return false
    if (opts.effect && opts.effect !== '全部') {
      if (!a.effect.some((e) => e.includes(opts.effect!)) && !a.indication.some((i) => i.includes(opts.effect!))) {
        return false
      }
    }
    if (opts.keyword) {
      const k = opts.keyword.trim()
      if (k && !a.name.includes(k) && !(a.alias || '').includes(k) && !a.meridian.includes(k)) {
        return false
      }
    }
    return true
  })
}

// ============ 服务器目录同步 setter ============
export function setAcupoints(list: Acupoint[]) {
  ACUPOINTS = list
}
