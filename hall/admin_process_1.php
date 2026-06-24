<?php
error_reporting(0);

session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}

include ("config/conn.php");
//echo $_POST["zongshu"];
for($ii=1;$ii<$_POST["zongshu"];$ii++)
{
		$str="UPDATE  `class` SET  `cintro` =  '".str_replace('<br>','\n',$_POST["cintro".$ii])."' WHERE  cname='".$_POST["cname".$ii]."'";
		//echo $str."<br>";
		mysqli_query($conn,$str);
}

//$str="UPDATE  `class` SET  `cintro` =  '".str_replace('\n','<br />',$_POST["c1"])."' WHERE  cid=1";
//mysql_query($str);
//$str="UPDATE  `class` SET  `cintro` =  '".str_replace('\n','<br />',$_POST["c2"])."' WHERE  cid=2";
//mysql_query($str);
//$str="UPDATE  `class` SET  `cintro` =  '".str_replace('\n','<br />',$_POST["c3"])."' WHERE  cid=3";
//mysql_query($str);

echo 1;
echo "<script language=javascript>alert('已提交修改!');</script>";
echo "<script language='javascript'>"; 
echo "location='admin_class.php'"; 
echo "</script>"; 
?>