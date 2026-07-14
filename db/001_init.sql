-- 执行前务必完整备份数据库，并先在测试库验证。
-- 历史表为 MyISAM；只有切换到 InnoDB 后，多表事务的提交与回滚才真正生效。
-- 批量排期不单独建表，生成的预约直接写入 borrow + submit，进入「预约审批」流程。
ALTER TABLE `borrow` ENGINE = InnoDB;
ALTER TABLE `submit` ENGINE = InnoDB;
ALTER TABLE `console` ENGINE = InnoDB;
ALTER TABLE `class`
  MODIFY `cintro` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY `cname` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  ENGINE = InnoDB;

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

-- 新后台独立管理员账号表，不读取或修改历史 user 表。
-- 默认登录账号：admin / admin
CREATE TABLE IF NOT EXISTS `admin_user` (
  `username` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `upwd` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `phone` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`username`)
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE `admin_user` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `admin_user` (`username`, `upwd`)
VALUES ('admin', '21232f297a57a5a743894a0e4a801fc3');
