import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import './index.scss';

function ProductForm({ onSubmit, initialValues }) {
  const [product, setProduct] = useState({
    name: '',
    type: '坯板', // 将type设置为固定值
    quantity: '',
    extra: '',
  });

  useEffect(() => {
    if (initialValues) {
      setProduct(initialValues);
    }
  }, [initialValues]);

  const handleSubmit = () => {
    onSubmit(product);
  };

  const handleProductNameChange = (value) => {
    setProduct({ ...product, name: value });
  };

  const handleQuantityChange = (value) => {
    setProduct({ ...product, quantity: value });
  };

  const handleRemarkChange = (value) => {
    setProduct({ ...product, extra: value });
  };

  return (
    <View className='product-form'>
      <View className='form-item'>
        <Input
          type='text'
          value={product.name}
          placeholder='请输入产品名称'
          onInput={(e) => handleProductNameChange(e.target.value)}
        />
      </View>
      <View className='form-item'>
        <Input
          type='text'
          value='坯板'
          placeholder='请输入产品类别'
          disabled // 禁用输入框，使其无法编辑
        />
      </View>
      <View className='form-item'>
        <Input
          type='number'
          value={product.quantity}
          placeholder='请输入数量'
          onInput={(e) => handleQuantityChange(e.target.value)}
        />
      </View>
      <View className='form-item'>
        <Input
          type='text'
          value={product.extra}
          placeholder='请输入备注'
          onInput={(e) => handleRemarkChange(e.target.value)}
        />
      </View>
      <View className='btn-group'>
        <Button className='btn-submit' onClick={handleSubmit}>
          提交
        </Button>
      </View>
    </View>
  );
}

export default ProductForm;
