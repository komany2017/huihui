/**
 * 服务器数据同步
 * - initCatalog:    拉取后台目录数据（服务/门店/时段/商品/疾病/穴位/分类），覆盖本地静态默认值
 * - pullUserData:   拉取当前设备用户的订单/档案/体质报告，服务器为准；服务器为空时把本地数据上行补传
 * 全部为「尽力而为」：服务器不可达时静默跳过，小程序继续使用本地数据，不影响任何功能
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
import { setServices, setStores, setTimeSlots, setServiceCategories } from '@/data/services'
import { setProducts, setProductCategories } from '@/data/products'
import { setDiseases, setDiseaseCategories, setHotDiseases } from '@/data/diseases'
import { setAcupoints } from '@/data/acupoints'

interface CategoryItem {
  id: string
  name: string
}

/** 拉取目录数据并覆盖本地静态默认值（ESM live binding，页面无需改动） */
export async function initCatalog(): Promise<void> {
  try {
    const c = await api.getCatalog()
    if (Array.isArray(c.services) && c.services.length) setServices(c.services as ServiceItem[])
    if (Array.isArray(c.stores) && c.stores.length) setStores(c.stores as Store[])
    if (Array.isArray(c.timeSlots) && c.timeSlots.length) setTimeSlots(c.timeSlots as string[])
    if (Array.isArray(c.products) && c.products.length) setProducts(c.products as Product[])
    if (Array.isArray(c.diseases) && c.diseases.length) setDiseases(c.diseases as Disease[])
    if (Array.isArray(c.acupoints) && c.acupoints.length) setAcupoints(c.acupoints as Acupoint[])
    if (c.categories) {
      if (c.categories.service?.length) setServiceCategories(c.categories.service as CategoryItem[])
      if (c.categories.product?.length) setProductCategories(c.categories.product as CategoryItem[])
      if (c.categories.disease?.length) setDiseaseCategories(c.categories.disease as CategoryItem[])
    }
  } catch {
    // 服务器不可达，保持静态数据
  }
}

/** 数组合并：服务器有数据则覆盖（服务器为准），否则把本地数据上行补传 */
function mergeArray<T>(
  serverList: T[],
  localList: T[],
  applyLocal: (v: T[]) => void,
  pushItem: (item: T) => Promise<unknown>,
  cacheKey: string
): void {
  if (Array.isArray(serverList) && serverList.length > 0) {
    applyLocal(serverList)
    setStorageSync(cacheKey, serverList)
  } else if (localList.length > 0) {
    // 服务器为空：把本地数据补传上行（离线产生的数据不丢失）
    localList.forEach((item) => {
      pushItem(item).catch(() => {})
    })
  }
}

/** 拉取当前设备用户数据并同步到 store */
export async function pullUserData(): Promise<void> {
  try {
    const u = await api.getUser()
    const s = useStore.getState()

    // 用户资料：服务器有则覆盖，否则上行本地
    if (u.profile) {
      useStore.setState({ userProfile: u.profile as UserProfile })
      setStorageSync('userProfile', u.profile)
    } else if (s.userProfile) {
      api.putProfile(s.userProfile).catch(() => {})
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
  } catch {
    // 服务器不可达，保留本地数据
  }
}
