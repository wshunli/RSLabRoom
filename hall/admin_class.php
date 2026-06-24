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
<title>无标题文档</title>
<script src="js/jquery.js" type="text/javascript"></script>
<script src="js/jquery-ui.js" type="text/ecmascript"></script>
<link href="css/ui-lightness/jquery-ui-1.8.18.custom.css" rel="stylesheet" type="text/css"/>
<script type="text/javascript">
$(document).ready(function(){
	$("#submit").click(function(){
		$.post('admin_process_1.php',{
			c1:$("#class1").attr("value"),
			c2:$("#class2").attr("value"),
			c3:$("#class3").attr("value"),
			c4:$("#class4").attr("value")
			},function(result){
				if (result=='1')
				{
					document.write('成功...1秒后刷新');
					setTimeout('window.location.href="admin_class.php"',1000);
				}
			}
		);
		
	});
	
});

</script>
</head>

<body>

<?php 

include ("config/conn.php");
echo "<form name=login method=post action='admin_process_1.php'>";

$str="select * from class order by cname";
$result = mysqli_query($conn,$str);
$ii=1;
while ($row=mysqli_fetch_array($result))
{
	//echo "<h2>".$row['cname']."</h2><br />";
	//echo "<textarea id=\"class".$row['cid']."\" cols=\"100\" rows=\"5\">".$row['cintro']."</textarea><br />";
	echo "<h2>".$row['cname']."</h2><br />";
	echo "<input name='cname".$ii."' type=hidden value='".$row['cname']."'>";
	echo "<textarea name='cintro".$ii."' cols=\"100\" rows=\"5\">".$row['cintro']."</textarea><br />";
	$ii+=1;
}
echo "<input name=zongshu type=hidden value='".$ii."'>";
echo "<input name=submit type=submit value='提交修改'>";
echo "</form>";
?>

<br />
<br />
<br />
<br />
<br />



</body>
</html>