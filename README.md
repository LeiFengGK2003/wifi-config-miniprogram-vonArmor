# 📱 WiFi 配网助手 - 微信小程序

通过蓝牙连接开发板并配置 WiFi 的微信小程序，配合微信云托管服务使用。

## ✨ 功能特性

### 小程序端
- 🔍 **自动扫描**：一键发现附近的 ESP32/开发板设备
- 📶 **信号强度显示**：实时 RSSI 值，智能排序展示最强信号设备
- 🔗 **智能连接**：自动查找可写服务/特性
- ⚙️ **WiFi 配置**：通过蓝牙发送 SSID 和密码到开发板
- 📝 **操作日志**：完整的调试信息记录

### 服务端（微信云托管）
- 🌐 **API 接口**：提供 WiFi 配置管理、设备状态查询等接口
- 💾 **代码分发**：通过 API 获取小程序源代码文件
- 📊 **访问统计**：内置计数器功能
- 🔧 **可扩展性**：支持自定义数据库存储配网历史

## 📁 项目结构

```
wifi-config-miniprogram-vonArmor/
├── index.js              # Express 服务端入口（API + 代码分发）
├── index.html            # 服务首页（功能介绍 + API 文档）
├── db.js                 # 数据库配置（SQLite）
├── package.json          # 依赖配置
├── Dockerfile            # Docker 构建配置
└── container.config.json # 微信云托管配置
```

## 🚀 快速开始

### 1. 部署到微信云托管

```bash
# 克隆项目到本地
git clone <your-repo-url>
cd wifi-config-miniprogram-vonArmor

# 在微信开发者工具中创建云托管环境
# 选择此目录作为项目根目录
```

### 2. 获取小程序代码

访问部署后的服务地址，点击"下载代码包"按钮获取小程序源代码。

或者通过 API 获取：

```bash
curl https://your-service-url.com/api/miniprogram/files
```

### 3. 在微信开发者工具中导入小程序

1. 创建新项目
2. 选择"不使用云开发模板"
3. 填写 AppID（测试可使用体验版）
4. 选择项目目录
5. 将获取的代码文件分别创建到对应位置

## 📱 小程序使用流程

```
┌─────────────────────────────────────┐
│  1. 点击"开始扫描设备"              │
├─────────────────────────────────────┤
│  2. 从列表中选择目标 ESP32 设备      │
├─────────────────────────────────────┤
│  3. 输入 WiFi SSID 和密码           │
├─────────────────────────────────────┤
│  4. 点击"发送 WiFi 配置"            │
└─────────────────────────────────────┘
```

## 🔌 API 接口文档

### POST `/api/wifi/config`
保存 WiFi 配置到服务器（可选功能）。

**请求体：**
```json
{
  "ssid": "MyWiFi",
  "password": "12345678",
  "deviceId": "ESP32-001"
}
```

### GET `/api/wifi/devices`
获取已配网的设备列表。

### GET `/api/wifi/status/:deviceId`
获取指定设备的 WiFi 状态。

### GET `/api/miniprogram/files`
获取小程序代码文件列表（JSON 格式）。

## 🔧 ESP32 接收端示例

```cpp
#include <BluetoothSerial.h>
#include <WiFi.h>

BluetoothSerial BT;

void setup() {
  Serial.begin(115200);
  BT.begin("WiFiConfigDevice"); // 设备名称
}

void loop() {
  if (BT.hasData()) {
    String data = BT.readString();
    
    // 解析 JSON: {"ssid":"MyWiFi","password":"12345678"}
    // TODO: 添加 WiFi 连接逻辑
    
    BT.write("ACK\r\n");
  }
  delay(10);
}
```

## 📊 技术栈

### 小程序端
- **框架**: 微信小程序原生框架
- **蓝牙**: Web Bluetooth API（微信封装）
- **UI**: WXML + WXSS

### 服务端
- **运行时**: Node.js
- **Web 框架**: Express
- **数据库**: SQLite（通过 Sequelize ORM）
- **部署**: 微信云托管（Docker）

## 🌟 特色功能

1. **智能设备去重**：自动保留信号最强的设备实例
2. **服务自动发现**：无需手动配置 UUID，自动查找可写特性
3. **实时日志记录**：所有操作都有详细日志输出
4. **优雅的错误处理**：友好的错误提示和恢复机制

## 📝 注意事项

1. **权限配置**：需要在微信后台申请蓝牙相关权限
2. **iOS 限制**：iOS 对蓝牙扫描有严格限制，需要用户主动触发
3. **开发板协议**：根据实际开发板的通信协议调整数据格式
4. **测试环境**：建议在真机上测试蓝牙功能（模拟器不支持）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

**傻妞出品 🌟 | 让 IoT 设备配网更简单**
