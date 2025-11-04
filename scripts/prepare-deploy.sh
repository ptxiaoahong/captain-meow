#!/bin/bash

# 准备 Git 部署的脚本
# 将 Decap CMS 配置从本地开发模式切换到 Git 部署模式

CONFIG_FILE="static/admin/config.yml"

echo "🔄 准备 Git 部署配置..."

# 检查文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 找不到配置文件 $CONFIG_FILE"
    exit 1
fi

# 备份原文件
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
echo "✅ 已备份配置文件到 ${CONFIG_FILE}.backup"

# 使用 sed 注释掉 local_backend
sed -i '' 's/^local_backend: true/# local_backend: true/' "$CONFIG_FILE"

# 确保 git-gateway 是启用的
sed -i '' 's/^  # name: git-gateway/  name: git-gateway/' "$CONFIG_FILE"
sed -i '' 's/^  name: file-system/  # name: file-system/' "$CONFIG_FILE"

echo "✅ 已切换到 Git 部署模式"
echo ""
echo "📝 下一步："
echo "   1. 提交更改到 Git: git add . && git commit -m 'Prepare for deployment'"
echo "   2. 推送到远程: git push"
echo "   3. 如果使用 Netlify，确保已启用 Identity 和 Git Gateway"
echo ""
echo "💡 要恢复本地开发模式，运行: ./scripts/prepare-dev.sh"

