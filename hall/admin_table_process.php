<?php
error_reporting(0);

session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}
include ("config/conn.php");
if (@$_POST['o']=='delt')
{
	if (@$_POST['id'])
	{
	$str= "DELETE from borrow  WHERE btimeid='".$_POST['id']."'";
	$str2= "DELETE from submit  WHERE stimeid='".$_POST['id']."'";
	if (mysqli_query($conn,$str)&&mysqli_query($conn,$str2))
	{
		echo 1;
	}
	}
}
else if (@$_POST['o']=='denied')
{
	if (@$_POST['id'])
	{
	$str= "UPDATE  `borrow` SET  `status` =0  WHERE btimeid='".$_POST['id']."'";
	$str2= "UPDATE  `submit` SET  `sstatus` =0  WHERE stimeid='".$_POST['id']."'";
	if (mysqli_query($conn,$str)&&mysqli_query($conn,$str2))
	{
		echo 1;
	}
	
	}
}
else if (@$_POST['o']=='access')
{
	if (@$_POST['id']) //id为时间戳id
	{
	$str = "SELECT btime,bclassid,tag from borrow where btimeid='".$_POST['id']."'";////dadfadada
//查询所有带有该id的时间
$temp=0;

	$result=mysqli_query($conn,$str);
	while ($row2=mysqli_fetch_array($result))
	{
		$str = "SELECT * from borrow,class where status=1 and  btime='".substr($row2['btime'],0,10)."' and bclassid=".$row2['bclassid']." and tag=".$row2['tag']." and bclassid = cid";

		$result2=mysqli_query($conn,$str);
	if ($row=(mysqli_fetch_array($result2)))
	{
		if (!$temp)
		{
			echo"操作失败，该时间段已经存在已通过课程了，";
		}
		echo "已通过的课程名称：".$row['bname'].";课程老师：".$row['bperson'].";课程时间：".substr($row['btime'],0,10).";课程地点：".$row['cname'].";课程时段：".$row['tag']."请确认该课程的具体时间！\n";
		$temp=1;
	}
	}
		if (!$temp){
		$str= "UPDATE  `borrow` SET  `status` =1  WHERE btimeid='".$_POST['id']."'";
		$str2= "UPDATE  `submit` SET  `sstatus` =1  WHERE stimeid='".$_POST['id']."'";
		if (mysqli_query($conn,$str)&&mysqli_query($conn,$str2))
		{
		echo 1;
		}
		}
	}
}
else if (@$_POST['o']=='detailaccess'){
	if (@$_POST['id']) //id为时间戳id
	{
	$str = "SELECT btime,bclassid,tag from borrow where bid='".$_POST['id']."'";////dadfadada
//查询所有带有该id的时间
$temp=0;

	$result=mysqli_query($conn,$str);
	while ($row2=mysqli_fetch_array($result))
	{
		$str = "SELECT * from borrow,class where status=1 and  btime='".substr($row2['btime'],0,10)."' and bclassid=".$row2['bclassid']." and tag=".$row2['tag']." and bclassid = cid";

	$result2=mysqli_query($conn,$str);
	if ($row=(mysqli_fetch_array($result2)))
	{
		if (!$temp)
		{
			echo"操作失败，该时间段已经存在已通过课程了，";
		}
		echo "已通过的课程名称：".$row['bname'].";课程老师：".$row['bperson'].";课程时间：".substr($row['btime'],0,10).";课程地点：".$row['cname'].";课程时段：".$row['tag']."请确认该课程的具体时间！\n";
		$temp=1;
	}
	}
		if (!$temp){
		$str= "UPDATE  `borrow` SET  `status` =1  WHERE bid='".$_POST['id']."'";
		if (mysqli_query($conn,$str))
		{
		echo 1;
		}
		}
	}
	
}
else if (@$_POST['o']=='detaildenied'){
	if (@$_POST['id'])
	{
	$str= "UPDATE  `borrow` SET  `status` =0  WHERE bid='".$_POST['id']."'";
	if (mysqli_query($conn,$str))
	{
		echo 1;
	}
	
	}
}
?>