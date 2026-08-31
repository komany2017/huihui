import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { SERVICES, SERVICE_CATEGORIES } from '@/data/services';
import ServiceCard from '@/components/ServiceCard';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const ServicePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredServices = SERVICES.filter(
    (s) => activeCategory === 'all' || s.category === activeCategory
  );

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
  };

  const handleServiceClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/service/detail/index?id=${id}` });
  };

  const goAcupoint = () => {
    Taro.navigateTo({ url: '/pages/acupoint/index/index' });
  };

  const goDisease = () => {
    Taro.navigateTo({ url: '/pages/disease/index/index' });
  };

  return (
    <View className={styles.container}>
      {/* 顶部入口 */}
      <View className={styles.topEntries}>
        <View className={styles.entryCard} onClick={goAcupoint}>
          <Text className={styles.entryIcon}>🧍</Text>
          <View>
            <Text className={styles.entryTitle}>穴位图解</Text>
            <Text className={styles.entryDesc}>人体穴位 · 定位按摩</Text>
          </View>
        </View>
        <View className={styles.entryCard} onClick={goDisease}>
          <Text className={styles.entryIcon}>📖</Text>
          <View>
            <Text className={styles.entryTitle}>疾病调理</Text>
            <Text className={styles.entryDesc}>中医辨证 · 食疗指导</Text>
          </View>
        </View>
      </View>

      {/* 分类标签 */}
      <View className={styles.categories}>
        {SERVICE_CATEGORIES.map((c) => (
          <View
            key={c.id}
            className={classnames(styles.category, activeCategory === c.id && styles.categoryActive)}
            onClick={() => handleCategoryClick(c.id)}
          >
            <Text
              className={classnames(
                styles.categoryText,
                activeCategory === c.id && styles.categoryTextActive
              )}
            >
              {c.name}
            </Text>
          </View>
        ))}
      </View>

      {/* 服务列表 */}
      <View className={styles.list}>
        {filteredServices.length > 0 ? (
          filteredServices.map((s) => (
            <ServiceCard key={s.id} data={s} onClick={() => handleServiceClick(s.id)} />
          ))
        ) : (
          <Empty text="该分类暂无服务" />
        )}
      </View>
    </View>
  );
};

export default ServicePage;
