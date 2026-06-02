CREATE TABLE IF NOT EXISTS `robot_route_plan` (
  `plan_id` varchar(64) NOT NULL,
  `map_id` varchar(64) NOT NULL,
  `plan_name` varchar(120) DEFAULT NULL,
  `plan_json` longtext NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `robot_route_plan_pk` PRIMARY KEY (`plan_id`),
  KEY `robot_route_plan_map_id_idx` (`map_id`)
);
