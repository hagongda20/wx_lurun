import { View, Button, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRef, useState } from 'react'

export default function VoiceQuery() {
  const recorder = useRef(Taro.getRecorderManager())
  const [recording, setRecording] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [result, setResult] = useState<any>([])

  // 录音结束处理
  const handleStop = async (res: any) => {
    setRecording(false)
    const tempFilePath = res.tempFilePath
    if (!tempFilePath) return

    try {
      // 1️⃣ 上传到云开发存储
      const uploadRes = await Taro.cloud.uploadFile({
        cloudPath: `voice/${Date.now()}.mp3`,
        filePath: tempFilePath,
      })

      // 2️⃣ 获取公网 URL
      const tempUrlRes = await Taro.cloud.getTempFileURL({
        fileList: [uploadRes.fileID],
      })
      const fileUrl = tempUrlRes.fileList[0].tempFileURL

      // 3️⃣ 调用云函数识别语音
      const asrRes = await Taro.cloud.callFunction({
        name: 'speechToText',
        data: { audioUrl: fileUrl },
      })

      if (!asrRes.result?.success) {
        Taro.showToast({ title: asrRes.result?.message || '识别失败', icon: 'none' })
        return
      }

      const text = asrRes.result.text
      setVoiceText(text || '')

      if (!text) {
        Taro.showToast({ title: '未识别到内容', icon: 'none' })
        return
      }

      // 4️⃣ 调用通用云函数请求 Flask 接口
      const resp = await Taro.cloud.callFunction({
        name: 'callFlaskApi',
        data: {
          url: 'http://101.42.250.129:12345/api/inventory/voice/query',
          method: 'POST',
          data: { text },
          headers: { 'Content-Type': 'application/json' },
        },
      })

      if (resp.result?.success) {
        setResult(resp.result.data.data || [])
      } else {
        Taro.showToast({ title: resp.result?.message || '查询失败', icon: 'none' })
      }
    } catch (err) {
      console.error(err)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const startRecord = () => {
    setRecording(true)
    recorder.current.start({ duration: 60000, format: 'mp3' })
    recorder.current.onStop(handleStop)
  }

  const stopRecord = () => {
    recorder.current.stop()
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* 识别文本 */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>识别文本：</Text>
        <View style={{ marginTop: 6, padding: 12, backgroundColor: '#fff', borderRadius: 8, minHeight: 40 }}>
          <Text>{voiceText || '暂无'}</Text>
        </View>
      </View>

      {/* 查询结果列表 */}
      <View style={{ flex: 1, marginBottom: 80 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>查询结果：</Text>
        <ScrollView scrollY style={{ maxHeight: '60vh' }}>
          {result.length > 0 ? (
            result.map((item: any) => (
              <View
                key={item.inventory_id}
                style={{
                  backgroundColor: '#fff',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                <Text style={{ fontSize: 16, color: '#333' }}>{item.display_name}</Text>
                <Text style={{ fontSize: 16, color: '#108ee9' }}>{item.quantity}</Text>
              </View>
            ))
          ) : (
            <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8 }}>
              <Text>暂无数据</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 语音按钮 */}
      <View style={{ position: 'fixed', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Button
          type="primary"
          style={{ width: 180, height: 50, borderRadius: 25, fontSize: 16 }}
          onTouchStart={startRecord}
          onTouchEnd={stopRecord}
        >
          {recording ? '松开发送' : '按住说话'}
        </Button>
      </View>
    </View>
  )
}
