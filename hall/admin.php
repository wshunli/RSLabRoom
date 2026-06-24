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
		$.get('admin_process.php',{
			time:$('#year').attr('value')+'-'+$('#month').attr('value')+'-'+$('#day').attr('value'),
			week:$('#week').attr('value'),
			name:$('#name').attr('value'),
			phone:$('#phone').attr('value')},function(result){
				if (result=='1')
				{
					document.write('成功...1秒后刷新');
					setTimeout('window.location.href="admin.php"',1000);
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
$str="select * from console";
$result = mysqli_query($conn,$str);
while ($row=mysqli_fetch_array($result))
{
	$ary[$row['name']]=$row['value'];
}
$time=$ary['begtime'];
$year=substr($time,0,4);
$month=substr($time,5,2);
$day=substr($time,8,2);



//////紧急用
//$sql="update `hall`.`borrow` set `bclassid`=3 WHERE `bclassid` =2";
//$sql="update `borrow` set `bclassid`=2 WHERE `bname` LIKE '%MOOC'";
//$sql="update `borrow` set `bclassid`=2 WHERE `bname` LIKE '%当代摄影测量培训班'";
//mysqli_query($conn,$sql);

echo "<form name=login method=post action='admin_process.php'>";
?>
设置开学时间：<input name="year" value="<?php echo $year; ?>" size="6" maxlength="4"  />年<input name="month" value="<?php echo $month; ?>" size="4" maxlength="2" />月<input name="day" value="<?php echo $day; ?>" size="4" maxlength="2" />日<br />
设置本学期周数：<input name="week" size="10" value="<?php echo $ary['week'] ?>" maxlength="3" />周<br />
设置首页联系人姓名：<input name="name" value="<?php echo $ary['lianxiren'] ?>" maxlength="20" /><br />
设置首页联系人电话：<input name="phone" value="<?php echo $ary['lianxidianhua'] ?>" maxlength="20" /><br />

<input type="submit" name="submit" size="15" maxlength="20"  value='提交修改'/>


</body>
</html>