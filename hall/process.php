<?php
error_reporting(0);
include ("config/conn.php");

$n1=@$_POST['bperson'];
$n2=@$_POST['bphone'];
//$n3=mysqli_real_escape_string(@$_POST['bsoftware']);
$n3=@$_POST['bsoftware'];
$n4=@$_POST['bnumber'];
$n5=@$_POST['btime'];
$n6=@$_POST['bclassid'];
$n7=@$_POST['bname'];
//$n8=mysqli_real_escape_string(@$_POST['bmore']);
$n8=@$_POST['bmore'];
$n9=@$_POST['tag'];
$n10=@$_POST['id'];
$n11=@$_POST['randomtime'];
$n5=date("Y-m-d",$n5);

$str="".$n1.$n2.$n3.$n4.$n5.$n6.$n7.$n8.$n9.$n11;

if  (strpos($str, "select") || strpos($str, "select")  || strpos($str, "insert")  || strpos($str, "delete")  || strpos($str, "update") || strpos($str, "or ") || strpos($str, "and ")  || strpos($str, "'")  || strpos($str, " #") || strpos($str, "--"))
{
	echo "<div>输入错误</div><br />";
}
else{
      $strsql="INSERT INTO `hall`.`borrow` (`bid`, `bperson`, `bphone`, `bsoftware`, `bnumer`, `btime`, `bclassid`, `status`, `bname`, `bmore`, `tag`,`btimeid`) VALUES (NULL, '$n1', '$n2', '$n3', '$n4', '$n5', '$n6', '0', '$n7', '$n8', '$n9','$n11')";
			if (mysqli_query($conn,$strsql))

			{
				echo  "<div style=\"color:red\">第".$n10."条时间插入成功！</div><br />";
			}
			else 
			{
				echo "<div>第".$n10."条时间段插入失败，时间=".$n5.",时段=".$n9."</div><br />";
				//echo $str;
			}
}
?>