/**
 * 图片 URL 解析
 * - 服务器上传图片为相对路径（如 /api/media/xxx），补全为完整 URL
 * - 外部 URL（http/https）走服务器代理，避免微信小程序域名白名单限制
 */
import { API_BASE_URL } from '@/config/api'

export function resolveImageUrl(url?: string): string {
  if (!url) return ''
  // 外部图片走服务器代理：/api/image-proxy?url=<encoded>
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 如果已是本服务器域名，直接返回
    if (url.startsWith(API_BASE_URL)) return url
    return `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(url)}`
  }
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return API_BASE_URL + url
  return url
}
