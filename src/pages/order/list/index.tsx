import React, { useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import Empty from '@/components/Empty';
import type { OrderStatus } from '@/types/service';
import { resolveImageUrl } from '@/utils/image';
import styles from './index.module.scss';

const STATUS_TABS: { key: 'all' | OrderStatus; name: string }[] = [
  { key: 'all', name: '全部' },
  { key: 'pending', name: '待确认' },
  { key: 'confirmed', name: '已确认' },
  { key: 'completed', name: '已完成' },
  { key: 'cancelled', name: '已取消' }
];

const STATUS_TEXT: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#d68a00',
  confirmed: '#4a8c3f',
  completed: '#9a8e85',
  cancelled: '#9a8e85'
};

const OrderListPage: React.FC = () => {
  const { bookingOrders, initFromStorage } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');

  useDidShow(() => {
    initFromStorage();
  });

  const filteredOrders = bookingOrders.filter(
    (o) => activeTab === 'all' || o.status === activeTab
  );

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/order/detail/index?id=${id}` });
  };

  return (
    <View className={styles.container}>
      {/* 状态 tab */}
      <View className={styles.tabs}>
        {STATUS_TABS.map((t) => (
          <View
            key={t.key}
            className={classnames(styles.tab, activeTab === t.key && styles.tabActive)}
            onClick={() => setActiveTab(t.key)}
          >
            <Text
              className={classnames(
                styles.tabText,
                activeTab === t.key && styles.tabTextActive
              )}
            >
              {t.name}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.list}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <View key={order.id} className={styles.orderCard} onClick={() => goDetail(order.id)}>
              <View className={styles.orderHeader}>
                <Text className={styles.orderNo}>订单号：{order.id}</Text>
                <Text
                  className={styles.orderStatus}
                  style={{ color: STATUS_COLOR[order.status] }}
                >
                  {STATUS_TEXT[order.status]}
                </Text>
              </View>
              <View className={styles.orderBody}>
                <Image className={styles.serviceCover} src={resolveImageUrl(order.serviceCover)} mode="aspectFill" />
                <View className={styles.serviceInfo}>
                  <Text className={styles.serviceName}>{order.serviceName}</Text>
                  <Text className={styles.storeName}>{order.storeName}</Text>
                  <Text className={styles.timeText}>
                    {order.date} {order.time}
                  </Text>
                </View>
                <View className={styles.priceCol}>
                  <Text className={styles.priceSymbol}>¥</Text>
                  <Text className={styles.priceValue}>{order.price}</Text>
                </View>
              </View>
              <View className={styles.orderFooter}>
                <Text className={styles.createTime}>
                  下单：{new Date(order.createdAt).toLocaleString('zh-CN')}
                </Text>
                <View className={styles.detailBtn}>
                  <Text className={styles.detailText}>查看详情 ›</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Empty text="暂无预约订单" icon="📅" />
        )}
      </ScrollView>
    </View>
  );
};

export default OrderListPage;
