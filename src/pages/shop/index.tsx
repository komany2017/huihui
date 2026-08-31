import React, { useState } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { PRODUCTS, PRODUCT_CATEGORIES } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import Empty from '@/components/Empty';
import { useStore } from '@/store/useStore';
import styles from './index.module.scss';

const ShopPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const { cart, initFromStorage } = useStore();

  Taro.useDidShow(() => {
    initFromStorage();
  });

  const filteredProducts = PRODUCTS.filter((p) => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (keyword && !p.name.includes(keyword) && !p.efficacy.includes(keyword)) return false;
    return true;
  });

  const goCart = () => {
    Taro.navigateTo({ url: '/pages/shop/cart/index' });
  };

  const goProduct = (id: string) => {
    Taro.navigateTo({ url: `/pages/shop/detail/index?id=${id}` });
  };

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <View className={styles.container}>
      {/* 搜索栏 */}
      <View className={styles.searchBar}>
        <View className={styles.searchInputWrap}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索养生好物"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
        <View className={styles.cartWrap} onClick={goCart}>
          <Text className={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View className={styles.cartBadge}>
              <Text className={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 分类 */}
      <ScrollView scrollX className={styles.categoriesScroll} showScrollbar={false}>
        {PRODUCT_CATEGORIES.map((c) => (
          <View
            key={c.id}
            className={classnames(styles.category, activeCategory === c.id && styles.categoryActive)}
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

      {/* 商品列表 */}
      <View className={styles.productList}>
        {filteredProducts.length > 0 ? (
          <View className={styles.productGrid}>
            {filteredProducts.map((p) => (
              <View key={p.id} className={styles.productItem}>
                <ProductCard data={p} onClick={() => goProduct(p.id)} />
              </View>
            ))}
          </View>
        ) : (
          <Empty text="暂无商品" icon="🛒" />
        )}
      </View>
    </View>
  );
};

export default ShopPage;
