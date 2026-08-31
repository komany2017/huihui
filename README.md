# 颐养堂 · 中医健康服务小程序

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

### 1. 启动后台服务（数据保存在服务器）

```bash
node server/index.js
# 或
npm run server
```

启动后：

```
管理后台:   http://localhost:3000/admin/     （默认账号 admin / admin123）
局域网访问: http://<本机IP>:3000/admin/
小程序 API: http://localhost:3000/api/
数据文件:   server/data/db.json（首次启动自动从内置数据播种）
```

环境变量可覆盖默认配置：`PORT`（端口）、`ADMIN_USER` / `ADMIN_PASS`（管理员账号密码）。

### 2. 预览小程序

在 IDE 内打开本项目，使用预览工具链生成预览二维码即可。小程序启动时会自动从服务器拉取目录数据与用户数据；**服务器未启动时自动回退本地模式，全部功能不受影响**。

真机预览/调试时，将 [src/config/api.ts](src/config/api.ts) 中的 `API_BASE_URL` 改为电脑局域网 IP（启动服务时控制台会打印），例如：

```ts
export const API_BASE_URL = 'http://192.168.1.190:3000'
```

### 3. 使用管理后台

浏览器打开 `http://localhost:3000/admin/`，默认账号 `admin` / `admin123`（可用环境变量修改）。详细操作见 [docs/ADMIN.md](docs/ADMIN.md)。

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
│   ├── seed.js                # 首次启动播种（从 src/data 生成初始库）
│   ├── data/db.json           # 业务数据（自动生成）
│   └── admin/                 # 管理后台前端（原生 HTML/JS/CSS，零构建）
├── config/                    # Taro 构建配置
└── docs/                      # 文档
    ├── API.md                 # 接口文档 + 数据结构
    └── ADMIN.md               # 管理后台使用手册
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

## 主题风格

新中式养生风格：朱砂红 `#c8362f` + 古金 `#b8893a` + 米白 `#f8f5f0`，定义于 [src/styles/theme.scss](src/styles/theme.scss)。

## 安全说明

- 本项目为演示/开发级实现：HTTP 明文传输、简单口令认证、JSON 文件存储
- 生产部署建议：启用 HTTPS 反向代理、更换强口令、限制 CORS 来源、敏感健康数据加密存储、定期备份 `db.json`
