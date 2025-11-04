#!/bin/bash

echo "🔍 检查代理服务器状态..."
echo ""

# 检查端口 8081
if lsof -i :8081 > /dev/null 2>&1; then
    echo "✅ 端口 8081 已被占用（代理服务器可能正在运行）"
    lsof -i :8081
else
    echo "❌ 端口 8081 未被占用（代理服务器未运行）"
    echo ""
    echo "请运行以下命令启动代理服务器："
    echo "  npx decap-cms-proxy-server"
    echo ""
    echo "或者使用："
    echo "  ./start-cms.sh"
fi

echo ""
echo "📝 检查 Hugo 服务器..."
if lsof -i :1313 > /dev/null 2>&1; then
    echo "✅ 端口 1313 已被占用（Hugo 服务器正在运行）"
else
    echo "❌ 端口 1313 未被占用（Hugo 服务器未运行）"
    echo "请运行：hugo serve"
fi

