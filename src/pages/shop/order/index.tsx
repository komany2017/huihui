import React, { useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import Empty from '@/components/Empty';
import type { ProductOrderStatus } from '@/types/product';
import styles from './index.module.scss';

const STATUS_TABS: { key: 'all' | ProductOrderStatus; name: string }[] = [
  { key: 'all', name: '全部' },
  { key: 'paid', name: '待发货' },
  { key: 'shipped', name: '待收货' },
  { key: 'completed', name: '已完成' }
];

const STATUS_TEXT: Record<ProductOrderStatus, string> = {
  unpaid: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消'
};

const ShopOrderPage: React.FC = () => {
  const { productOrders } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | ProductOrderStatus>('all');

  const filteredOrders = productOrders.filter(
    (o) => activeTab === 'all' || o.status === activeTab
  );

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
            <View key={order.id} className={styles.orderCard}>
              <View className={styles.orderHeader}>
                <Text className={styles.orderNo}>订单号：{order.id}</Text>
                <Text className={styles.orderStatus}>{STATUS_TEXT[order.status]}</Text>
              </View>
              {order.items.map((item, idx) => (
                <View key={idx} className={styles.orderItem}>
                  <Image className={styles.itemImage} src={item.productCover} mode="aspectFill" />
                  <View className={styles.itemInfo}>
                    <Text className={styles.itemName}>{item.productName}</Text>
                    <Text className={styles.itemSpec}>{item.specName}</Text>
                    <View className={styles.itemMeta}>
                      <Text className={styles.itemPrice}>¥{item.price}</Text>
                      <Text className={styles.itemQty}>×{item.quantity}</Text>
                    </View>
                  </View>
                </View>
              ))}
              <View className={styles.orderFooter}>
                <Text className={styles.footerTime}>
                  {new Date(order.createdAt).toLocaleString('zh-CN')}
                </Text>
                <View className={styles.totalWrap}>
                  <Text className={styles.totalLabel}>合计</Text>
                  <Text className={styles.totalSymbol}>¥</Text>
                  <Text className={styles.totalValue}>{order.totalAmount}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Empty text="暂无订单" icon="📦" />
        )}
      </ScrollView>
    </View>
  );
};

export default ShopOrderPage;
