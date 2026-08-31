import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { DISEASE_CATEGORIES, HOT_DISEASES, searchDiseases } from '@/data/diseases';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const DiseaseIndexPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const list = useMemo(
    () =>
      searchDiseases(
        keyword,
        DISEASE_CATEGORIES.find((c) => c.id === activeCategory)?.name
      ),
    [keyword, activeCategory]
  );

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/disease/detail/index?id=${id}` });
  };

  const handleHot = (k: string) => {
    setKeyword(k);
  };

  return (
    <View className={styles.container}>
      {/* 搜索栏 */}
      <View className={styles.searchBar}>
        <View className={styles.searchInputWrap}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索疾病 / 别名 / 症状"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
          {keyword.length > 0 && (
            <Text className={styles.clearIcon} onClick={() => setKeyword('')}>
              ✕
            </Text>
          )}
        </View>
      </View>

      {/* 热门搜索 */}
      {!keyword && (
        <View className={styles.hotSection}>
          <Text className={styles.hotTitle}>热门搜索</Text>
          <View className={styles.hotWrap}>
            {HOT_DISEASES.map((d) => (
              <View key={d} className={styles.hotItem} onClick={() => handleHot(d)}>
                <Text className={styles.hotText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 分类 */}
      <ScrollView scrollX className={styles.categoriesScroll} showScrollbar={false}>
        {DISEASE_CATEGORIES.map((c) => (
          <View
            key={c.id}
            className={classnames(
              styles.category,
              activeCategory === c.id && styles.categoryActive
            )}
            onClick={() => setActiveCategory(c.id)}
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
      </ScrollView>

      {/* 列表头 */}
      <View className={styles.listHeader}>
        <Text className={styles.listCount}>共 {list.length} 条记录</Text>
      </View>

      {/* 疾病列表 */}
      <View className={styles.list}>
        {list.length > 0 ? (
          list.map((d) => (
            <View key={d.id} className={styles.diseaseCard} onClick={() => goDetail(d.id)}>
              <Image className={styles.cover} src={d.cover} mode="aspectFill" />
              <View className={styles.content}>
                <View className={styles.titleRow}>
                  <Text className={styles.name}>{d.name}</Text>
                  {d.alias && <Text className={styles.alias}>·{d.alias}</Text>}
                </View>
                <View className={styles.categoryTag}>
                  <Text className={styles.categoryTagText}>{d.category}</Text>
                </View>
                <Text className={styles.symptomText}>
                  主要症状：{d.symptoms.slice(0, 3).join('、')}
                </Text>
              </View>
              <Text className={styles.arrow}>›</Text>
            </View>
          ))
        ) : (
          <Empty text="未找到相关疾病" icon="📖" />
        )}
      </View>
    </View>
  );
};

export default DiseaseIndexPage;
