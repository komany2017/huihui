import React, { useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { getProductById } from '@/data/products';
import { useStore } from '@/store/useStore';
import Tag from '@/components/Tag';
import styles from './index.module.scss';

const ProductDetailPage: React.FC = () => {
  const router = useRouter();
  const product = getProductById(router.params.id);
  const [selectedSpec, setSelectedSpec] = useState(0);
  const { addToCart } = useStore();

  if (!product) {
    return (
      <View className={styles.emptyWrap}>
        <Text className={styles.emptyText}>商品不存在</Text>
      </View>
    );
  }

  const spec = product.specs[selectedSpec];

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productCover: product.cover,
      specId: spec.id,
      specName: spec.name,
      price: spec.price,
      quantity: 1
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    Taro.navigateTo({ url: '/pages/shop/cart/index' });
  };

  const goCart = () => {
    Taro.navigateTo({ url: '/pages/shop/cart/index' });
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 主图 */}
        <View className={styles.mainImageWrap}>
          <Image className={styles.mainImage} src={product.cover} mode="aspectFill" />
          <View className={styles.cartIconBtn} onClick={goCart}>
            <Text className={styles.cartIconText}>🛒</Text>
          </View>
        </View>

        {/* 价格信息 */}
        <View className={styles.priceCard}>
          <View className={styles.priceRow}>
            <Text className={styles.priceSymbol}>¥</Text>
            <Text className={styles.price}>{spec.price}</Text>
            {product.originalPrice && (
              <Text className={styles.originalPrice}>¥{product.originalPrice}</Text>
            )}
          </View>
          <Text className={styles.sales}>销量 {product.sales} · {product.unit}</Text>
          <Text className={styles.productName}>{product.name}</Text>
          <View className={styles.tags}>
            {product.tags.map((t) => (
              <Tag key={t} text={t} type="primary" />
            ))}
          </View>
        </View>

        {/* 规格 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>规格选择</Text>
          <View className={styles.specs}>
            {product.specs.map((s, idx) => (
              <View
                key={s.id}
                className={classnames(styles.specItem, selectedSpec === idx && styles.specActive)}
                onClick={() => setSelectedSpec(idx)}
              >
                <Text
                  className={classnames(
                    styles.specText,
                    selectedSpec === idx && styles.specTextActive
                  )}
                >
                  {s.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 功效 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>功效</Text>
          <Text className={styles.sectionContent}>{product.efficacy}</Text>
        </View>

        {/* 描述 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>商品介绍</Text>
          <Text className={styles.sectionContent}>{product.description}</Text>
          {product.detailImages.map((img, idx) => (
            <Image key={idx} className={styles.detailImage} src={img} mode="widthFix" />
          ))}
        </View>

        {/* 用法 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>使用方法</Text>
          <Text className={styles.sectionContent}>{product.usage}</Text>
        </View>
      </ScrollView>

      {/* 底部操作 */}
      <View className={styles.bottomBar}>
        <View className={styles.actionBtnSecondary} onClick={handleAddToCart}>
          <Text className={styles.actionTextSecondary}>加入购物车</Text>
        </View>
        <View className={styles.actionBtnPrimary} onClick={handleBuyNow}>
          <Text className={styles.actionTextPrimary}>立即购买</Text>
        </View>
      </View>
    </View>
  );
};

export default ProductDetailPage;
