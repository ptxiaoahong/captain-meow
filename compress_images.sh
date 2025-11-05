#!/bin/bash
# 批量压缩 assets/images 中的图片，确保不超过 1MB

cd "$(dirname "$0")"
find assets/images -name "*.jpg" -type f -size +1M | while read img; do
    echo "压缩: $img"
    # 使用 sips (macOS 内置工具) 压缩图片
    # 质量设置为 75，如果还超过 1MB，继续降低尺寸
    sips -s format jpeg -s formatOptions 75 "$img" --out "$img.tmp" > /dev/null 2>&1
    if [ -f "$img.tmp" ]; then
        size=$(stat -f%z "$img.tmp" 2>/dev/null || stat -c%s "$img.tmp" 2>/dev/null)
        if [ "$size" -gt 1048576 ]; then
            # 如果还超过 1MB，降低质量到 65
            sips -s format jpeg -s formatOptions 65 "$img" --out "$img.tmp" > /dev/null 2>&1
        fi
        if [ -f "$img.tmp" ]; then
            mv "$img.tmp" "$img"
            echo "  ✓ 完成"
        fi
    fi
done
echo "压缩完成！"
