/**
 * 服务器数据同步
 * - initCatalog:    拉取后台目录数据（服务/门店/时段/商品/疾病/穴位/分类）
 * - pullUserData:   拉取当前设备用户的订单/档案/体质报告
 * 服务器不可达时：保留本地静态数据作为兜底，静默失败不打扰用户
 */
import type { ServiceItem, Store } from '@/types/service'
import type { Product } from '@/types/product'
import type { Disease } from '@/types/disease'
import type { Acupoint } from '@/types/acupoint'
import type { BookingOrder } from '@/types/service'
import type { ProductOrder } from '@/types/product'
import type { ConstitutionResult } from '@/types/constitution'
import type { HealthRecord, UserProfile } from '@/types/record'
import { api } from '@/utils/api'
import { setStorageSync } from '@/utils/storage'
import { useStore } from '@/store/useStore'
import { flushSyncQueue } from '@/utils/syncQueue'
import { setServices, setStores, setTimeSlots, setServiceCategories } from '@/data/services'
import { setProducts, setProductCategories } from '@/data/products'
import { setDiseases, setDiseaseCategories, setHotDiseases } from '@/data/diseases'
import { setAcupoints } from '@/data/acupoints'

interface CategoryItem {
  id: string
  name: string
}

/** 拉取目录数据；服务器有数据则覆盖，无数据或失败时保留本地静态兜底 */
export async function initCatalog(): Promise<void> {
  try {
    const c = await api.getCatalog()
    // 服务器有数据才覆盖；服务器返回空时保留本地静态数据，避免商城空白
    if (Array.isArray(c.services) && c.services.length) setServices(c.services as ServiceItem[])
    if (Array.isArray(c.stores) && c.stores.length) setStores(c.stores as Store[])
    if (Array.isArray(c.timeSlots) && c.timeSlots.length) setTimeSlots(c.timeSlots as string[])
    if (Array.isArray(c.products) && c.products.length) setProducts(c.products as Product[])
    if (Array.isArray(c.diseases) && c.diseases.length) setDiseases(c.diseases as Disease[])
    if (Array.isArray(c.acupoints) && c.acupoints.length) setAcupoints(c.acupoints as Acupoint[])
    if (c.categories) {
      if ((c.categories.service || []).length) setServiceCategories((c.categories.service || []) as CategoryItem[])
      if ((c.categories.product || []).length) setProductCategories((c.categories.product || []) as CategoryItem[])
      if ((c.categories.disease || []).length) setDiseaseCategories((c.categories.disease || []) as CategoryItem[])
    }
    if (Array.isArray(c.hotDiseases) && c.hotDiseases.length) setHotDiseases(c.hotDiseases as string[])
  } catch (e) {
    const msg = (e as Error).message
    console.error('[initCatalog] 服务器目录拉取失败，保留本地数据：', msg)
    // 失败时不清空本地数据，使用静态兜底保证页面可浏览
  }
}

/**
 * 智能数组合并：
 * 1. 服务器数据为主，覆盖本地
 * 2. 本地有但服务器没有的条目 → 补传上行（避免离线数据丢失）
 * 3. 两边都有同 id 的条目 → 按 updatedAt 取较新的
 */
function mergeArray<T extends { id?: string; updatedAt?: string }>(
  serverList: T[],
  localList: T[],
  applyLocal: (v: T[]) => void,
  pushItem: (item: T) => Promise<unknown>,
  cacheKey: string
): void {
  const serverIds = new Set((serverList || []).map((x) => x.id))

  // 本地有但服务器没有的 → 补传
  const missingOnServer = (localList || []).filter((x) => x.id && !serverIds.has(x.id))
  missingOnServer.forEach((item) => {
    pushItem(item).catch(() => {})
  })

  // 同 id 的条目：按 updatedAt 取较新的
  const merged: T[] = (serverList || []).map((s) => {
    const local = localList.find((l) => l.id === s.id)
    if (local && local.updatedAt && s.updatedAt && local.updatedAt > s.updatedAt) {
      // 本地较新，补传到服务器
      pushItem(local).catch(() => {})
      return local
    }
    return s
  })

  // 最终合并：服务器数据 + 本地独有数据
  const finalList = [...merged, ...missingOnServer]
  applyLocal(finalList)
  setStorageSync(cacheKey, finalList)
}

/** 拉取当前设备用户数据并同步到 store */
export async function pullUserData(): Promise<void> {
  try {
    const u = await api.getUser()
    const s = useStore.getState()

    // 用户资料：按 updatedAt 取较新的
    const serverProfile = u.profile as UserProfile | undefined
    const localProfile = s.userProfile
    if (serverProfile) {
      if (localProfile && localProfile.updatedAt && serverProfile.updatedAt && localProfile.updatedAt > serverProfile.updatedAt) {
        // 本地较新，上传到服务器
        api.putProfile(localProfile).catch(() => {})
        useStore.setState({ userProfile: localProfile })
        setStorageSync('userProfile', localProfile)
      } else {
        useStore.setState({ userProfile: serverProfile })
        setStorageSync('userProfile', serverProfile)
      }
    } else if (localProfile) {
      api.putProfile(localProfile).catch(() => {})
    }

    mergeArray<BookingOrder>(
      u.bookingOrders as BookingOrder[],
      s.bookingOrders,
      (v) => useStore.setState({ bookingOrders: v }),
      (item) => api.postBookingOrder(item),
      'bookingOrders'
    )
    mergeArray<ProductOrder>(
      u.productOrders as ProductOrder[],
      s.productOrders,
      (v) => useStore.setState({ productOrders: v }),
      (item) => api.postProductOrder(item),
      'productOrders'
    )
    mergeArray<ConstitutionResult>(
      u.constitutionResults as ConstitutionResult[],
      s.constitutionResults,
      (v) => useStore.setState({ constitutionResults: v }),
      (item) => api.postConstitutionResult(item),
      'constitutionResults'
    )
    mergeArray<HealthRecord>(
      u.healthRecords as HealthRecord[],
      s.healthRecords,
      (v) => useStore.setState({ healthRecords: v }),
      (item) => api.postHealthRecord(item),
      'healthRecords'
    )
  } catch (e) {
    const msg = (e as Error).message
    console.error('[pullUserData] 服务器用户数据拉取失败，保留本地数据：', msg)
    // 失败时不清空本地数据，不弹 toast 干扰用户
  }
}

/**
 * 全量同步：拉取目录 + 拉取用户数据 + 刷新待同步队列
 * 启动时和定时调用，确保本地与服务器一致
 */
export async function syncAll(): Promise<void> {
  await Promise.all([initCatalog(), pullUserData()])
  await flushSyncQueue()
}
