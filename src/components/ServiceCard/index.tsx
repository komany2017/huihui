import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import type { ServiceItem } from '@/types/service'
import Tag from '@/components/Tag'
import styles from './index.module.scss'

interface ServiceCardProps {
  data: ServiceItem
  onClick?: () => void
}

const ServiceCard: React.FC<ServiceCardProps> = ({ data, onClick }) => {
  return (
    <View className={styles.container} onClick={onClick}>
      <View className={styles.imageWrap}>
        <Image className={styles.image} src={data.cover} mode="aspectFill" />
        <View className={styles.duration}>
          <Text className={styles.durationText}>{data.duration}分钟</Text>
        </View>
        {data.popular && (
          <View className={styles.hot}>
            <Text className={styles.hotText}>HOT</Text>
          </View>
        )}
      </View>
      <View className={styles.content}>
        <Text className={styles.name}>{data.name}</Text>
        <Text className={styles.intro}>{data.intro}</Text>
        <View className={styles.tags}>
          {data.efficacy.slice(0, 3).map((tag) => (
            <Tag key={tag} text={tag} type="primary" />
          ))}
        </View>
        <View className={styles.bottom}>
          <View className={styles.priceWrap}>
            <Text className={styles.priceSymbol}>¥</Text>
            <Text className={styles.price}>{data.price}</Text>
            {data.originalPrice && <Text className={styles.originalPrice}>¥{data.originalPrice}</Text>}
          </View>
          <View className={styles.bookBtn}>
            <Text className={styles.bookBtnText}>立即预约</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ServiceCard
