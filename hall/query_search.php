<table width="100%" border="1">
  <tr>
    <th scope="col">教师姓名</th>
    <th scope="col">课程名称</th>
    <th scope="col">联系电话</th>
    <th scope="col">需要软件</th>
    <th scope="col">上课人数</th>
    <th scope="col">上课机房</th>
    <th scope="col">具体时间</th>
    <th scope="col">审核状态</th>
  </tr>

<?php
error_reporting(0);

include ("config/conn.php");

if ($str=@$_POST['time'])
{
	$query_str="SELECT * from borrow,class where borrow.bclassid=class.cid and  btime='$str' order by class.cname,borrow.bperson,borrow.bid";
	//echo $query_str;
	$result = mysqli_query($conn,$query_str);
	if (!$result) {echo "对不起,未查询到结果";}
	while ($row=mysqli_fetch_array($result))
	{
		switch ($row['tag']){
		case '1':$row['tag']='上午';break;
		case '2':$row['tag']='下午';break;
		case '3':$row['tag']='晚上';break;
		}
		switch ($row['status']){
		case '0':$row['status']="<span style=\"color:red\">未通过</span>";break;
		case '1':$row['status']="<span style=\"color:green\">已通过</span>";break;
		}
		echo "<tr>";
		echo "<td>".$row['bperson']."</td>"."<td>".$row['bname']."</td>"."<td>".$row['bphone']."</td>"."<td>".$row['bsoftware']."</td>"."<td>".$row['bnumer']."</td>"."<td>".$row['cname']."</td>"."<td style=\"color:blue\">".substr($row['btime'],0,10).$row['tag']."</td>"."<td>".$row['status']."</td>";
		echo "</tr>";
	}
}
else if ($str=@$_POST['teacher'])
{
	$query_str="SELECT * from `borrow`,`class` where `borrow`.`bclassid`=`class`.`cid` and `bperson` like '%".$str."%'";
	//echo $query_str;
	$result = mysqli_query($conn,$query_str);
	if (!$result) {echo "对不起,未查询到结果";}
	while ($row=mysqli_fetch_array($result))
	{
		switch ($row['tag']){
		case '1':$row['tag']='上午';break;
		case '2':$row['tag']='下午';break;
		case '3':$row['tag']='晚上';break;
		}
		switch ($row['status']){
		case '0':$row['status']="<span style=\"color:red\">未通过</span>";break;
		case '1':$row['status']="<span style=\"color:green\">已通过</span>";break;
		}
		echo "<tr>";
		echo "<td style=\"color:blue\">".$row['bperson']."</td>"."<td>".$row['bname']."</td>"."<td>".$row['bphone']."</td>"."<td>".$row['bsoftware']."</td>"."<td>".$row['bnumer']."</td>"."<td>".$row['cname']."</td>"."<td style=\"color:red\">".substr($row['btime'],0,10).$row['tag']."</td>"."<td>".$row['status']."</td>";
		echo "</tr>";
	}
}
else if ($str=@$_POST['classname'])
{
	$query_str="SELECT * from borrow,class where borrow.bclassid=class.cid and bname like '%".$str."%'";
	//echo $query_str;
	$result = mysqli_query($conn,$query_str);
	if (!$result) {echo "对不起,未查询到结果";}
	while ($row=mysqli_fetch_array($result))
	{
		switch ($row['tag']){
		case '1':$row['tag']='上午';break;
		case '2':$row['tag']='下午';break;
		case '3':$row['tag']='晚上';break;
		}
		switch ($row['status']){
		case '0':$row['status']="<span style=\"color:red\">未通过</span>";break;
		case '1':$row['status']="<span style=\"color:green\">已通过</span>";break;
		}
		echo "<tr>";
		echo "<td>".$row['bperson']."</td>"."<td style=\"color:blue\" >".$row['bname']."</td>"."<td>".$row['bphone']."</td>"."<td>".$row['bsoftware']."</td>"."<td>".$row['bnumer']."</td>"."<td>".$row['cname']."</td>"."<td>".substr($row['btime'],0,10).$row['tag']."</td>"."<td>".$row['status']."</td>";
		echo "</tr>";
	}
}
else 
{
	echo "对不起，未查询到结果";
}

?>

</table>
