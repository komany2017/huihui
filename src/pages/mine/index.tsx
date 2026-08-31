import React, { useState } from 'react';
import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import type { UserProfile } from '@/types/record';
import { CONSTITUTION_NAME_MAP } from '@/data/constitution';
import type { ConstitutionType } from '@/types/constitution';
import styles from './index.module.scss';

const GENDER_OPTIONS: { value: UserProfile['gender']; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '保密' }
];

const MinePage: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    bookingOrders,
    productOrders,
    constitutionResults,
    initFromStorage
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(userProfile);

  useDidShow(() => {
    initFromStorage();
  });

  const openEdit = () => {
    setDraft(userProfile);
    setEditing(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    updateUserProfile({
      name: draft.name.trim(),
      gender: draft.gender,
      age: draft.age,
      height: draft.height,
      weight: draft.weight,
      bloodType: draft.bloodType,
      allergy: draft.allergy,
      chronicDisease: draft.chronicDisease
    });
    Taro.showToast({ title: '已保存', icon: 'success' });
    setEditing(false);
  };

  const goBookingOrders = () => {
    Taro.navigateTo({ url: '/pages/order/list/index' });
  };

  const goProductOrders = () => {
    Taro.navigateTo({ url: '/pages/shop/order/index' });
  };

  const goConstitutionList = () => {
    Taro.switchTab({ url: '/pages/record/index' });
  };

  const goConstitutionQuiz = () => {
    Taro.navigateTo({ url: '/pages/constitution/quiz/index' });
  };

  const goLatestConstitution = () => {
    const latest = constitutionResults[0];
    if (latest) {
      Taro.navigateTo({ url: `/pages/constitution/result/index?id=${latest.id}` });
    } else {
      goConstitutionQuiz();
    }
  };

  const pendingBookings = bookingOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
  const paidProductOrders = productOrders.filter(
    (o) => o.status === 'paid' || o.status === 'shipped'
  ).length;
  const latestConstitution = constitutionResults[0];
  const constitutionName = latestConstitution
    ? CONSTITUTION_NAME_MAP[latestConstitution.primary as ConstitutionType]
    : '未测试';

  const showAbout = () => {
    Taro.showModal({
      title: '关于颐养堂',
      content:
        '颐养堂致力于中医健康服务，提供体质辨识、理疗预约、养生商城、穴位图解、疾病调理等一站式中医养生方案。\n\n本应用数据仅保存在本机，不会上传。',
      showCancel: false,
      confirmColor: '#c8362f',
      confirmText: '我知道了'
    });
  };

  const showDataStatement = () => {
    Taro.showModal({
      title: '数据说明',
      content:
        '1. 您的健康档案、订单、体质报告等数据均保存在本机存储。\n2. 数据不会上传至云端或共享给第三方。\n3. 清理小程序缓存将导致数据丢失，请谨慎操作。\n4. 本应用仅供健康参考，不能替代专业医师诊疗。',
      showCancel: false,
      confirmColor: '#c8362f',
      confirmText: '我知道了'
    });
  };

  const clearData = () => {
    Taro.showModal({
      title: '清空数据',
      content: '将清空所有本地数据（购物车、订单、体质、档案等），且不可恢复，确认继续？',
      confirmColor: '#c8362f',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync();
          Taro.showToast({ title: '已清空', icon: 'success' });
          setTimeout(() => {
            Taro.reLaunch({ url: '/pages/home/index' });
          }, 1000);
        }
      }
    });
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {/* 用户卡片 */}
        <View className={styles.userCard}>
          <View className={styles.userHeader}>
            <View className={styles.avatar}>
              <Text className={styles.avatarText}>颐</Text>
            </View>
            <View className={styles.userInfo}>
              <Text className={styles.userName}>{userProfile.name}</Text>
              <Text className={styles.userDesc}>守护健康 · 颐养身心</Text>
            </View>
            <View className={styles.editBtn} onClick={openEdit}>
              <Text className={styles.editText}>编辑资料</Text>
            </View>
          </View>

          {/* 数据统计 */}
          <View className={styles.statsRow}>
            <View className={styles.statItem} onClick={goBookingOrders}>
              <Text className={styles.statValue}>{bookingOrders.length}</Text>
              <Text className={styles.statLabel}>预约订单</Text>
              {pendingBookings > 0 && (
                <View className={styles.statBadge}>
                  <Text className={styles.statBadgeText}>{pendingBookings}</Text>
                </View>
              )}
            </View>
            <View className={styles.statItem} onClick={goProductOrders}>
              <Text className={styles.statValue}>{productOrders.length}</Text>
              <Text className={styles.statLabel}>商品订单</Text>
              {paidProductOrders > 0 && (
                <View className={styles.statBadge}>
                  <Text className={styles.statBadgeText}>{paidProductOrders}</Text>
                </View>
              )}
            </View>
            <View className={styles.statItem} onClick={goConstitutionList}>
              <Text className={styles.statValue}>{constitutionResults.length}</Text>
              <Text className={styles.statLabel}>体质报告</Text>
            </View>
          </View>
        </View>

        {/* 快捷入口 */}
        <View className={styles.quickSection}>
          <View className={styles.quickGrid}>
            <View className={styles.quickItem} onClick={goBookingOrders}>
              <Text className={styles.quickIcon}>📅</Text>
              <Text className={styles.quickName}>预约订单</Text>
            </View>
            <View className={styles.quickItem} onClick={goProductOrders}>
              <Text className={styles.quickIcon}>📦</Text>
              <Text className={styles.quickName}>商品订单</Text>
            </View>
            <View className={styles.quickItem} onClick={goLatestConstitution}>
              <Text className={styles.quickIcon}>📋</Text>
              <Text className={styles.quickName}>体质报告</Text>
            </View>
            <View className={styles.quickItem} onClick={goConstitutionQuiz}>
              <Text className={styles.quickIcon}>🩺</Text>
              <Text className={styles.quickName}>体质测试</Text>
            </View>
          </View>
        </View>

        {/* 当前体质 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>我的体质</Text>
          <View className={styles.constitutionBlock} onClick={goLatestConstitution}>
            <View className={styles.constitutionLeft}>
              <Text className={styles.constitutionLabel}>最近主倾向</Text>
              <Text className={styles.constitutionName}>{constitutionName}</Text>
              {latestConstitution && (
                <Text className={styles.constitutionDate}>
                  {new Date(latestConstitution.date).toLocaleDateString('zh-CN')}
                </Text>
              )}
            </View>
            <Text className={styles.arrow}>›</Text>
          </View>
        </View>

        {/* 健康档案 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>健康档案</Text>
          <View className={styles.recordRow} onClick={goConstitutionList}>
            <Text className={styles.recordIcon}>📋</Text>
            <Text className={styles.recordName}>档案管理</Text>
            <Text className={styles.arrow}>›</Text>
          </View>
        </View>

        {/* 设置 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>设置</Text>
          <View className={styles.settingItem} onClick={showAbout}>
            <Text className={styles.settingIcon}>ℹ️</Text>
            <Text className={styles.settingName}>关于我们</Text>
            <Text className={styles.arrow}>›</Text>
          </View>
          <View className={styles.settingItem} onClick={showDataStatement}>
            <Text className={styles.settingIcon}>🔒</Text>
            <Text className={styles.settingName}>数据说明</Text>
            <Text className={styles.arrow}>›</Text>
          </View>
          <View className={styles.settingItem} onClick={clearData}>
            <Text className={styles.settingIcon}>🗑️</Text>
            <Text className={styles.settingName}>清空数据</Text>
            <Text className={styles.arrow}>›</Text>
          </View>
        </View>

        <View className={styles.footer}>
          <Text className={styles.footerText}>颐养堂 · 守护您的健康</Text>
          <Text className={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>

      {/* 编辑资料弹层 */}
      {editing && (
        <View className={styles.modalMask} onClick={() => setEditing(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>编辑个人资料</Text>
              <Text className={styles.modalClose} onClick={() => setEditing(false)}>
                ✕
              </Text>
            </View>
            <ScrollView scrollY className={styles.modalScroll}>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>姓名</Text>
                <Input
                  className={styles.formInput}
                  placeholder="请输入姓名"
                  value={draft.name}
                  onInput={(e) => setDraft({ ...draft, name: e.detail.value })}
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>性别</Text>
                <View className={styles.genderRow}>
                  {GENDER_OPTIONS.map((g) => (
                    <View
                      key={g.value}
                      className={classnames(
                        styles.genderItem,
                        draft.gender === g.value && styles.genderItemActive
                      )}
                      onClick={() => setDraft({ ...draft, gender: g.value })}
                    >
                      <Text
                        className={classnames(
                          styles.genderText,
                          draft.gender === g.value && styles.genderTextActive
                        )}
                      >
                        {g.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>年龄</Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="请输入年龄"
                  value={String(draft.age)}
                  onInput={(e) =>
                    setDraft({ ...draft, age: Number(e.detail.value) || 0 })
                  }
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>身高(cm)</Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="身高"
                  value={String(draft.height)}
                  onInput={(e) =>
                    setDraft({ ...draft, height: Number(e.detail.value) || 0 })
                  }
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>体重(kg)</Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="体重"
                  value={String(draft.weight)}
                  onInput={(e) =>
                    setDraft({ ...draft, weight: Number(e.detail.value) || 0 })
                  }
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>血型</Text>
                <Input
                  className={styles.formInput}
                  placeholder="A/B/O/AB"
                  value={draft.bloodType}
                  onInput={(e) => setDraft({ ...draft, bloodType: e.detail.value })}
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>过敏史</Text>
                <Input
                  className={styles.formInput}
                  placeholder="无 / 食物药物过敏等"
                  value={draft.allergy}
                  onInput={(e) => setDraft({ ...draft, allergy: e.detail.value })}
                />
              </View>
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>慢性病</Text>
                <Textarea
                  className={styles.formTextarea}
                  placeholder="无 / 高血压、糖尿病等"
                  value={draft.chronicDisease}
                  onInput={(e) => setDraft({ ...draft, chronicDisease: e.detail.value })}
                  maxlength={100}
                />
              </View>
            </ScrollView>
            <View className={styles.modalFooter}>
              <View className={styles.modalCancel} onClick={() => setEditing(false)}>
                <Text className={styles.modalCancelText}>取消</Text>
              </View>
              <View className={styles.modalConfirm} onClick={handleSave}>
                <Text className={styles.modalConfirmText}>保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default MinePage;
