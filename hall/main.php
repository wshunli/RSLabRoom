<?php
error_reporting(0);
include("config/conn.php");

mysqli_query($conn,"delete from `hall`.`class` where `cid`='611'")
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>无标题文档</title>

<script src="js/jquery.js" type="text/javascript"></script>
<script src="js/jquery-ui.js" type="text/ecmascript"></script>
<script type="text/javascript">

var i=<?php echo $weekjs ?>;
var weeks=<?php echo $weeksjs ?>;

function open_dialog(){

       $("#dialog").dialog("open");

}

$(document).ready(function(){
  $("#before").click(function(){
  if (i<=1) {alert("这学期从第一周开始"); return}
  $("#tab1").fadeOut(500,function(){
	  i--;
    $.post("table.php",{oper:i},function(result){
	  $("#tab1").html(result);
	  $("#tab1").fadeIn(500);
    });
  });
  }); 
  $("#dialog").dialog({		
        autoOpen:false,
        modal:true,
		height:300,
		width:200
  }); 
  $("#next").click(function(){
  if (i>=weeks) {alert("超过了这学期最大的周数"); return;}
  $("#tab1").fadeOut(500,function(){
	  i++;
    $.post("table.php",{oper:i},function(result){
	  $("#tab1").html(result);
	  $("#tab1").fadeIn(500);
    });
  });
  });

});
function query()
{	i=$("#textarea").attr("value");
	if (i<=0||i>weeks) {alert("输入有误");return}
	  
      $("#tab1").fadeOut(500,function(){
      $.post("table.php",{oper:i},function(result){
	  $("#tab1").html(result);
	  $("#tab1").fadeIn(500);
    });
  });	  
}

function detail(p){
	$(document).ready(function(){

		//$("#td"+p).css("background","red");
		$.get("detail.php",{id:p},function(result){
		
		$("#dialog").html(result);
		
		});
		open_dialog();
		
	});
}
</script>
<link href="css/ui-lightness/jquery-ui-1.8.18.custom.css" rel="stylesheet" type="text/css"/>
<style type="text/css">
h2{
	text-align:center;	
	font-family:微软雅黑,黑体;
}
table{
	text-align:center;
	margin: 0 auto;
	clear: both;
}
#contain{
	margin:0 auto;	
	width:600px;
	
}
#detail{
	margin:0 auto;
}
td{
	font-family:微软雅黑,黑体;
	font-size:12px;	
}
.taken{
	background:#36F;
	cursor:pointer;
	color:white;
}
#dialog{
	font-family:微软雅黑,黑体;
	font-size:14px;
}
</style>
</head>

<body>
<h2>武汉大学遥感信息工程学院实验教学中心机房借用查询系统(2024新版)</h2>
<div id="detail" style="font-family:微软雅黑;">

<div id="tab1">
<?php include ("table.php") ?>

</div>
<div style="font-size:14px;"><div style="float:left; cursor:pointer; margin-left: 25px; text-decoration: underline;" id="before">上一周</div> <div style="float:left; cursor:pointer; margin-right: 25px; margin-left:15px; text-decoration: underline;" id="next">下一周</div><br /><div style="float:right;">备注：上午时间：8:00-12:00 下午时间：14:00-18:00 晚上时间：18:00-22:00</div></div>
</div>
<div id="dialog"  title="详细信息"></div>

</body>
</html>