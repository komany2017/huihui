import React from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getServiceById } from '@/data/services';
import Tag from '@/components/Tag';
import { resolveImageUrl } from '@/utils/image';
import styles from './index.module.scss';

const ServiceDetailPage: React.FC = () => {
  const router = useRouter();
  const service = getServiceById(router.params.id);

  if (!service) {
    return (
      <View className={styles.emptyWrap}>
        <Text className={styles.emptyText}>服务不存在</Text>
      </View>
    );
  }

  const handleBook = () => {
    Taro.navigateTo({
      url: `/pages/order/create/index?serviceId=${service.id}`
    });
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 封面图 */}
        <View className={styles.coverWrap}>
          <Image className={styles.cover} src={resolveImageUrl(service.cover)} mode="aspectFill" />
          <View className={styles.coverMask} />
          <View className={styles.coverInfo}>
            <Text className={styles.serviceName}>{service.name}</Text>
            <Text className={styles.serviceIntro}>{service.intro}</Text>
          </View>
        </View>

        {/* 价格时长 */}
        <View className={styles.priceCard}>
          <View className={styles.priceRow}>
            <Text className={styles.priceSymbol}>¥</Text>
            <Text className={styles.price}>{service.price}</Text>
            {service.originalPrice && (
              <Text className={styles.originalPrice}>¥{service.originalPrice}</Text>
            )}
          </View>
          <View className={styles.metaRow}>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>时长</Text>
              <Text className={styles.metaValue}>{service.duration}分钟</Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>分类</Text>
              <Text className={styles.metaValue}>{service.category}</Text>
            </View>
          </View>
        </View>

        {/* 功效 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>功效说明</Text>
          <View className={styles.tags}>
            {service.efficacy.map((e) => (
              <Tag key={e} text={e} type="primary" />
            ))}
          </View>
        </View>

        {/* 适用人群 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>适用人群</Text>
          <View className={styles.list}>
            {service.suitable.map((s) => (
              <View key={s} className={styles.listItem}>
                <Text className={styles.bullet}>✓</Text>
                <Text className={styles.listText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 流程 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>理疗流程</Text>
          <View className={styles.steps}>
            {service.steps.map((step, idx) => (
              <View key={idx} className={styles.stepItem}>
                <View className={styles.stepNum}>
                  <Text className={styles.stepNumText}>{idx + 1}</Text>
                </View>
                <View className={styles.stepContent}>
                  <Text className={styles.stepTitle}>{step.title}</Text>
                  <Text className={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 注意事项 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>注意事项</Text>
          <View className={styles.cautionList}>
            {service.caution.map((c) => (
              <View key={c} className={styles.cautionItem}>
                <Text className={styles.cautionIcon}>⚠️</Text>
                <Text className={styles.cautionText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 底部预约 */}
      <View className={styles.bottomBar}>
        <View className={styles.bottomPrice}>
          <Text className={styles.bottomPriceSymbol}>¥</Text>
          <Text className={styles.bottomPriceValue}>{service.price}</Text>
          <Text className={styles.bottomPriceUnit}>起</Text>
        </View>
        <View className={styles.bookBtn} onClick={handleBook}>
          <Text className={styles.bookBtnText}>立即预约</Text>
        </View>
      </View>
    </View>
  );
};

export default ServiceDetailPage;
