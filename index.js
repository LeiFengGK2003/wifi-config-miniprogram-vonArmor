const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// ==================== 首页 ====================
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ==================== 计数 API（保留原有功能）====================
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({ truncate: true });
  }
  res.send({ code: 0, data: await Counter.count() });
});

app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({ code: 0, data: result });
});

// ==================== WiFi 配置相关 API ====================

/**
 * POST /api/wifi/config
 * 保存 WiFi 配置到服务器（可选功能，用于记录配网历史）
 */
app.post("/api/wifi/config", async (req, res) => {
  try {
    const { ssid, password, deviceId } = req.body;
    
    if (!ssid || !password) {
      return res.status(400).json({
        code: 400,
        message: "SSID 和密码不能为空"
      });
    }

    console.log(`[WiFi Config] Device: ${deviceId || 'unknown'}, SSID: ${ssid}`);
    
    res.json({
      code: 0,
      message: "配置已保存",
      data: { ssid, deviceId: deviceId || null }
    });
  } catch (error) {
    console.error("[WiFi Config Error]", error);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});

/**
 * GET /api/wifi/devices
 * 获取已配网的设备列表（示例接口）
 */
app.get("/api/wifi/devices", async (req, res) => {
  const devices = [
    { id: "ESP32-001", ssid: "HomeWiFi", lastConnected: new Date().toISOString() },
    { id: "ESP32-002", ssid: "OfficeWiFi", lastConnected: new Date().toISOString() }
  ];
  res.json({ code: 0, data: devices });
});

/**
 * GET /api/wifi/status/:deviceId
 * 获取设备 WiFi 状态（示例接口）
 */
app.get("/api/wifi/status/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  res.json({
    code: 0,
    data: { deviceId, connected: true, ssid: "HomeWiFi", ip: "192.168.1.100", rssi: -45 }
  });
});

// ==================== 小程序代码文件 API（直接返回）====================
app.get("/api/miniprogram/files", async (req, res) => {
  const files = [
    { name: "app.json", content: getAppJson() },
    { name: "app.js", content: getAppJs() },
    { name: "app.wxss", content: getAppWxss() },
    { name: "pages/index/index.wxml", content: getIndexWxml() },
    { name: "pages/index/index.wxss", content: getIndexWxss() },
    { name: "pages/index/index.js", content: getIndexJs() },
    { name: "pages/index/index.json", content: getIndexJson() }
  ];
  res.json({ code: 0, data: files });
});

// ==================== 小程序文件内容（内嵌）====================
function getAppJson() {
  return JSON.stringify({
    "pages": ["pages/index/index"],
    "window": {
      "backgroundTextStyle": "light",
      "navigationBarBackgroundColor": "#07c160",
      "navigationBarTitleText": "WiFi 配网助手",
      "navigationBarTextStyle": "white"
    },
    "requiredPrivateInfos": [
      "getBluetoothAdapterState",
      "startBluetoothDevicesDiscovery",
      "connectBluetoothDevice",
      "getConnectedBluetoothDevices"
    ]
  }, null, 2);
}

function getAppJs() {
  return `// app.js\nApp({\n  globalData: { userInfo: null },\n  onLaunch() {\n    console.log('WiFi Config Mini Program Started');\n  }\n});`;
}

function getAppWxss() {
  return `/**app.wxss**/\npage {\n  font-family: -apple-system, BlinkMacSystemFont, sans-serif;\n  font-size: 28rpx;\n  color: #333;\n  background-color: #f7f7f7;\n}`;
}

function getIndexWxml() {
  return `<view class="container">
  <view class="status-bar">
    <text class="status-icon">{{bluetoothState === '✅ 可用' ? '🟢' : '🔴'}}</text>
    <text class="status-text">蓝牙状态：{{bluetoothState}}</text>
  </view>

  <button class="{{isScanning ? 'scanning-btn' : 'scan-btn'}}" bindtap="startScan" disabled="{{isConnected}}">
    {{isScanning ? '🔍 正在扫描...' : '📡 开始扫描设备'}}
  </button>

  <view class="device-list" wx:if="{{devices.length > 0}}">
    <view class="section-title">发现设备 ({{devices.length}})</view>
    <scroll-view scroll-y class="device-scroll" style="height: {{Math.min(devices.length * 120, 600)}}rpx">
      <view class="device-item {{selectedDeviceId === device.id ? 'selected' : ''}}"
        wx:for="{{devices}}" wx:key="id" bindtap="selectDevice" data-id="{{device.id}}">
        <view class="device-header">
          <text class="device-name">{{device.name || '未知设备'}}</text>
          <text class="device-rssi">📶 {{device.RSSI}}dBm</text>
        </view>
        <text class="device-uuid">{{device.id}}</text>
      </view>
    </scroll-view>
  </view>

  <view class="wifi-config" wx:if="{{selectedDeviceId}}">
    <view class="section-title">📶 WiFi 配置</view>
    
    <view class="input-group">
      <text class="label">WiFi 名称 (SSID):</text>
      <input class="input-field" placeholder="请输入 WiFi 名称" value="{{wifiSsid}}" bindinput="onSsidInput"/>
    </view>

    <view class="input-group">
      <text class="label">WiFi 密码:</text>
      <input class="input-field" type="password" placeholder="请输入 WiFi 密码" value="{{wifiPassword}}" bindinput="onPasswordInput"/>
    </view>

    <view class="connection-status" wx:if="{{isConnected}}">
      <text class="connected-icon">✅</text>
      <text class="status-text">已连接到 {{selectedDeviceName}}</text>
    </view>

    <button class="config-btn" bindtap="sendWifiConfig" disabled="{{!isConnected || !wifiSsid || !wifiPassword}}">
      📶 发送 WiFi 配置
    </button>

    <button class="disconnect-btn" bindtap="disconnectDevice" wx:if="{{isConnected}}">
      🔌 断开连接
    </button>
  </view>

  <view class="log-area" wx:if="{{logs.length > 0}}">
    <view class="section-title">📝 操作日志</view>
    <scroll-view scroll-y class="log-content">
      <text class="log-text">{{logs.join('\n')}}</text>
    </scroll-view>
  </view>

  <view class="empty-state" wx:if="{{devices.length === 0 && !isScanning}}">
    <text class="empty-icon">📱</text>
    <text class="empty-text">点击“开始扫描设备”查找附近的蓝牙设备</text>
  </view>

  <view class="footer">
    <text class="footer-text">WiFi 配网助手 v1.0 | 傻妞出品 🌟</text>
  </view>
</view>`;
}

function getIndexWxss() {
  return `.container { padding: 20rpx; }
.status-bar {
  background-color: #ffffff;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 25rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
}
.status-icon { font-size: 36rpx; margin-right: 15rpx; }
.status-text { font-size: 30rpx; color: #333; font-weight: 500; }
.scan-btn, .scanning-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  font-size: 34rpx;
  background-color: #07c160;
  color: white;
  margin-bottom: 35rpx;
  box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.3);
}
.scan-btn[disabled] { background-color: #bdc3c7 !important; box-shadow: none !important; }
.scanning-btn { animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.section-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 25rpx;
  padding-bottom: 15rpx;
  border-bottom: 3rpx solid #ecf0f1;
}
.device-list { margin-bottom: 35rpx; }
.device-scroll { background-color: transparent; }
.device-item {
  background-color: white;
  padding: 32rpx;
  margin-bottom: 18rpx;
  border-radius: 14rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.08);
}
.device-item.selected {
  background-color: #e7f9ef;
  border: 3rpx solid #07c160;
  transform: scale(1.02);
}
.device-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.device-name { font-size: 32rpx; color: #2c3e50; font-weight: 600; flex: 1; }
.device-rssi { font-size: 24rpx; color: #7f8c8d; }
.device-uuid { font-size: 22rpx; color: #95a5a6; word-break: break-all; }
.wifi-config {
  background-color: #ffffff;
  padding: 35rpx;
  border-radius: 16rpx;
  margin-bottom: 35rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
}
.input-group { margin-bottom: 30rpx; }
.label {
  font-size: 28rpx;
  color: #555;
  display: block;
  margin-bottom: 15rpx;
  font-weight: 500;
}
.input-field {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 10rpx;
  padding: 0 25rpx;
  font-size: 28rpx;
  background-color: #fafafa;
}
.input-field:focus { border-color: #07c160; background-color: white; }
.connection-status {
  background-color: #e7f9ef;
  padding: 25rpx;
  border-radius: 10rpx;
  margin-bottom: 25rpx;
  display: flex;
  align-items: center;
}
.connected-icon { font-size: 40rpx; margin-right: 18rpx; }
.config-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  background-color: #1989fa;
  color: white;
  margin-top: 15rpx;
  box-shadow: 0 6rpx 20rpx rgba(25, 137, 250, 0.3);
}
.config-btn[disabled] { background-color: #bdc3c7 !important; box-shadow: none !important; }
.disconnect-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  background-color: #ff9500;
  color: white;
  margin-top: 20rpx;
}
.log-area { margin-top: 35rpx; }
.log-content {
  height: 450rpx;
  background-color: #1a1a2e;
  padding: 25rpx;
  border-radius: 12rpx;
}
.log-text { font-size: 24rpx; color: #00ff88; line-height: 1.6; white-space: pre-wrap; font-family: monospace; }
.empty-state { text-align: center; padding: 100rpx 50rpx; }
.empty-icon { font-size: 120rpx; display: block; margin-bottom: 30rpx; }
.empty-text { font-size: 30rpx; color: #999; }
.footer { text-align: center; padding: 40rpx 20rpx; margin-top: 30rpx; }
.footer-text { font-size: 24rpx; color: #999; }`;
}

function getIndexJs() {
  return `// pages/index/index.js\nconst app = getApp();\n\nPage({\n  data: {\n    bluetoothState: '未初始化',\n    isScanning: false,\n    devices: [],\n    selectedDeviceId: null,\n    selectedDeviceName: '',\n    wifiSsid: '',\n    wifiPassword: '',\n    isConnected: false,\n    connectedDeviceId: null,\n    serviceUuid: null,\n    characteristicUuid: null,\n    logs: []\n  },\n\n  onLoad() { this.checkBluetoothState(); },\n\n  onUnload() {\n    wx.stopBluetoothDevicesDiscovery();\n    if (this.data.isConnected) {\n      wx.closeBluetoothAdapter({ success: () => console.log('已关闭蓝牙适配器') });\n    }\n  },\n\n  checkBluetoothState() {\n    wx.getBluetoothAdapterState({\n      success: (res) => {\n        const state = res.available ? '✅ 可用' : '❌ 不可用';\n        this.setData({ bluetoothState: state });\n        this.addLog('蓝牙状态：' + state);\n      },\n      fail: (err) => {\n        this.setData({ bluetoothState: '❌ 获取失败' });\n        wx.showModal({ title: '错误', content: '无法访问蓝牙，请检查权限设置', showCancel: false });\n      }\n    });\n  },\n\n  startScan() {\n    if (this.data.isScanning) return;\n    this.setData({ isScanning: true, devices: [] });\n    this.addLog('开始扫描蓝牙设备...');\n\n    wx.onBluetoothDeviceFound((res) => {\n      const newDevices = res.devices.map(device => ({\n        id: device.deviceId,\n        name: device.name || '未知设备',\n        RSSI: device.RSSI\n      }));\n      const allDevices = [...this.data.devices, ...newDevices];\n      this.setData({ devices: this.getUniqueDevices(allDevices) });\n    });\n\n    wx.startBluetoothDevicesDiscovery({\n      allowDuplicatesKey: false,\n      services: [],\n      success: () => this.addLog('扫描已启动'),\n      fail: (err) => {\n        this.setData({ isScanning: false });\n        wx.showModal({ title: '错误', content: '无法启动蓝牙扫描', showCancel: false });\n      }\n    });\n\n    setTimeout(() => this.stopScan(), 5000);\n  },\n\n  stopScan() {\n    wx.stopBluetoothDevicesDiscovery({\n      success: () => {\n        this.setData({ isScanning: false });\n        this.addLog('扫描完成，共发现 ' + this.data.devices.length + ' 个设备');\n      }\n    });\n  },\n\n  getUniqueDevices(devices) {\n    const map = new Map();\n    devices.forEach(device => {\n      if (!map.has(device.id)) { map.set(device.id, device); }\n      else if (device.RSSI > map.get(device.id).RSSI) { map.set(device.id, device); }\n    });\n    return Array.from(map.values());\n  },\n\n  selectDevice(e) {\n    const deviceId = e.currentTarget.dataset.id;\n    if (this.data.selectedDeviceId === deviceId) return;\n\n    this.setData({ selectedDeviceId: deviceId });\n    this.addLog('选中设备：' + deviceId);\n\n    wx.connectBluetoothDevice({\n      deviceId,\n      success: () => {\n        const device = this.data.devices.find(d => d.id === deviceId);\n        this.setData({ isConnected: true, connectedDeviceId: deviceId, selectedDeviceName: device.name || '未知设备' });\n        this.addLog('蓝牙连接成功');\n        this.getServices(deviceId);\n      },\n      fail: () => wx.showModal({ title: '错误', content: '连接设备失败', showCancel: false })\n    });\n  },\n\n  getServices(deviceId) {\n    wx.getBluetoothDeviceServices({\n      deviceId,\n      success: (res) => {\n        this.addLog('发现 ' + res.services.length + ' 个服务');\n        const writableService = res.services.find(s => s.characteristics && s.characteristics.some(c => c.properties?.write));\n        if (writableService) {\n          this.setData({ serviceUuid: writableService.uuid });\n          wx.getBluetoothDeviceCharacteristics({\n            deviceId,\n            serviceId: writableService.uuid,\n            success: (charRes) => {\n              const writableChar = charRes.characteristics.find(c => c.properties?.write);\n              if (writableChar) this.setData({ characteristicUuid: writableChar.uuid });\n            }\n          });\n        }\n      },\n      fail: () => wx.showModal({ title: '错误', content: '无法获取设备服务列表', showCancel: false })\n    });\n  },\n\n  onSsidInput(e) { this.setData({ wifiSsid: e.detail.value }); },\n  onPasswordInput(e) { this.setData({ wifiPassword: e.detail.value }); },\n\n  sendWifiConfig() {\n    if (!this.data.isConnected || !this.data.wifiSsid || !this.data.wifiPassword) {\n      wx.showToast({ title: '请填写完整信息', icon: 'none' });\n      return;\n    }\n\n    const configData = JSON.stringify({ ssid: this.data.wifiSsid, password: this.data.wifiPassword });\n    const bytes = [];\n    for (let i = 0; i < configData.length; i++) { bytes.push(configData.charCodeAt(i)); }\n    const buffer = new Uint8Array(bytes).buffer;\n\n    wx.writeBluetoothDeviceCharacteristicValue({\n      deviceId: this.data.connectedDeviceId,\n      serviceId: this.data.serviceUuid,\n      characteristicId: this.data.characteristicUuid,\n      value: buffer,\n      success: () => {\n        this.addLog('✅ WiFi 配置已发送');\n        wx.showToast({ title: '配置已发送', icon: 'success' });\n      },\n      fail: () => wx.showModal({ title: '错误', content: '发送配置失败', showCancel: false })\n    });\n  },\n\n  disconnectDevice() {\n    wx.closeBluetoothAdapter({\n      success: () => {\n        this.setData({ isConnected: false, connectedDeviceId: null, selectedDeviceId: null, selectedDeviceName: '', serviceUuid: null, characteristicUuid: null });\n        this.addLog('已断开连接');\n      }\n    });\n  },\n\n  addLog(message) {\n    const timestamp = new Date().toLocaleTimeString();\n    this.setData({ logs: [...this.data.logs, '[' + timestamp + '] ' + message].slice(-50) });\n  }\n});`;
}

function getIndexJson() {
  return JSON.stringify({
    "navigationBarTitleText": "WiFi 配网助手",
    "usingComponents": {}
  }, null, 2);
}

// ==================== 启动服务 ====================
const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("=====================================");
    console.log("   WiFi Config Server Started");
    console.log(`   Port: ${port}`);
    console.log("=====================================");
  });
}

bootstrap();
