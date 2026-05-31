package io.github.jinganix.admin.starter.robot;

import io.github.jinganix.admin.starter.helper.utils.UtilsService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class RobotMapService {

  public static final String ACTIVE_MAP_ID = "calf-map-001";

  private final ObjectMapper objectMapper = new ObjectMapper();

  private final RobotMapConfigRepository mapRepository;

  private final RobotRoutePlanRepository planRepository;

  private final UtilsService utilsService;

  @Value("${calf.map.storage-dir:/home/firecom/calf-deploy/data/maps}")
  private String storageDir;

  public List<Map<String, Object>> listMaps() {
    ensureDefaultMap();
    return mapRepository.findAll().stream()
        .sorted(Comparator.comparing((RobotMapConfig entity) -> entityUpdatedAt(entity)).reversed())
        .map(this::toResponse)
        .toList();
  }

  public Map<String, Object> createMap(Map<String, Object> payload) {
    String mapId = stringValue(payload.get("mapID"), "map-" + UUID.randomUUID());
    RobotMapConfig current = mapRepository.findById(mapId).orElseGet(() -> defaultConfig(mapId));
    Map<String, Object> config = readJson(current.getConfigJson());
    config.putAll(payload);
    config.put("mapID", mapId);
    config.putIfAbsent("name", "未命名平面图");
    config.putIfAbsent("currentStep", "upload");
    long now = utilsService.currentTimeMillis();
    current.setMapId(mapId).setConfigJson(writeJson(config)).setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toResponse(mapRepository.save(current));
  }

  public Map<String, Object> getActiveMap() {
    return getMap(ACTIVE_MAP_ID);
  }

  public Map<String, Object> getMap(String mapId) {
    return toResponse(mapRepository.findById(mapId).orElseGet(() -> defaultConfig(mapId)));
  }

  @Transactional
  public Map<String, Object> deleteMap(String mapId) throws IOException {
    RobotMapConfig current = mapRepository.findById(mapId).orElse(null);
    if (current == null) {
      return Map.of("mapID", mapId, "deleted", false);
    }
    planRepository.deleteByMapId(mapId);
    mapRepository.delete(current);
    if (current.getImagePath() != null) {
      Files.deleteIfExists(Path.of(current.getImagePath()));
    }
    return Map.of("mapID", mapId, "deleted", true);
  }

  public Map<String, Object> saveActiveMap(Map<String, Object> payload) {
    return saveMap(ACTIVE_MAP_ID, payload);
  }

  public Map<String, Object> saveMap(String mapId, Map<String, Object> payload) {
    RobotMapConfig current = mapRepository.findById(mapId).orElseGet(() -> defaultConfig(mapId));
    Map<String, Object> config = new LinkedHashMap<>(payload);
    config.put("mapID", mapId);
    config.putIfAbsent("name", "未命名平面图");
    if (current.getImagePath() != null) {
      config.put("imageUrl", "/api/maps/" + mapId + "/image");
    }
    long now = utilsService.currentTimeMillis();
    current.setMapId(mapId).setConfigJson(writeJson(config)).setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toResponse(mapRepository.save(current));
  }

  public Map<String, Object> saveActiveImage(MultipartFile file) throws IOException {
    return saveImage(ACTIVE_MAP_ID, file);
  }

  public Map<String, Object> saveImage(String mapId, MultipartFile file) throws IOException {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("image file is empty");
    }
    String contentType = file.getContentType() == null ? "" : file.getContentType();
    if (!contentType.startsWith("image/")) {
      throw new IllegalArgumentException("only image uploads are supported");
    }

    Path dir = Path.of(storageDir).toAbsolutePath().normalize();
    Files.createDirectories(dir);
    String extension = extension(file.getOriginalFilename(), contentType);
    Path imagePath = dir.resolve(mapId + extension).normalize();
    if (!imagePath.startsWith(dir)) {
      throw new IllegalArgumentException("invalid upload path");
    }
    file.transferTo(imagePath);

    RobotMapConfig current = mapRepository.findById(mapId).orElseGet(() -> defaultConfig(mapId));
    Map<String, Object> config = readJson(current.getConfigJson());
    config.put("mapID", mapId);
    config.putIfAbsent("name", "未命名平面图");
    config.put("imageUrl", "/api/maps/" + mapId + "/image");
    long now = utilsService.currentTimeMillis();
    current
        .setMapId(mapId)
        .setImagePath(imagePath.toString())
        .setConfigJson(writeJson(config))
        .setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toResponse(mapRepository.save(current));
  }

  public Resource imageResource(String mapId) {
    RobotMapConfig current = mapRepository.findById(mapId).orElse(null);
    if (current == null || current.getImagePath() == null) {
      return null;
    }
    FileSystemResource resource = new FileSystemResource(current.getImagePath());
    return resource.exists() ? resource : null;
  }

  public MediaType imageMediaType(String mapId) throws IOException {
    Resource resource = imageResource(mapId);
    if (resource == null || resource.getFile() == null) {
      return MediaType.APPLICATION_OCTET_STREAM;
    }
    String type = Files.probeContentType(resource.getFile().toPath());
    return type == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(type);
  }

  public List<Map<String, Object>> listPlans(String mapId) {
    ensureDefaultPlan(mapId);
    return planRepository.findByMapId(mapId).stream()
        .sorted(Comparator.comparing((RobotRoutePlan entity) -> entityUpdatedAt(entity)).reversed())
        .map(this::toPlanResponse)
        .toList();
  }

  public Map<String, Object> createPlan(String mapId, Map<String, Object> payload) {
    String planId = stringValue(payload.get("planID"), "plan-" + UUID.randomUUID());
    RobotRoutePlan current =
        planRepository.findById(planId).orElseGet(() -> defaultPlan(mapId, planId));
    Map<String, Object> config = readJson(current.getPlanJson());
    config.putAll(payload);
    config.put("mapID", mapId);
    config.put("planID", planId);
    config.putIfAbsent("name", "未命名路线方案");
    config.putIfAbsent("targetIslandIDs", List.of());
    config.putIfAbsent("robotPath", List.of());
    long now = utilsService.currentTimeMillis();
    current
        .setPlanId(planId)
        .setMapId(mapId)
        .setPlanName(stringValue(config.get("name"), "未命名路线方案"))
        .setPlanJson(writeJson(config))
        .setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toPlanResponse(planRepository.save(current));
  }

  public Map<String, Object> getPlan(String mapId, String planId) {
    RobotRoutePlan plan = planRepository.findById(planId).orElseGet(() -> defaultPlan(mapId, planId));
    if (!mapId.equals(plan.getMapId())) {
      throw new IllegalArgumentException("route plan does not belong to map");
    }
    return toPlanResponse(plan);
  }

  public Map<String, Object> savePlan(String mapId, String planId, Map<String, Object> payload) {
    RobotRoutePlan current =
        planRepository.findById(planId).orElseGet(() -> defaultPlan(mapId, planId));
    if (!mapId.equals(current.getMapId())) {
      throw new IllegalArgumentException("route plan does not belong to map");
    }
    Map<String, Object> config = new LinkedHashMap<>(payload);
    config.put("mapID", mapId);
    config.put("planID", planId);
    config.putIfAbsent("name", "未命名路线方案");
    config.putIfAbsent("targetIslandIDs", List.of());
    config.putIfAbsent("robotPath", List.of());
    long now = utilsService.currentTimeMillis();
    current
        .setPlanId(planId)
        .setMapId(mapId)
        .setPlanName(stringValue(config.get("name"), "未命名路线方案"))
        .setPlanJson(writeJson(config))
        .setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toPlanResponse(planRepository.save(current));
  }

  private void ensureDefaultMap() {
    if (mapRepository.count() == 0) {
      mapRepository.save(defaultConfig(ACTIVE_MAP_ID));
    }
  }

  private void ensureDefaultPlan(String mapId) {
    if (!ACTIVE_MAP_ID.equals(mapId) || !planRepository.findByMapId(mapId).isEmpty()) {
      return;
    }
    if (mapRepository.findById(mapId).isPresent()) {
      planRepository.save(defaultPlan(mapId, "plan-default-" + mapId));
    }
  }

  private RobotMapConfig defaultConfig(String mapId) {
    Map<String, Object> config = new LinkedHashMap<>();
    config.put("mapID", mapId);
    config.put("name", ACTIVE_MAP_ID.equals(mapId) ? "默认犊牛岛区平面图" : "未命名平面图");
    config.put("currentStep", "upload");
    config.put("calibration", null);
    config.put("zones", List.of());
    config.put("islands", List.of());
    config.put("roadGraph", Map.of("nodes", List.of(), "edges", List.of()));
    long now = utilsService.currentTimeMillis();
    RobotMapConfig entity = new RobotMapConfig().setMapId(mapId).setConfigJson(writeJson(config));
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);
    return entity;
  }

  private RobotRoutePlan defaultPlan(String mapId, String planId) {
    Map<String, Object> config = new LinkedHashMap<>();
    config.put("planID", planId);
    config.put("mapID", mapId);
    config.put("name", "默认路线方案");
    config.put("targetIslandIDs", List.of());
    config.put("feedAmount", 500);
    config.put("robotPath", List.of());
    long now = utilsService.currentTimeMillis();
    RobotRoutePlan entity =
        new RobotRoutePlan()
            .setPlanId(planId)
            .setMapId(mapId)
            .setPlanName("默认路线方案")
            .setPlanJson(writeJson(config));
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);
    return entity;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> readJson(String json) {
    if (json == null || json.isBlank()) {
      return new LinkedHashMap<>();
    }
    try {
      return objectMapper.readValue(json, LinkedHashMap.class);
    } catch (Exception e) {
      throw new IllegalStateException("failed to parse robot config", e);
    }
  }

  private String writeJson(Map<String, Object> config) {
    try {
      return objectMapper.writeValueAsString(config);
    } catch (Exception e) {
      throw new IllegalStateException("failed to serialize robot config", e);
    }
  }

  private Map<String, Object> toResponse(RobotMapConfig current) {
    Map<String, Object> config = readJson(current.getConfigJson());
    config.put("mapID", current.getMapId());
    config.putIfAbsent("name", "未命名平面图");
    if (current.getImagePath() != null) {
      config.put("imageUrl", "/api/maps/" + current.getMapId() + "/image");
    }
    config.put("createdAt", current.getCreatedAt());
    config.put("updatedAt", current.getUpdatedAt());
    return config;
  }

  private Map<String, Object> toPlanResponse(RobotRoutePlan current) {
    Map<String, Object> config = readJson(current.getPlanJson());
    config.put("planID", current.getPlanId());
    config.put("mapID", current.getMapId());
    config.putIfAbsent("name", stringValue(current.getPlanName(), "未命名路线方案"));
    config.put("createdAt", current.getCreatedAt());
    config.put("updatedAt", current.getUpdatedAt());
    return config;
  }

  private long entityUpdatedAt(RobotMapConfig entity) {
    return entity.getUpdatedAt() == null ? 0 : entity.getUpdatedAt();
  }

  private long entityUpdatedAt(RobotRoutePlan entity) {
    return entity.getUpdatedAt() == null ? 0 : entity.getUpdatedAt();
  }

  private static String stringValue(Object value, String fallback) {
    if (value == null) {
      return fallback;
    }
    String text = String.valueOf(value);
    return text.isBlank() ? fallback : text;
  }

  private static String extension(String filename, String contentType) {
    if (filename != null) {
      int index = filename.lastIndexOf('.');
      if (index >= 0 && index < filename.length() - 1) {
        String ext = filename.substring(index).toLowerCase();
        if (ext.matches("\\.(png|jpg|jpeg|webp|gif)")) {
          return ext;
        }
      }
    }
    return switch (contentType) {
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/gif" -> ".gif";
      default -> ".jpg";
    };
  }
}
