import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useStore } from '@/store/useStore';
import { CONSTITUTION_NAME_MAP } from '@/data/constitution';
import Empty from '@/components/Empty';
import type { ConstitutionType } from '@/types/constitution';
import styles from './index.module.scss';

const ConstitutionResultPage: React.FC = () => {
  const router = useRouter();
  const { constitutionResults } = useStore();
  const result = constitutionResults.find((r) => r.id === router.params.id);

  if (!result) {
    return (
      <View className={styles.container}>
        <Empty text="报告不存在或已失效" icon="📋" />
      </View>
    );
  }

  const primaryInfo = result.infos.find((i) => i.type === result.primary);
  const secondaryInfo = result.secondary
    ? result.infos.find((i) => i.type === result.secondary)
    : null;

  const restart = () => {
    Taro.redirectTo({ url: '/pages/constitution/quiz/index' });
  };

  const goHome = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 报告头 */}
        <View className={styles.header}>
          <Text className={styles.headerTitle}>体质辨识报告</Text>
          <Text className={styles.headerDate}>
            {new Date(result.date).toLocaleDateString('zh-CN')}
          </Text>
          <View className={styles.primaryCard}>
            <View className={styles.primaryBadge}>
              <Text className={styles.primaryBadgeText}>主倾向</Text>
            </View>
            <Text className={styles.primaryName}>
              {CONSTITUTION_NAME_MAP[result.primary as ConstitutionType]}
            </Text>
            <Text className={styles.primaryScore}>转化分 {result.scores[result.primary as ConstitutionType]}</Text>
            {secondaryInfo && (
              <Text className={styles.secondaryInfo}>
                兼夹：{CONSTITUTION_NAME_MAP[result.secondary as ConstitutionType]}（{result.scores[result.secondary as ConstitutionType]}分）
              </Text>
            )}
          </View>
        </View>

        {/* 体质雷达图（条形图替代） */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>九种体质得分</Text>
          <View className={styles.barChart}>
            {result.infos.map((info) => (
              <View key={info.type} className={styles.barItem}>
                <Text className={styles.barLabel}>{info.name}</Text>
                <View className={styles.barTrack}>
                  <View
                    className={styles.barFill}
                    style={{
                      width: `${info.score}%`,
                      background:
                        info.type === result.primary
                          ? `linear-gradient(90deg, #c8362f 0%, #e85d56 100%)`
                          : info.score >= 40
                          ? `linear-gradient(90deg, #b8893a 0%, #d4a857 100%)`
                          : `#f0ebe2`
                    }}
                  />
                  <Text className={styles.barScore}>{info.score}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 主倾向分析 */}
        {primaryInfo && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{primaryInfo.name}·特征分析</Text>
            <View className={styles.descBlock}>
              <Text className={styles.descLabel}>体质描述</Text>
              <Text className={styles.descText}>{primaryInfo.description}</Text>
            </View>
            <View className={styles.descBlock}>
              <Text className={styles.descLabel}>典型表现</Text>
              {primaryInfo.symptoms.map((s, idx) => (
                <View key={idx} className={styles.listItem}>
                  <Text className={styles.bullet}>·</Text>
                  <Text className={styles.listText}>{s}</Text>
                </View>
              ))}
            </View>
            <View className={styles.descBlock}>
              <Text className={styles.descLabel}>形成原因</Text>
              {primaryInfo.causes.map((c, idx) => (
                <View key={idx} className={styles.listItem}>
                  <Text className={styles.bullet}>·</Text>
                  <Text className={styles.listText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 调养建议 */}
        {primaryInfo && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>个性化调养建议</Text>

            <View className={styles.adviceBlock}>
              <View className={styles.adviceHeader}>
                <Text className={styles.adviceIcon}>🍚</Text>
                <Text className={styles.adviceTitle}>饮食建议</Text>
              </View>
              {primaryInfo.advice.diet.map((d, idx) => (
                <View key={idx} className={styles.listItem}>
                  <Text className={styles.bullet}>·</Text>
                  <Text className={styles.listText}>{d}</Text>
                </View>
              ))}
            </View>

            <View className={styles.adviceBlock}>
              <View className={styles.adviceHeader}>
                <Text className={styles.adviceIcon}>🏃</Text>
                <Text className={styles.adviceTitle}>运动建议</Text>
              </View>
              {primaryInfo.advice.exercise.map((e, idx) => (
                <View key={idx} className={styles.listItem}>
                  <Text className={styles.bullet}>·</Text>
                  <Text className={styles.listText}>{e}</Text>
                </View>
              ))}
            </View>

            <View className={styles.adviceBlock}>
              <View className={styles.adviceHeader}>
                <Text className={styles.adviceIcon}>🛏️</Text>
                <Text className={styles.adviceTitle}>起居建议</Text>
              </View>
              {primaryInfo.advice.lifestyle.map((l, idx) => (
                <View key={idx} className={styles.listItem}>
                  <Text className={styles.bullet}>·</Text>
                  <Text className={styles.listText}>{l}</Text>
                </View>
              ))}
            </View>

            <View className={styles.adviceBlock}>
              <View className={styles.adviceHeader}>
                <Text className={styles.adviceIcon}>💆</Text>
                <Text className={styles.adviceTitle}>理疗建议</Text>
              </View>
              {primaryInfo.advice.therapy.map((t, idx) => (
                <View key={idx} className={styles.listItem}>
                  <Text className={styles.bullet}>·</Text>
                  <Text className={styles.listText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View className={styles.actionRow}>
          <View className={styles.actionSecondary} onClick={restart}>
            <Text className={styles.actionSecondaryText}>重新测试</Text>
          </View>
          <View className={styles.actionPrimary} onClick={goHome}>
            <Text className={styles.actionPrimaryText}>返回首页</Text>
          </View>
        </View>

        <View className={styles.disclaimer}>
          <Text className={styles.disclaimerText}>
            本报告基于中医九种体质标准量表自动生成，仅供健康参考，不能替代专业医师诊断。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ConstitutionResultPage;
