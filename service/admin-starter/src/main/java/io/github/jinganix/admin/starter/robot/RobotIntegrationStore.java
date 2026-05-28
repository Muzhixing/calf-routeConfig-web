package io.github.jinganix.admin.starter.robot;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;

@Service
public class RobotIntegrationStore {

  private static final String DEFAULT_DEVICE_ID = "robot001";

  private final ConcurrentMap<String, Map<String, Object>> latestStatus = new ConcurrentHashMap<>();

  private final ConcurrentMap<String, Map<String, Object>> activeTasks = new ConcurrentHashMap<>();

  public Map<String, Object> saveStatus(Map<String, Object> payload) {
    Map<String, Object> status = new LinkedHashMap<>(payload);
    String deviceId = stringValue(status.get("deviceID"), DEFAULT_DEVICE_ID);
    status.put("deviceID", deviceId);
    status.putIfAbsent("lastOnlineTime", Instant.now().toString());
    status.put("serverReceivedAt", Instant.now().toString());
    latestStatus.put(deviceId, status);
    return status;
  }

  public Object getStatus(String deviceId) {
    if (deviceId != null && !deviceId.isBlank()) {
      return latestStatus.get(deviceId);
    }
    return new ArrayList<>(latestStatus.values());
  }

  public Map<String, Object> getLatestStatus(String deviceId) {
    Object status = getStatus(deviceId);
    if (status instanceof Map<?, ?> map) {
      return typedMap(map);
    }
    List<Map<String, Object>> values = new ArrayList<>(latestStatus.values());
    return values.isEmpty() ? null : values.get(values.size() - 1);
  }

  public Map<String, Object> saveTask(Map<String, Object> payload) {
    Map<String, Object> task = normalizeTask(payload);
    String deviceId = stringValue(task.get("deviceID"), DEFAULT_DEVICE_ID);
    activeTasks.put(deviceId, task);
    return task;
  }

  public Map<String, Object> getTask(String deviceId) {
    return activeTasks.get(stringValue(deviceId, DEFAULT_DEVICE_ID));
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> normalizeTask(Map<String, Object> payload) {
    Map<String, Object> task = new LinkedHashMap<>(payload);
    Object nestedData = task.get("data");
    if (nestedData instanceof Map<?, ?> nestedMap) {
      task = typedMap(nestedMap);
    }

    String deviceId = stringValue(task.get("deviceID"), DEFAULT_DEVICE_ID);
    String taskId = stringValue(task.get("taskID"), "task-" + System.currentTimeMillis());
    double gridScaleM = doubleValue(task.get("gridScaleM"), 0.5);
    Object rawPath = task.getOrDefault("robotPath", task.get("robotpath"));

    List<Map<String, Object>> robotPath = new ArrayList<>();
    if (rawPath instanceof List<?> list) {
      for (int i = 0; i < list.size(); i++) {
        Object item = list.get(i);
        if (item instanceof Map<?, ?> pointMap) {
          robotPath.add(normalizePoint(typedMap(pointMap), i + 1, gridScaleM));
        }
      }
    }
    robotPath.sort(Comparator.comparingInt(point -> intValue(point.get("seq"), 0)));

    Map<String, Object> normalized = new LinkedHashMap<>();
    normalized.put("taskID", taskId);
    normalized.put("deviceID", deviceId);
    normalized.put("gridScaleM", gridScaleM);
    if (task.get("mapID") != null) {
      normalized.put("mapID", task.get("mapID"));
    }
    if (task.get("targetIslandIDs") instanceof List<?> targetIslandIds) {
      normalized.put("targetIslandIDs", targetIslandIds);
    }
    normalized.put("robotPath", robotPath);
    normalized.put("taskState", "pending");
    normalized.put("updatedAt", Instant.now().toString());
    return normalized;
  }

  private Map<String, Object> normalizePoint(
      Map<String, Object> point, int fallbackSeq, double gridScaleM) {
    Map<String, Object> normalized = new LinkedHashMap<>(point);
    int seq = intValue(normalized.get("seq"), fallbackSeq);
    int row = intValue(normalized.get("row"), 0);
    int col = intValue(normalized.get("col"), 0);
    normalized.put("seq", seq);
    normalized.put("row", row);
    normalized.put("col", col);
    normalized.put("x", doubleValue(normalized.get("x"), col * gridScaleM));
    normalized.put("y", doubleValue(normalized.get("y"), row * gridScaleM));
    normalized.putIfAbsent("action", seq == 1 ? "start" : "pass");
    return normalized;
  }

  private static Map<String, Object> typedMap(Map<?, ?> source) {
    Map<String, Object> data = new LinkedHashMap<>();
    source.forEach((key, value) -> data.put(String.valueOf(key), value));
    return data;
  }

  private static String stringValue(Object value, String fallback) {
    if (value == null) {
      return fallback;
    }
    String text = String.valueOf(value);
    return text.isBlank() ? fallback : text;
  }

  private static int intValue(Object value, int fallback) {
    if (value instanceof Number number) {
      return number.intValue();
    }
    try {
      return value == null ? fallback : Integer.parseInt(String.valueOf(value));
    } catch (NumberFormatException ignored) {
      return fallback;
    }
  }

  private static double doubleValue(Object value, double fallback) {
    if (value instanceof Number number) {
      return number.doubleValue();
    }
    try {
      return value == null ? fallback : Double.parseDouble(String.valueOf(value));
    } catch (NumberFormatException ignored) {
      return fallback;
    }
  }
}
