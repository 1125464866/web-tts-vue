<template>
  <div class="logicflow-page">
    <div class="header-bar">
      <el-page-header @back="goBack" content="审批流程 Demo"/>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="exportJson">导出 JSON</el-button>
        <el-button type="success" size="small" @click="copyJson">复制 JSON</el-button>
      </div>
    </div>
    <div class="bank"></div>
    <div class="main-container">
      <!-- 左侧节点面板 -->
      <div class="node-panel">
        <div class="panel-title">节点面板</div>
        <div class="panel-tip">拖拽节点到右侧画布</div>
        <div class="node-list">
          <div
            class="node-item"
            v-for="node in nodeItems"
            :key="node.type"
            @mousedown="onMouseDown($event, node)"
          >
            <div class="node-preview">{{ node.icon }}</div>
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>
        <div class="panel-title" style="margin-top: 10px;">流程控制</div>
        <div class="flow-control">
          <div class="current-step">
            <span>当前节点：</span>
            <span class="step-name">{{ currentStepName }}</span>
          </div>
          <el-button
            v-if="canSubmit"
            type="success"
            size="small"
            @click="handleCurrentNode"
          >
            {{ currentNodeHasData ? '提交并下一步' : '填写数据' }}
          </el-button>
          <el-button
            v-if="canReject"
            type="danger"
            size="small"
            @click="handleReject"
          >
            驳回
          </el-button>
        </div>
        <div class="panel-title" style="margin-top: 10px;">操作提示</div>
        <div class="tips">
          <p>• 拖拽节点到画布</p>
          <p>• 从锚点拖出连线</p>
          <p>• 拖动连线端点换连接</p>
          <p>• 点击节点填写数据</p>
          <p>• Delete 删除选中项</p>
        </div>
      </div>

      <!-- 中间画布 -->
      <div class="canvas-wrapper">
        <div id="container" class="lf-container"></div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="property-panel">
        <div class="panel-title">属性面板</div>
        <div v-if="selectedNode" class="property-content">
          <div class="property-group">
            <div class="property-label">节点名称</div>
            <el-input v-model="selectedNode.text" size="small" @change="updateNodeText"/>
          </div>
          <div class="property-group">
            <div class="property-label">节点类型</div>
            <el-select v-model="selectedNode.nodeType" size="small" style="width: 100%;" @change="updateNodeType">
              <el-option label="开始节点" value="start"/>
              <el-option label="审批节点" value="approval"/>
              <el-option label="结束节点" value="end"/>
            </el-select>
          </div>
          <div class="property-group">
            <div class="property-label">绑定页面</div>
            <el-select v-model="selectedNode.bindPage" size="small" style="width: 100%;" @change="updateNodeProperties">
              <el-option v-for="page in pageOptions" :key="page.value" :label="page.label" :value="page.value"/>
            </el-select>
          </div>
          <div class="property-group">
            <div class="property-label">所属者</div>
            <el-select v-model="selectedNode.owner" size="small" style="width: 100%;" @change="updateNodeProperties">
              <el-option v-for="owner in ownerOptions" :key="owner.value" :label="owner.label" :value="owner.value"/>
            </el-select>
          </div>

          <el-divider>节点数据</el-divider>

          <!-- 根据数据状态显示不同按钮 -->
          <div class="node-data-section">
            <div v-if="!hasNodeData" class="no-data">
              <p>暂无数据</p>
              <el-button type="primary" size="small" @click="openDataDialog">新增数据</el-button>
            </div>
            <div v-else class="has-data">
              <div class="data-preview">
                <p><strong>备注：</strong>{{ selectedNode.nodeData.remark || '-' }}</p>
                <p><strong>金额：</strong>{{ selectedNode.nodeData.amount || '-' }}</p>
              </div>
              <el-button type="text" @click="openDataDialog">查看详情</el-button>
            </div>
          </div>
        </div>
        <div v-else class="empty-tip">
          <p>点击节点查看属性</p>
        </div>
      </div>
    </div>

    <!-- 数据弹窗 -->
    <el-dialog :title="dataDialogTitle" :visible.sync="dataDialogVisible" width="500px">
      <el-form :model="formData" label-width="80px">
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注"/>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="formData.amount" :min="0" :precision="2" style="width: 100%;"/>
        </el-form-item>
        <el-form-item label="附件">
          <el-input v-model="formData.attachment" placeholder="附件链接"/>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dataDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNodeData">保存</el-button>
      </span>
    </el-dialog>

    <!-- JSON 弹窗 -->
    <el-dialog title="流程图 JSON 数据" :visible.sync="jsonDialogVisible" width="600px">
      <el-input type="textarea" :rows="15" v-model="jsonStr" readonly/>
      <span slot="footer">
        <el-button @click="jsonDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyJson">复制到剪贴板</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import LogicFlow from '@logicflow/core'
import { Menu, SelectionSelect } from '@logicflow/extension'
import '@logicflow/core/dist/index.css'
import '@logicflow/extension/lib/style/index.css'

export default {
  name: 'LogicFlowDemo',
  data() {
    return {
      lf: null,
      selectedNode: null,
      currentStepNodeId: null,
      nodeFlowData: {}, // 存储每个节点的流程数据
      jsonDialogVisible: false,
      dataDialogVisible: false,
      jsonStr: '',
      formData: {
        remark: '',
        amount: 0,
        attachment: ''
      },
      nodeItems: [
        { type: 'rect', label: '矩形', icon: '口' },
        { type: 'circle', label: '圆形', icon: '○' },
        { type: 'diamond', label: '菱形', icon: '◇' },
      ],
      pageOptions: [
        { label: '首页', value: '/home' },
        { label: '用户管理', value: '/user-manage' },
        { label: '订单列表', value: '/order-list' },
        { label: '审批中心', value: '/approval' },
      ],
      ownerOptions: [
        { label: '张三', value: 'zhangsan' },
        { label: '李四', value: 'lisi' },
        { label: '王五', value: 'wangwu' },
      ]
    }
  },
  computed: {
    currentStepName() {
      if (!this.currentStepNodeId) return '未开始'
      const node = this.getNodeById(this.currentStepNodeId)
      return node ? (node.text?.value || node.text || node.id) : '未开始'
    },
    currentNodeHasData() {
      if (!this.selectedNode) return false
      const data = this.nodeFlowData[this.selectedNode.id]
      return data && (data.remark || data.amount)
    },
    hasNodeData() {
      if (!this.selectedNode) return false
      const data = this.nodeFlowData[this.selectedNode.id]
      return data && (data.remark || data.amount)
    },
    dataDialogTitle() {
      return this.hasNodeData ? '查看详情' : '新增数据'
    },
    canSubmit() {
      // 当前选中的节点是当前步骤节点时才能提交
      return this.selectedNode && this.selectedNode.id === this.currentStepNodeId
    },
    canReject() {
      // 不是第一个节点时可以驳回
      if (!this.currentStepNodeId) return false
      const prevNodeId = this.getPrevNodeId(this.currentStepNodeId)
      return prevNodeId !== null
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initLogicFlow()
    })
  },
  methods: {
    initLogicFlow() {
      this.lf = new LogicFlow({
        container: document.querySelector('#container'),
        grid: { size: 20, visible: true, type: 'dot', config: { color: '#e8e8e8' } },
        adjustEdgeMiddle: true,
        allowRotation: false,
        keyboard: { enabled: true },
        plugins: [Menu, SelectionSelect],
        snapline: true,
        // 允许调整连线
        edgeAdjustdStyle: true,
      })

      // 使用箭头函数绑定 this
      const lf = this.lf

      // 设置右键菜单
      this.lf.extension.menu.setMenuConfig({
        nodeMenu: [
          {
            text: '删除',
            callback: (node) => {
              lf.deleteNode(node.id)
            }
          },
          {
            text: '复制',
            callback: (node) => {
              lf.cloneNode(node.id)
            }
          }
        ],
        edgeMenu: [
          {
            text: '删除',
            callback: (edge) => {
              lf.deleteEdge(edge.id)
            }
          }
        ],
        graphMenu: []
      })

      // 白色主题
      this.lf.setTheme({
        circle: { r: 35, fill: '#ffffff', stroke: '#d9d9d9', strokeWidth: 2 },
        rect: { width: 120, height: 60, radius: 8, fill: '#ffffff', stroke: '#d9d9d9', strokeWidth: 2 },
        diamond: { fill: '#ffffff', stroke: '#d9d9d9', strokeWidth: 2 },
        nodeText: { color: '#333', fontSize: 13 },
        edgeText: { color: '#666', fontSize: 12 },
      })

      this.lf.render({ nodes: [], edges: [] })
      this.lf.fitView(100)

      // 监听节点点击
      this.lf.on('node:click', ({ data }) => {
        this.selectNode(data)
      })

      // 监听画布点击
      this.lf.on('blank:click', () => {
        this.selectedNode = null
      })

      // 监听删除
      this.lf.on('node:delete', ({ data }) => {
        if (this.selectedNode?.id === data.id) {
          this.selectedNode = null
        }
        delete this.nodeFlowData[data.id]
      })
    },
    selectNode(data) {
      const properties = data.properties || {}
      this.selectedNode = {
        id: data.id,
        type: data.type,
        text: data.text?.value || data.text || '',
        nodeType: properties.nodeType || 'approval',
        bindPage: properties.bindPage || '',
        owner: properties.owner || '',
        nodeData: this.nodeFlowData[data.id] || {}
      }
    },
    updateNodeText(value) {
      if (this.selectedNode && this.lf) {
        const model = this.lf.graphModel.getNodeModelById(this.selectedNode.id)
        if (model) model.setText(value)
      }
    },
    updateNodeType() {
      this.updateNodeProperties()
    },
    updateNodeProperties() {
      if (this.selectedNode && this.lf) {
        this.lf.setProperties(this.selectedNode.id, {
          nodeType: this.selectedNode.nodeType,
          bindPage: this.selectedNode.bindPage,
          owner: this.selectedNode.owner
        })
      }
    },
    onMouseDown(event, node) {
      if (!this.lf) return

      const point = this.lf.graphModel.getPointByClient({
        x: event.clientX,
        y: event.clientY
      })

      const nodeConfig = {
        type: node.type,
        x: point.x,
        y: point.y,
        text: node.label,
        properties: {
          nodeType: 'approval',
          bindPage: '',
          owner: '',
          isActive: false
        }
      }

      if (node.type === 'circle') {
        nodeConfig.r = 35
      } else if (node.type === 'rect') {
        nodeConfig.width = 120
        nodeConfig.height = 60
      }

      const newNode = this.lf.addNode(nodeConfig)

      // 如果是第一个节点，设为当前步骤并亮灯
      const graphData = this.lf.getGraphData()
      if (graphData.nodes.length === 1) {
        this.currentStepNodeId = newNode.id
        // 延迟执行亮灯，确保 DOM 渲染完成
        setTimeout(() => {
          this.highlightCurrentNode()
        }, 100)
      }

      const onMouseMove = (e) => {
        const newPoint = this.lf.graphModel.getPointByClient({
          x: e.clientX,
          y: e.clientY
        })
        this.lf.graphModel.moveNode(newNode.id, newPoint.x - point.x, newPoint.y - point.y)
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        // 拖拽结束后重新亮灯
        if (this.currentStepNodeId) {
          setTimeout(() => {
            this.highlightCurrentNode()
          }, 50)
        }
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    // 高亮当前节点
    highlightCurrentNode() {
      if (!this.lf) return

      const graphData = this.lf.getGraphData()
      const container = document.querySelector('#container')
      if (!container) return

      const allNodes = container.querySelectorAll('.lf-node')

      // 第一步：重置所有节点的 DOM 样式
      allNodes.forEach(nodeEl => {
        // 移除发光效果
        nodeEl.style.filter = ''
        // 重置所有形状的填充和边框
        const shapes = nodeEl.querySelectorAll('rect, circle, ellipse, polygon')
        shapes.forEach(shape => {
          shape.setAttribute('fill', '#ffffff')
          shape.setAttribute('stroke', '#d9d9d9')
          shape.setAttribute('stroke-width', '2')
        })
      })

      if (!this.currentStepNodeId) return

      // 第二步：找到当前节点并高亮
      const nodeIndex = graphData.nodes.findIndex(n => n.id === this.currentStepNodeId)
      console.log('目标节点索引:', nodeIndex, 'DOM节点数:', allNodes.length)

      if (nodeIndex !== -1 && allNodes[nodeIndex]) {
        const targetNode = allNodes[nodeIndex]
        // 添加发光效果
        targetNode.style.filter = 'drop-shadow(0 0 12px rgba(24, 144, 255, 0.9))'
        // 设置形状的高亮样式
        const shapes = targetNode.querySelectorAll('rect, circle, ellipse, polygon')
        shapes.forEach(shape => {
          shape.setAttribute('fill', '#bae7ff')
          shape.setAttribute('stroke', '#1890ff')
          shape.setAttribute('stroke-width', '3')
        })
        console.log('亮灯成功，索引:', nodeIndex)
      }
    },
    // 获取下一个节点
    getNextNodeId(nodeId) {
      if (!this.lf) return null
      const graphData = this.lf.getGraphData()
      const edge = graphData.edges.find(e => e.sourceNodeId === nodeId)
      return edge ? edge.targetNodeId : null
    },
    // 获取上一个节点
    getPrevNodeId(nodeId) {
      if (!this.lf) return null
      const graphData = this.lf.getGraphData()
      const edge = graphData.edges.find(e => e.targetNodeId === nodeId)
      return edge ? edge.sourceNodeId : null
    },
    // 根据ID获取节点
    getNodeById(nodeId) {
      if (!this.lf) return null
      const graphData = this.lf.getGraphData()
      return graphData.nodes.find(n => n.id === nodeId)
    },
    // 处理当前节点操作
    handleCurrentNode() {
      if (!this.selectedNode) return

      if (!this.currentNodeHasData) {
        // 没有数据，打开新增弹窗
        this.openDataDialog()
      } else {
        // 有数据，提交并进入下一步
        this.goToNextStep()
      }
    },
    // 进入下一步
    goToNextStep() {
      const nextNodeId = this.getNextNodeId(this.currentStepNodeId)
      if (nextNodeId) {
        this.currentStepNodeId = nextNodeId
        this.highlightCurrentNode()
        this.$message.success('已提交，进入下一步')
      } else {
        this.$message.success('流程已完成！')
      }
    },
    // 驳回
    handleReject() {
      const prevNodeId = this.getPrevNodeId(this.currentStepNodeId)
      if (prevNodeId) {
        this.currentStepNodeId = prevNodeId
        this.highlightCurrentNode()
        // 清空当前节点数据
        if (this.selectedNode) {
          delete this.nodeFlowData[this.selectedNode.id]
          this.selectedNode.nodeData = {}
        }
        this.$message.warning('已驳回，请重新填写')
      }
    },
    // 打开数据弹窗
    openDataDialog() {
      const existingData = this.nodeFlowData[this.selectedNode.id] || {}
      this.formData = {
        remark: existingData.remark || '',
        amount: existingData.amount || 0,
        attachment: existingData.attachment || ''
      }
      this.dataDialogVisible = true
    },
    // 保存节点数据
    saveNodeData() {
      if (!this.selectedNode) return

      this.nodeFlowData[this.selectedNode.id] = { ...this.formData }
      this.selectedNode.nodeData = { ...this.formData }
      this.dataDialogVisible = false
      this.$message.success('数据保存成功')
    },
    exportJson() {
      if (!this.lf) return
      const data = this.lf.getGraphData()
      const fullData = {
        graphData: data,
        flowData: this.nodeFlowData,
        currentStep: this.currentStepNodeId
      }
      this.jsonStr = JSON.stringify(fullData, null, 2)
      this.jsonDialogVisible = true
    },
    copyJson() {
      if (!this.lf) return
      const data = this.lf.getGraphData()
      const fullData = {
        graphData: data,
        flowData: this.nodeFlowData,
        currentStep: this.currentStepNodeId
      }
      const jsonStr = JSON.stringify(fullData, null, 2)

      navigator.clipboard.writeText(jsonStr).then(() => {
        this.$message.success('JSON 已复制到剪贴板')
        this.jsonDialogVisible = false
      }).catch(() => {
        const textarea = document.createElement('textarea')
        textarea.value = jsonStr
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        this.$message.success('JSON 已复制到剪贴板')
        this.jsonDialogVisible = false
      })
    },
    goBack() {
      this.$router.push({ path: '/entry' })
    }
  },
  beforeDestroy() {
    if (this.lf) {
      this.lf.destroy()
    }
  }
}
</script>

<style scoped>
.logicflow-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.bank {
  margin: 10px 0;
}

.main-container {
  display: flex;
  flex: 1;
  height: calc(100vh - 120px);
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

/* 左侧面板 */
.node-panel {
  width: 180px;
  background: #f5f7fa;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.panel-title {
  padding: 12px 15px;
  font-weight: bold;
  font-size: 14px;
  border-bottom: 1px solid #dcdfe6;
  background: #fff;
}

.panel-tip {
  padding: 8px 15px;
  font-size: 12px;
  color: #909399;
  background: #fff;
}

.node-list {
  padding: 10px;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.3s;
  user-select: none;
}

.node-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.node-preview {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #999;
  border-radius: 4px;
  margin-right: 10px;
  font-size: 14px;
  color: #666;
}

.node-label {
  font-size: 13px;
  color: #303133;
}

.flow-control {
  padding: 15px;
  background: #fff;
  border-bottom: 1px solid #dcdfe6;
}

.current-step {
  margin-bottom: 10px;
  font-size: 13px;
}

.step-name {
  color: #1890ff;
  font-weight: bold;
}

.tips {
  padding: 10px 15px;
  font-size: 12px;
  color: #909399;
  line-height: 1.8;
}

.tips p {
  margin: 0;
}

/* 中间画布 */
.canvas-wrapper {
  flex: 1;
  background: #fff;
}

.lf-container {
  width: 100%;
  height: 100%;
}

/* 右侧属性面板 */
.property-panel {
  width: 280px;
  background: #f5f7fa;
  border-left: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.property-content {
  padding: 15px;
  overflow-y: auto;
}

.property-group {
  margin-bottom: 15px;
}

.property-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
  font-weight: 500;
}

.empty-tip {
  padding: 40px 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.node-data-section {
  background: #fff;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e4e7ed;
}

.no-data {
  text-align: center;
  color: #909399;
}

.no-data p {
  margin-bottom: 10px;
}

.has-data .data-preview {
  margin-bottom: 10px;
  font-size: 13px;
}

.has-data .data-preview p {
  margin: 5px 0;
}

/* LogicFlow 样式覆盖 */
.canvas-wrapper >>> .lf-node-content {
  cursor: move;
}

.canvas-wrapper >>> .lf-anchor {
  cursor: crosshair;
}

/* 节点高亮样式 - 亮灯效果 */
.canvas-wrapper >>> .lf-node.node-active {
  filter: drop-shadow(0 0 8px rgba(24, 144, 255, 0.6));
}

.canvas-wrapper >>> .lf-node.node-active .lf-node-content {
  fill: #e6f7ff !important;
  stroke: #1890ff !important;
  stroke-width: 3 !important;
}

.canvas-wrapper >>> .lf-node.node-active rect {
  fill: #e6f7ff !important;
  stroke: #1890ff !important;
  stroke-width: 3 !important;
}

.canvas-wrapper >>> .lf-node.node-active circle {
  fill: #e6f7ff !important;
  stroke: #1890ff !important;
  stroke-width: 3 !important;
}

.canvas-wrapper >>> .lf-node.node-active polygon {
  fill: #e6f7ff !important;
  stroke: #1890ff !important;
  stroke-width: 3 !important;
}

.canvas-wrapper >>> .lf-node.node-active ellipse {
  fill: #e6f7ff !important;
  stroke: #1890ff !important;
  stroke-width: 3 !important;
}
</style>
