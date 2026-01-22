import Taro, { useReachBottom } from '@tarojs/taro'
import { View, Text, Switch } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { AtButton } from 'taro-ui'
import './index.scss'

export default function StockWxQuery() {
  /* ================== 状态 ================== */
  const [specList, setSpecList] = useState<any[]>([])
  const [specEnabledMap, setSpecEnabledMap] = useState<Record<string, boolean>>({})
  const [specValueMap, setSpecValueMap] = useState<Record<string, string[]>>({})

  const [list, setList] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  /* ================== 初始化规格 ================== */
  useEffect(() => {
    fetchSpec()
  }, [])

  const fetchSpec = async () => {
    const res = await Taro.cloud.callFunction({
      name: 'inventory',
      data: { action: 'spec_list' }
    })

    if (res.result?.success) {
      const data = res.result.data || []
      setSpecList(data)

      const enabledInit: Record<string, boolean> = {}
      const valueInit: Record<string, string[]> = {}

      data.forEach(cat => {
        enabledInit[cat.code] = true
        valueInit[cat.code] = []
      })

      setSpecEnabledMap(enabledInit)
      setSpecValueMap(valueInit)
    }
  }

  /* ================== 规格开关（⭐已修正） ================== */
  const toggleSpec = (code: string, value: boolean) => {
    setSpecEnabledMap(prev => ({
      ...prev,
      [code]: value
    }))

    // ⭐ 关闭时：立即清空该规格所有选中值
    if (!value) {
      setSpecValueMap(prev => ({
        ...prev,
        [code]: []
      }))
    }
  }

  /* ================== 规格值点击 ================== */
  const onSpecClick = (
    code: string,
    value: string,
    mode: 'single' | 'multiple'
  ) => {
    if (!specEnabledMap[code]) return

    setSpecValueMap(prev => {
      const old = prev[code] || []
      let next: string[] = []

      if (mode === 'single') {
        next = old[0] === value ? [] : [value]
      } else {
        next = old.includes(value)
          ? old.filter(v => v !== value)
          : [...old, value]
      }

      return { ...prev, [code]: next }
    })
  }

  /* ================== 构造查询参数 ================== */
  const buildSpecPayload = () => {
    const payload: any = {}

    Object.keys(specEnabledMap).forEach(code => {
      payload[code] = {
        enabled: specEnabledMap[code],
        values: specValueMap[code] || []
      }
    })

    return payload
  }

  /* ================== 查询库存 ================== */
  const doSearch = async (reset = false) => {
    if (loading) return
    if (!hasMore && !reset) return

    setLoading(true)
    const currentPage = reset ? 1 : page

    try {
      const res = await Taro.cloud.callFunction({
        name: 'inventory',
        data: {
          action: 'wx_query',
          page: currentPage,
          page_size: 20,
          spec: buildSpecPayload()
        }
      })

      if (res.result?.success) {
        const data = res.result.data
        setList(reset ? data.list : [...list, ...data.list])
        setHasMore(data.has_more)
        setPage(currentPage + 1)
      }
    } catch (err) {
      console.error('查询库存失败', err)
    }

    setLoading(false)
  }

  /* ================== 重置 ================== */
  const resetAll = () => {
    const enabledReset: Record<string, boolean> = {}
    const valueReset: Record<string, string[]> = {}

    specList.forEach(cat => {
      enabledReset[cat.code] = true
      valueReset[cat.code] = []
    })

    setSpecEnabledMap(enabledReset)
    setSpecValueMap(valueReset)
    setList([])
    setPage(1)
    setHasMore(true)
  }

  /* ================== 触底加载 ================== */
  useReachBottom(() => {
    doSearch()
  })

  /* ================== 渲染（UI 未改） ================== */
  return (
    <View className="wx-stock-page">
      <View className="spec-panel">
        {specList.map(cat => {
          const enabled = specEnabledMap[cat.code]
          return (
            <View key={cat.code} className="spec-row">
              <Switch
                className="spec-switch"
                checked={enabled}
                onChange={e => toggleSpec(cat.code, e.detail.value)}
                color="#6190E8"
              />

              <View className={`spec-values ${!enabled ? 'disabled' : ''}`}>
                {cat.options.map(opt => {
                  const active =
                    specValueMap[cat.code]?.includes(opt.value)

                  return (
                    <View
                      key={opt.id}
                      className={`spec-tag ${active ? 'active' : ''} ${cat.select_mode}`}
                      onClick={() =>
                        onSpecClick(cat.code, opt.value, cat.select_mode)
                      }
                    >
                      <Text>{opt.value}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}
      </View>

      <View className="action-bar">
        <AtButton size="small" onClick={resetAll}>
          重置
        </AtButton>
        <AtButton type="primary" size="small" onClick={() => doSearch(true)}>
          查询库存
        </AtButton>
      </View>

      <View className="inventory-list">
        {list.map(product => (
          <View key={product.product_id} className="inventory-item">
            <View className="product-name">
              <Text>{product.product_name}</Text>
              <Text className="total">总量: {product.total_quantity}</Text>
            </View>
            {product.companies.map(comp => (
              <View key={comp.inventory_id} className="company-line">
                <Text>{comp.company_name}</Text>
                <Text>{comp.display_name}</Text>
                <Text className="qty">{comp.quantity}</Text>
              </View>
            ))}
          </View>
        ))}

        {!loading && !hasMore && list.length === 0 && (
          <View className="no-more">暂无库存数据</View>
        )}
        {loading && <View className="loading">加载中...</View>}
        {!loading && !hasMore && list.length > 0 && (
          <View className="no-more">没有更多了</View>
        )}
      </View>
    </View>
  )
}
