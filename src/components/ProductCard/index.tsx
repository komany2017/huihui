import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import type { Product } from '@/types/product'
import Tag from '@/components/Tag'
import { resolveImageUrl } from '@/utils/image'
import styles from './index.module.scss'

interface ProductCardProps {
  data: Product
  onClick?: () => void
}

const ProductCard: React.FC<ProductCardProps> = ({ data, onClick }) => {
  return (
    <View className={styles.container} onClick={onClick}>
      <View className={styles.imageWrap}>
        <Image className={styles.image} src={resolveImageUrl(data.cover)} mode="aspectFill" />
        {data.hot && (
          <View className={styles.hot}>
            <Text className={styles.hotText}>热销</Text>
          </View>
        )}
      </View>
      <View className={styles.content}>
        <Text className={styles.name}>{data.name}</Text>
        <Text className={styles.efficacy}>{data.efficacy}</Text>
        <View className={styles.tags}>
          {data.tags.slice(0, 2).map((tag) => (
            <Tag key={tag} text={tag} />
          ))}
        </View>
        <View className={styles.bottom}>
          <View className={styles.priceWrap}>
            <Text className={styles.priceSymbol}>¥</Text>
            <Text className={styles.price}>{data.price}</Text>
            <Text className={styles.unit}>/{data.unit}</Text>
          </View>
          <Text className={styles.sales}>销量 {data.sales}</Text>
        </View>
      </View>
    </View>
  )
}

export default ProductCard
