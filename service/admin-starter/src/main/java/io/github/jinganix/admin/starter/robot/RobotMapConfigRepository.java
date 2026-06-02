package io.github.jinganix.admin.starter.robot;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RobotMapConfigRepository extends JpaRepository<RobotMapConfig, String> {}
