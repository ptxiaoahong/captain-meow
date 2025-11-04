#!/bin/bash

# 准备本地开发的脚本
# 将 Decap CMS 配置从 Git 部署模式切换到本地开发模式

CONFIG_FILE="static/admin/config.yml"

echo "🔄 准备本地开发配置..."

# 检查文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 找不到配置文件 $CONFIG_FILE"
    exit 1
fi

# 备份原文件
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
echo "✅ 已备份配置文件到 ${CONFIG_FILE}.backup"

# 启用 local_backend
sed -i '' 's/^# local_backend: true/local_backend: true/' "$CONFIG_FILE"

# 确保 git-gateway 配置保留（用于生产环境回退）
# 不需要修改，保持 git-gateway 配置

echo "✅ 已切换到本地开发模式"
echo ""
echo "📝 现在可以："
echo "   1. 运行: hugo serve"
echo "   2. 访问: http://localhost:1313/admin/"
echo "   3. 直接编辑内容，更改会保存到文件系统"
echo ""
echo "💡 要切换到部署模式，运行: ./scripts/prepare-deploy.sh"

