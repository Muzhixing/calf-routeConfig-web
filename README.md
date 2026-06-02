# 犊牛岛智能投喂车管理端

本仓库是犊牛岛智能投喂车项目的 1.0 管理端与板卡对接服务。系统对外提供一个管理入口，支持管理员维护犊牛岛区平面图、生成可复用路线方案、下发投喂任务、查看板卡视频识别画面，并接收板卡状态与任务拉取请求。

项目基于 `admin-starter` 管理后台框架扩展，保留用户、角色、权限、审计等基础后台能力；当前项目相关功能集中在 `robot` 后端模块和管理端三个页面。

## 1.0 功能范围

- 路径规划：导入 2D 犊牛岛区平面图，两点标定比例尺，标注区域、投喂停靠点和通道网络。
- 批量投喂点：支持用左上/右上端点、行数、每行数量均分生成投喂点；多行可补充左下/右下端点降低累计误差。
- 路线方案：从目标犊牛岛生成可下发路径，路线方案保存到 MySQL，可重复用于不同投喂任务。
- 投喂任务：选择地图、路线方案、车辆和投喂量后下发任务，板卡通过接口拉取当前任务。
- 视频识别：浏览器连接 WebRTC 信令，接收板卡原始视频，并根据 metadata 在前端叠加检测框。
- 板卡状态：接收设备在线状态、实时坐标、任务状态、投喂状态、牛奶/饮水余量、STM32 状态等字段。
- 单入口部署：生产环境可将管理页面、REST API 和 WebSocket 信令统一挂在 `5173` 端口。

## 目录结构

```text
frontend/admin                         管理端 React 前端
frontend/admin/src/pages/route-planner.page.tsx
                                       路径规划页面
frontend/admin/src/pages/feeding-tasks.page.tsx
                                       投喂任务页面
frontend/admin/src/pages/live-viewer.page.tsx
                                       视频识别页面
frontend/admin/src/pages/robot-map.shared.ts
                                       地图、车辆、路线生成共享逻辑
service/admin-starter                  Spring Boot 后端
service/admin-starter/src/main/java/io/github/jinganix/admin/starter/robot
                                       板卡状态、地图方案、WebRTC 信令接口
service/admin-starter/src/main/resources/db/migration
                                       Flyway 数据库表结构
proto                                  WebPB/管理端基础接口定义
```

## 前端页面

| 路由 | 功能 |
| --- | --- |
| `/route-planner` | 导入平面图、两点标定、区域/投喂点/通道标注、生成路线方案 |
| `/feeding-tasks` | 选择地图和路线方案，选择车辆与投喂参数，下发板卡任务 |
| `/live-viewer` | WebRTC 视频观看，浏览器端叠加检测 metadata |
| `/dashboard` | 后台首页 |
| `/users`、`/roles`、`/permissions`、`/audits` | 系统用户、角色、权限、审计 |

## 板卡对接地址

生产部署建议给板卡配置以下地址，域名或 IP 按实际服务器替换：

```env
STATUS_PUSH_URL=http://<server>:5173/api/basicdata
TASK_PULL_URL=http://<server>:5173/api/tasks/active?deviceID={deviceID}
WEBRTC_SIGNAL_URL=ws://<server>:5173/ws/python
WEBRTC_PEER_ID=browser
```

## REST API

所有业务响应一般采用以下包装结构：

```json
{
  "code": "200",
  "message": "查询成功",
  "data": {}
}
```

### 板卡状态与任务

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/basicdata` | 板卡上报设备状态、位置、余量、检测距离等 |
| `GET` | `/api/webget?deviceID=robot001` | 前端查询指定设备状态；不传 `deviceID` 时返回全部设备 |
| `GET` | `/api/basicdata/latest?deviceID=robot001` | 查询最新设备状态 |
| `POST` | `/api/pathSettings` | 投喂任务页提交路线任务 |
| `GET` | `/api/tasks/active?deviceID=robot001` | 板卡拉取当前有效任务；无任务时返回 `204` |

板卡状态示例：

```json
{
  "deviceID": "robot001",
  "status": true,
  "location_x": 12.5,
  "location_y": 8.0,
  "taskID": "task-001",
  "taskState": "running",
  "currentSeq": 5,
  "milkRemainingMl": 8200,
  "milkCapacityMl": 12000,
  "waterRemainingMl": 5000,
  "waterCapacityMl": 8000,
  "stm32State": "ok",
  "distance_m": 0.532
}
```

路线任务示例：

```json
{
  "taskID": "task-001",
  "deviceID": "robot001",
  "mapID": "calf-map-001",
  "planID": "plan-001",
  "targetIslandIDs": ["A1", "A2", "A3"],
  "feedAmount": 500,
  "robotPath": [
    {"seq": 1, "x": 10.0, "y": 2.0, "action": "start"},
    {"seq": 2, "x": 12.0, "y": 2.0, "action": "pass"},
    {"seq": 3, "x": 12.0, "y": 5.0, "action": "feed", "targetIslandID": "A1", "feedAmount": 500}
  ]
}
```

### 地图与路线方案

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/maps` | 查询历史平面图列表 |
| `POST` | `/api/maps` | 新建地图草稿 |
| `GET` | `/api/maps/{mapID}` | 读取地图配置 |
| `PATCH` | `/api/maps/{mapID}` | 自动保存地图标注 |
| `DELETE` | `/api/maps/{mapID}` | 删除地图及该地图下路线方案 |
| `POST` | `/api/maps/{mapID}/image` | 上传平面图图片，字段名 `file` |
| `GET` | `/api/maps/{mapID}/image` | 读取平面图图片 |
| `GET` | `/api/maps/{mapID}/plans` | 查询地图下路线方案 |
| `POST` | `/api/maps/{mapID}/plans` | 新建路线方案 |
| `GET` | `/api/maps/{mapID}/plans/{planID}` | 读取路线方案 |
| `PATCH` | `/api/maps/{mapID}/plans/{planID}` | 自动保存路线方案 |
| `GET` | `/api/maps/active` | 兼容接口：读取默认地图 |
| `POST` | `/api/maps/active` | 兼容接口：保存默认地图 |
| `POST` | `/api/maps/active/image` | 兼容接口：上传默认地图图片 |

地图核心结构：

```json
{
  "mapID": "calf-map-001",
  "name": "一号犊牛岛区",
  "imageUrl": "/api/maps/calf-map-001/image",
  "calibration": {
    "p1": {"px": 120, "py": 80, "x": 0.0, "y": 0.0},
    "p2": {"px": 1380, "py": 920, "x": 63.0, "y": 42.0}
  },
  "zones": [{"id": "A", "name": "A区", "polygon": [{"x": 1.2, "y": 2.3}]}],
  "islands": [
    {"id": "A1", "zoneID": "A", "center": {"x": 3.0, "y": 6.5}, "servicePoint": {"x": 3.0, "y": 6.5}}
  ],
  "roadGraph": {
    "nodes": [{"id": "n1", "x": 0.0, "y": 0.0}],
    "edges": [{"id": "e1", "from": "n1", "to": "n2", "type": "main"}]
  }
}
```

## WebRTC 信令

后端提供 WebSocket 信令转发：

```text
ws://<server>:5173/ws/python
ws://<server>:5173/ws/browser
```

信令消息中可以带 `to` 字段指定目标端：

```json
{
  "to": "browser",
  "type": "offer",
  "sdp": "..."
}
```

如果不传 `to`，后端默认在 `python` 和 `browser` 之间互相转发。视频建议由板卡推送未画框原始帧，检测框、距离、置信度、帧时间戳等 metadata 通过 DataChannel 或 WebSocket 同步给浏览器叠加。

检测 metadata 示例：

```json
{
  "deviceID": "robot001",
  "frame_id": 10241,
  "frame_ts": 1710000000.123,
  "image": {"width": 1280, "height": 720, "source": "left_rectified"},
  "detected": true,
  "distance_m": 0.532,
  "detections": [
    {"label": "bucket", "score": 0.91, "bbox": {"left": 120, "top": 80, "right": 360, "bottom": 420}}
  ]
}
```

## 数据库与文件存储

- MySQL 表：
  - `robot_map_config`：地图底图路径与地图配置 JSON。
  - `robot_route_plan`：路线方案 JSON。
- 图片存储目录默认值：

```properties
calf.map.storage-dir=/home/firecom/calf-deploy/data/maps
```

可通过 Spring 配置覆盖该目录。

## 本地运行

依赖：

- JDK 21
- Node.js，版本见 `.tool-versions`
- MySQL
- Redis

后端：

```shell
./gradlew service:admin-starter:bootRun
```

前端：

```shell
cd frontend/admin
npm install
npm start
```

默认后端端口为 `8080`，前端 Vite 开发端口按本机可用端口启动。生产环境可以通过统一入口代理 `/sys/*`、`/api/*`、`/ws/*` 和前端静态资源。

## 构建

前端：

```shell
cd frontend/admin
npm run build
```

后端：

```shell
./gradlew service:admin-starter:bootJar
```

Docker Compose 会启动 MySQL、Redis 和后端服务：

```shell
docker-compose up --build
```

## 1.0 交付说明

本版本主分支包含：

- `5173` 单入口管理端整合。
- 路径规划、投喂任务、视频识别三个一级功能。
- 板卡状态上报、任务下发/拉取、WebRTC 信令。
- 地图与路线方案持久化。

板卡侧只需要按接口契约推送状态、拉取任务、连接信令服务即可，不需要在本地渲染检测框。
