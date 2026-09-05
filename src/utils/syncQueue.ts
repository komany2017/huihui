/**
 * 数据同步队列
 * - 所有写操作（创建订单/更新状态/保存档案等）失败时入队
 * - 队列持久化到本地 storage，重启后自动重试
 * - 提供 flushSyncQueue() 批量重试，确保最终与服务器一致
 */
import { getStorageSync, setStorageSync } from './storage'
import { api } from './api'

const QUEUE_KEY = 'syncQueue'

/** 同步操作类型 */
export type SyncAction =
  | { type: 'postBookingOrder'; data: unknown }
  | { type: 'patchBookingOrder'; id: string; patch: unknown }
  | { type: 'postProductOrder'; data: unknown }
  | { type: 'patchProductOrder'; id: string; patch: unknown }
  | { type: 'postConstitutionResult'; data: unknown }
  | { type: 'postHealthRecord'; data: unknown }
  | { type: 'deleteHealthRecord'; id: string }
  | { type: 'putProfile'; data: unknown }

interface QueueItem {
  id: string
  action: SyncAction
  retry: number
  createdAt: number
}

/** 从 storage 读取队列 */
function loadQueue(): QueueItem[] {
  return getStorageSync<QueueItem[]>(QUEUE_KEY) || []
}

/** 持久化队列 */
function saveQueue(queue: QueueItem[]): void {
  setStorageSync(QUEUE_KEY, queue)
}

/** 入队：一个写操作失败时调用 */
export function enqueueSync(action: SyncAction): void {
  const queue = loadQueue()
  queue.push({
    id: `${action.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    action,
    retry: 0,
    createdAt: Date.now()
  })
  saveQueue(queue)
}

/** 执行单个同步操作 */
async function executeAction(action: SyncAction): Promise<void> {
  switch (action.type) {
    case 'postBookingOrder':
      await api.postBookingOrder(action.data)
      break
    case 'patchBookingOrder':
      await api.patchBookingOrder(action.id, action.patch)
      break
    case 'postProductOrder':
      await api.postProductOrder(action.data)
      break
    case 'patchProductOrder':
      await api.patchProductOrder(action.id, action.patch)
      break
    case 'postConstitutionResult':
      await api.postConstitutionResult(action.data)
      break
    case 'postHealthRecord':
      await api.postHealthRecord(action.data)
      break
    case 'deleteHealthRecord':
      await api.deleteHealthRecord(action.id)
      break
    case 'putProfile':
      await api.putProfile(action.data)
      break
  }
}

/**
 * 批量重试队列中的所有操作
 * - 成功的出队
 * - 失败的 retry+1，超过 5 次则放弃并打印告警
 * @returns 成功数、失败数
 */
export async function flushSyncQueue(): Promise<{ success: number; failed: number }> {
  const queue = loadQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  const remaining: QueueItem[] = []
  let success = 0
  let failed = 0

  for (const item of queue) {
    try {
      await executeAction(item.action)
      success++
    } catch (e) {
      failed++
      if (item.retry < 5) {
        remaining.push({ ...item, retry: item.retry + 1 })
      } else {
        console.error(`[syncQueue] 放弃同步 ${item.action.type}，已重试 ${item.retry} 次`, e)
      }
    }
  }

  saveQueue(remaining)
  if (success > 0 || failed > 0) {
    console.log(`[syncQueue] 同步完成：成功 ${success}，失败 ${failed}，剩余 ${remaining.length}`)
  }
  return { success, failed }
}

/** 队列长度 */
export function getSyncQueueSize(): number {
  return loadQueue().length
}
