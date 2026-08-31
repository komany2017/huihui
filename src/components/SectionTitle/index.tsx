import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface SectionTitleProps {
  title: string
  subtitle?: string
  actionText?: string
  onAction?: () => void
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, actionText, onAction }) => {
  return (
    <View className={styles.container}>
      <View className={styles.leftWrap}>
        <View className={styles.indicator} />
        <View className={styles.titleWrap}>
          <Text className={styles.title}>{title}</Text>
          {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {actionText && (
        <View className={styles.action} onClick={onAction}>
          <Text className={styles.actionText}>{actionText}</Text>
          <Text className={styles.arrow}>›</Text>
        </View>
      )}
    </View>
  )
}

export default SectionTitle
