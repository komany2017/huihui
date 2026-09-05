import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { SERVICES } from '@/data/services';
import { PRODUCTS } from '@/data/products';
import { useStore } from '@/store/useStore';
import ServiceCard from '@/components/ServiceCard';
import ProductCard from '@/components/ProductCard';
import SectionTitle from '@/components/SectionTitle';
import { resolveImageUrl } from '@/utils/image';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const [bannerList] = useState([
    { id: 1, image: '', title: '九种体质 免费测评' },
    { id: 2, image: '', title: '刮痧理疗 焕活气血' },
    { id: 3, image: '', title: '养生好物 甄选道地' }
  ]);
  const [current, setCurrent] = useState(0);

  const [functions] = useState([
    { key: 'constitution', name: '体质测试', icon: '🩺', color: '#f5ede0' },
    { key: 'service', name: '理疗服务', icon: '💆', color: '#f0e5d0' },
    { key: 'shop', name: '养生商城', icon: '🛍️', color: '#fdf2e2' },
    { key: 'acupoint', name: '穴位图解', icon: '🧍', color: '#f5ede0' },
    { key: 'disease', name: '疾病调理', icon: '📖', color: '#f0e5d0' },
    { key: 'record', name: '健康档案', icon: '📋', color: '#fdf2e2' },
    { key: 'booking', name: '在线预约', icon: '📅', color: '#f5ede0' },
    { key: 'mine', name: '个人中心', icon: '👤', color: '#f0e5d0' }
  ]);

  const { initFromStorage } = useStore();

  useDidShow(() => {
    initFromStorage();
  });

  const handleFunctionClick = (key: string) => {
    const routeMap: Record<string, string> = {
      constitution: '/pages/constitution/quiz/index',
      service: '/pages/service/index',
      shop: '/pages/shop/index',
      acupoint: '/pages/acupoint/index/index',
      disease: '/pages/disease/index/index',
      record: '/pages/record/index',
      booking: '/pages/service/index',
      mine: '/pages/mine/index'
    };
    const url = routeMap[key];
    if (url) {
      // tabBar 页面需用 switchTab
      if (['service', 'shop', 'record', 'mine', 'booking'].includes(key)) {
        Taro.switchTab({ url });
      } else {
        Taro.navigateTo({ url });
      }
    }
  };

  const handleServiceClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/service/detail/index?id=${id}` });
  };

  const handleProductClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/shop/detail/index?id=${id}` });
  };

  const handleStartConstitution = () => {
    Taro.navigateTo({ url: '/pages/constitution/quiz/index' });
  };

  const goBookingList = () => {
    Taro.navigateTo({ url: '/pages/order/list/index' });
  };

  const hotServices = SERVICES.filter((s) => s.popular).slice(0, 3);
  const hotProducts = PRODUCTS.filter((p) => p.hot).slice(0, 4);

  return (
    <View className={styles.container}>
      {/* Banner */}
      <View className={styles.bannerSection}>
        <ScrollView
          className={styles.bannerScroll}
          scrollX
          enableFlex
          snapToEdge
          onChange={(e) => setCurrent(e.detail.current)}
          enhanced
          showScrollbar={false}
        >
          {bannerList.map((b, idx) => (
            <View key={b.id} className={styles.bannerItem} onClick={handleStartConstitution}>
              {b.image && <Image className={styles.bannerImage} src={resolveImageUrl(b.image)} mode="aspectFill" />}
              <View className={styles.bannerMask} />
              <View className={styles.bannerContent}>
                <Text className={styles.bannerTitle}>{b.title}</Text>
                <Text className={styles.bannerDesc}>专业中医 焕活身心</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View className={styles.indicators}>
          {bannerList.map((b, idx) => (
            <View
              key={b.id}
              className={classnames(styles.dot, idx === current && styles.dotActive)}
            />
          ))}
        </View>
      </View>

      {/* 功能宫格 */}
      <View className={styles.functions}>
        {functions.map((f) => (
          <View key={f.key} className={styles.functionItem} onClick={() => handleFunctionClick(f.key)}>
            <View className={styles.functionIcon} style={{ background: f.color }}>
              <Text className={styles.functionEmoji}>{f.icon}</Text>
            </View>
            <Text className={styles.functionName}>{f.name}</Text>
          </View>
        ))}
      </View>

      {/* 体质测试 CTA */}
      <View className={styles.constitutionCard} onClick={handleStartConstitution}>
        <View className={styles.constitutionLeft}>
          <Text className={styles.constitutionTitle}>免费中医体质辨识</Text>
          <Text className={styles.constitutionDesc}>基于中医九种体质标准 · 个性化调养建议</Text>
          <View className={styles.constitutionBtn}>
            <Text className={styles.constitutionBtnText}>立即测试 ›</Text>
          </View>
        </View>
        <View className={styles.constitutionIconWrap}>
          <Text className={styles.constitutionIcon}>🌿</Text>
        </View>
      </View>

      {/* 推荐服务 */}
      <View className={styles.section}>
        <SectionTitle
          title="热门理疗"
          subtitle="专业理疗师辨证调理"
          actionText="查看全部"
          onAction={() => Taro.switchTab({ url: '/pages/service/index' })}
        />
        <View className={styles.serviceList}>
          {hotServices.map((s) => (
            <ServiceCard key={s.id} data={s} onClick={() => handleServiceClick(s.id)} />
          ))}
        </View>
      </View>

      {/* 热门商品 */}
      <View className={styles.section}>
        <SectionTitle
          title="养生好物"
          subtitle="甄选道地养生产品"
          actionText="更多"
          onAction={() => Taro.switchTab({ url: '/pages/shop/index' })}
        />
        <View className={styles.productGrid}>
          {hotProducts.map((p) => (
            <View key={p.id} className={styles.productItem}>
              <ProductCard data={p} onClick={() => handleProductClick(p.id)} />
            </View>
          ))}
        </View>
      </View>

      {/* 预约入口 */}
      <View className={styles.section}>
        <SectionTitle title="我的预约" subtitle="便捷管理理疗订单" actionText="查看" onAction={goBookingList} />
        <View className={styles.bookingCard} onClick={goBookingList}>
          <View className={styles.bookingLeft}>
            <Text className={styles.bookingIcon}>📅</Text>
            <View>
              <Text className={styles.bookingTitle}>预约订单管理</Text>
              <Text className={styles.bookingDesc}>查看历史预约 · 取消订单</Text>
            </View>
          </View>
          <Text className={styles.bookingArrow}>›</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <Text className={styles.footerText}>润泉养元 · 守护您的健康</Text>
      </View>
    </View>
  );
};

export default HomePage;
