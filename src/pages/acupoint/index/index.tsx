import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { BODY_PARTS, ACUPOINT_EFFECTS, filterAcupoints } from '@/data/acupoints';
import AcupointCard from '@/components/AcupointCard';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const AcupointIndexPage: React.FC = () => {
  const [activePart, setActivePart] = useState<string>('all');
  const [activeEffect, setActiveEffect] = useState<string>('全部');
  const [keyword, setKeyword] = useState('');

  const list = useMemo(
    () =>
      filterAcupoints({
        part: activePart,
        effect: activeEffect,
        keyword
      }),
    [activePart, activeEffect, keyword]
  );

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/acupoint/detail/index?id=${id}` });
  };

  return (
    <View className={styles.container}>
      {/* 搜索栏 */}
      <View className={styles.searchBar}>
        <View className={styles.searchInputWrap}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索穴位 / 别名 / 经络"
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

      {/* 身体部位 */}
      <ScrollView scrollX className={styles.partScroll} showScrollbar={false}>
        <View
          className={classnames(styles.partItem, activePart === 'all' && styles.partItemActive)}
          onClick={() => setActivePart('all')}
        >
          <Text className={styles.partIcon}>🧍</Text>
          <Text
            className={classnames(styles.partName, activePart === 'all' && styles.partNameActive)}
          >
            全部
          </Text>
        </View>
        {BODY_PARTS.map((p) => (
          <View
            key={p.key}
            className={classnames(styles.partItem, activePart === p.key && styles.partItemActive)}
            onClick={() => setActivePart(p.key)}
          >
            <Text className={styles.partIcon}>{p.icon}</Text>
            <Text
              className={classnames(
                styles.partName,
                activePart === p.key && styles.partNameActive
              )}
            >
              {p.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* 功效筛选 */}
      <ScrollView scrollX className={styles.effectScroll} showScrollbar={false}>
        {ACUPOINT_EFFECTS.map((e) => (
          <View
            key={e}
            className={classnames(styles.effectItem, activeEffect === e && styles.effectItemActive)}
            onClick={() => setActiveEffect(e)}
          >
            <Text
              className={classnames(
                styles.effectText,
                activeEffect === e && styles.effectTextActive
              )}
            >
              {e}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* 列表头部 */}
      <View className={styles.listHeader}>
        <Text className={styles.listCount}>共 {list.length} 个穴位</Text>
      </View>

      {/* 穴位列表 */}
      <View className={styles.list}>
        {list.length > 0 ? (
          list.map((a) => <AcupointCard key={a.id} data={a} onClick={() => goDetail(a.id)} />)
        ) : (
          <Empty text="未找到匹配的穴位" icon="🌿" />
        )}
      </View>
    </View>
  );
};

export default AcupointIndexPage;
