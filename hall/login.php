<?php
error_reporting(0);
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>武汉大学遥感信息工程学院计算机教室借用申请</title>

<link href="css/ui-lightness/jquery-ui-1.8.18.custom.css" rel="stylesheet" type="text/css"/>
</head>

<body>
<h2 align="center">武汉大学遥感信息工程学院机房借用管理系统(2024新版)</h2>
<?php
echo "<form name=login method=post action='check_state.php'>";
?>
<div align="center" style="text-align:center">
<p>用户名<input name="username" size="14" maxlength="20"  /></p>
<p>密码  <input type="password" name="pwd" size="15" maxlength="20"  /></p>
<input type="submit" name="submit" size="15" maxlength="20"  value='登陆'/>

</div>
</form>
</body>
</html>