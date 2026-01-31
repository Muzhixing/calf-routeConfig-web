# 后端启动命令
`gradlew.bat service:admin-starter:bootRun`

# 仅信令模式（无需数据库）
```bash
java -Dloader.main=io.github.jinganix.admin.starter.SignalOnlyApplication \
  -jar service/admin-starter/build/libs/admin-starter-service.jar \
  --server.port=8081
```

WebSocket 信令地址：
`ws://<host>:8081/ws`
# 前端启动命令
`npm start`

在 service/admin-starter 下新增业务模块（Controller、Service、Repository）

在 frontend/admin/src/pages 下新增页面组件

配合现有权限系统即可快速扩展后台功能
