<?php
error_reporting(0);
session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}
include("config/conn.php");
$i = @$_POST['id'] ;
$str="SELECT * from borrow , class where bclassid= cid and btimeid=$i order by bid";
$result = mysqli_query($conn,$str) or die("error");

?><table width="98%" border="1" cellspacing="1">
  <tr>
    <th scope="col">ID</th>
    <th scope="col">教师名</th>
    <th scope="col">课程名</th>
    <th scope="col">时间</th>
    <th scope="col">教室</th>
    <th scope="col">操作</th>
  </tr>
<?php 

while ($row = mysqli_fetch_array($result))
{
	echo "<tr>";
	echo "<td>".$row['bid']."</td>";
	echo "<td>".$row['bperson']."</td>";
	echo "<td>".$row['bname']."</td>";
	$nowtime = strtotime($row['btime']);
	$w = (int)(($nowtime - $begtime)/(24*60*60*7))+1; //多少周
	switch ($row['tag']) 
	{
		case '1':$row['tag']='上午';break;
		case '2':$row['tag']='下午';break;
		case '3':$row['tag']='晚上';break;
	}
	echo "<td>".substr($row['btime'],0,10)."(".$w."周)".$row['tag']."</td>";
	echo "<td>".$row['cname']."</td>";
	if ($row['status']==1) echo "<td class=\"detail_click\" id=\"d_".$row['bid']."\" onclick=\"javascript:detail_denied(".$row['bid'].")\">撤销</td>";
	else if ($row['status']==0) echo "<td class=\"detail_click2\" id=\"d_".$row['bid']."\" onclick=\"javascript:detail_pass(".$row['bid'].")\">通过</td>";
	echo "</tr>";
}

?>

</table>