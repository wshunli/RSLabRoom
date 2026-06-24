<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>无标题文档</title>
<style type="text/css">
.contains{
	width:800px;
	margin:0 auto;
	border:solid 1px #666;
}
p{
	text-indent:2em;
}
</style>
</head>
<?php
error_reporting(0);

include ("config/conn.php"); 

$str="select cname,cintro from class order by cname";
$result=mysqli_query($conn,$str);
while ($row = mysqli_fetch_array($result)){
	//如果存在一直循环


?>
<body>

	<div class="contains">
	<h2 align="center"><?php echo $row['cname']; ?></h2>
    <p>
    <?php echo nl2br($row['cintro']) ; ?>
    </p>
    </div>
<?php } ?>

</body>
</html>
