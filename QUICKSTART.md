# Decap CMS 快速开始指南

## ⚠️ 重要：先切换到项目目录

**必须在项目目录中运行所有命令！**

项目目录路径：
```
/Users/hongshize/猫猫船长个人网站
```

切换到项目目录：
```bash
cd "/Users/hongshize/猫猫船长个人网站"
```

---

## 🎯 本地开发（3步启动）

### 步骤 1：切换到项目目录
```bash
cd "/Users/hongshize/猫猫船长个人网站"
```

### 步骤 2：启动 CMS 代理服务器
打开第一个终端，运行：
```bash
./start-cms.sh
```
或者：
```bash
npx decap-server
```

### 步骤 3：启动 Hugo 服务器
打开第二个终端，先切换到项目目录：
```bash
cd "/Users/hongshize/猫猫船长个人网站"
```

然后运行：
```bash
hugo serve
```

### 步骤 4：访问管理后台
**⚠️ 重要：用浏览器访问，不是终端！**

打开浏览器（Chrome/Safari/Firefox），在地址栏输入：
```
http://localhost:1313/admin/
```

✅ 现在可以开始编辑内容了！所有更改会直接保存到本地文件。

---

## 🚀 Git 部署

### 准备工作

1. **确保代码已提交到 Git 仓库**（GitHub/GitLab 等）

2. **如果使用 Netlify**：
   - 登录 Netlify 控制台
   - 选择你的网站
   - 进入 **Identity** → 点击 **Enable Identity**
   - 在 Identity 设置中启用 **Git Gateway**
   - 邀请你的邮箱（Settings → Identity → Invite users）

3. **访问管理后台**：
   ```
   https://你的域名/admin/
   ```
   - 使用 GitHub/GitLab 账号登录
   - 开始编辑内容

---

## 📝 常用操作

### 创建新文章
1. 点击 **"New Post"**
2. 填写标题、标签、分类等信息
3. 在正文中编辑内容（支持 Markdown）
4. 点击 **"Save"** 保存

### 上传图片
1. 点击编辑器中的图片图标
2. 选择或拖拽图片上传
3. 图片会自动保存到 `static` 目录
4. 在 Markdown 中使用：`![](/文件夹/文件名.jpg)`

### 编辑现有文章
1. 在文章列表中点击要编辑的文章
2. 修改内容
3. 点击 **"Save"** 保存

---

## ⚠️ 注意事项

- **本地开发**：需要同时运行两个终端（代理服务器 + Hugo 服务器）
- **图片路径**：使用 `/文件夹名/文件名.jpg` 格式（相对于 static 目录）
- **保存格式**：文章会自动保存为 TOML 格式的前置参数
- **Git 部署**：确保 Netlify Identity 和 Git Gateway 已正确配置

---

## 🔧 故障排除

### 无法访问 /admin/
- ✅ 检查代理服务器是否在运行（终端 1）
- ✅ 检查 Hugo 服务器是否在运行（终端 2）
- ✅ 确认访问地址是 `http://localhost:1313/admin/`

### 保存失败
- ✅ 检查文件权限
- ✅ 查看浏览器控制台的错误信息
- ✅ 确认代理服务器正常运行

### 部署后无法登录
- ✅ 检查 Netlify Identity 是否启用
- ✅ 确认 Git Gateway 已启用
- ✅ 确认已邀请你的邮箱

---

## 📚 更多信息

详细使用说明请查看：`static/admin/使用指南.md`

