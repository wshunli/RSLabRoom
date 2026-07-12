-- 执行前务必完整备份数据库，并先在测试库验证。
-- 历史表为 MyISAM；只有切换到 InnoDB 后，多表事务的提交与回滚才真正生效。
-- 批量排期不单独建表，生成的预约直接写入 borrow + submit，进入「预约审批」流程。
ALTER TABLE `borrow` ENGINE = InnoDB;
ALTER TABLE `submit` ENGINE = InnoDB;
ALTER TABLE `console` ENGINE = InnoDB;
ALTER TABLE `class`
  MODIFY `cintro` varchar(1000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  MODIFY `cname` varchar(500) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  ENGINE = InnoDB;

-- SMTP 配置沿用 console 键值表，由管理后台按需写入；密码不会通过管理接口回显。
ALTER TABLE `user`
  ADD COLUMN `name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  ADD COLUMN `email` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  ADD COLUMN `phone` varchar(25) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  ENGINE = InnoDB;
