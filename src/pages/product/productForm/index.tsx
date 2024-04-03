import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';

function ProductForm({ onSubmit, initialValues }) {
  const [product, setProduct] = useState({
    name: '',
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
        <Text>产品名称：</Text>
        <Input
          type='text'
          value={product.name}
          placeholder='请输入产品名称'
          onInput={(e) => handleProductNameChange(e.target.value)}
        />
      </View>
      <View className='form-item'>
        <Text>数量：</Text>
        <Input
          type='number'
          value={product.quantity}
          placeholder='请输入数量'
          onInput={(e) => handleQuantityChange(e.target.value)}
        />
      </View>
      <View className='form-item'>
        <Text>备注：</Text>
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
