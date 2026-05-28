package io.github.jinganix.admin.starter.robot;

import io.github.jinganix.admin.starter.helper.utils.UtilsService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

  private final RobotMapConfigRepository repository;

  private final UtilsService utilsService;

  @Value("${calf.map.storage-dir:/home/firecom/calf-deploy/data/maps}")
  private String storageDir;

  public Map<String, Object> getActiveMap() {
    return toResponse(repository.findById(ACTIVE_MAP_ID).orElseGet(this::defaultConfig));
  }

  public Map<String, Object> saveActiveMap(Map<String, Object> payload) {
    RobotMapConfig current = repository.findById(ACTIVE_MAP_ID).orElseGet(this::defaultConfig);
    Map<String, Object> config = new LinkedHashMap<>(payload);
    config.put("mapID", ACTIVE_MAP_ID);
    if (current.getImagePath() != null) {
      config.put("imageUrl", "/api/maps/" + ACTIVE_MAP_ID + "/image");
    }
    long now = utilsService.currentTimeMillis();
    current.setMapId(ACTIVE_MAP_ID).setConfigJson(writeJson(config)).setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toResponse(repository.save(current));
  }

  public Map<String, Object> saveImage(MultipartFile file) throws IOException {
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
    Path imagePath = dir.resolve(ACTIVE_MAP_ID + extension).normalize();
    if (!imagePath.startsWith(dir)) {
      throw new IllegalArgumentException("invalid upload path");
    }
    file.transferTo(imagePath);

    RobotMapConfig current = repository.findById(ACTIVE_MAP_ID).orElseGet(this::defaultConfig);
    Map<String, Object> config = readJson(current.getConfigJson());
    config.put("mapID", ACTIVE_MAP_ID);
    config.put("imageUrl", "/api/maps/" + ACTIVE_MAP_ID + "/image");
    long now = utilsService.currentTimeMillis();
    current
        .setMapId(ACTIVE_MAP_ID)
        .setImagePath(imagePath.toString())
        .setConfigJson(writeJson(config))
        .setUpdatedAt(now);
    if (current.getCreatedAt() == null) {
      current.setCreatedAt(now);
    }
    return toResponse(repository.save(current));
  }

  public Resource imageResource(String mapId) {
    if (!ACTIVE_MAP_ID.equals(mapId)) {
      return null;
    }
    RobotMapConfig current = repository.findById(ACTIVE_MAP_ID).orElse(null);
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

  private RobotMapConfig defaultConfig() {
    Map<String, Object> config = new LinkedHashMap<>();
    config.put("mapID", ACTIVE_MAP_ID);
    config.put("calibration", null);
    config.put("zones", List.of());
    config.put("islands", List.of());
    config.put("roadGraph", Map.of("nodes", List.of(), "edges", List.of()));
    long now = utilsService.currentTimeMillis();
    RobotMapConfig entity =
        new RobotMapConfig().setMapId(ACTIVE_MAP_ID).setConfigJson(writeJson(config));
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
      throw new IllegalStateException("failed to parse map config", e);
    }
  }

  private String writeJson(Map<String, Object> config) {
    try {
      return objectMapper.writeValueAsString(config);
    } catch (Exception e) {
      throw new IllegalStateException("failed to serialize map config", e);
    }
  }

  private Map<String, Object> toResponse(RobotMapConfig current) {
    Map<String, Object> config = readJson(current.getConfigJson());
    config.put("mapID", ACTIVE_MAP_ID);
    if (current.getImagePath() != null) {
      config.put("imageUrl", "/api/maps/" + ACTIVE_MAP_ID + "/image");
    }
    return config;
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
