-- 学期配置独立存储；旧 console.semesters 数据不再读取。
CREATE TABLE IF NOT EXISTS `semesters` (
  `start_year` smallint NOT NULL,
  `term` tinyint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `weeks` tinyint unsigned NOT NULL,
  `extra_weeks` tinyint unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`start_year`, `term`),
  UNIQUE KEY `uq_semesters_start_date` (`start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
