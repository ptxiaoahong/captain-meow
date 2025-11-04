# Decap CMS 使用说明

## 本地开发模式

1. **启动 Hugo 服务器**：
   ```bash
   hugo serve
   ```

2. **访问管理后台**：
   打开浏览器访问 `http://localhost:1313/admin/`

3. **编辑内容**：
   - 在 `config.yml` 中，`local_backend: true` 已启用
   - 所有更改会直接保存到本地文件系统
   - 无需 Git 认证，可以直接编辑

## Git 部署模式

1. **部署前配置**：
   - 在 `config.yml` 中注释掉 `local_backend: true`
   - 确保 `backend.name` 设置为 `git-gateway`
   - 确保 `backend.branch` 设置为正确的分支名（通常是 `main`）

2. **如果使用 Netlify**：
   - 在 Netlify 控制台启用 Identity 服务
   - 启用 Git Gateway
   - 访问 `https://你的域名/admin/` 进行登录

3. **如果使用其他平台**：
   - 需要配置 Git Gateway 或使用代理服务器
   - 参考 Decap CMS 文档配置相应的后端

## 切换模式

### 切换到本地开发模式：
```yaml
backend:
  # name: git-gateway  # 注释掉
  name: file-system     # 取消注释
  
local_backend: true     # 取消注释
```

### 切换到 Git 部署模式：
```yaml
backend:
  name: git-gateway     # 取消注释
  branch: main
  # name: file-system   # 注释掉
  
# local_backend: true  # 注释掉
```

## 注意事项

- 本地开发时，更改会直接写入文件，建议使用 Git 版本控制
- 部署时，确保 `local_backend` 已注释，否则会尝试使用文件系统后端导致错误
- 图片上传到 `static` 目录，路径会自动处理

