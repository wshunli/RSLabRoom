<?php
error_reporting(0);
include("console.php");
$conn = mysqli_connect($serverloc,$servername,$serverpwd,$dbname) or die("Could not connect1");
//$db=mysqli_select_db("hall",$conn) or die("Could not connect2");
mysqli_query($conn,'set names utf8');
$str="select value from console where name='begtime'";
$row = mysqli_fetch_array(mysqli_query($conn,$str));
$begtime = strtotime($row["value"]); //时间戳（开学时间）
$nowtime = time();
$weekjs = (int)(($nowtime - $begtime) / (24*60*60*7)+1); //获取当前周

$str="select value from console where name='week'";
$row = mysqli_fetch_array(mysqli_query($conn,$str));
$weeksjs =$row["value"]; //这学期多少周

$str="select value from console where name='lianxiren'";
$row = mysqli_fetch_array(mysqli_query($conn,$str));
$lianxiren =$row["value"];

$str="select value from console where name='lianxidianhua'";
$row = mysqli_fetch_array(mysqli_query($conn,$str));
$lianxidianhua =$row["value"];
?>