# 🚀 Decap CMS 启动指南

## ⚠️ 重要：必须同时运行两个服务

### 步骤 1：启动 CMS 代理服务器（终端 1）

```bash
cd "/Users/hongshize/猫猫船长个人网站"
npx decap-server
```

**看到类似这样的输出说明成功：**
```
Proxy server is running on http://localhost:8081
```

**保持这个终端窗口打开！**

---

### 步骤 2：启动 Hugo 服务器（终端 2）

打开**新的终端窗口**，运行：

```bash
cd "/Users/hongshize/猫猫船长个人网站"
hugo serve
```

**看到类似这样的输出说明成功：**
```
Web Server is available at http://localhost:1313/
```

---

### 步骤 3：访问管理后台

打开浏览器，访问：
```
http://localhost:1313/admin/
```

**现在应该可以直接进入，无需登录！**

---

## ❌ 常见错误

### 错误：Config Errors - Backend not found
- **原因**：代理服务器没有运行
- **解决**：确保在终端 1 中运行了 `npx decap-cms-proxy-server`

### 错误：仍然需要登录
- **原因**：代理服务器没有运行或没有正确连接
- **解决**：
  1. 检查代理服务器是否在运行（终端 1）
  2. 刷新浏览器页面（Cmd+Shift+R）
  3. 查看浏览器控制台是否有错误

### 错误：无法保存
- **原因**：代理服务器断开连接
- **解决**：重新启动代理服务器

---

## ✅ 成功标志

- ✅ 终端 1：显示 "Proxy server is running"
- ✅ 终端 2：显示 "Web Server is available"
- ✅ 浏览器：可以直接看到文章列表，无需登录

---

## 💡 提示

- 两个终端窗口都要保持打开
- 如果关闭了代理服务器，需要重新启动才能使用 CMS
- 编辑的内容会直接保存到本地文件系统

