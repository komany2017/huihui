import React from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { useStore } from '@/store/useStore';
import Empty from '@/components/Empty';
import type { OrderStatus } from '@/types/service';
import { resolveImageUrl } from '@/utils/image';
import styles from './index.module.scss';

const STATUS_TEXT: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

const STATUS_DESC: Record<OrderStatus, string> = {
  pending: '门店正在确认您的预约，请耐心等待',
  confirmed: '预约已确认，请按时到店',
  completed: '本次理疗已完成，期待您的下次光临',
  cancelled: '预约已取消'
};

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const { bookingOrders, initFromStorage, updateBookingStatus } = useStore();

  useDidShow(() => {
    initFromStorage();
  });

  const order = bookingOrders.find((o) => o.id === router.params.id);

  if (!order) {
    return (
      <View className={styles.emptyWrap}>
        <Empty text="订单不存在" icon="📅" />
      </View>
    );
  }

  const handleCancel = () => {
    Taro.showModal({
      title: '取消预约',
      content: '确认取消此预约订单吗？',
      confirmColor: '#c8362f',
      success: (res) => {
        if (res.confirm) {
          updateBookingStatus(order.id, 'cancelled');
          Taro.showToast({ title: '已取消', icon: 'success' });
          setTimeout(() => {
            Taro.navigateBack();
          }, 800);
        }
      }
    });
  };

  const statusColor: Record<OrderStatus, string> = {
    pending: '#d68a00',
    confirmed: '#4a8c3f',
    completed: '#9a8e85',
    cancelled: '#9a8e85'
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 状态头 */}
        <View
          className={styles.statusHeader}
          style={{ background: `linear-gradient(135deg, ${statusColor[order.status]} 0%, #c8362f 100%)` }}
        >
          <Text className={styles.statusText}>{STATUS_TEXT[order.status]}</Text>
          <Text className={styles.statusDesc}>{STATUS_DESC[order.status]}</Text>
        </View>

        {/* 服务信息 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务信息</Text>
          <View className={styles.serviceRow}>
            <Image className={styles.serviceCover} src={resolveImageUrl(order.serviceCover)} mode="aspectFill" />
            <View className={styles.serviceInfo}>
              <Text className={styles.serviceName}>{order.serviceName}</Text>
              <Text className={styles.servicePrice}>¥{order.price}</Text>
            </View>
          </View>
        </View>

        {/* 门店地址 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>门店地址</Text>
          <View className={styles.storeBlock}>
            <Text className={styles.storeName}>{order.storeName}</Text>
            <View className={styles.storeAddrRow}>
              <Text className={styles.addrIcon}>📍</Text>
              <Text className={styles.storeAddr}>{order.storeAddress}</Text>
            </View>
          </View>
        </View>

        {/* 预约时间 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>预约时间</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>日期</Text>
            <Text className={styles.infoValue}>{order.date}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>时段</Text>
            <Text className={styles.infoValue}>{order.time}</Text>
          </View>
        </View>

        {/* 客户信息 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>客户信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>姓名</Text>
            <Text className={styles.infoValue}>{order.customerName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>电话</Text>
            <Text className={styles.infoValue}>{order.customerPhone}</Text>
          </View>
          {order.remark && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>备注</Text>
              <Text className={styles.infoValue}>{order.remark}</Text>
            </View>
          )}
        </View>

        {/* 订单信息 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>订单信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>订单号</Text>
            <Text className={styles.infoValue}>{order.id}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>下单时间</Text>
            <Text className={styles.infoValue}>
              {new Date(order.createdAt).toLocaleString('zh-CN')}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>订单金额</Text>
            <Text className={styles.priceValue}>¥{order.price}</Text>
          </View>
        </View>

        {/* 温馨提示 */}
        <View className={styles.tipCard}>
          <Text className={styles.tipTitle}>温馨提示</Text>
          <View className={styles.tipList}>
            <Text className={styles.tipText}>· 请提前 10 分钟到店办理登记</Text>
            <Text className={styles.tipText}>· 如需取消请提前 2 小时操作</Text>
            <Text className={styles.tipText}>· 如有疑问请联系门店咨询</Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部按钮 */}
      {order.status === 'pending' || order.status === 'confirmed' ? (
        <View className={styles.bottomBar}>
          <View className={styles.cancelBtn} onClick={handleCancel}>
            <Text className={styles.cancelText}>取消预约</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default OrderDetailPage;
