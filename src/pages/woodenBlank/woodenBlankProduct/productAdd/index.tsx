import React, { useState, useEffect } from 'react';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import ProductForm from '../productForm/index';
import { db, getPrefixByCompany } from '../../../../utils';

function ProductPage() {
  const [product, setProduct] = useState({
    name: '',
    type: '',
    quantity: '',
  });

  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));

  useEffect(() => {
    if (Taro.getCurrentInstance().router?.params?.id) {
      // 如果是编辑模式，则根据商品 ID 获取商品信息
      const productId = Taro.getCurrentInstance().router?.params?.id;
      getProduct(productId);
    }
  }, []);

  const getProduct = async (productId) => {
    try {
      const res = await db.collection(data_prefix+ 'woodenBlank').doc(productId).get();
      if (res.data) {
        setProduct(res.data);
      }
    } catch (error) {
      console.error('获取商品信息失败:', error);
    }
  };

  const handleFormSubmit = async (formData) => {
    const selectedValue = Taro.getCurrentInstance().router?.params.selectedValue;
    const selectedType = Taro.getCurrentInstance().router?.params.selectedType;
    try {
      if (Taro.getCurrentInstance().router?.params?.id) {
        // 如果是编辑模式，则更新商品信息
        const { _openid, _id, ...updatedData } = formData;
        console.log('更新商品开始:', updatedData);
        const productId = Taro.getCurrentInstance().router?.params?.id;
        await db.collection(data_prefix+ 'woodenBlank').doc(productId).update({
          data: updatedData,
        });
        console.log('更新商品成功:', formData);
        Taro.eventCenter.trigger('refreshPageProductList', selectedValue, selectedType);
      } else {
        // 否则，新增商品信息
        await db.collection(data_prefix+ 'woodenBlank').add({
          data: formData,
        });
        console.log('新增商品成功:', formData);
        Taro.eventCenter.trigger('refreshPageProductList', selectedValue, selectedType);
      }
      // 返回上一页
      Taro.navigateBack();
    } catch (error) {
      console.error('操作失败:', error);
      Taro.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 1500,
      });
    }
  };

  return (
    <View className='product-page'>
      <ProductForm onSubmit={handleFormSubmit} initialValues={product} />
    </View>
  );
}

export default ProductPage;
