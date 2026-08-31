import React, { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { getServiceById, STORES, BOOKING_TIME_SLOTS } from '@/data/services';
import { useStore } from '@/store/useStore';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const OrderCreatePage: React.FC = () => {
  const router = useRouter();
  const service = getServiceById(router.params.serviceId || '');
  const { createBooking, userProfile } = useStore();

  const [storeId, setStoreId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [name, setName] = useState<string>(userProfile.name === '润泉用户' ? '' : userProfile.name);
  const [phone, setPhone] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // 可选日期：未来 7 天
  const dateList = useMemo(() => {
    const arr: { value: string; label: string; weekday: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      arr.push({
        value: `${y}-${m}-${day}`,
        label: `${m}/${day}`,
        weekday: weekdays[d.getDay()]
      });
    }
    return arr;
  }, []);

  if (!service) {
    return (
      <View className={styles.emptyWrap}>
        <Empty text="服务不存在" icon="💆" />
      </View>
    );
  }

  const store = STORES.find((s) => s.id === storeId);

  const handleSubmit = () => {
    if (!storeId) {
      Taro.showToast({ title: '请选择门店', icon: 'none' });
      return;
    }
    if (!date) {
      Taro.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    if (!time) {
      Taro.showToast({ title: '请选择时段', icon: 'none' });
      return;
    }
    if (!name) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    const id = createBooking({
      serviceId: service.id,
      serviceName: service.name,
      serviceCover: service.cover,
      price: service.price,
      storeId: store!.id,
      storeName: store!.name,
      storeAddress: store!.address,
      date,
      time,
      customerName: name,
      customerPhone: phone,
      remark,
      status: 'pending'
    });
    Taro.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/order/list/index' });
    }, 1000);
    void id;
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 服务信息 */}
        <View className={styles.serviceCard}>
          <Image className={styles.serviceCover} src={service.cover} mode="aspectFill" />
          <View className={styles.serviceInfo}>
            <Text className={styles.serviceName}>{service.name}</Text>
            <Text className={styles.serviceMeta}>{service.duration}分钟 · {service.category}</Text>
            <Text className={styles.servicePrice}>¥{service.price}</Text>
          </View>
        </View>

        {/* 门店选择 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择门店</Text>
          {STORES.map((s) => (
            <View
              key={s.id}
              className={classnames(
                styles.storeItem,
                storeId === s.id && styles.storeItemActive
              )}
              onClick={() => setStoreId(s.id)}
            >
              <View className={styles.storeInfo}>
                <View className={styles.storeHeader}>
                  <Text className={styles.storeName}>{s.name}</Text>
                  <Text className={styles.storeDistance}>{s.distance}km</Text>
                </View>
                <Text className={styles.storeAddress}>{s.address}</Text>
                <Text className={styles.storeMeta}>
                  营业时间：{s.businessHours} · 电话：{s.phone}
                </Text>
              </View>
              <View className={styles.radioWrap}>
                <View
                  className={classnames(
                    styles.radio,
                    storeId === s.id && styles.radioActive
                  )}
                >
                  {storeId === s.id && <Text className={styles.radioDot}>✓</Text>}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 日期选择 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择日期</Text>
          <ScrollView scrollX className={styles.dateScroll} showScrollbar={false}>
            {dateList.map((d) => (
              <View
                key={d.value}
                className={classnames(
                  styles.dateItem,
                  date === d.value && styles.dateItemActive
                )}
                onClick={() => setDate(d.value)}
              >
                <Text
                  className={classnames(
                    styles.dateLabel,
                    date === d.value && styles.dateLabelActive
                  )}
                >
                  {d.label}
                </Text>
                <Text
                  className={classnames(
                    styles.dateWeekday,
                    date === d.value && styles.dateWeekdayActive
                  )}
                >
                  {d.weekday}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 时段选择 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>选择时段</Text>
          <View className={styles.timeGrid}>
            {BOOKING_TIME_SLOTS.map((t) => (
              <View
                key={t}
                className={classnames(
                  styles.timeItem,
                  time === t && styles.timeItemActive
                )}
                onClick={() => setTime(t)}
              >
                <Text
                  className={classnames(
                    styles.timeText,
                    time === t && styles.timeTextActive
                  )}
                >
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 客户信息 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>客户信息</Text>
          <View className={styles.inputRow}>
            <Text className={styles.label}>姓名</Text>
            <Input
              className={styles.input}
              placeholder="请输入预约人姓名"
              value={name}
              onInput={(e) => setName(e.detail.value)}
            />
          </View>
          <View className={styles.inputRow}>
            <Text className={styles.label}>手机号</Text>
            <Input
              className={styles.input}
              type="number"
              placeholder="请输入手机号"
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
            />
          </View>
          <View className={styles.textareaRow}>
            <Text className={styles.label}>备注</Text>
            <Textarea
              className={styles.textarea}
              placeholder="填写调理需求、健康状况或禁忌等（选填）"
              value={remark}
              onInput={(e) => setRemark(e.detail.value)}
              maxlength={200}
            />
          </View>
        </View>

        {/* 预约须知 */}
        <View className={styles.noticeCard}>
          <Text className={styles.noticeTitle}>预约须知</Text>
          <View className={styles.noticeList}>
            <Text className={styles.noticeText}>· 请按时到达，迟到 15 分钟以上视为自动取消</Text>
            <Text className={styles.noticeText}>· 如需取消请提前 2 小时操作</Text>
            <Text className={styles.noticeText}>· 过饥过饱、女性经期部分项目需避开</Text>
            <Text className={styles.noticeText}>· 实际费用以到店为准</Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部提交 */}
      <View className={styles.bottomBar}>
        <View className={styles.priceWrap}>
          <Text className={styles.priceSymbol}>¥</Text>
          <Text className={styles.priceValue}>{service.price}</Text>
        </View>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          <Text className={styles.submitText}>提交预约</Text>
        </View>
      </View>
    </View>
  );
};

export default OrderCreatePage;
