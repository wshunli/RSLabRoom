<?php
error_reporting(0);
include ("config/conn.php");

$n1=@$_POST['bperson'];
$n2=@$_POST['bphone'];
//$n3=mysqli_real_escape_string(@$_POST['bsoftware']);
$n3=@$_POST['bsoftware'];
$n4=@$_POST['bnumber'];
$n7=@$_POST['bname'];
//$n8=mysqli_real_escape_string(@$_POST['bmore']);
$n8=@$_POST['bmore'];
$n9=@$_POST['randomtime'];

$str="". $n1.$n2.$n3.$n4.$n7.$n8.$n9;

if  (strpos($str, "select") || strpos($str, "select")  || strpos($str, "insert")  || strpos($str, "delete")  || strpos($str, "update") || strpos($str, "or ") || strpos($str, "and ")  || strpos($str, "'")  || strpos($str, " #") || strpos($str, "--"))
{
	echo "<div>输入错误</div><br />";
}
else{
	$strsql="INSERT INTO `hall`.`submit` (`sid`, `stimeid`, `sperson`, `sphone`, `snumer`, `ssoftware`, `sname`, `smore`,`sstatus`) VALUES (NULL, '$n9', '$n1', '$n2', '$n4', '$n3', '$n7', '$n8', '0')";
		if (mysqli_query($conn,$strsql))
		{
			echo  "<div style=\"color:red\">插入成功！</div><br />";
		}
		else 
		{
			echo "<div>失败</div><br />";
			//echo $str;
		}
}
?>