-- 执行前备份数据库；本迁移为批量排期增加独立的批次表。
-- 每个 schedules 记录对应一批 borrow 预约，borrow.btimeid 与 schedules.id 相同。
ALTER TABLE `borrow` ENGINE = InnoDB;
ALTER TABLE `class`
  MODIFY `cintro` varchar(1000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  MODIFY `cname` varchar(500) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  ENGINE = InnoDB;
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `course_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `room_id` int(11) NOT NULL,
  `weekday` tinyint NOT NULL,
  `period` tinyint NOT NULL,
  `start_week` tinyint NOT NULL,
  `end_week` tinyint NOT NULL,
  `recurrence` enum('weekly','odd','even') NOT NULL DEFAULT 'weekly',
  `created_slots` int NOT NULL DEFAULT 0,
  `skipped_slots` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_room` (`room_id`),
  CONSTRAINT `fk_schedules_room` FOREIGN KEY (`room_id`) REFERENCES `class` (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
