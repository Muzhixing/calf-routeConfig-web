package io.github.jinganix.admin.starter.robot;

import io.github.jinganix.admin.starter.helper.data.AbstractEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Entity
@Getter
@Setter
@Accessors(chain = true)
@Table(name = "robot_map_config")
public class RobotMapConfig extends AbstractEntity {

  @Id
  @Column(name = "map_id", length = 64)
  private String mapId;

  @Column(name = "image_path", length = 500)
  private String imagePath;

  @Lob
  @Column(name = "config_json", nullable = false)
  private String configJson;
}
