// 将 src/assets/tabbar 下所有 SVG 转换为 PNG（微信小程序 tabBar 仅支持 png/jpg/jpeg）
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const tabbarDir = path.join(__dirname, 'src', 'assets', 'tabbar')
const files = fs.readdirSync(tabbarDir).filter((f) => f.endsWith('.svg'))

;(async () => {
  for (const f of files) {
    const svgPath = path.join(tabbarDir, f)
    const pngPath = svgPath.replace(/\.svg$/, '.png')
    // 读取 SVG，确保有尺寸
    let svg = fs.readFileSync(svgPath, 'utf8')
    // 如果 SVG 没有 width/height，补充 viewBox 尺寸
    if (!/width=/.test(svg) && !/height=/.test(svg)) {
      svg = svg.replace('<svg', '<svg width="81" height="81"')
    }
    await sharp(Buffer.from(svg))
      .resize(81, 81)
      .png()
      .toFile(pngPath)
    console.log(`✅ ${f} -> ${path.basename(pngPath)}`)
  }
  console.log(`\n共转换 ${files.length} 个 SVG → PNG`)
})()
