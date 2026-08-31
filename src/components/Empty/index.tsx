import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface EmptyProps {
  text?: string
  icon?: string
}

const Empty: React.FC<EmptyProps> = ({ text = '暂无数据', icon = '🌿' }) => {
  return (
    <View className={styles.container}>
      <Text className={styles.icon}>{icon}</Text>
      <Text className={styles.text}>{text}</Text>
    </View>
  )
}

export default Empty
