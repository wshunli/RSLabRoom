<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>无标题文档</title>
<script src="js/jquery.js" type="text/javascript"></script>
<script src="js/jquery-ui.js" type="text/ecmascript"></script>
<script type="text/javascript">
$(document).ready(function(){
	$("#dialog_1").dialog({
		 autoOpen:false,
		 modal:true,
		 width:350
	})
	$("#dialog_2").dialog({
		 autoOpen:false,
		 modal:true
	})
	$("#dialog_3").dialog({
		 autoOpen:false,
		 modal:true
	})
	$("#query").dialog({
		 autoOpen:false,
		 modal:true,
		 width:800
	})
	$("#l_1").click(function(){
		$("#dialog_1").dialog("open");
	});
	$("#l_2").click(function(){
		$("#dialog_2").dialog("open");
	});
	$("#l_3").click(function(){
		$("#dialog_3").dialog("open");
	});
	$("#btn1").click(function(){
		if (parseInt($("#t_1").attr("value"))=="NaN"||!$("#t_1").attr("value")) {alert("输入有误");return;}
		if (parseInt($("#t_2").attr("value"))=="NaN"||!$("#t_2").attr("value")) {alert("输入有误");return;}
		if (parseInt($("#t_3").attr("value"))=="NaN"||!$("#t_3").attr("value")) {alert("输入有误");return;}
		$("#dialog_1").dialog("close");
		str=$("#t_1").attr("value")+"-"+$("#t_2").attr("value")+"-"+$("#t_3").attr("value");
		//alert(str);
		$.post("query_search.php",{time:str},function(result){
			$("#query").html(result);
			$("#query").dialog("open");	
		});
	});
	$("#btn2").click(function(){
		if (!$("#t_4").attr("value")) {alert("输入有误");return;}
		$("#dialog_2").dialog("close");
		str=$("#t_4").attr("value");

		$.post("query_search.php",{classname:str},function(result){
			$("#query").html(result);
			$("#query").dialog("open");	
		});
	});
	$("#btn3").click(function(){
		if (!$("#t_5").attr("value")) {alert("输入有误");return;}
		$("#dialog_3").dialog("close");
		str=$("#t_5").attr("value");

		$.post("query_search.php",{teacher:str},function(result){
			$("#query").html(result);
			$("#query").dialog("open");	
		});
	});
});

</script>
<link href="css/ui-lightness/jquery-ui-1.8.18.custom.css" rel="stylesheet" type="text/css"/>
<style type="text/css">
#contain{
	width:200px;
	height:100px;
	margin: 0 auto;
	margin-top:100px;
}
li{
	cursor:pointer;
}
li:hover{
	color:red;
}
table{
	text-align:center;
}
</style>
</head>

<body>
<div id="contain">
	<ul>
    <li id="l_1">按时间查询</li>
    <li id="l_2">按课程名称查询</li>
    <li id="l_3">按任课老师查询</li>
    </ul>
    </div>
<div id="dialog_1">
    活动时间：<input size="6" maxlength="4" id="t_1" />年<input size="3" maxlength="2" id="t_2" />月<input size="3" maxlength="2" id="t_3" />日<br />
  <input type="button" id="btn1" value="查找" />
</div>
<div id="dialog_2">
    课程名称：<input size="17" maxlength="30" id="t_4" /><br />
  <input type="button" id="btn2" value="查找" />
</div>
<div id="dialog_3">
    教师姓名：<input size="17" maxlength="10" id="t_5" /><br />
  <input type="button" id="btn3" value="查找" />
</div>
<div id="query" title="查询结果">对不起，没有找到您需要的结果</div>
</body>
</html>