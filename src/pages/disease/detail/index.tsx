import React from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getDiseaseById } from '@/data/diseases';
import Tag from '@/components/Tag';
import Empty from '@/components/Empty';
import { resolveImageUrl } from '@/utils/image';
import styles from './index.module.scss';

const DiseaseDetailPage: React.FC = () => {
  const router = useRouter();
  const disease = getDiseaseById(router.params.id);

  if (!disease) {
    return (
      <View className={styles.emptyWrap}>
        <Empty text="疾病记录不存在" icon="📖" />
      </View>
    );
  }

  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 头部 */}
        <View className={styles.coverWrap}>
          <Image className={styles.cover} src={resolveImageUrl(disease.cover)} mode="aspectFill" />
          <View className={styles.coverMask} />
          <View className={styles.coverInfo}>
            <View className={styles.titleRow}>
              <Text className={styles.name}>{disease.name}</Text>
              {disease.alias && <Text className={styles.alias}>·{disease.alias}</Text>}
            </View>
            <View className={styles.tagRow}>
              <Tag text={disease.category} type="primary" />
            </View>
          </View>
        </View>

        {/* 主要症状 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>主要症状</Text>
          <View className={styles.symptomTags}>
            {disease.symptoms.map((s) => (
              <View key={s} className={styles.symptomTag}>
                <Text className={styles.symptomTagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 中医辨证 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>中医辨证</Text>
          <Text className={styles.diagnosisText}>{disease.tcmDiagnosis}</Text>
        </View>

        {/* 中医调理 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>中医调理</Text>
          <View className={styles.list}>
            {disease.tcmTreatment.map((t, idx) => (
              <View key={idx} className={styles.listItem}>
                <Text className={styles.bullet}>·</Text>
                <Text className={styles.listText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 食疗方案 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>食疗方案</Text>
          <View className={styles.list}>
            {disease.diet.map((d, idx) => (
              <View key={idx} className={styles.listItem}>
                <Text className={styles.bullet}>·</Text>
                <Text className={styles.listText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 食疗方剂表 */}
        {disease.dietRecipes.length > 0 && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>食疗方剂</Text>
            <View className={styles.recipes}>
              {disease.dietRecipes.map((r, idx) => (
                <View key={idx} className={styles.recipeCard}>
                  <View className={styles.recipeHeader}>
                    <Text className={styles.recipeName}>{r.name}</Text>
                    <Text className={styles.recipeEffect}>{r.effect}</Text>
                  </View>
                  <View className={styles.recipeRow}>
                    <Text className={styles.recipeLabel}>材料</Text>
                    <Text className={styles.recipeValue}>{r.ingredients}</Text>
                  </View>
                  <View className={styles.recipeRow}>
                    <Text className={styles.recipeLabel}>做法</Text>
                    <Text className={styles.recipeValue}>{r.method}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 生活指导 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>生活指导</Text>
          <View className={styles.list}>
            {disease.lifestyle.map((l, idx) => (
              <View key={idx} className={styles.listItem}>
                <Text className={styles.bullet}>✓</Text>
                <Text className={styles.listText}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 注意事项 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>注意事项</Text>
          <View className={styles.cautionList}>
            {disease.precautions.map((p, idx) => (
              <View key={idx} className={styles.cautionItem}>
                <Text className={styles.cautionIcon}>⚠️</Text>
                <Text className={styles.cautionText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.disclaimer}>
          <Text className={styles.disclaimerText}>
            以上调理建议仅供健康参考，不能替代专业医师诊疗。如有疾病请及时就医并遵医嘱。
          </Text>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.backBtn} onClick={goBack}>
          <Text className={styles.backBtnText}>返回列表</Text>
        </View>
      </View>
    </View>
  );
};

export default DiseaseDetailPage;
