import Taro, { useReachBottom } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useEffect, useState, useMemo } from 'react'
import { AtButton } from 'taro-ui'
import './index.scss'

const API_BASE = 'http://101.42.250.129:12345/api/inventory'

export default function StockWxQuery() {
  /* ================== 状态 ================== */
  const [specList, setSpecList] = useState<any[]>([])
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
    const res = await Taro.request({
      url: `${API_BASE}/wx/spec/list`,
      method: 'GET'
    })

    if (res.data?.success) {
      setSpecList(res.data.data || [])
    }
  }

  /* ================== 规格点击 ================== */
  const onSpecClick = (
    code: string,
    value: string,
    mode: 'single' | 'multiple'
  ) => {
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

      return {
        ...prev,
        [code]: next
      }
    })
  }

  /* ================== 查询 ================== */
  const doSearch = async (reset = false) => {
    if (loading) return
    if (!hasMore && !reset) return

    setLoading(true)
    const currentPage = reset ? 1 : page

    const res = await Taro.request({
      url: `${API_BASE}/inventory/wx_query`,
      method: 'POST',
      data: {
        spec: specValueMap,
        page: currentPage,
        page_size: 20
      }
    })

    if (res.data?.success) {
      const data = res.data.data
      setList(reset ? data.list : [...list, ...data.list])
      setHasMore(data.has_more)
      setPage(currentPage + 1)
    }

    setLoading(false)
  }

  /* ================== 重置 ================== */
  const resetSpec = () => {
    setSpecValueMap({})
    setList([])
    setPage(1)
    setHasMore(true)
  }

  /* ================== 触底加载 ================== */
  useReachBottom(() => {
    doSearch()
  })

  return (
    <View className='wx-stock-page'>
      {/* ========== 规格筛选 ========== */}
      <View className='spec-panel'>
        {specList.map(cat => (
          <View key={cat.code} className='spec-group'>
            <View className='spec-values'>
              {cat.options.map(opt => {
                const active =
                  specValueMap[cat.code]?.includes(opt.value)

                return (
                  <View
                    key={opt.id}
                    className={`
                      spec-tag
                      ${cat.select_mode === 'single' ? 'single' : 'multi'}
                      ${active ? 'active' : ''}
                    `}
                    onClick={() =>
                      onSpecClick(cat.code, opt.value, cat.select_mode)
                    }
                  >
                    <Text>{opt.value}</Text>
                    {cat.select_mode === 'multiple' && active && (
                      <Text className='check'>✓</Text>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        ))}
      </View>

      {/* ========== 操作按钮 ========== */}
      <View className='action-bar'>
        <AtButton size='small' onClick={resetSpec}>
          重置
        </AtButton>
        <AtButton
          type='primary'
          size='small'
          onClick={() => doSearch(true)}
          loading={loading}
        >
          查询库存
        </AtButton>
      </View>

      {/* ========== 库存列表（产品维度） ========== */}
      <View className='inventory-list'>
        {list.map(product => {
          const totalQty = product.companies.reduce(
            (sum, c) => sum + (c.quantity || 0),
            0
          )

          return (
            <View
              key={product.product_id}
              className='inventory-item'
            >
              {/* 产品名 + 合计 */}
              <View className='product-name'>
                <Text>{product.product_name}</Text>
                <Text className='total'>
                  合计：{totalQty}
                </Text>
              </View>

              {/* 公司库存行 */}
              {product.companies.map((c, idx) => (
                <View key={idx} className='company-line'>
                  <Text>{c.company_name}</Text>
                  <Text>{c.display_name}</Text>
                  <Text className='qty'>
                    {c.quantity}
                  </Text>
                </View>
              ))}
            </View>
          )
        })}

        {loading && <View className='loading'>加载中…</View>}
        {!hasMore && list.length > 0 && (
          <View className='no-more'>— 已到底 —</View>
        )}
      </View>
    </View>
  )
}
