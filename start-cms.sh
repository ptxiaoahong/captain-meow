#!/bin/bash

# Decap CMS 启动脚本
# 使用方法：在项目根目录运行 ./start-cms.sh

echo "🚀 启动 Decap CMS 开发环境..."
echo ""
echo "📝 注意：这个脚本会启动 CMS 代理服务器"
echo "   请在另一个终端运行 'hugo serve' 来启动 Hugo 服务器"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "   项目路径: /Users/hongshize/猫猫船长个人网站"
    exit 1
fi

# 启动代理服务器
npx decap-server

