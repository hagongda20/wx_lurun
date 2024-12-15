import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import './index.scss';

function ProductForm({ onSubmit, initialValues }) {
  const [product, setProduct] = useState({
    name: '',
    type: '',
    quantity: '',
    extra: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialValues) {
      setProduct(initialValues);
    }
  }, [initialValues]);

  const handleSubmit = () => {
    // 确保字段为有效字符串，并且进行空白字符去除
    if (!(product.name && product.name.trim())) {
      setError('产品名称不能为空');
      return;
    }
    if (!(product.type && product.type.trim())) {
      setError('产品类别不能为空');
      return;
    }
    if (!product.quantity ) {
      setError('数量不能为空');
      return;
    }

    // 清空错误信息并提交
    setError('');
    onSubmit(product);
  };

  const handleProductNameChange = (value) => {
    setProduct({ ...product, name: value });
  };

  const handleProductTypeChange = (value) => {
    setProduct({ ...product, type: value });
  };

  const handleQuantityChange = (value) => {
    setProduct({ ...product, quantity: value });
  };

  const handleRemarkChange = (value) => {
    setProduct({ ...product, extra: value });
  };

  return (
    <View className='product-form'>
      {error && <Text className='error-message'>{error}</Text>}  {/* 显示错误信息 */}

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
          value={product.type}
          placeholder='请输入产品类别'
          onInput={(e) => handleProductTypeChange(e.target.value)}
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
