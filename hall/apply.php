<?php
error_reporting(0);
include("config/conn.php");?>
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
var begtime=1; //第i周的开始时间
var total=0;
var shijian = new Array(); //具体年月日de timestamp
var shijianduan = new Array();//具体时间 上午下午晚上
var jiaoshi = new Array(); //具体教室
var id = new Array();// 通过判断shijian 来记录id
var showtag = new Array();

function fresh(){

	for (pp=0;pp<total;pp++)
	{

		if (shijian[pp]>=Number(begtime)&&shijian[pp]<=Number(begtime)+24*60*60*7-1)
		//如果当前第i个值存在于符合时间段那么在点击上一周 下一周 查询之后重新显示图像
		{
			$("#tdd"+id[pp]).css("background-color","#5C0273");
			//alert(id[pp]);
		}
	}
	
}
function del(pp){
	$("#d"+pp).fadeOut(500);
	if (shijian[pp]>=Number(begtime)&&shijian[pp]<=Number(begtime)+24*60*60*7-1)
	{
		//如果删除的对应时间在显示范围内
		$("#tdd"+id[pp]).css("background-color","#A7EFFE");
	}
	shijian[pp]=0;
	showtag[pp]="";
}
//时间戳转换函数
Date.prototype.format = function(format) 
{ 
var o = 
{ 
"M+" : this.getMonth()+1, //month 
"d+" : this.getDate(), //day 
"h+" : this.getHours(), //hour 
"m+" : this.getMinutes(), //minute 
"s+" : this.getSeconds(), //second 
"q+" : Math.floor((this.getMonth()+3)/3), //quarter 
"S" : this.getMilliseconds() //millisecond 
}
if(/(y+)/.test(format)) 
{ 
format = format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
}
for(var k in o) 
{ 
if(new RegExp("("+ k +")").test(format)) 
{ 
format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length)); 
} 
} 
return format; 
} 



function open_dialog(){
       $("#dialog").dialog("open");
}

$(document).ready(function(){
  begtime=Number($("#begintime").html()); //获取当前第i周的值
  $("#before").click(function(){
  if (i<=1) {alert("这学期从第一周开始"); return}
  $("#tab1").fadeOut(500,function(){
	  i--;
    $.post("main_apply.php",{oper:i},function(result){
	  $("#tab1").html(result);
	  begtime-=60*24*60*7;
	  $("#tab1").fadeIn(500);
	  fresh();
    });
  });
  }); 
  $("#dialog").dialog({		
        autoOpen:false,
        modal:true,
		height:300,
		width:200
  }); 
  $("#dialog2").dialog({		
        autoOpen:false,
        modal:true
  }); 
  $("#next").click(function(){
  if (i>=weeks) {alert("超过了这学期最大的周数"); return;}
  $("#tab1").fadeOut(500,function(){
	  begtime+=60*24*60*7;
	  i++;
    $.post("main_apply.php",{oper:i},function(result){
	  $("#tab1").html(result);
	  $("#tab1").fadeIn(500);
	  fresh();
    });
  });
  });
  $("#but2").click(function(){
	 tempo=0;
	 for (pp=0;pp<total;pp++)
	 {
		if (showtag[pp]){
		tempo=1;
		break;	
		}
	 }
	 if (tempo==1){
	 $("#dialog2").dialog("open"); 	
	 }
	 else alert("请选择可用时间");
  });
  $("#finalsubmit").click(function(){
	  //生成客户端提交时间
	  var mydate = new Date();
	  var radtime = String(mydate.getTime());
	  rad=parseInt(1000*Math.random())
	  radtime += rad;
		//radtime 等于本次提交的时间+三位随机数
	 dia_name=$("#b_name").attr("value");
	 if (dia_name=="") {alert("请填写姓名");return;}
	 dia_tele=$("#b_tele").attr("value");
	 if (dia_tele=="") {alert("请填写电话");return;}
	 dia_numbers=$("#b_numbers").attr("value");
	 if (dia_numbers=="") {alert("请填写学生人数");return;}
	 dia_classname=$("#b_classname").attr("value");
	 if (dia_classname=="") {alert("请填写课程名称");return;}
	 dia_software=$("#b_software").attr("value");
	 if (dia_software=="") {alert("请填写需用软件");return;}
	 dia_more=$("#b_more").attr("value");
	 str="";times=0;
	 $("#ui-dialog-title-dialog2").html("提交情况");
	
	 for (pp=0;pp<total;pp++)
	 {
		 if (showtag[pp]=="") continue; //如果此条记录被删除那么就放弃吧
		 times++;
		 $.post("process.php",{
			 bperson:dia_name,
			 bphone:dia_tele,
			 bsoftware:dia_software,
			 bnumber:dia_numbers,
			 btime:shijian[pp],
			 bclassid:jiaoshi[pp],
			 bname:dia_classname,
			 bmore:dia_more,
			 tag:shijianduan[pp],
			 id:times,
			 randomtime:radtime
			 }//加入第i个randomtime
			 ,function(result){
			 str+=result;
			 $("#dialog2").html(str);
		 });
		  del(pp);
	 }
	 //接下来将数据存入 submit 表中
	 $.post("submittime.php",{
		 bperson:dia_name,
		 bphone:dia_tele,
		 bsoftware:dia_software,
		 bnumber:dia_numbers,
		 bname:dia_classname,
		 bmore:dia_more,
		 randomtime:radtime
	 }
	 ,function(result){
		 str+=result;
		 $("#dialog2").html(str);
	 });
	 setTimeout("window.location.href='apply.php'",1000);
  });

});


function query()
{	ii=$("#textarea").attr("value");
	if (ii<=0||ii>weeks) {alert("输入有误");return}
	i=ii;
      $("#tab1").fadeOut(500,function(){
      $.post("main_apply.php",{oper:ii},function(result){
	  $("#tab1").html(result);
	  begtime=Number($("#begintime").html());
	 
	  $("#tab1").fadeIn(500);
	  fresh();
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
function over(p){
	if ($("#tdd"+p).css("background-color")=="rgb(92, 2, 115)") {return;}
	$("#tdd"+p).css("background-color","#CB99FD");
}
function out(p){
	if ($("#tdd"+p).css("background-color")=="rgb(92, 2, 115)") {return;}
	$("#tdd"+p).css("background-color","#A7EFFE");
}
function choose(p){
	$("#tdd"+p).css("background-color","#5C0273");
	//进行左侧的插入工作
	//建立一个数组，存储相应的值
	//首先检查是否有相同的
	classroomid = 1+Math.floor((p-1)/21);   
	time = 1+Math.floor(((p-1) % 21)/7);	
	//time代表上午下午晚上
	weektime = (p-1) % 7;//星期几
	subtime = Number(begtime) + weektime * 60 * 60 * 24 ;
	//alert(classroomid+' '+time+' '+weektime+' ');
	
	for (pp=0;pp < total ;pp++)
	{
		if (classroomid==jiaoshi[pp] && time == shijianduan[pp] && shijian[pp] == subtime) {return;} //如果已经插入过相同的值了 不管了
	}
	//进行插入工作
	jiaoshi[total]=classroomid;
	shijianduan[total]=time;
	shijian[total]=subtime;
	id[total]=p;
	//插入到数组后进行显示工作
		var test = new Date(Number(shijian[total]+"000"));
		switch (shijianduan[total])
		{
			case 1:{time='上午';break;}
			case 2:{time='下午';break;}
			case 3:{time='晚上';break;}
		}
		
		showtag[total]="<div onclick=\"javascript:del("+total+")\" class=\"tags\"  id=\"d"+total+"\">"+ test.format("yyyy年MM月dd日")+'('+i+'周) '+time+','+$("#th"+jiaoshi[total]).html()+"</div>";
	//alert(str);
	str="";
	total ++ ;
	for (pp=0;pp<total;pp++)
	{
		str+=showtag[pp];
	}
	$("#left_bar").html(str);
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
#detail{
	float: right;
	width: 78%;
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
.notaken{
	background:#A7EFFE;
	cursor:pointer;
}
#dialog{
	font-family:微软雅黑,黑体;
	font-size:14px;
}
#left_bar2{
	float:left;
	width:20%;
	font-family:微软雅黑,黑体;
	font-size:14px;
	background:#CCC;
	border:solid 1px black;
	padding: 5px;
	text-align: center;
}
.tags{
	cursor:pointer;
}
.tags:hover{
	background-color:#E3E3E3;
}
.di_more{
	font-size:12px;
	font-family:微软雅黑,黑体;
	margin:0 auro;
	padding:0;
}
</style>
</head>

<body>
<h2>武汉大学遥感信息工程学院实验教学中心机房借用申请(2024新版)</h2>
<div id="left_bar2">
点击取消
<div id="left_bar">
	<div id="d1">
   	未选择
    </div>
</div>
<input type="button" id="but2" value="提交" />
</div>
<div id="detail" style="font-family:微软雅黑;">
<div id="tab1">
<?php include ("main_apply.php") ?>

</div>
<div style="font-size:14px;">
	<div style="float:left; cursor:pointer; margin-left: 25px; text-decoration: underline;" id="before">上一周</div> 
	<div style="float:left; cursor:pointer; margin-right: 25px; margin-left:15px; text-decoration: underline;" id="next">下一周</div><br />
	<div style="float:right;">备注：上午时间：8:00-12:00 下午时间：14:00-18:00 晚上时间：18:00-22:00</div>
</div>
</div>
<div id="dialog"  title="详细信息"></div>
<div id="dialog2" title="需要您填写的东西..."><br />
	<div class="di_more">申请姓名：<input id="b_name" size="25" maxlength="20" /></div><br />
	<div class="di_more">申请电话：<input id="b_tele" size="25" maxlength="20" /></div><br />
    <div class="di_more">上课人数：<input id="b_numbers" size="25" maxlength="20" /></div><br />
  <div class="di_more">课程名称：<input id="b_classname" size="25" maxlength="20" /></div><br />
  <div class="di_more">需用软件：<input id="b_software" size="25" maxlength="200" /></div><br />
    <div class="di_more">备注信息（上课时间段）：<br />
      <textarea cols="35" rows="10" id="b_more"></textarea>
    </div>
	<input type="button" id="finalsubmit" style="font-size:14px; font-family:微软雅黑,宋体" value="提交" />
</div>
</body>
</html>