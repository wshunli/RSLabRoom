<?php
error_reporting(0);

include ("config/conn.php");
//获取当前时间，判断当前第几周
$str="select value from console where name='begtime'";
$row = mysqli_fetch_array(mysqli_query($conn,$str));
$begtime = strtotime($row["value"]); //时间戳（开学时间）
$nowtime = time();
$week = (int)(($nowtime - $begtime) / (24*60*60*7)+1); //获取当前周
$week=@$_POST["oper"]?@$_POST["oper"]:$week;
//通过post获得当前周之后，再进行判断，通过开学时间的时间戳，转换时间
$nowtime = $begtime + 24*60*60*7*($week-1); //获取当前周的时间
$nowtime_ = date("时间：Y年m月d日～",$nowtime);
$nowtime_ = $nowtime_.(string)((date("Y年m月d日",$nowtime+24*60*60*6)));
?>
<div id="begintime" style="display:none;"><?php echo $nowtime ?></div>

<div style="margin-left:15px; float:left;"><?php echo $nowtime_ ?> 第<?php echo $week ?>周</div>
    <div style="margin-right:15px; float:right;">查询第<input type="text" value="<?php
    echo $week;
	?>" maxlength="2" id="textarea" style="width:30px;" />周 <input type="button" id="btn1" onclick="javascript:query()"  value="搜索" /></div>
    <table width="98%" height="267" border="1">
  <tr>
    <th scope="col">机房</th>
    <th scope="col">时段</th>
    <th scope="col">星期日</th>
    <th scope="col">星期一</th>
    <th scope="col">星期二</th>
    <th scope="col">星期三</th>
    <th scope="col">星期四</th>
    <th scope="col">星期五</th>
    <th scope="col">星期六</th>
  </tr>
  
  <tr>
  <?php 
  //开始计算所需要的表格数（因为是教室数量未知）
  
  $str = "select cid,cname from class order by cname,cid";
  $i=0;
  $result = mysqli_query($conn,$str)or die(mysqli_error());
  while ($row = mysqli_fetch_array($result))
  {
	$i++;
	$array1[$i]=$row["cname"];  //将名字存进数组中
	$array4[$i]=$row["cid"];
  }

  //开始查询课程表，通过给定的现有week进行查询
  
  $begtime_ = date("Y-m-d",$begtime+60*60*24*7*($week-1));
  $endtime_ = date("Y-m-d",$begtime+60*60*24*7*$week-1); 
  $str="SELECT bid,btime,bname,tag,bclassid FROM `borrow` WHERE `btime` >= '$begtime_' and `btime` <= '$endtime_' and status=1  ";//and status=1
  
  $result = mysqli_query($conn,$str) or die (mysqli_error());
  while ($row = mysqli_fetch_array($result))
  {
	  $ttime=strtotime($row["btime"]); //选课的日期
	  $ttime=(int)(($ttime-$begtime-60*60*24*7*($week-1))/(60*60*24)); //算出当前是周几呀
	  $array2[$row["bclassid"]][$row["tag"]][$ttime]=$row["bname"];
	  $array3[$row["bclassid"]][$row["tag"]][$ttime]=$row["bid"]; //"第i个教室 第j个时段 的 第几天（周几） 有课(ID)"
  }
  for($ii=1;$ii<=$i;$ii++)
  {?>
  	
    <th rowspan="3" id="th<?php echo $ii; ?>" scope="row"><?php echo $array1[$ii] ?></th>
    <td>上午</td>
    <?php 
		for ($j=0;$j<7;$j++)
		{
			 if (@$array2[$array4[$ii]]["1"][$j])
			 {
				 echo "<td class=\"taken\" id=\"td".$array3[$array4[$ii]]["1"][$j]."\" onclick=\"javascript:detail(".$array3[$array4[$ii]]["1"][$j].");\">".($array2[$array4[$ii]]["1"][$j])."</td>";
			 }
			 else 
			 {
				 echo "<td id=\"tdd".(string)(($ii-1)*21+1+$j)."\" class=\"notaken\" onMouseOver=\"javascript:over(".(string)(($ii-1)*21+1+$j).")\" onMouseOut=\"javascript:out(".(string)(($ii-1)*21+1+$j).")\"  onclick=\"javascript:choose(".(string)(($ii-1)*21+1+$j).")\">无</td>";
			 }
		}
		//输出数组内的元素
	?>

  </tr>   
 
  <tr>
    <td>下午</td>
    <?php 
		for ($j=0;$j<7;$j++)
		{
			 if (@$array2[$array4[$ii]]["2"][$j])
			 {
				 echo "<td class=\"taken\" id=\"td".$array3[$array4[$ii]]["2"][$j]."\" onclick=\"javascript:detail(".$array3[$array4[$ii]]["2"][$j].");\">".($array2[$array4[$ii]]["2"][$j])."</td>";
			 }
			 else 
			 {
				 echo "<td id=\"tdd".(string)(($ii-1)*21+8+$j)."\" class=\"notaken\" onMouseOver=\"javascript:over(".(string)(($ii-1)*21+8+$j).")\" onMouseOut=\"javascript:out(".(string)(($ii-1)*21+8+$j).")\"  class=\"notaken\" onclick=\"javascript:choose(".(string)(($ii-1)*21+1+$j+7).")\">无</td>";
			 }
		}
		//输出数组内的元素
	?>
  </tr>
  <tr>
    <td>晚上</td>
    <?php 
		for ($j=0;$j<7;$j++)
		{
			 if (@$array2[$array4[$ii]]["3"][$j])
			 {
				 echo "<td class=\"taken\" id=\"td".$array3[$array4[$ii]]["3"][$j]."\" onclick=\"javascript:detail(".$array3[$array4[$ii]]["3"][$j].");\">".($array2[$array4[$ii]]["3"][$j])."</td>";
			 }
			 else 
			 {
				 echo "<td id=\"tdd".(string)(($ii-1)*21+15+$j)."\" class=\"notaken\" class=\"notaken\"  onMouseOver=\"javascript:over(".(string)(($ii-1)*21+15+$j).")\" onMouseOut=\"javascript:out(".(string)(($ii-1)*21+15+$j).")\"  onclick=\"javascript:choose(".(string)(($ii-1)*21+15+$j).")\">无</td>";
			 }
		}
		//输出数组内的元素
	?>
  </tr>
<?php 

	}?>

</table>