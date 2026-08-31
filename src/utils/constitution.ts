import type { ConstitutionType, ConstitutionInfo, ConstitutionResult } from '@/types/constitution'
import { CONSTITUTION_INFOS } from '@/data/constitution'

// 体质类型列表（除平和质外，其余8种为偏颇体质）
export const PARTIAL_TYPES: ConstitutionType[] = [
  'qixu',
  'yangxu',
  'yinxu',
  'tanshi',
  'shire',
  'xueyu',
  'qiyu',
  'tebing'
]

// 计算单体质转化分（标准算法：原始分→转化分）
// 原始分 = 该体质所有题分之和
// 转化分 = (原始分 - 题数) / (题数 * 4) * 100
export function calcTransformedScore(rawScore: number, questionCount: number): number {
  if (questionCount === 0) return 0
  const score = ((rawScore - questionCount) / (questionCount * 4)) * 100
  return Math.round(Math.max(0, Math.min(100, score)))
}

// 判定体质：转化分 >= 60 为该体质倾向，>= 40 为兼夹
export function judgeConstitution(
  scores: Record<ConstitutionType, number>
): { primary: ConstitutionType; secondary?: ConstitutionType } {
  // 平和质判定：平和质转化分 >= 60 且其他偏颇体质均 < 40
  const pingheScore = scores.pinghe
  const partialScores = PARTIAL_TYPES.map((t) => ({ type: t, score: scores[t] }))
  const hasHighPartial = partialScores.some((p) => p.score >= 60)

  if (pingheScore >= 60 && pingheScore >= 70 && !hasHighPartial) {
    return { primary: 'pinghe' }
  }

  // 否则取分数最高的偏颇体质作为主倾向
  const sorted = [...partialScores].sort((a, b) => b.score - a.score)
  const primary = sorted[0]
  const secondary = sorted[1] && sorted[1].score >= 40 ? sorted[1].type : undefined
  return { primary: primary.type, secondary }
}

// 完整体质结果生成
export function buildConstitutionResult(
  rawScores: Record<ConstitutionType, number>,
  questionCount: Record<ConstitutionType, number>
): ConstitutionResult {
  const transformed: Record<ConstitutionType, number> = { ...rawScores }
  // 平和质特殊：转化分 = (原始分) / (题数 * 5) * 100
  transformed.pinghe = Math.round((rawScores.pinghe / (questionCount.pinghe * 5)) * 100)

  for (const t of PARTIAL_TYPES) {
    transformed[t] = calcTransformedScore(rawScores[t], questionCount[t])
  }

  const { primary, secondary } = judgeConstitution(transformed)

  // 构建排序后的体质详情列表
  const infos: ConstitutionInfo[] = Object.entries(transformed)
    .map(([type, score]) => ({
      ...CONSTITUTION_INFOS.find((c) => c.type === type)!,
      score
    }))
    .sort((a, b) => b.score - a.score)
    .map((info, idx) => ({ ...info, rank: idx + 1 }))

  return {
    id: `c${Date.now()}`,
    date: new Date().toISOString(),
    scores: transformed,
    primary,
    secondary,
    infos
  }
}
