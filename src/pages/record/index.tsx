import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import { CONSTITUTION_NAME_MAP } from '@/data/constitution';
import Empty from '@/components/Empty';
import type { HealthRecord, UserProfile } from '@/types/record';
import type { ConstitutionType } from '@/types/constitution';
import styles from './index.module.scss';

const RECORD_TABS: { key: 'all' | HealthRecord['type']; name: string }[] = [
  { key: 'all', name: '全部' },
  { key: 'condition', name: '病情' },
  { key: 'treatment', name: '调理' },
  { key: 'medical', name: '诊疗' }
];

const RECORD_TYPE_LABEL: Record<HealthRecord['type'], string> = {
  condition: '病情记录',
  treatment: '调理记录',
  medical: '诊疗记录',
  constitution: '体质记录'
};

const GENDER_TEXT: Record<UserProfile['gender'], string> = {
  male: '男',
  female: '女',
  unknown: '未填'
};

const RecordPage: React.FC = () => {
  const {
    userProfile,
    constitutionResults,
    healthRecords,
    initFromStorage,
    addHealthRecord,
    deleteHealthRecord
  } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | HealthRecord['type']>('all');

  useDidShow(() => {
    initFromStorage();
  });

  usePullDownRefresh(() => {
    initFromStorage();
    Taro.stopPullDownRefresh();
  });

  const filteredRecords = healthRecords.filter(
    (r) => activeTab === 'all' || r.type === activeTab
  );

  const goConstitutionQuiz = () => {
    Taro.navigateTo({ url: '/pages/constitution/quiz/index' });
  };

  const goConstitutionResult = (id: string) => {
    Taro.navigateTo({ url: `/pages/constitution/result/index?id=${id}` });
  };

  const goProfile = () => {
    Taro.navigateTo({ url: '/pages/mine/index' });
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除记录',
      content: '确认删除此健康记录吗？',
      confirmColor: '#c8362f',
      success: (res) => {
        if (res.confirm) {
          deleteHealthRecord(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const handleAddRecord = () => {
    Taro.showActionSheet({
      itemList: ['病情记录', '调理记录', '诊疗记录'],
      success: (res) => {
        const types: HealthRecord['type'][] = ['condition', 'treatment', 'medical'];
        const type = types[res.tapIndex];
        showAddDialog(type);
      }
    });
  };

  const showAddDialog = (type: HealthRecord['type']) => {
    Taro.showModal({
      title: `添加${RECORD_TYPE_LABEL[type]}`,
      editable: true,
      placeholderText: '请输入标题',
      confirmColor: '#c8362f',
      success: (res) => {
        if (res.confirm) {
          const title = res.content || '';
          if (!title) {
            Taro.showToast({ title: '请输入标题', icon: 'none' });
            return;
          }
          showContentDialog(type, title);
        }
      }
    });
  };

  const showContentDialog = (
    type: HealthRecord['type'],
    title: string
  ) => {
    Taro.showModal({
      title: '记录内容',
      editable: true,
      placeholderText: '请输入详细内容',
      confirmColor: '#c8362f',
      success: (res) => {
        if (res.confirm) {
          const content = res.content || '';
          addHealthRecord({
            date: new Date().toISOString(),
            type,
            title,
            content
          });
          Taro.showToast({ title: '已添加', icon: 'success' });
        }
      }
    });
  };

  const latestConstitution = constitutionResults[0];

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 用户档案摘要 */}
        <View className={styles.profileCard}>
          <View className={styles.profileHeader}>
            <View className={styles.avatar}>
              <Text className={styles.avatarText}>颐</Text>
            </View>
            <View className={styles.profileInfo}>
              <View className={styles.profileNameRow}>
                <Text className={styles.profileName}>{userProfile.name}</Text>
                <Text className={styles.profileGender}>{GENDER_TEXT[userProfile.gender]}</Text>
              </View>
              <Text className={styles.profileMeta}>
                {userProfile.age}岁 · {userProfile.height}cm · {userProfile.weight}kg · {userProfile.bloodType}型
              </Text>
            </View>
            <View className={styles.profileEdit} onClick={goProfile}>
              <Text className={styles.profileEditText}>编辑 ›</Text>
            </View>
          </View>
          <View className={styles.profileGrid}>
            <View className={styles.profileCell}>
              <Text className={styles.cellLabel}>过敏史</Text>
              <Text className={styles.cellValue}>{userProfile.allergy || '无'}</Text>
            </View>
            <View className={styles.profileCell}>
              <Text className={styles.cellLabel}>慢性病</Text>
              <Text className={styles.cellValue}>{userProfile.chronicDisease || '无'}</Text>
            </View>
          </View>
        </View>

        {/* 体质记录 */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>体质记录</Text>
            <View className={styles.sectionAction} onClick={goConstitutionQuiz}>
              <Text className={styles.sectionActionText}>去测试 ›</Text>
            </View>
          </View>
          {latestConstitution ? (
            <View
              className={styles.constitutionCard}
              onClick={() => goConstitutionResult(latestConstitution.id)}
            >
              <View className={styles.constitutionLeft}>
                <Text className={styles.constitutionLabel}>最近体质</Text>
                <Text className={styles.constitutionName}>
                  {CONSTITUTION_NAME_MAP[latestConstitution.primary as ConstitutionType]}
                </Text>
                <Text className={styles.constitutionDate}>
                  {new Date(latestConstitution.date).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <View className={styles.constitutionRight}>
                <Text className={styles.constitutionArrow}>›</Text>
              </View>
            </View>
          ) : (
            <View className={styles.emptyConstitution} onClick={goConstitutionQuiz}>
              <Text className={styles.emptyIcon}>🩺</Text>
              <Text className={styles.emptyText}>尚未进行体质测试</Text>
              <Text className={styles.emptyAction}>立即免费测试 ›</Text>
            </View>
          )}
        </View>

        {/* 健康记录 */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>健康记录</Text>
            <View className={styles.sectionAction} onClick={handleAddRecord}>
              <Text className={styles.sectionActionText}>+ 添加</Text>
            </View>
          </View>

          {/* 类型筛选 */}
          <View className={styles.recordTabs}>
            {RECORD_TABS.map((t) => (
              <View
                key={t.key}
                className={classnames(
                  styles.recordTab,
                  activeTab === t.key && styles.recordTabActive
                )}
                onClick={() => setActiveTab(t.key)}
              >
                <Text
                  className={classnames(
                    styles.recordTabText,
                    activeTab === t.key && styles.recordTabTextActive
                  )}
                >
                  {t.name}
                </Text>
              </View>
            ))}
          </View>

          {/* 记录列表 */}
          <View className={styles.recordList}>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((r) => (
                <View key={r.id} className={styles.recordItem}>
                  <View className={styles.recordTop}>
                    <View className={styles.recordTypeTag}>
                      <Text className={styles.recordTypeText}>{RECORD_TYPE_LABEL[r.type]}</Text>
                    </View>
                    <Text className={styles.recordDate}>
                      {new Date(r.date).toLocaleDateString('zh-CN')}
                    </Text>
                    <View className={styles.recordDelete} onClick={() => handleDelete(r.id)}>
                      <Text className={styles.recordDeleteText}>删除</Text>
                    </View>
                  </View>
                  <Text className={styles.recordTitle}>{r.title}</Text>
                  {r.content && <Text className={styles.recordContent}>{r.content}</Text>}
                </View>
              ))
            ) : (
              <Empty text="暂无记录" icon="📋" />
            )}
          </View>
        </View>

        <View className={styles.footer}>
          <Text className={styles.footerText}>数据仅保存在本机，不会上传</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default RecordPage;
