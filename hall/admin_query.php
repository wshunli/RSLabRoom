<?php
error_reporting(0);

session_start();  
if (!@$_SESSION['author']){
	header("Location:login.php"); 
	exit;
}
include ("config/conn.php");
$type=@$_GET['type']?@$_GET['type']:0;
//echo $type;
$pagerows = 20;
//echo "select count(*) as rows from `submit` where `sstatus` = '".$type."'";
	$result = mysqli_query($conn,"select count(*) as `rows` from `submit` where `sstatus` = '".$type."'") or die(mysqli_error());
	$row=mysqli_fetch_array($result);
	//$totalrows = mysqli_result($result,0,"rows");
	$totalrows=$row["rows"];
	//echo $totalrows;
	$totalpage = ceil($totalrows/$pagerows);
	if(!array_key_exists("page",$_GET))
		$page = 1;
	else
		$page = $_GET["page"];
	if($page <= 1)
	{
		$previous = "首页] [上一页";
		$page=1;
	}
	else 
	{
		$previouspage = $page - 1;
		$previous = "] [<a href=".$_SERVER["PHP_SELF"]."?page=".$previouspage."&type=".$type.">上一页</a>";
		$previous = "<a href=".$_SERVER["PHP_SELF"]."?page=1&type=".$type.">首页</a>".$previous;
	}
	if($page >= $totalpage)
		{$next="下一页] [末页";$page = $totalpage;}
	else 
		{
			$nextpage = $page + 1;
			$next = "<a href=\"".$_SERVER["PHP_SELF"]."?page=".$nextpage."&type=".$type."\">下一页</a>";
			$next .= "] [<a href=\"".$_SERVER["PHP_SELF"]."?page=".$totalpage."&type=".$type."\">末页</a>";
		}
	$headstr="共  ".$totalrows." 个，分 ".$totalpage." 页显示，每页 ".$pagerows."个，当前是第 ".$page." 页。<br> [".$previous."] [".$next."]<br>";
	$num = ($page-1)*$pagerows;

echo $type;

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>无标题文档</title>
<script src="js/jquery.js" type="text/javascript"></script>
<script src="js/jquery-ui.js" type="text/ecmascript"></script>
<style type="text/css">
a:link{
	color:blue;
	text-decoration:none;
	cursor:pointer;
}
a:hover{
	color:red;
	cursor:pointer;
}
a:visited{
	color:black;
	text-decoration:none;
	cursor:pointer;
}
table{
	text-align:center;
	font-size:12px;
	font-family:微软雅黑,黑体;
}
.redd{
	color:red;
}
.greenn{
	color:green;
}
.link{
	cursor:pointer;
}
.link:hover{
	color:red;
}
.detail_click{
	color:red;
	cursor:pointer;
}
.detail_click:hover{
	color:green;
}
.detail_click2{
	color:green;
	cursor:pointer;
}
.detail_click2:hover{
	color:red;
}
</style>

<script type="text/ecmascript">
$(document).ready(function(){
	$("#dialog").dialog({
		 autoOpen:false,
		 modal:true,
		 width:800
	});
});

function delt(i){
	if (confirm("确认删除"))
	{
	$.post("admin_table_process.php",{o:"delt",id:i},function(result){
		if (result=='1')
		$("#t"+i).fadeOut(500);
		else alert(result);
	});
	}
}
function denied(i){
	$.post("admin_table_process.php",{o:"denied",id:i},function(result){
		if (result=='1')
		$("#t"+i).fadeOut(500);
		
	});	
}
function access(i){
	$.post("admin_table_process.php",{o:"access",id:i},function(result){
		if (result=='1')
		$("#t"+i).fadeOut(500);	
		else if (result=='-1')
		alert('操作失败，该时间段已经存在已通过课程了');
		else alert(result)
	});		
}
function detail(i){
	//$.post("admin_detail.php",{id=i},function(result){
	$.post("admin_detail.php",{id:i},function(result){	
	$("#dialog").html(result);
	$("#dialog").dialog("open");
	})
}
function detail_pass(i){
	$.post("admin_table_process.php",{o:"detailaccess",id:i},function(result){
		if (result=='1')
		{
			$("#d_"+i).html("成功");
		}
		else alert(result);
	});
}
function detail_denied(i){
	$.post("admin_table_process.php",{o:"detaildenied",id:i},function(result){
		if (result=='1')
		{
			$("#d_"+i).html("成功");
		}		
		else alert(result);
	});	
}
</script>
<link href="css/ui-lightness/jquery-ui-1.8.18.custom.css" rel="stylesheet" type="text/css"/>
</head>

<body>

<table width="98%" border="1" cellspacing="1">
  <tr>
    <th scope="col">ID</th>
    <th scope="col" width="7%">姓名</th>
    <th scope="col">电话</th>
    <th scope="col">需要软件</th>
    <th scope="col">学生人数</th>
    <th scope="col">详细信息</th>

    <th scope="col">课程名称</th>
    <th scope="col" width="30%">备注</th>
    <th scope="col" width="10%">审核状态</th>
  </tr>
  <?php
  $str="SELECT * FROM  `submit` WHERE sstatus =$type ORDER BY sid LIMIT $num , $pagerows";
  $result=mysqli_query($conn,$str) or die ("无数据");
  while ($row = mysqli_fetch_array($result))
  {
	  echo "<tr id=\"t".$row['stimeid']."\">";
	  
	  echo "<td>".$row['sid']."</td>";
	  echo "<td>".$row['sperson']."</td>";
	  echo "<td>".$row['sphone']."</td>";
	  echo "<td>".$row['ssoftware']."</td>";
	  echo "<td>".$row['snumer']."</td>";
	  echo "<td class=\"link\" onclick=\"javascript:detail(".$row['stimeid'].")\">查看</td>";
	  echo "<td>".$row['sname']."</td>";
	  echo "<td>".$row['smore']."</td>";
	  if ($row['sstatus']=='1')
	  
	  {
		 //撤销通过审核和删除 
		 echo "<td><a class=\"greenn\" onclick=\"javascript:denied(".$row['stimeid'].")\">撤销</a> <a  onclick=\"javascript:delt(".$row['stimeid'].")\">删除</a></tr>";
	  }
	  else if ($row['sstatus']=='0')
	  {
		 //通过审核和删除 
		 echo "<td><a class=\"redd\"  onclick=\"javascript:access(".$row['stimeid'].")\">通过</a> <a onclick=\"javascript:delt(".$row['stimeid'].")\">删除</a></tr>";
	  }
	  
	  echo "</tr>";
  }
  ?>

</table>
<div style="font-size:12px;font-family:黑体,微软雅黑">
<?php echo $headstr; 
?>
</div>
<div id="dialog" title="详细信息"></div>
</body>
</html>