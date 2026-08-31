import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type { CartItem, ProductOrder } from '@/types/product'
import type { BookingOrder } from '@/types/service'
import type { ConstitutionResult } from '@/types/constitution'
import type { HealthRecord, UserProfile } from '@/types/record'
import { getStorageSync, setStorageSync, generateId } from '@/utils/storage'
import { api } from '@/utils/api'

interface AppState {
  // 购物车
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  updateCartQuantity: (specId: string, delta: number) => void
  removeFromCart: (specId: string) => void
  clearCart: () => void

  // 商品订单
  productOrders: ProductOrder[]
  createProductOrder: (order: Omit<ProductOrder, 'id' | 'createdAt'>) => string

  // 预约订单
  bookingOrders: BookingOrder[]
  createBooking: (order: Omit<BookingOrder, 'id' | 'createdAt'>) => string
  updateBookingStatus: (id: string, status: BookingOrder['status']) => void

  // 体质记录
  constitutionResults: ConstitutionResult[]
  saveConstitutionResult: (result: ConstitutionResult) => void

  // 健康档案
  healthRecords: HealthRecord[]
  addHealthRecord: (record: Omit<HealthRecord, 'id'>) => void
  deleteHealthRecord: (id: string) => void

  // 用户资料
  userProfile: UserProfile
  updateUserProfile: (profile: Partial<UserProfile>) => void

  // 初始化加载
  initFromStorage: () => void
}

const DEFAULT_PROFILE: UserProfile = {
  name: '颐养用户',
  gender: 'unknown',
  age: 30,
  height: 170,
  weight: 60,
  bloodType: 'A',
  allergy: '无',
  chronicDisease: '无',
  updatedAt: new Date().toISOString()
}

export const useStore = create<AppState>((set, get) => ({
  cart: [],
  addToCart: (item) => {
    const cart = [...get().cart]
    const idx = cart.findIndex((c) => c.specId === item.specId)
    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + item.quantity }
    } else {
      cart.push(item)
    }
    set({ cart })
    setStorageSync('cart', cart)
    Taro.showToast({ title: '已加入购物车', icon: 'success' })
  },
  updateCartQuantity: (specId, delta) => {
    const cart = get()
      .cart.map((c) => {
        if (c.specId === specId) {
          return { ...c, quantity: Math.max(1, c.quantity + delta) }
        }
        return c
      })
    set({ cart })
    setStorageSync('cart', cart)
  },
  removeFromCart: (specId) => {
    const cart = get().cart.filter((c) => c.specId !== specId)
    set({ cart })
    setStorageSync('cart', cart)
  },
  clearCart: () => {
    set({ cart: [] })
    setStorageSync('cart', [])
  },

  productOrders: [],
  createProductOrder: (order) => {
    const id = generateId('po')
    const newOrder: ProductOrder = {
      ...order,
      id,
      createdAt: new Date().toISOString()
    }
    const orders = [newOrder, ...get().productOrders]
    set({ productOrders: orders })
    setStorageSync('productOrders', orders)
    // 上行同步到服务器（失败静默，本地兜底）
    api.postProductOrder(newOrder).catch(() => {})
    // 清空购物车
    set({ cart: [] })
    setStorageSync('cart', [])
    return id
  },

  bookingOrders: [],
  createBooking: (order) => {
    const id = generateId('bo')
    const newOrder: BookingOrder = {
      ...order,
      id,
      createdAt: new Date().toISOString()
    }
    const orders = [newOrder, ...get().bookingOrders]
    set({ bookingOrders: orders })
    setStorageSync('bookingOrders', orders)
    // 上行同步到服务器（失败静默，本地兜底）
    api.postBookingOrder(newOrder).catch(() => {})
    return id
  },
  updateBookingStatus: (id, status) => {
    const orders = get().bookingOrders.map((o) => (o.id === id ? { ...o, status } : o))
    set({ bookingOrders: orders })
    setStorageSync('bookingOrders', orders)
    api.patchBookingOrder(id, { status }).catch(() => {})
  },

  constitutionResults: [],
  saveConstitutionResult: (result) => {
    const results = [result, ...get().constitutionResults]
    set({ constitutionResults: results })
    setStorageSync('constitutionResults', results)
    api.postConstitutionResult(result).catch(() => {})
  },

  healthRecords: [],
  addHealthRecord: (record) => {
    const newRecord: HealthRecord = { ...record, id: generateId('hr') }
    const records = [newRecord, ...get().healthRecords]
    set({ healthRecords: records })
    setStorageSync('healthRecords', records)
    api.postHealthRecord(newRecord).catch(() => {})
  },
  deleteHealthRecord: (id) => {
    const records = get().healthRecords.filter((r) => r.id !== id)
    set({ healthRecords: records })
    setStorageSync('healthRecords', records)
    api.deleteHealthRecord(id).catch(() => {})
  },

  userProfile: DEFAULT_PROFILE,
  updateUserProfile: (profile) => {
    const newProfile = { ...get().userProfile, ...profile, updatedAt: new Date().toISOString() }
    set({ userProfile: newProfile })
    setStorageSync('userProfile', newProfile)
    api.putProfile(newProfile).catch(() => {})
  },

  initFromStorage: () => {
    set({
      cart: getStorageSync<CartItem[]>('cart') || [],
      productOrders: getStorageSync<ProductOrder[]>('productOrders') || [],
      bookingOrders: getStorageSync<BookingOrder[]>('bookingOrders') || [],
      constitutionResults: getStorageSync<ConstitutionResult[]>('constitutionResults') || [],
      healthRecords: getStorageSync<HealthRecord[]>('healthRecords') || [],
      userProfile: getStorageSync<UserProfile>('userProfile') || DEFAULT_PROFILE
    })
  }
}))
