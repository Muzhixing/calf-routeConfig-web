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
@Table(name = "robot_route_plan")
public class RobotRoutePlan extends AbstractEntity {

  @Id
  @Column(name = "plan_id", length = 64)
  private String planId;

  @Column(name = "map_id", length = 64, nullable = false)
  private String mapId;

  @Column(name = "plan_name", length = 120)
  private String planName;

  @Lob
  @Column(name = "plan_json", nullable = false)
  private String planJson;
}
