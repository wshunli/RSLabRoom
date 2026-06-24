<?php
error_reporting(0);

session_start();  

 include("config/conn.php");
// $username=mysqli_real_escape_string(@$_POST['u']);
$username=$_POST['username'];
 $password=$_POST['pwd'];

 if (!$username)//如果没有传出值那么跳回登陆页面login.php
 {
	header("Location:login.php"); 
	exit;
 }
 else{


$state=0; 
$str="select upwd from user where username='".$username."' ";
//echo $str;
$result=mysqli_query($conn,$str);
if ($row=mysqli_fetch_array($result))
{

	if ($row['upwd']==md5($password)){
		$_SESSION['author']=1;
		echo '1';
		header("Location:index_admin.php");
		}
		else echo 0;
}
else echo 0;
 }
?>
