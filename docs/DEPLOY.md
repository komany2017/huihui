# 润泉养元 · 云服务器部署手册

一键将后台服务（REST API + 管理后台）部署到 Linux 或 Windows 云服务器。

---

# 一、Windows Server 部署（含 2012 R2 / 2016 / 2019 / 2022）

离线友好的安装包方案：开发机打一个 zip，拷到服务器双击安装，自动完成 Node 运行时、防火墙、开机自启。

## 快速使用

**第 1 步：开发机打包**

```powershell
# JSON 文件存储（最简，零依赖）
powershell -ExecutionPolicy Bypass -File server/package.ps1

# 服务器用 MySQL 存储：打入 mysql2 依赖（服务器无需 npm）
powershell -ExecutionPolicy Bypass -File server/package.ps1 -WithMysql

# 连同本地数据一起打包（服务器首次启动自动迁移入库）
powershell -ExecutionPolicy Bypass -File server/package.ps1 -WithMysql -PushData
```

产物：`server/dist/ruanquan-win-deploy.zip`

> **MySQL 存储前置条件**：部署包只含 mysql2 **客户端驱动**，**不含 MySQL 数据库软件**——服务器需已安装并运行 MySQL Server（本地或同内网另一台均可）。若 MySQL 连不上，服务会自动回退 JSON 文件存储并在安装输出中告警（数据写入 `app\data\db.json`），不会中断安装；处理方式：装好/修好 MySQL 后重跑 `install.bat` 更新配置即可。（可用 `-OutName` 自定义文件名，便于同时产出 JSON/MySQL 两个变体）

**第 2 步：服务器安装**

1. 把 zip 拷贝到服务器（远程桌面直接复制 / 共享文件夹 / 上传均可）
2. 解压到任意目录，如 `C:\ruanquan`
3. 双击 **install.bat**（自动请求管理员权限），按提示输入配置：
   - 管理后台密码（回车默认 `admin123`）
   - MySQL 主机（**直接回车 = JSON 文件存储**；输入 `127.0.0.1` 启用 MySQL），随后依次提示输入**端口（默认 3306）、用户名（默认 root）、密码（密文不回显）、数据库名（默认 ruanquan）**
   - 选 MySQL 时安装脚本会**先做连接预检**：成功才继续；失败会打印真实错误（如 `Access denied ... using password: NO/YES`），可当场 **[R] 重输参数 / [J] 改用 JSON 继续 / [Q] 退出**，避免装完才发现回退

**第 3 步：完成** — 安装脚本自动：检测/下载 Node.js → 生成启动配置 → 防火墙放行端口 → 注册开机自启（任务计划程序，SYSTEM 账户）→ 启动并健康检查 → 打印访问地址。

> **默认监听 3000 端口**：安装完成后访问 `http://<服务器公网IP>:3000/`，管理后台 `http://<服务器公网IP>:3000/admin/`。
> 外网访问还需在**云控制台安全组**放行入站 TCP 3000；如需 80 端口（URL 不带 `:3000`），安装时加 `-Port 80`（需先停用占用 80 的 IIS）。

## 安装脚本做了什么

| 步骤 | 说明 |
|---|---|
| Node 运行时 | 优先用系统已装 Node → 包内 `runtime\` 便携版 → 自动从镜像下载（默认 **v16.20.2**，兼容 2012 R2；可用 `-NodeVersion` 更换） |
| 启动配置 | 生成 `run.bat`（环境变量 + 绝对路径启动 + 日志重定向 `logs\app.log`） |
| 防火墙 | `netsh` 放行 TCP 端口（入站，全部配置文件） |
| 开机自启 | `schtasks /SC ONSTART /RU SYSTEM` 注册任务 `RuanquanAPI`，无需 pm2/NSSM |
| 健康检查 | 启动后轮询 `/api/health`，通过才提示成功 |

## 日常管理（manage.bat）

```bat
manage.bat status      查看状态 + 健康检查
manage.bat start|stop|restart
manage.bat logs        查看最近 60 行日志
manage.bat uninstall   停止服务、删除自启任务与防火墙规则（保留应用文件）
```

## 参数说明（install.ps1，install.bat 可透传）

| 参数 | 默认值 | 说明 |
|---|---|---|
| `-Port` | `3000` | 服务监听端口（改 80 可让 URL 不带端口后缀，需处理 IIS 占用） |
| `-AdminUser` / `-AdminPass` | `admin` / 交互输入 | 管理后台账号密码 |
| `-MysqlHost` 等 | 空 = JSON 存储 | MySQL 连接参数（`-MysqlPort/-MysqlUser/-MysqlPass/-MysqlDb`） |
| `-NodeVersion` | `v16.20.2` | 自动下载的 Node 版本（2012 R2 最高支持 16.x） |
| `-NodeExe` | 自动检测 | 指定 node.exe 路径 |
| `-NoService` | 关 | 仅前台测试，不注册自启/防火墙 |
| `-Action` | `install` | `start/stop/restart/status/uninstall` |

## 2012 R2 兼容性说明

- 全部脚本兼容 **PowerShell 4.0**（不依赖 `Compress-Archive`/`Expand-Archive`/PS5 特性，zip 操作走 .NET `System.IO.Compression`）
- 服务端代码兼容 **Node 16**（已实测 v16.20.2 启动 + 健康检查通过；`structuredClone` 有 JSON 兜底）
- 离线服务器：提前从 nodejs.org 下载 `node-v16.20.2-win-x64.zip` 放到解压目录，安装脚本会优先使用，不再联网下载

## 升级 / 重装

1. 开发机重新 `package.ps1` 打包（数据不受影响，除非加 `-PushData`）
2. 服务器上先 `manage.bat stop`，用新 zip 覆盖 `app\` 目录（保留 `logs\`、`app\data\`），再 `manage.bat start`
3. 或直接重跑 `install.bat`（会重新生成配置并重启服务，MySQL/JSON 存储数据保留在库/文件中）

## 常见问题（Windows）

| 现象 | 处理 |
|---|---|
| 双击 install.bat 闪退 | 右键"以管理员身份运行"；或用命令行 `powershell -ExecutionPolicy Bypass -File install.ps1` 查看报错 |
| 端口被占用 | 安装脚本会预检并报出占用进程；默认 3000 极少冲突（旧 node 实例会自动停掉）。如改用 80 且被 IIS 占用：`net stop w3svc` / 停用 Default Web Site，或换 `-Port` |
| 手机/外网访问不了 | 防火墙规则已自动添加，还需检查云安全组入站放行 TCP 3000；外网地址为 `http://服务器公网IP:3000/` |
| 中文乱码 | 安装脚本带 UTF-8 BOM，请勿用会去 BOM 的编辑器保存；`logs\app.log` 用记事本/VS Code 打开 |
| 数据在哪 | JSON 模式：`app\data\db.json`；MySQL 模式：`ruanquan` 库 3 张表（备份用 `mysqldump`） |
| `Access denied ... using password: NO` | 安装时没输入 MySQL 密码（旧版脚本不提示密码导致）。新版安装会逐项提示端口/用户/密码/库并做连接预检；已装的服务直接重跑 `install.bat` 按提示输入正确密码即可切换 |
| `Access denied ... using password: YES` | 密码错误。重跑 `install.bat`，预检失败时按 `R` 重新输入；忘记 root 密码需在 MySQL 侧重置 |

---

# 二、Linux 服务器部署

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

1. **部署包**：`index.js` / `store.js` / `db.js` / `seed.js` / `verify-api.mjs` / `admin/` + `src-data/`（种子数据，供服务器首次启动自动建库）；**不包含本地 `data/db.json`**
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
