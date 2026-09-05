import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
// 全局样式
import './app.scss';
import { useStore } from '@/store/useStore';
import { syncAll } from '@/utils/sync';
import { flushSyncQueue } from '@/utils/syncQueue';

const SYNC_INTERVAL = 60 * 1000 // 定时同步间隔：60 秒

function App(props) {
  useEffect(() => {
    // 启动时：从本地 storage 恢复数据
    useStore.getState().initFromStorage()
    // 启动时全量同步：拉取目录 + 用户数据 + 刷新待同步队列
    syncAll()
    // 定时同步：确保本地与服务器保持一致
    const timer = setInterval(() => {
      syncAll()
    }, SYNC_INTERVAL)
    return () => clearInterval(timer)
  }, []);

  // 小程序前台显示时：立即同步一次（刷新数据 + 重试队列）
  useDidShow(() => {
    syncAll()
  });

  // 小程序后台隐藏时：最后刷新一次队列
  useDidHide(() => {
    flushSyncQueue()
  });

  return props.children;
}

export default App;
