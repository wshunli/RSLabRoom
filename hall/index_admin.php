<?php
error_reporting(0);

session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>武汉大学遥感信息工程学院计算机教室借用申请后台</title>
</head>

<frameset cols="200,*" framespacing="0" frameborder="yes" border="0" bordercolor="#000000">
	<frame src="admin_left_bar.php" name="leftFrame" scrolling="no" noresize/>
    <frame src="admin.php" name="mainFrame"/>
</frameset>

<noframes><body>您的浏览器不支持该页面显示,请使用更高级浏览器...</body></noframes>

</html>