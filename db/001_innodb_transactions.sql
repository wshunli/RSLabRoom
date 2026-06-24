-- 执行前务必完整备份数据库，并先在测试库验证。
-- 历史表为 MyISAM；只有切换到 InnoDB 后，多表事务的提交与回滚才真正生效。
ALTER TABLE `borrow` ENGINE = InnoDB;
ALTER TABLE `submit` ENGINE = InnoDB;
ALTER TABLE `console` ENGINE = InnoDB;
