/**
 * 微信小程序 CI 上传脚本
 * 使用前提：
 * 1. mp.weixin.qq.com → 开发管理 → 开发设置 → 小程序代码上传 → 下载代码上传密钥
 * 2. 将密钥文件放到项目根目录，命名 private.wxee00090582dd5ad6.key
 * 3. 同页面将本机 IP 加入白名单（或开启 IP 白名单关闭）
 * 4. 先执行 npm run build:weapp 生成 dist/，再运行:
 *    node scripts/upload.js [版本号] [备注]
 *    例如: node scripts/upload.js 1.0.0 "首次发布"
 */
const path = require('path')
const ci = require('miniprogram-ci')

const APPID = 'wxee00090582dd5ad6'
const projectPath = path.join(__dirname, '..')
const keyPath = path.join(projectPath, `private.${APPID}.key`)

const version = process.argv[2] || '1.0.0'
const desc = process.argv[3] || `润泉养元 v${version}`

async function main() {
  const project = new ci.Project({
    appid: APPID,
    type: 'miniProgram',
    projectPath,
    privateKeyPath: keyPath,
    ignores: ['node_modules/**/*', 'server/**/*', 'src/**/*']
  })

  const result = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: false,
      minifyJS: true,
      minifyWXML: true,
      minifyWXSS: true,
      codeProtect: false
    },
    onProgressUpdate: console.log
  })

  console.log('\n============================================')
  console.log(`[OK] 上传成功: 版本 ${version}`)
  console.log(`    包大小: ${(result.subPackageInfo?.[0]?.size / 1024 || 0).toFixed(0)} KB`)
  console.log('    下一步: mp.weixin.qq.com → 版本管理 → 提交审核')
  console.log('============================================')
}

main().catch(e => {
  console.error('[X] 上传失败:', e.message)
  if (e.message.includes('private')) {
    console.error('    请检查代码上传密钥是否存在:', keyPath)
  }
  process.exit(1)
})
