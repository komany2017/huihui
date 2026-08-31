# 颐养堂后台服务 · 接口文档

- Base URL：`http://localhost:3000`（真机调试改为局域网 IP）
- 响应格式：`{ "code": 0, "data": ... }`；`code !== 0` 或非 2xx 状态码表示失败，失败时含 `msg` 字段
- 所有接口均支持 CORS（允许任意来源/方法/头），供 H5 调试使用
- 标注 **[Auth]** 的接口需要请求头 `Authorization: Bearer <token>`

---

## 一、小程序端接口（公开）

### 1.1 获取目录数据

```
GET /api/catalog
```

返回后台管理的全部目录内容（后台修改后小程序启动时自动拉取覆盖）：

```jsonc
{
  "code": 0,
  "data": {
    "services": [ /* ServiceItem[]，见 3.1 */ ],
    "stores": [ /* Store[]，见 3.2 */ ],
    "timeSlots": ["09:00-10:00", "10:00-11:00", ...],
    "products": [ /* Product[]，见 3.3 */ ],
    "diseases": [ /* Disease[]，见 3.4 */ ],
    "acupoints": [ /* Acupoint[]，见 3.5 */ ],
    "categories": {
      "service": [{ "id": "all", "name": "全部" }, ...],
      "product": [...],
      "disease": [...]
    },
    "hotDiseases": ["感冒", "失眠", ...]
  }
}
```

### 1.2 用户数据

用户以 `deviceId`（小程序首次启动自动生成并本地持久化）区分，无需登录。

**获取用户全量数据**

```
GET /api/user/:deviceId
```

```jsonc
{
  "code": 0,
  "data": {
    "profile": { ... },              // UserProfile | null
    "bookingOrders": [ ... ],        // 预约订单，新的在前
    "productOrders": [ ... ],        // 商品订单
    "constitutionResults": [ ... ],  // 体质报告
    "healthRecords": [ ... ]         // 健康档案
  }
}
```

**更新用户资料**

```
PUT /api/user/:deviceId/profile
Body: { "name": "张三", "gender": "male", "age": 30, ... }   // 合并写入，自动更新 updatedAt
```

**创建预约订单**（`id` 必填，客户端生成；重复提交按 id 覆盖）

```
POST /api/user/:deviceId/booking-orders
Body: BookingOrder
```

**修改预约订单**（局部更新）

```
PATCH /api/user/:deviceId/booking-orders/:orderId
Body: { "status": "confirmed" }
```

**创建商品订单 / 修改商品订单**

```
POST  /api/user/:deviceId/product-orders          Body: ProductOrder
PATCH /api/user/:deviceId/product-orders/:orderId Body: { "status": "shipped" }
```

**保存体质报告**（同一 id 重新提交会覆盖旧记录）

```
POST /api/user/:deviceId/constitution-results
Body: ConstitutionResult
```

**新增 / 删除健康档案**

```
POST   /api/user/:deviceId/health-records              Body: HealthRecord
DELETE /api/user/:deviceId/health-records/:recordId
```

### 1.3 健康检查

```
GET /api/health   →  { "code": 0, "data": { "ok": true, "time": "..." } }
```

---

## 二、后台管理接口

### 2.1 登录

```
POST /api/admin/login
Body: { "username": "admin", "password": "admin123" }
→  { "code": 0, "data": { "token": "<48位hex>" } }
```

- 账号密码可用环境变量 `ADMIN_USER` / `ADMIN_PASS` 覆盖
- token 保存在服务端内存，服务重启后失效（客户端需重新登录）

### 2.2 概览与用户

```
GET /api/admin/overview
→  { "userCount", "bookingOrders", "productOrders", "healthRecords",
     "constitutionResults", "serviceCount", "productCount", "diseaseCount", "acupointCount" }

GET /api/admin/users
→  [{ "deviceId", "profile", "counts": { bookingOrders, productOrders, healthRecords, constitutionResults } }]

GET /api/admin/user/:deviceId
→  该用户全量数据（同 1.2 结构）
```

### 2.3 订单管理

```
GET /api/admin/orders?type=booking|product
→  全部用户的订单（含 deviceId 字段），按 createdAt 倒序

PATCH /api/admin/order/:deviceId/:type/:orderId
Body: { "status": "..." }      // booking: pending/confirmed/completed/cancelled
                               // product: unpaid/paid/shipped/completed/cancelled
```

### 2.4 目录内容管理（CRUD）

```
GET    /api/admin/catalog/:type          列表
POST   /api/admin/catalog/:type          新增（body 为完整对象，id 必填且唯一）
PUT    /api/admin/catalog/:type/:id      更新（局部合并）
DELETE /api/admin/catalog/:type/:id      删除
```

`:type` 取值：`services` | `stores` | `products` | `diseases` | `acupoints`

### 2.5 基础配置

```
PUT /api/admin/catalog/timeSlots      Body: { "items": ["09:00-10:00", ...] }     整体替换
PUT /api/admin/catalog/hotDiseases    Body: { "items": ["感冒", ...] }            整体替换
PUT /api/admin/catalog/categories     Body: { "kind": "service|product|disease", "items": [{id,name}] }
```

---

## 三、数据结构

### 3.1 ServiceItem（理疗服务）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 唯一 ID，如 `s001` |
| name / category / cover | string | 名称 / 分类（刮痧、拔罐…）/ 封面图 URL |
| price / originalPrice? / duration | number | 价格 / 原价 / 时长（分钟） |
| intro | string | 简介 |
| efficacy / suitable / caution | string[] | 功效 / 适用人群 / 注意事项 |
| steps | `{title, desc}[]` | 服务流程 |
| popular | boolean | 是否热门 |

### 3.2 Store（门店）

`id` `name` `address` `phone` `distance`(km) `businessHours` `cover`

### 3.3 Product（商品）

| 字段 | 类型 | 说明 |
|---|---|---|
| id / name / category / cover / unit | string | 基础信息 |
| price / originalPrice? / sales | number | 价格 / 原价 / 销量 |
| tags | string[] | 标签 |
| description / efficacy / usage | string | 详情 / 功效 / 用法 |
| specs | `{id, name, price, stock}[]` | 规格列表 |
| detailImages | string[] | 详情图 |
| hot | boolean | 热销 |

### 3.4 Disease（疾病）

`id` `name` `alias?` `category`（内科/妇科/儿科/外科）`symptoms[]` `tcmDiagnosis`（中医辨证）`tcmTreatment[]`（调理方案）`diet[]`（食疗方案）`dietRecipes[]`（`{name, ingredients, method, effect}`）`lifestyle[]`（生活指导）`precautions[]`（注意事项）`cover`

### 3.5 Acupoint（穴位）

`id` `name` `alias?` `part`（head/neck/back/chest/abdomen/limb）`meridian`（经络）`location`（定位）`effect[]`（功效）`massage`（按摩方法）`indication[]`（主治）`caution`（注意事项）`cover`

### 3.6 BookingOrder（预约订单）

| 字段 | 说明 |
|---|---|
| id / createdAt | 订单号（客户端 `bo` 前缀生成）/ 创建时间 |
| serviceId / serviceName / serviceCover / price | 服务快照 |
| storeId / storeName / storeAddress | 门店快照 |
| date / time | 预约日期 `YYYY-MM-DD` / 时段 |
| customerName / customerPhone / remark | 客户信息 |
| status | `pending` 待确认 → `confirmed` 已确认 → `completed` 已完成；任意状态可 `cancelled` 已取消 |

### 3.7 ProductOrder（商品订单）

| 字段 | 说明 |
|---|---|
| id / createdAt | 订单号（`po` 前缀）/ 下单时间 |
| items | `CartItem[]`：`{productId, productName, productCover, specId, specName, price, quantity}` |
| totalAmount | 订单总金额 |
| receiver / phone / address / remark | 收货信息 |
| status | `unpaid` 待付款 / `paid` 已付款 / `shipped` 已发货 / `completed` 已完成 / `cancelled` 已取消 |

### 3.8 ConstitutionResult（体质报告）

`id` `date`（测试时间）`primary`（主要体质）`secondary?`（兼夹体质）`scores`（九种体质转化分 `pinghe/qixu/yangxu/yinxu/tanshi/shire/xueyu/qiyu/tebing` → 0-100）`infos`（排序后的体质详情，含调养建议）

### 3.9 HealthRecord / UserProfile（健康档案）

```jsonc
// HealthRecord
{ "id": "hr...", "date": "ISO时间", "type": "condition|treatment|medical|constitution",
  "title": "标题", "content": "内容", "details": { } }

// UserProfile
{ "name": "昵称", "gender": "male|female|unknown", "age": 30, "height": 170, "weight": 60,
  "bloodType": "A", "allergy": "无", "chronicDisease": "无", "updatedAt": "ISO时间" }
```

### 3.10 服务器存储文件（server/data/db.json）

```jsonc
{
  "catalog": {                      // 全局目录（后台管理，小程序共享）
    "services": [], "stores": [], "timeSlots": [], "products": [],
    "diseases": [], "acupoints": [],
    "categories": { "service": [], "product": [], "disease": [] },
    "hotDiseases": []
  },
  "users": {                        // 按 deviceId 分区的用户数据
    "u_xxx": {
      "profile": null,
      "bookingOrders": [],
      "productOrders": [],
      "constitutionResults": [],
      "healthRecords": []
    }
  }
}
```

> 首次启动服务时，`seed.js` 自动解析小程序静态数据（`src/data/*.ts`）生成初始库；之后一切以 `db.json` 为准。

---

## 四、错误码约定

| HTTP | code | 含义 |
|---|---|---|
| 200 | 0 | 成功 |
| 400 | 1 | 参数错误（缺 id 等） |
| 401 | 1 | 未登录 / token 失效 / 账号密码错误 |
| 404 | 1 | 接口或记录不存在 |
| 500 | 1 | 服务器内部错误 |
