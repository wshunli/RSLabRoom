<?php
error_reporting(0);

include ("config/conn.php");
$id=@$_GET["id"]?$_GET["id"]:1;
$str="SELECT * from borrow,class where bid=$id and bclassid=class.cid";
$result = mysqli_query($conn,$str);
$row = mysqli_fetch_array($result);
if ($row){
	echo "任课老师：".$row['bperson']."<br />";
	echo "课程名称：".$row['bname']."<br />";
	echo "联系电话：".$row['bphone']."<br />";
	echo "任课教室：".$row['cname']."<br />";
	echo "上课人数：".$row['bnumer']."<br />";
	echo "需要软件：".$row['bsoftware']."<br />";
	echo "备注（上课时间段）：<br /><textarea readonly=\"readonly\" rows=\"5\" style=\"border:solid 1px black;\">".$row['bmore']."</textarea>";
}
?>


