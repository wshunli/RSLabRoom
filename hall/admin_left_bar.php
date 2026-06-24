<?php
error_reporting(0);

session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}
?>
<?php include("config/conn.php"); ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>无标题文档</title>
<style type="text/css">
#contain{
	width:170px;
	height:250px;
	margin-top:200px;
}
#person{
	width:150px;
	height:60px;
	background:#FCF;
	padding-left:20px;
	padding-top:25px;
	font-family:黑体,微软雅黑;
	font-size:14px;
}
a:link{
	color:black;	
	text-decoration:none;
}
a:hover{
	color:red;
	text-decoration:none;
}
a:visited{
	color:red;
	text-decoration:none;
}
ul{
	margin-top:30px;
}
</style>
</head>

<body style="background:#CCC">
	<div id="contain">
    <ul>
    	<li><a href="admin.php" target="mainFrame">修改全局参数</a></li>
        <li><a href="admin_query.php?type=1" target="mainFrame">查看已通过申请</a></li>
    	<li><a href="admin_query.php?type=0" target="mainFrame">查看未通过申请</a></li>
        <li><a href="admin_class.php" target="mainFrame">添加机房简介</a></li>
    	<li><a href="main.php" target="mainFrame">机房使用周历</a></li>
        <li><a href="query.php" target="mainFrame">已用机房查询</a></li>
    	<li><a href="apply.php" target="mainFrame">机房借用申请</a></li>
        <li><a href="introduction.php" target="mainFrame">机房基本情况</a></li>
    </ul>
    </div>

</body>
</html>
