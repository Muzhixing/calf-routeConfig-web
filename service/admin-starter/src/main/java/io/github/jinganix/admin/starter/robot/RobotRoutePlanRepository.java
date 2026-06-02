package io.github.jinganix.admin.starter.robot;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RobotRoutePlanRepository extends JpaRepository<RobotRoutePlan, String> {

  List<RobotRoutePlan> findByMapId(String mapId);

  void deleteByMapId(String mapId);
}
