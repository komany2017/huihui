import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const CartPage: React.FC = () => {
  const { cart, updateCartQuantity, removeFromCart, clearCart, createProductOrder } = useStore();
  const [receiver, setReceiver] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    if (!receiver || !phone || !address) {
      Taro.showToast({ title: '请填写完整收货信息', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    const id = createProductOrder({
      items: [...cart],
      totalAmount: total,
      status: 'paid',
      address,
      receiver,
      phone,
      remark: ''
    });
    Taro.showToast({ title: '下单成功', icon: 'success' });
    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/shop/order/index' });
    }, 1000);
  };

  return (
    <View className={styles.container}>
      <ScrollView scrollY className={styles.scroll}>
        {cart.length > 0 ? (
          <>
            {/* 收货信息 */}
            <View className={styles.addressCard}>
              <Text className={styles.cardTitle}>收货信息</Text>
              <View className={styles.inputRow}>
                <Text className={styles.label}>收件人</Text>
                <Input
                  className={styles.input}
                  placeholder="请输入姓名"
                  value={receiver}
                  onInput={(e) => setReceiver(e.detail.value)}
                />
              </View>
              <View className={styles.inputRow}>
                <Text className={styles.label}>手机号</Text>
                <Input
                  className={styles.input}
                  type="number"
                  placeholder="请输入手机号"
                  value={phone}
                  onInput={(e) => setPhone(e.detail.value)}
                />
              </View>
              <View className={styles.inputRow}>
                <Text className={styles.label}>地址</Text>
                <Input
                  className={styles.input}
                  placeholder="请输入收货地址"
                  value={address}
                  onInput={(e) => setAddress(e.detail.value)}
                />
              </View>
            </View>

            {/* 商品列表 */}
            <View className={styles.listCard}>
              <Text className={styles.cardTitle}>商品清单</Text>
              {cart.map((item) => (
                <View key={item.specId} className={styles.cartItem}>
                  <Image className={styles.itemImage} src={item.productCover} mode="aspectFill" />
                  <View className={styles.itemInfo}>
                    <Text className={styles.itemName}>{item.productName}</Text>
                    <Text className={styles.itemSpec}>{item.specName}</Text>
                    <View className={styles.itemBottom}>
                      <Text className={styles.itemPrice}>¥{item.price}</Text>
                      <View className={styles.quantityCtrl}>
                        <View
                          className={styles.qtyBtn}
                          onClick={() => updateCartQuantity(item.specId, -1)}
                        >
                          <Text className={styles.qtyBtnText}>-</Text>
                        </View>
                        <Text className={styles.qtyText}>{item.quantity}</Text>
                        <View
                          className={styles.qtyBtn}
                          onClick={() => updateCartQuantity(item.specId, 1)}
                        >
                          <Text className={styles.qtyBtnText}>+</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className={styles.removeBtn} onClick={() => removeFromCart(item.specId)}>
                    <Text className={styles.removeText}>删除</Text>
                  </View>
                </View>
              ))}
              <View className={styles.clearBtn} onClick={clearCart}>
                <Text className={styles.clearText}>清空购物车</Text>
              </View>
            </View>
          </>
        ) : (
          <Empty text="购物车空空如也" icon="🛒" />
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View className={styles.bottomBar}>
          <View className={styles.totalWrap}>
            <Text className={styles.totalLabel}>合计：</Text>
            <Text className={styles.totalSymbol}>¥</Text>
            <Text className={styles.totalValue}>{total}</Text>
          </View>
          <View className={styles.checkoutBtn} onClick={handleCheckout}>
            <Text className={styles.checkoutText}>立即下单</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default CartPage;
