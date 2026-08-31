import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { QUIZ_QUESTIONS } from '@/data/constitution';
import type { ConstitutionType } from '@/types/constitution';
import { buildConstitutionResult } from '@/utils/constitution';
import { useStore } from '@/store/useStore';
import styles from './index.module.scss';

const ConstitutionQuizPage: React.FC = () => {
  const { saveConstitutionResult } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const total = QUIZ_QUESTIONS.length;
  const current = QUIZ_QUESTIONS[currentIndex];
  const progress = Math.round(((currentIndex + 1) / total) * 100);

  const handleSelect = (value: number) => {
    const newAnswers = { ...answers, [current.id]: value };
    setAnswers(newAnswers);

    if (currentIndex < total - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 200);
    } else {
      // 完成，计算结果
      setTimeout(() => {
        const rawScores: Record<ConstitutionType, number> = {
          pinghe: 0,
          qixu: 0,
          yangxu: 0,
          yinxu: 0,
          tanshi: 0,
          shire: 0,
          xueyu: 0,
          qiyu: 0,
          tebing: 0
        };
        const questionCount: Record<ConstitutionType, number> = { ...rawScores };

        QUIZ_QUESTIONS.forEach((q) => {
          rawScores[q.category] += newAnswers[q.id] || 3;
          questionCount[q.category] += 1;
        });

        const result = buildConstitutionResult(rawScores, questionCount);
        saveConstitutionResult(result);
        Taro.redirectTo({ url: `/pages/constitution/result/index?id=${result.id}` });
      }, 300);
    }
  };

  return (
    <View className={styles.container}>
      {/* 顶部进度 */}
      <View className={styles.header}>
        <View className={styles.progressInfo}>
          <Text className={styles.progressText}>
            第 {currentIndex + 1} 题 / 共 {total} 题
          </Text>
          <Text className={styles.progressPercent}>{progress}%</Text>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${progress}%` }} />
        </View>
        <Text className={styles.hint}>请根据您最近 1 个月的实际感受选择最符合的选项</Text>
      </View>

      {/* 题目 */}
      <View className={styles.questionCard}>
        <View className={styles.questionNumber}>
          <Text className={styles.questionNumberText}>Q{current.id}</Text>
        </View>
        <Text className={styles.questionText}>{current.question}</Text>
        <View className={styles.options}>
          {current.options.map((opt, idx) => (
            <View
              key={idx}
              className={classnames(
                styles.optionItem,
                answers[current.id] === opt.value && styles.optionActive
              )}
              onClick={() => handleSelect(opt.value)}
            >
              <View
                className={classnames(
                  styles.optionIndicator,
                  answers[current.id] === opt.value && styles.optionIndicatorActive
                )}
              >
                {answers[current.id] === opt.value && <Text className={styles.checkMark}>✓</Text>}
              </View>
              <Text className={styles.optionLabel}>{opt.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 底部操作 */}
      <View className={styles.footer}>
        {currentIndex > 0 && (
          <View className={styles.prevBtn} onClick={() => setCurrentIndex(currentIndex - 1)}>
            <Text className={styles.prevBtnText}>上一题</Text>
          </View>
        )}
        <View className={styles.skipBtn} onClick={() => handleSelect(3)}>
          <Text className={styles.skipBtnText}>{currentIndex < total - 1 ? '跳过此题' : '完成测试'}</Text>
        </View>
      </View>
    </View>
  );
};

export default ConstitutionQuizPage;
