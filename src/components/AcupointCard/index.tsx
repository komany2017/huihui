import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import type { Acupoint } from '@/types/acupoint'
import { BODY_PARTS } from '@/data/acupoints'
import { resolveImageUrl } from '@/utils/image'
import styles from './index.module.scss'

interface AcupointCardProps {
  data: Acupoint
  onClick?: () => void
}

const AcupointCard: React.FC<AcupointCardProps> = ({ data, onClick }) => {
  const partName = BODY_PARTS.find((p) => p.key === data.part)?.name || ''

  return (
    <View className={styles.container} onClick={onClick}>
      <View className={styles.imageWrap}>
        <Image className={styles.image} src={resolveImageUrl(data.cover)} mode="aspectFill" />
      </View>
      <View className={styles.content}>
        <View className={styles.titleRow}>
          <Text className={styles.name}>{data.name}</Text>
          {data.alias && <Text className={styles.alias}>·{data.alias}</Text>}
        </View>
        <View className={styles.meta}>
          <Text className={styles.meridian}>{data.meridian}</Text>
          <Text className={styles.dot}>·</Text>
          <Text className={styles.part}>{partName}</Text>
        </View>
        <Text className={styles.location}>{data.location}</Text>
        <View className={styles.effects}>
          {data.effect.slice(0, 3).map((e) => (
            <Text key={e} className={styles.effectItem}>
              {e}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}

export default AcupointCard
