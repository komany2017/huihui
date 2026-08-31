# 润泉养元 · 中医健康服务小程序

集 **体质辨识、理疗服务、养生商城、在线预约、健康档案、疾病调理、穴位图解** 七大中医健康服务于一体的微信小程序，配套 **Web 后台管理系统** 与 **服务器数据存储**。

> 技术栈：Taro 4.1.9 + React 18 + TypeScript + SCSS Modules + Zustand
> 后台服务：零依赖 Node.js（≥18），JSON 文件数据库，开箱即用

---

## 功能特性

| 模块 | 说明 |
|---|---|
| 中医体质辨识 | 40 题问卷、科学的转化分算法、九种体质分析报告与个性化调养建议 |
| 中医理疗服务 | 刮痧/拔罐/艾灸/推拿/针灸等服务详情：功效、流程、适用人群、注意事项 |
| 产品商城 | 养生产品展示、规格选择、购物车、下单与订单管理 |
| 预约服务 | 服务选择 → 门店 → 日期时段 → 客户信息，全流程在线预约 |
| 健康档案 | 病情记录、调理历史、诊疗记录，安全存储于服务器 |
| 疾病搜索调理 | 常见病中医辨证、调理方案、食疗方剂、生活指导 |
| 穴位图解 | 按身体部位/功效检索穴位，定位、主治、按摩方法 |

**后台管理系统**：服务/商品/疾病/穴位内容管理（改动实时对小程序生效）、预约与商品订单管理、用户健康档案查看、基础配置（分类/时段/热搜）。

## 快速开始

### 1. 启动后台服务（数据保存在 MySQL）

```bash
npm run dev:mysql   # 一键启动：本地 MySQL（未运行时自动拉起）+ 后台服务（MySQL 存储）
# 仅启动后端（未配置 MYSQL_* 环境变量时自动回退 JSON 文件存储）：
npm run server
```

> 本地开发 MySQL 8.0.45 位于 `e:\mysql8`（官方二进制 + 持久数据目录 `e:\mysql8\data`，root 空密码仅限本机）。停止 MySQL：`e:\mysql8\mysql\bin\mysqladmin.exe --no-defaults -u root shutdown`

启动后：

```
管理后台:   http://localhost:3000/admin/     （默认账号 admin / admin123）
局域网访问: http://<本机IP>:3000/admin/
小程序 API: http://localhost:3000/api/
数据文件:   server/data/db.json（首次启动自动从内置数据播种）
```

环境变量可覆盖默认配置：`PORT`（端口）、`ADMIN_USER` / `ADMIN_PASS`（管理员账号密码）、`DATA_DIR`（数据库目录）。详见下文[服务器配置](#服务器配置环境变量)。

### 2. 预览小程序

在 IDE 内打开本项目，使用预览工具链生成预览二维码即可。小程序启动时会自动从服务器拉取目录数据与用户数据；**服务器未启动时自动回退本地模式，全部功能不受影响**。

真机预览/调试时，将 [src/config/api.ts](src/config/api.ts) 中的 `API_BASE_URL` 改为电脑局域网 IP（启动服务时控制台会打印），例如：

```ts
export const API_BASE_URL = 'http://192.168.1.190:3000'
```

### 3. 使用管理后台

浏览器打开 `http://localhost:3000/admin/`，默认账号 `admin` / `admin123`（可用环境变量修改）。详细操作见 [docs/ADMIN.md](docs/ADMIN.md)。

### 4. 一键部署到云服务器

```powershell
npm run deploy -- -ServerHost <服务器IP> -User root
# 预演（不实际执行）：加 -DryRun
```

自动完成：打包上传 → 远程安装/重启（自动检测 pm2，否则 nohup + PID 守护）→ 数据备份保留 → 健康检查。详见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 数据同步机制（离线优先）

```
小程序启动 ──→ GET /api/catalog           覆盖本地目录（服务/商品/疾病/穴位/分类）
         └─→ GET /api/user/<deviceId>     服务器数据为准；服务器为空时自动上行补传本地数据
用户操作   ──→ 本地立即生效 + 异步上行服务器（失败静默，下次启动自动补传）
```

- 每台设备以 `deviceId`（首次启动自动生成）区分用户数据分区，互不干扰
- 网络不可达时不影响任何功能；恢复后数据自动补传
- 所有数据持久化于 `server/data/db.json`，**备份/迁移只需拷贝该文件**

## 目录结构

```
e:\zytl
├── src/
│   ├── app.config.ts          # 全局配置（页面/tabBar）
│   ├── app.tsx                # 入口（启动时同步服务器数据）
│   ├── config/api.ts          # API 基础地址配置
│   ├── pages/                 # 18 个页面（home/service/shop/record/mine 五个 tab + 二级页）
│   ├── components/            # SectionTitle/Empty/Tag/ServiceCard/ProductCard/AcupointCard
│   ├── store/useStore.ts      # 全局状态（购物车/订单/档案/体质/资料 + 服务器上行同步）
│   ├── data/                  # 内置静态数据（服务器目录数据的默认值/兜底）
│   ├── types/                 # TypeScript 类型定义
│   └── utils/                 # storage/api/sync/constitution 工具
├── server/
│   ├── index.js               # 后台服务（REST API + 管理后台静态托管）
│   ├── db.js                  # JSON 文件数据库（原子写入）
│   ├── seed.js                # 首次启动播种（从 src/data 或随包 src-data 生成初始库）
│   ├── deploy.ps1             # 一键部署脚本（scp/ssh，支持 DryRun 预演）
│   ├── verify-api.mjs         # 接口回归验证脚本
│   ├── data/db.json           # 业务数据（自动生成）
│   └── admin/                 # 管理后台前端（原生 HTML/JS/CSS，零构建）
├── config/                    # Taro 构建配置
└── docs/                      # 文档
    ├── API.md                 # 接口文档 + 数据结构
    ├── ADMIN.md               # 管理后台使用手册
    └── DEPLOY.md              # 云服务器部署手册
```

## 页面清单

| 页面 | 路径 |
|---|---|
| 首页 / 服务 / 商城 / 档案 / 我的（tabBar） | `pages/home` `pages/service` `pages/shop` `pages/record` `pages/mine` |
| 体质测试 / 体质报告 | `pages/constitution/quiz` `pages/constitution/result` |
| 服务详情 | `pages/service/detail` |
| 商品详情 / 购物车 / 商品订单 | `pages/shop/detail` `pages/shop/cart` `pages/shop/order` |
| 预约下单 / 预约订单列表 / 预约详情 | `pages/order/create` `pages/order/list` `pages/order/detail` |
| 穴位主页 / 穴位详情 | `pages/acupoint/index` `pages/acupoint/detail` |
| 疾病搜索 / 疾病详情 | `pages/disease/index` `pages/disease/detail` |

## 服务器配置（环境变量）

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务监听端口 |
| `ADMIN_USER` | `admin` | 管理后台登录账号 |
| `ADMIN_PASS` | `admin123` | 管理后台登录密码 |
| `DATA_DIR` | `server/data` | JSON 存储模式的数据库目录，支持绝对路径 |
| `MYSQL_HOST` | 无 | 配置后启用 **MySQL 存储** |
| `MYSQL_PORT` | `3306` | MySQL 端口 |
| `MYSQL_USER` / `MYSQL_PASS` | `root` / 空 | MySQL 账号 |
| `MYSQL_DB` | `ruanquan` | 数据库名（库需预先创建，表自动建） |
| `DB_DRIVER` | 自动 | `mysql`=强制 MySQL；不设时按是否配置 `MYSQL_HOST` 自动选择 |

**数据存储说明：**

- **MySQL 模式**（推荐生产）：3 张表 `catalog_entities`（服务/门店/商品/疾病/穴位，id + JSON 载荷）、`catalog_config`（分类/时段/热搜）、`users`（按设备号分区的用户数据），首次启动自动建表；若库为空且本地存在 `db.json` 会**自动迁移**，否则播种内置数据；MySQL 连接失败自动回退 JSON 文件，服务不中断
- **JSON 模式**（默认/兜底）：单文件 `server/data/db.json`，原子写入，备份/迁移只需拷贝该文件

**配置示例（Windows PowerShell）：**

```powershell
$env:PORT = '8080'
$env:ADMIN_PASS = '强密码这里'
$env:MYSQL_HOST = '127.0.0.1'   # 配置后即使用 MySQL 存储
$env:MYSQL_USER = 'root'
$env:MYSQL_PASS = '密码'
$env:MYSQL_DB = 'ruanquan'
node server/index.js
```

**运维说明：**

- JSON 模式写入采用**原子写**（先写 `.tmp` 再替换），进程意外退出不会损坏数据；**备份**：直接拷贝 `db.json`；**重置**：删除后重启自动重新播种
- MySQL 模式备份/迁移用标准工具（`mysqldump`）；切换驱动时数据自动迁移（见上文）
- ⚠️ **中文编码防坑**：在 PowerShell 中对 mysql/mysqldump 使用管道（`|`）或重定向（`>`/`<`）会把 UTF-8 数据按 GBK 重新编码，导致中文**不可逆**变成问号。备份请用 `cmd` 的 `<`/`>` 重定向，或直接用 node 脚本（mysql2）导出 JSON。万一已损坏：清空数据库后重启后端，会自动从 `db.json`（node 原生 UTF-8，始终完好）重新迁移
- 登录 token 保存在服务端内存，重启后需重新登录

## 主题风格

新中式养生风格：朱砂红 `#c8362f` + 古金 `#b8893a` + 米白 `#f8f5f0`，定义于 [src/styles/theme.scss](src/styles/theme.scss)。

## 安全说明

- 本项目为演示/开发级实现：HTTP 明文传输、简单口令认证、JSON 文件存储
- 生产部署建议：启用 HTTPS 反向代理、更换强口令、限制 CORS 来源、敏感健康数据加密存储、定期备份 `db.json`
