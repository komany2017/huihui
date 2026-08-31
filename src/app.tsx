import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
// 全局样式
import './app.scss';
import { useStore } from '@/store/useStore';
import { initCatalog, pullUserData } from '@/utils/sync';

function App(props) {
  // 可以使用所有的 React Hooks
  useEffect(() => {
    // 启动时同步服务器数据：目录（后台管理的服务/商品/疾病/穴位）+ 用户数据（订单/档案/报告）
    // 服务器不可达时自动使用本地兜底，不影响任何功能
    initCatalog();
    pullUserData();
  }, []);

  // 对应 onShow
  useDidShow(() => {});

  // 对应 onHide
  useDidHide(() => {});

  return props.children;
}

export default App;
