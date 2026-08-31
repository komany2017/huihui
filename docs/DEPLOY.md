# 润泉养元 · 云服务器部署手册

一键将后台服务（REST API + 管理后台）部署到 Linux 云服务器。

## 前置条件

| 项目 | 要求 |
|---|---|
| 本机 | Windows 10+（自带 ssh / scp / tar，无需额外安装） |
| 服务器 | Linux（Ubuntu / CentOS 等），已安装 **Node.js 18+**（脚本会自动检查并给出安装命令） |
| 凭证 | 能 SSH 登录服务器（密钥免密或密码均可，密码方式会交互提示输入） |
| 网络 | 服务器安全组/防火墙放行 TCP `3000`（或自定义 `DEPLOY_APP_PORT`） |

## 快速使用

```powershell
# 基本用法（在项目根目录执行）
npm run deploy -- -ServerHost <服务器IP> -User root

# 或直接调用脚本
powershell -ExecutionPolicy Bypass -File server/deploy.ps1 -ServerHost 1.2.3.4 -User root
```

**执行流程（全自动）：**

```
检查参数与本地工具 → 组装部署包（server 代码 + 种子源数据）
→ 连接服务器检查 Node 版本 → scp 上传 → 远程解压/备份/重启
→ 自动健康检查（远程 + 本机公网验证）→ 输出访问地址
```

**脚本做了什么：**

1. **部署包**：`index.js` / `db.js` / `seed.js` / `verify-api.mjs` / `admin/` + `src-data/`（种子数据，供服务器首次启动自动建库）；**不包含本地 `data/db.json`**
2. **数据保护**：默认不覆盖服务器数据；如加 `-PushData` 才上传本地库，且上传前自动备份远端为 `data/db.json.bak-时间戳`
3. **进程守护**：服务器装了 pm2 则用 `pm2 start/restart ruanquan-api`；否则 `nohup` 启动并写 `deploy.pid`（下次部署自动 kill 旧进程）
4. **健康检查**：远程 `curl /api/health` 校验 `code: 0`，失败则中止并提示查看 `app.log`

## 参数说明

| 参数 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `-ServerHost` | `DEPLOY_HOST` | 无（必填） | 服务器 IP 或域名 |
| `-User` | `DEPLOY_USER` | 无（必填） | SSH 登录用户 |
| `-SshPort` | `DEPLOY_SSH_PORT` | `22` | SSH 端口 |
| `-DeployDir` | `DEPLOY_DIR` | `/opt/ruanquan` | 服务器部署目录 |
| `-AppPort` | `DEPLOY_APP_PORT` | `3000` | 服务监听端口 |
| `-PushData` | — | 关 | 连同本地 `db.json` 上传（默认保留服务器数据） |
| `-WithMysql` | — | 关 | 打包 mysql2 依赖进部署包（服务器要用 MySQL 存储时必须加） |
| `-DryRun` | — | 关 | 预演模式：只打包并打印将执行的命令，不连接服务器 |

环境变量用法（设置后无需每次传参）：

```powershell
$env:DEPLOY_HOST = '1.2.3.4'
$env:DEPLOY_USER = 'root'
npm run deploy
```

服务进程的业务环境变量（`ADMIN_USER` / `ADMIN_PASS` / `DATA_DIR`）如已在本机设置，会随 `npm run deploy` 继承到远程启动命令吗？——**不会**，远程进程使用默认值（`admin`/`admin123`）。如需修改远程管理员密码，部署后 `ssh` 登录服务器，在部署目录执行：

```bash
pm2 delete ruanquan-api ; ADMIN_PASS='新密码' pm2 start index.js --name ruanquan-api
# 或 nohup 方式：
kill $(cat deploy.pid) ; ADMIN_PASS='新密码' PORT=3000 nohup node index.js > app.log 2>&1 & echo $! > deploy.pid
```

## 部署后

| 访问项 | 地址 |
|---|---|
| 管理后台 | `http://<服务器IP>:3000/admin/` |
| 小程序 API | `http://<服务器IP>:3000/api/` |
| 部署目录 | `/opt/ruanquan`（`app.log` 为运行日志，`deploy.pid` 为进程号） |

**让正式版小程序连上服务器**：把 [src/config/api.ts](../src/config/api.ts) 的 `API_BASE_URL` 改为 `http://<服务器IP>:3000`（建议后续升级为域名 + HTTPS 反代，微信正式版要求 HTTPS），然后在预览页面重新「代码上传 → 提审发布」。

## 常见问题

| 现象 | 处理 |
|---|---|
| 连接超时 | 服务器安全组放行 SSH 端口；或本机网络受限（可改用已有代理网络） |
| 提示远程无 Node | 按脚本输出的命令安装 Node 20.x 后重跑 |
| 本机验证公网 404/超时 | 云安全组未放行 TCP `3000`，控制台添加入站规则 |
| 部署后健康检查失败 | `ssh` 登录后 `cat /opt/ruanquan/app.log` 查看报错（常见：端口被占用，改 `DEPLOY_APP_PORT`） |
| 想回滚数据 | 服务器 `data/` 目录下有 `db.json.bak-时间戳`，直接覆盖回去并重启 |
| 升级代码 | 直接重跑部署命令即可；未加 `-PushData` 时服务器数据不受影响 |
| 中文乱码 | 本脚本已带 UTF-8 BOM，请勿用会去掉 BOM 的编辑器保存 |

## 使用 MySQL 存储（可选）

服务器安装/已有 MySQL 后，用 `-WithMysql` 部署（会把 `mysql2` 依赖打入部署包，服务器无需 npm）：

```powershell
npm run deploy -- -ServerHost <IP> -User root -WithMysql
```

然后在服务器上给服务进程配置环境变量并重启（pm2 方式示例）：

```bash
cd /opt/ruanquan
pm2 delete ruanquan-api
MYSQL_HOST=127.0.0.1 MYSQL_USER=root MYSQL_PASS='密码' MYSQL_DB=ruanquan \
  pm2 start index.js --name ruanquan-api
```

**MySQL 行为说明：**

- 数据库需预先 `CREATE DATABASE ruanquan CHARACTER SET utf8mb4;`（表会自动创建，共 3 张：`catalog_entities` / `catalog_config` / `users`）
- **首次以 MySQL 启动且库为空**：若部署目录存在 `db.json`（配合 `-PushData` 上传）自动**迁移全部数据**；否则播种内置数据
- 未配置 `MYSQL_*` 或连接失败：服务自动回退 JSON 文件存储，不会崩溃
- 备份/迁移：`mysqldump ruanquan > backup.sql`

## 可选：systemd 托管（替代 pm2/nohup）

如需开机自启，可在服务器创建 `/etc/systemd/system/ruanquan.service`：

```ini
[Unit]
Description=Ruanquan API Server
After=network.target

[Service]
WorkingDirectory=/opt/ruanquan
ExecStart=/usr/bin/node /opt/ruanquan/index.js
Environment=PORT=3000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ruanquan
```

> 使用 systemd 时请先停掉脚本启动的进程（`pm2 delete ruanquan-api` 或 `kill $(cat deploy.pid)`），避免端口冲突。此后重新部署仍可正常使用本脚本（远程脚本会先停旧进程）。
