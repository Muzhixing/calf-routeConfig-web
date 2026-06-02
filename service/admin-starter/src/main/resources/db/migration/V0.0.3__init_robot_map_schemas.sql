CREATE TABLE IF NOT EXISTS `robot_map_config` (
  `map_id` varchar(64) NOT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `config_json` longtext NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `robot_map_config_pk` PRIMARY KEY (`map_id`)
);
