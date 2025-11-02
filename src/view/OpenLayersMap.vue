<template>
  <div>
    <el-page-header @back="goBack" content="OpenLayers地图测试 - 美国硅谷"/>
    <div class="bank"></div>
    <el-card header="硅谷地图">
      <div id="map" class="map-container"></div>
      <div class="bank"></div>
      <el-card v-if="clickedCoordinates" header="当前位置信息">
        <p><strong>经纬度：</strong>{{ clickedCoordinates }}</p>
        <p v-if="address"><strong>地址：</strong>{{ address }}</p>
        <p v-if="errorMessage" style="color: red;"><strong>错误：</strong>{{ errorMessage }}</p>
        <p v-if="!address && !errorMessage && clickedCoordinates">查询中...</p>
      </el-card>
      <el-card v-else>
        <p>点击地图上的任意位置，可查看该位置的地址信息（经纬度转地址）</p>
        <p style="color: #909399; font-size: 12px; margin-top: 10px;">
          <strong>提示：</strong>Nominatim 是免费服务，不需要 API key，但有使用频率限制（每秒1次请求）
        </p>
      </el-card>
    </el-card>
  </div>
</template>

<script>
import 'ol/ol.css'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Feature } from 'ol'
import { Point } from 'ol/geom'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { Style, Circle, Fill, Stroke } from 'ol/style'

export default {
  name: 'OpenLayersMap',
  data() {
    return {
      map: null,
      address: '',
      clickedCoordinates: '',
      clickMarker: null,
      errorMessage: ''
    }
  },
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      // 美国硅谷的经纬度（以圣何塞San Jose为中心）
      const siliconValleyLon = -121.8863
      const siliconValleyLat = 37.3382
      
      // 将经纬度转换为OpenLayers使用的投影坐标
      const siliconValleyCoordinates = fromLonLat([siliconValleyLon, siliconValleyLat])
      
      // 创建标记点
      const marker = new Feature({
        geometry: new Point(siliconValleyCoordinates),
        name: 'Silicon Valley'
      })
      
      // 创建标记样式 - 使用圆形标记
      marker.setStyle(new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({
            color: '#FF0000'
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2
          })
        })
      }))
      
      // 创建矢量图层
      const vectorSource = new VectorSource({
        features: [marker]
      })
      
      const vectorLayer = new VectorLayer({
        source: vectorSource
      })
      
      // 创建地图
      this.map = new Map({
        target: 'map',
        layers: [
          new TileLayer({
            source: new OSM()
          }),
          vectorLayer
        ],
        view: new View({
          center: siliconValleyCoordinates,
          zoom: 16  // 街道级别，可以清楚看到街道和建筑物
        })
      })
      
      // 添加地图点击事件，实现经纬度转地址（反向地理编码）
      // 添加防抖，避免请求频率过高（Nominatim 限制每秒1次请求）
      let lastRequestTime = 0
      const requestDelay = 1000 // 1秒延迟
      
      this.map.on('click', (event) => {
        // 将投影坐标转换为经纬度（WGS84）
        const lonLat = toLonLat(event.coordinate)
        const lon = lonLat[0]
        const lat = lonLat[1]
        
        // 显示点击的经纬度
        this.clickedCoordinates = `经度: ${lon.toFixed(6)}, 纬度: ${lat.toFixed(6)}`
        
        // 在点击位置添加标记（使用投影坐标）
        this.addMarkerAtClick(event.coordinate)
        
        // 防抖：避免请求过于频繁
        const now = Date.now()
        if (now - lastRequestTime >= requestDelay) {
          lastRequestTime = now
          // 调用 Nominatim API 进行反向地理编码（经纬度转地址）
          this.reverseGeocode(lon, lat)
        } else {
          // 如果请求太频繁，显示提示
          this.errorMessage = `请求过于频繁，请等待 ${Math.ceil((requestDelay - (now - lastRequestTime)) / 1000)} 秒后再试`
          this.address = ''
          // 延迟后自动重试
          setTimeout(() => {
            this.reverseGeocode(lon, lat)
            lastRequestTime = Date.now()
          }, requestDelay - (now - lastRequestTime))
        }
      })
    },
    // 反向地理编码：经纬度转地址（使用 OpenStreetMap 的 Nominatim API）
    // 注意：Nominatim 是免费的，不需要 API key，但有使用限制（每秒1次请求）
    async reverseGeocode(lon, lat) {
      this.address = ''
      this.errorMessage = ''
      
      try {
        // 使用 Nominatim API（OpenStreetMap 的免费地理编码服务）
        // 注意：需要设置 User-Agent，否则可能被拒绝
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
        
        console.log('请求 Nominatim API:', url)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'WebTTS-Vue-App/1.0 (Contact: your-email@example.com)' // Nominatim 要求设置 User-Agent
          },
          // 添加 referer 可能有助于某些服务器接受请求
          referrerPolicy: 'no-referrer'
        })
        
        console.log('响应状态:', response.status, response.statusText)
        
        if (!response.ok) {
          throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('Nominatim 响应数据:', data)
        
        if (data && data.display_name) {
          this.address = data.display_name
          this.errorMessage = ''
        } else if (data && data.error) {
          this.errorMessage = `API 错误: ${data.error}`
          this.address = ''
        } else {
          this.errorMessage = '未找到地址信息（该位置可能没有详细的地址数据）'
          this.address = ''
        }
      } catch (error) {
        console.error('反向地理编码失败:', error)
        this.errorMessage = `请求失败: ${error.message}。可能的原因：1) 网络问题 2) CORS 限制 3) 请求频率过高（需等待1秒）`
        this.address = ''
        
        // 如果是 CORS 错误，提供额外提示
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          this.errorMessage += ' | 提示：如果是 CORS 错误，可能需要使用代理服务器'
        }
      }
    },
    // 在点击位置添加临时标记（coordinates 已经是投影坐标）
    addMarkerAtClick(coordinates) {
      // 清除之前的临时标记
      if (this.clickMarker) {
        const vectorSource = this.clickMarker.getSource()
        vectorSource.clear()
      }
      
      // 创建新的标记（coordinates 已经是投影坐标，直接使用）
      const marker = new Feature({
        geometry: new Point(coordinates),
        name: '点击位置'
      })
      
      marker.setStyle(new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({
            color: '#00FF00'  // 绿色标记表示点击位置
          }),
          stroke: new Stroke({
            color: '#000000',
            width: 2
          })
        })
      }))
      
      const vectorSource = new VectorSource({
        features: [marker]
      })
      
      const vectorLayer = new VectorLayer({
        source: vectorSource
      })
      
      this.map.addLayer(vectorLayer)
      this.clickMarker = vectorLayer
    },
    goBack() {
      this.$router.push({ path: "/entry" })
    }
  },
  beforeDestroy() {
    if (this.map) {
      this.map.setTarget(null)
    }
  }
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 600px;
}

.bank {
  margin: 10px 0;
}
</style>
