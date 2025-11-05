#!/bin/bash
# 压缩剩余的超过 1MB 的图片

cd "$(dirname "$0")"
find assets/images -name "*.jpg" -type f -size +1M | while read img; do
    echo "处理: $img"
    width=$(sips -g pixelWidth "$img" 2>/dev/null | awk '/pixelWidth:/ {print $2}')
    height=$(sips -g pixelHeight "$img" 2>/dev/null | awk '/pixelHeight:/ {print $2}')
    
    if [ -n "$width" ] && [ -n "$height" ]; then
        # 缩小到 50% 尺寸
        new_width=$((width * 50 / 100))
        new_height=$((height * 50 / 100))
        echo "  原始: ${width}x${height} -> 缩小到: ${new_width}x${new_height}"
        
        sips -z "$new_width" "$new_height" "$img" --out "$img.tmp" > /dev/null 2>&1
        if [ -f "$img.tmp" ]; then
            # 质量压缩到 50
            sips -s format jpeg -s formatOptions 50 "$img.tmp" --out "$img.tmp2" > /dev/null 2>&1
            if [ -f "$img.tmp2" ]; then
                final_size=$(stat -f%z "$img.tmp2" 2>/dev/null || stat -c%s "$img.tmp2" 2>/dev/null)
                echo "  最终大小: $((final_size / 1024))KB"
                if [ "$final_size" -lt 1048576 ]; then
                    mv "$img.tmp2" "$img"
                    rm -f "$img.tmp"
                    echo "  ✓ 成功压缩到 1MB 以下"
                else
                    rm "$img.tmp2" "$img.tmp"
                    echo "  ⚠ 仍超过 1MB，需要手动处理"
                fi
            fi
        fi
    fi
done
echo "处理完成！"

