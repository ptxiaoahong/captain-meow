# 本地开发配置说明

## ✅ 当前配置（已更新）

现在配置已改为使用 `file-system` 后端，**无需登录，无需代理服务器**！

## 🚀 使用方法

### 1. 启动 Hugo 服务器
```bash
cd "/Users/hongshize/猫猫船长个人网站"
hugo serve
```

### 2. 访问管理后台
打开浏览器访问：`http://localhost:1313/admin/`

**无需启动代理服务器，无需登录！**

## 📝 注意事项

- **本地开发**：使用 `file-system` 后端，直接保存到文件系统
- **Git 部署**：需要修改 `config.yml`，将 `backend.name` 改为 `git-gateway`

## 🔄 切换到生产环境

部署前，需要修改 `static/admin/config.yml`：

```yaml
backend:
  # name: file-system  # 注释掉这行
  name: git-gateway    # 取消注释
  branch: main        # 取消注释
```

同时修改 `static/admin/index.html`，取消注释 Netlify Identity 的 script 标签。

