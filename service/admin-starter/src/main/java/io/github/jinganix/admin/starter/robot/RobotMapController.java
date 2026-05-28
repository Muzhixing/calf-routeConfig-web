package io.github.jinganix.admin.starter.robot;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
public class RobotMapController {

  private final RobotMapService robotMapService;

  @GetMapping
  public Map<String, Object> listMaps() {
    return ok("查询成功", robotMapService.listMaps());
  }

  @PostMapping
  public Map<String, Object> createMap(@RequestBody(required = false) Map<String, Object> payload) {
    return ok("地图已创建", robotMapService.createMap(payload == null ? Map.of() : payload));
  }

  @GetMapping("/active")
  public Map<String, Object> getActiveMap() {
    return ok("查询成功", robotMapService.getActiveMap());
  }

  @PostMapping("/active")
  public Map<String, Object> saveActiveMap(@RequestBody Map<String, Object> payload) {
    return ok("地图已保存", robotMapService.saveActiveMap(payload));
  }

  @PostMapping(value = "/active/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Map<String, Object> uploadActiveMapImage(@RequestParam("file") MultipartFile file)
      throws IOException {
    return ok("图片已上传", robotMapService.saveActiveImage(file));
  }

  @GetMapping("/{mapID}")
  public Map<String, Object> getMap(@PathVariable String mapID) {
    return ok("查询成功", robotMapService.getMap(mapID));
  }

  @PatchMapping("/{mapID}")
  public Map<String, Object> saveMap(
      @PathVariable String mapID, @RequestBody Map<String, Object> payload) {
    return ok("地图已保存", robotMapService.saveMap(mapID, payload));
  }

  @PostMapping(value = "/{mapID}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Map<String, Object> uploadMapImage(
      @PathVariable String mapID, @RequestParam("file") MultipartFile file) throws IOException {
    return ok("图片已上传", robotMapService.saveImage(mapID, file));
  }

  @GetMapping("/{mapID}/image")
  public ResponseEntity<Resource> getMapImage(@PathVariable String mapID) throws IOException {
    Resource resource = robotMapService.imageResource(mapID);
    if (resource == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok().contentType(robotMapService.imageMediaType(mapID)).body(resource);
  }

  @GetMapping("/{mapID}/plans")
  public Map<String, Object> listPlans(@PathVariable String mapID) {
    return ok("查询成功", robotMapService.listPlans(mapID));
  }

  @PostMapping("/{mapID}/plans")
  public Map<String, Object> createPlan(
      @PathVariable String mapID, @RequestBody(required = false) Map<String, Object> payload) {
    return ok("路线方案已创建", robotMapService.createPlan(mapID, payload == null ? Map.of() : payload));
  }

  @GetMapping("/{mapID}/plans/{planID}")
  public Map<String, Object> getPlan(@PathVariable String mapID, @PathVariable String planID) {
    return ok("查询成功", robotMapService.getPlan(mapID, planID));
  }

  @PatchMapping("/{mapID}/plans/{planID}")
  public Map<String, Object> savePlan(
      @PathVariable String mapID,
      @PathVariable String planID,
      @RequestBody Map<String, Object> payload) {
    return ok("路线方案已保存", robotMapService.savePlan(mapID, planID, payload));
  }

  private static Map<String, Object> ok(String message, Object data) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("code", "200");
    response.put("message", message);
    response.put("data", data);
    return response;
  }
}
