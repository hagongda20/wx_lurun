import Taro from '@tarojs/taro'
import { View, RadioGroup, Radio, Input } from '@tarojs/components'
import './index.scss'
import { useEffect, useState } from 'react'
import {db} from '../../utils'
import {AtButton } from 'taro-ui'


export default function Index() {
  const [company, setCompany] = useState('鲁润') // 默认选中鲁润
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleCompanyChange = (e) => {
    setCompany(e.detail.value)
  }

  const handleUsernameChange = (e) => {
    setUsername(e.detail.value)
  }

  const handlePasswordChange = (e) => {
    setPassword(e.detail.value)
  }

  const handleSubmit = async () => {
    try {
      console.log('company:',company,"username:",username,"password:",password)
      
      const res = await db.collection('users').where({
        username,
        password
        /** 
        company: db.RegExp({
          regexp: company,
          options: 'i'  // 使用 'i' 选项进行不区分大小写匹配
        })*/
      }).get()
      console.log('Login result:', res)
      if (res.data.length > 0) {
        // 登录成功
        Taro.setStorageSync('username', username);
        Taro.setStorageSync('password', password);
        Taro.setStorageSync('company', company);
        if(res.data[0].company.includes(company)){ //公司隶属标志，有隶属关系则开放相关权限
          Taro.setStorageSync('belongToCompany', true);
        }else{
          Taro.setStorageSync('belongToCompany', false);
        }

        Taro.setStorageSync('role',res.data[0].role);
        Taro.setStorageSync('loginTime', new Date().getTime()); // 记录登录时间
        console.log('登录成功')
        Taro.navigateTo({
          url: '/pages/funcNav/index'
        })
      } else {
        // 登录失败
        console.log('用户名或密码错误')
        Taro.showToast({
          title: '用户名或密码错误',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      Taro.showToast({
        title: '登录失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    }
  }

  // 在小程序初始化时检查是否有缓存的登录信息
  useEffect(() => {
    const cachedUsername = Taro.getStorageSync('username');
    const cachedPassword = Taro.getStorageSync('password');
    const cachedCompany = Taro.getStorageSync('company');
    const loginTime = Taro.getStorageSync('loginTime');
    
    // 如果有缓存的用户名和密码，并且登录时间在一周之内（604800000 毫秒为一周）
    if (cachedUsername && cachedPassword && (new Date().getTime() - loginTime) < 604800000) {
      setUsername(cachedUsername);
      setPassword(cachedPassword);
      setCompany(cachedCompany);
    }
  }, []);

  return (
    <View className='login'>
      <View className='company'>
        <RadioGroup className='radio-group' onChange={handleCompanyChange} value={company}>
          <Radio className='radio' value='鲁润' checked={company=='鲁润'}>鲁润</Radio>
          <Radio className='radio' value='永和' checked={company=='永和'}>永和</Radio>
          <Radio className='radio' value='国基' checked={company=='国基'}>国基</Radio>
          <Radio className='radio' value='测试' checked={company=='测试'}>测试</Radio>
        </RadioGroup>
      </View>
      <View className='form'>
          <View className='input-item'>
            <Input className='input'
              type='text'
              placeholder='请输入用户名'
              value={username}
              onInput={handleUsernameChange}
            />
          </View>
          <View className='input-item'>
            <Input className='input'
              type='text'
              placeholder='请输入密码'
              value={password}
              onInput={handlePasswordChange}
            />
          </View>
          <AtButton className='submit-btn' onClick={handleSubmit}>登录</AtButton>
        </View>
    </View>
  )
}
