#!/bin/bash
# 对超过 1MB 的图片进行更激进的压缩

cd "$(dirname "$0")"
find assets/images -name "*.jpg" -type f -size +1M | while read img; do
    echo "处理: $img"
    original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
    echo "  原始大小: $((original_size / 1024))KB"
    
    # 策略1: 降低质量到 55
    sips -s format jpeg -s formatOptions 55 "$img" --out "$img.tmp" > /dev/null 2>&1
    if [ -f "$img.tmp" ]; then
        new_size=$(stat -f%z "$img.tmp" 2>/dev/null || stat -c%s "$img.tmp" 2>/dev/null)
        if [ "$new_size" -lt 1048576 ]; then
            mv "$img.tmp" "$img"
            echo "  ✓ 质量压缩成功: $((new_size / 1024))KB"
            continue
        fi
        rm "$img.tmp"
    fi
    
    # 策略2: 如果还超过，先缩小到 80% 尺寸，再压缩到质量 55
    width=$(sips -g pixelWidth "$img" 2>/dev/null | awk '/pixelWidth:/ {print $2}')
    if [ -n "$width" ] && [ "$width" -gt 2000 ]; then
        new_width=$((width * 80 / 100))
        sips -z "$new_width" "$new_width" "$img" --out "$img.tmp" > /dev/null 2>&1
        if [ -f "$img.tmp" ]; then
            sips -s format jpeg -s formatOptions 55 "$img.tmp" --out "$img.tmp2" > /dev/null 2>&1
            if [ -f "$img.tmp2" ]; then
                final_size=$(stat -f%z "$img.tmp2" 2>/dev/null || stat -c%s "$img.tmp2" 2>/dev/null)
                if [ "$final_size" -lt 1048576 ]; then
                    mv "$img.tmp2" "$img"
                    rm -f "$img.tmp"
                    echo "  ✓ 尺寸+质量压缩成功: $((final_size / 1024))KB"
                    continue
                fi
                rm "$img.tmp2"
            fi
            rm "$img.tmp"
        fi
    fi
    
    echo "  ⚠ 无法压缩到 1MB 以下，请手动处理"
done
echo "处理完成！"
