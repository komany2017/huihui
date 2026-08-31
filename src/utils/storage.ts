import Taro from '@tarojs/taro'

const PREFIX = 'yyt_'

export async function setStorage<T>(key: string, data: T): Promise<void> {
  try {
    await Taro.setStorage({ key: `${PREFIX}${key}`, data })
  } catch (e) {
    console.error('[Storage] setStorage failed:', key, e)
  }
}

export function setStorageSync<T>(key: string, data: T): void {
  try {
    Taro.setStorageSync(`${PREFIX}${key}`, data)
  } catch (e) {
    console.error('[Storage] setStorageSync failed:', key, e)
  }
}

export async function getStorage<T>(key: string): Promise<T | null> {
  try {
    const res = await Taro.getStorage({ key: `${PREFIX}${key}` })
    return res.data as T
  } catch (e) {
    // 不存在时静默返回 null
    return null
  }
}

export function getStorageSync<T>(key: string): T | null {
  try {
    return Taro.getStorageSync(`${PREFIX}${key}`) as T
  } catch (e) {
    return null
  }
}

export async function removeStorage(key: string): Promise<void> {
  try {
    await Taro.removeStorage({ key: `${PREFIX}${key}` })
  } catch (e) {
    console.error('[Storage] removeStorage failed:', key, e)
  }
}

// 生成唯一 ID
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`
}
