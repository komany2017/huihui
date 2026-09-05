/**
 * 后台服务请求封装
 * 约定响应格式: { code: 0, data: any } / 失败抛异常
 * 所有请求均为「尽力而为」：服务器不可达时静默失败，由调用方保留本地数据兜底
 */
import Taro from '@tarojs/taro'
import { API_BASE_URL } from '@/config/api'
import { getStorageSync, setStorageSync, generateId } from '@/utils/storage'

/** 设备/用户标识：用于服务器区分不同用户的数据分区 */
export function getDeviceId(): string {
  let id = getStorageSync<string>('deviceId')
  if (!id) {
    id = generateId('u')
    setStorageSync('deviceId', id)
  }
  return id
}

async function request<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: unknown): Promise<T> {
  const res = await Taro.request({
    url: API_BASE_URL + url,
    method,
    data: data as Record<string, unknown>,
    timeout: 15000,
    header: { 'Content-Type': 'application/json' }
  })
  if (res.statusCode >= 200 && res.statusCode < 300) {
    const body = res.data as { code: number; data: T }
    if (body && body.code === 0) return body.data
  }
  throw new Error(`接口异常(${res.statusCode})`)
}

export interface CatalogData {
  services: unknown[]
  stores: unknown[]
  timeSlots: string[]
  products: unknown[]
  diseases: unknown[]
  acupoints: unknown[]
  hotDiseases: string[]
  categories?: {
    service?: { id: string; name: string }[]
    product?: { id: string; name: string }[]
    disease?: { id: string; name: string }[]
  }
}

export interface UserData {
  profile: unknown
  bookingOrders: unknown[]
  productOrders: unknown[]
  constitutionResults: unknown[]
  healthRecords: unknown[]
}

export const api = {
  /** 获取服务器目录数据（服务/门店/时段/商品/疾病/穴位/分类） */
  getCatalog: () => request<CatalogData>('/api/catalog', 'GET'),

  /** 获取当前设备用户的全部数据 */
  getUser: () => request<UserData>(`/api/user/${getDeviceId()}`, 'GET'),

  /** 预约订单 */
  postBookingOrder: (order: unknown) => request(`/api/user/${getDeviceId()}/booking-orders`, 'POST', order),
  patchBookingOrder: (id: string, patch: unknown) => request(`/api/user/${getDeviceId()}/booking-orders/${id}`, 'PATCH', patch),

  /** 商品订单 */
  postProductOrder: (order: unknown) => request(`/api/user/${getDeviceId()}/product-orders`, 'POST', order),
  patchProductOrder: (id: string, patch: unknown) => request(`/api/user/${getDeviceId()}/product-orders/${id}`, 'PATCH', patch),

  /** 体质报告 */
  postConstitutionResult: (result: unknown) => request(`/api/user/${getDeviceId()}/constitution-results`, 'POST', result),

  /** 健康档案 */
  postHealthRecord: (record: unknown) => request(`/api/user/${getDeviceId()}/health-records`, 'POST', record),
  deleteHealthRecord: (id: string) => request(`/api/user/${getDeviceId()}/health-records/${id}`, 'DELETE'),

  /** 用户资料 */
  putProfile: (profile: unknown) => request(`/api/user/${getDeviceId()}/profile`, 'PUT', profile)
}
