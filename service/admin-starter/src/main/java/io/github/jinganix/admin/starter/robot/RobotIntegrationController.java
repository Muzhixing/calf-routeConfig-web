package io.github.jinganix.admin.starter.robot;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RobotIntegrationController {

  private final RobotIntegrationStore store;

  @PostMapping("/basicdata")
  public Map<String, Object> receiveBasicData(@RequestBody Map<String, Object> payload) {
    return ok("状态已接收", store.saveStatus(payload));
  }

  @GetMapping("/webget")
  public Map<String, Object> getStatus(@RequestParam(required = false) String deviceID) {
    return ok("查询成功", store.getStatus(deviceID));
  }

  @GetMapping("/basicdata/latest")
  public Map<String, Object> getLatestStatus(@RequestParam(required = false) String deviceID) {
    return ok("查询成功", store.getLatestStatus(deviceID));
  }

  @PostMapping("/pathSettings")
  public Map<String, Object> savePathTask(@RequestBody Map<String, Object> payload) {
    return ok("路径任务已保存", store.saveTask(payload));
  }

  @GetMapping("/tasks/active")
  public ResponseEntity<Map<String, Object>> getActiveTask(
      @RequestParam(defaultValue = "robot001") String deviceID) {
    Map<String, Object> task = store.getTask(deviceID);
    return task == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(task);
  }

  private static Map<String, Object> ok(String message, Object data) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("code", "200");
    response.put("message", message);
    response.put("data", data);
    return response;
  }
}
