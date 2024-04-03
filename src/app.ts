import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import 'taro-ui/dist/style/index.scss'
import Taro from '@tarojs/taro'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  // Taro.cloud.init({
  //   env: 'lurun-3g2n26afd5946d56' // 替换为你的云开发环境 ID
  // })
  // wx.cloud.init({
  //   env: 'lurun-3g2n26afd5946d56',
  //   traceUser: true,
  // })

  useLaunch(() => {
    wx.cloud.init({
      env: 'lurun-3g2n26afd5946d56',
      traceUser: true,
    })
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  return children
}

export default App
