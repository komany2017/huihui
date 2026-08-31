import React from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getAcupointById, BODY_PARTS } from '@/data/acupoints';
import Tag from '@/components/Tag';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const AcupointDetailPage: React.FC = () => {
  const router = useRouter();
  const acupoint = getAcupointById(router.params.id);

  if (!acupoint) {
    return (
      <View className={styles.emptyWrap}>
        <Empty text="穴位不存在" icon="🌿" />
      </View>
    );
  }

  const partName = BODY_PARTS.find((p) => p.key === acupoint.part)?.name || '';

  const goAcupoints = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 定位图 */}
        <View className={styles.coverWrap}>
          <Image className={styles.cover} src={acupoint.cover} mode="aspectFill" />
          <View className={styles.coverMask} />
          <View className={styles.coverInfo}>
            <View className={styles.titleRow}>
              <Text className={styles.name}>{acupoint.name}</Text>
              {acupoint.alias && <Text className={styles.alias}>·{acupoint.alias}</Text>}
            </View>
            <View className={styles.metaRow}>
              <Tag text={acupoint.meridian} type="primary" />
              <Tag text={partName} type="warning" />
            </View>
          </View>
        </View>

        {/* 所属经络 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>所属经络</Text>
          <Text className={styles.meridianText}>{acupoint.meridian}</Text>
          <Text className={styles.partText}>归属部位：{partName}</Text>
        </View>

        {/* 定位描述 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>穴位定位</Text>
          <Text className={styles.locationText}>{acupoint.location}</Text>
        </View>

        {/* 功效 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>功效说明</Text>
          <View className={styles.tags}>
            {acupoint.effect.map((e) => (
              <Tag key={e} text={e} type="primary" />
            ))}
          </View>
        </View>

        {/* 主治 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>主治病症</Text>
          <View className={styles.indicationWrap}>
            {acupoint.indication.map((i) => (
              <View key={i} className={styles.indicationItem}>
                <Text className={styles.bullet}>·</Text>
                <Text className={styles.indicationText}>{i}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 按摩方法 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>按摩方法</Text>
          <View className={styles.massageBlock}>
            <Text className={styles.massageIcon}>💆</Text>
            <Text className={styles.massageText}>{acupoint.massage}</Text>
          </View>
        </View>

        {/* 注意事项 */}
        {acupoint.caution && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>注意事项</Text>
            <View className={styles.cautionBlock}>
              <Text className={styles.cautionIcon}>⚠️</Text>
              <Text className={styles.cautionText}>{acupoint.caution}</Text>
            </View>
          </View>
        )}

        <View className={styles.disclaimer}>
          <Text className={styles.disclaimerText}>
            穴位按摩仅为辅助调理，不可替代专业医疗。如有不适应及时就医。
          </Text>
        </View>
      </ScrollView>

      {/* 底部按钮 */}
      <View className={styles.bottomBar}>
        <View className={styles.backBtn} onClick={goAcupoints}>
          <Text className={styles.backBtnText}>返回穴位列表</Text>
        </View>
      </View>
    </View>
  );
};

export default AcupointDetailPage;
