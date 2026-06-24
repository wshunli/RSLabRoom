<?php
header("Content-type: text/html; charset=gb2312" );  
error_reporting(0);

session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}

include ("config/conn.php");
$str="UPDATE  `console` SET  `value` =  '".$_POST["week"]."' WHERE  `console`.`name` =  'week' LIMIT 1";
mysqli_query($conn,$str);
$str="UPDATE  `console` SET  `value` =  '".$_POST["name"]."' WHERE  `console`.`name` =  'lianxiren' LIMIT 1";
mysqli_query($conn,$str);
$str="UPDATE  `console` SET  `value` =  '".$_POST["phone"]."' WHERE  `console`.`name` =  'lianxidianhua' LIMIT 1";
mysqli_query($conn,$str);
$time = $_POST["year"]."-".$_POST["month"]."-".$_POST["day"];
//$time = date("Y-m-d",strtotime($time));
$str="UPDATE  `console` SET  `value` =  '".$time."' WHERE  `console`.`name` =  'begtime' LIMIT 1";
mysqli_query($conn,$str);
echo "<script language=javascript>alert('已提交修改!');</script>";
echo "<script language='javascript'>"; 
echo "location='admin.php'"; 
echo "</script>"; 

//header("Location:admin.php");
?>