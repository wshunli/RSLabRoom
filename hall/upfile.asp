<!--#include File="upload.inc"-->
<%
Server.ScriptTimeOut=999999
'公开定义
Dim upload_type,upload_ViewType
Dim previewpath,F_Viewname
Dim Forumupload
Dim FormName,FormPath,File_name,FileExt,Filesize,F_Type,rename
Dim upNum,dateupnum
Dim TempSize,ImageWidth,ImageHeight
Dim ImageMode
'________________________________________________

'===========================上传功能开始判断==============================
FormPath=checkFolder

'开始上传图片
Call upload_0()

'===========================无组件上传加水印，加缩略图============================
Sub upload_0()
Dim upload,File,UpCount,utype
UpCount=0
set upload=new upload_5xsoft

set file=upload.file("fileData")
        utype=int(upload.Form("utype"))
		FileWidthl = int(upload.Form("imgWidthl"))
        FileHeightl = int(upload.Form("imgHeightl"))
		FileWidth = int(upload.Form("imgWidth"))
        FileHeight = int(upload.Form("imgHeight"))
        FileBorder = int(upload.Form("imgBorder"))
        FileTitle = upload.Form("imgTitle")
        FileAlign = upload.Form("imgAlign")
        FileHspace = int(upload.Form("imgHspace"))
        FileVspace = int(upload.Form("imgVspace"))

		FileExt=lcase(File.FileExt)

		if TrueStr(file.filename)=false then
		response.write "图片文件出错，请重新选择，并点击预览确定你的图片能显示出来"
        response.end
        end if
		If right(FormPath,1)<>"/" then FormPath=FormPath&"/"
		'付值变量
		F_Type		=	CheckFiletype(FileExt)
		File_name	=	CreateName()
		Filename	=	File_name&"."&FileExt
		rename		=	Filename&"|"
		Filename	=	FormPath&Filename
		Filesize	=	File.FileSize
        file.saveas  Server.mappath(FileName)
		filename="../web/"&filename
		Response.Write "<script type=""text/javascript"">parent.KindInsertImage(""" & Filename & """,""" & FileWidth & """,""" & FileHeight & """,""" & FileBorder & """,""" & FileTitle & """,""" & FileAlign & """,""" & FileHspace & """,""" & FileVspace & """);</script>"
		F_Viewname=FormPath&File_name&"_"&FileExt&"_small.jpg"
		if FileWidthl>300 and Fileheightl>300 then
		Call shuiyin(FileName,ImageMode)
	    end if	
        Response.write "1个文件上传成功!大小为"&round(FileSize/1024,2)&"K"
Set File=Nothing
Set upload=Nothing
End Sub



'判断文件类型是否合格
Private Function CheckFileExt(FileExt)
Dim Forumupload,i
	If FileExt="" or IsEmpty(FileExt) Then
		CheckFileExt=false
		Exit Function
	End If
	If FileExt="asa" or FileExt="asp" or FileExt="cer" or FileExt="shtml" or FileExt="php" or FileExt="aspx" or FileExt="bmp" then
	CheckFileExt=false
    Exit Function
	End If
	Forumupload=split(uploadtype,"|")
	For i=0 To ubound(Forumupload)
		If Lcase(FileExt)=Lcase(trim(Forumupload(i))) then
			CheckFileExt=true
			exit Function
		Else
			CheckFileExt=false
		End If
	Next
End Function
Private Function CheckFiletype(FileExt)
Dim upFiletype
Dim FilePic,FileVedio,FileSoft,FileFlash,FileMusic
FileExt=Lcase(replace(FileExt,".",""))
Select Case Lcase(FileExt)
		Case "gif", "jpg", "jpeg","png","bmp","tif","iff"
		CheckFiletype=1
		Case "swf", "swi"
		CheckFiletype=2
		Case "mid", "wav", "mp3","rmi","cda"
		CheckFiletype=3
		Case "avi", "mpg", "mpeg","ra","ram","wov","asf"
		CheckFiletype=4
		Case Else
		CheckFiletype=0
End Select
End Function

function TrueStr(fileTrue)
 str_len=len(fileTrue)
 pos=Instr(fileTrue,chr(0))
 if pos=0 or pos=str_len then
    TrueStr=true
 else
    TrueStr=false
 end if
end function
'___________________________________________________________

'创建预览图片:call CreateView(原始文件的路径,预览文件名及路径)
Sub CreateView(imagename,tempFilename)
'定义变量
Dim PreviewImageFolderName
Dim ogvbox,objFont,xiaotu
Dim Logobox,LogoPath
LogoPath = Server.MapPath("/images") & "\logo.gif"  '//加入图片所在路径及文件名
        Set xiaotu = Server.CreateObject("Persits.Jpeg")
        xiaotu.Open Trim(Server.MapPath(imagename))	

If xiaotu.OriginalWidth / xiaotu.OriginalHeight > 1 Then
    xiaotu.Width = 100 
    xiaotu.Height = int((100/xiaotu.OriginalWidth)*xiaotu.OriginalHeight) 
Else
    xiaotu.Height = 100 
    xiaotu.Width= int(xiaotu.OriginalWidth*(100/xiaotu.OriginalHeight)) 
End If
    xiaotu.Save Server.MapPath(tempFilename)	
Set xiaotu = Nothing
End Sub
'___________________________________________________________


sub shuiyin(imagename,ImageMode)
	Set ogvbox = Server.CreateObject("Persits.Jpeg")
	ogvbox.Open Trim(Server.MapPath(imagename))	
	dim bb
	dim aa
	dim cc
	aa=ogvbox.Binary
			ogvbox.Canvas.Font.Color	= &Hff0000		'// 文字的颜色
			ogvbox.Canvas.Font.Family	= "Arial Black"	'// 文字的字体
			ogvbox.Canvas.Font.BkMode = "Opaque"
			ogvbox.Canvas.Font.Bkcolor=&HffFFFF
			ogvbox.Canvas.Font.Quality = 4
			ogvbox.Canvas.Font.size = 20
			ogvbox.Canvas.Font.ShadowColor = &HFFFF00''文字阴影
			ogvbox.Canvas.Font.ShadowYOffset = 1 
            ogvbox.Canvas.Font.ShadowXOffset = 1 
			ogvbox.Canvas.Font.Bold = false
			ogvbox.Canvas.Print 1, 1, "图片水印信息"		
			bb=ogvbox.Binary
			Set ogvbox = Server.CreateObject("Persits.Jpeg") 
             ogvbox.OpenBinary aa 
            Set Logo = Server.CreateObject("Persits.Jpeg") 
             Logo.OpenBinary bb 
            ogvbox.DrawImage 0,0, Logo, 0.6 '0.3是透明度 
            cc=ogvbox.Binary 
			ogvbox.Save Server.MapPath(imagename)		'// 生成大图片，并加水印
			
Set Jpeg1 = Server.CreateObject("Persits.Jpeg")
Set Jpeg2 = Server.CreateObject("Persits.Jpeg")
Jpeg1.Open Server.MapPath(imagename)
Jpeg2.Open Server.MapPath("/images/logo.jpg")

iWidth=Jpeg1.OriginalWidth 
iHeight=Jpeg1.OriginalHeight

iiWidth=Jpeg2.OriginalWidth 
iiHeight=Jpeg2.OriginalHeight

iX=iWidth / 2
iY=iHeight / 2

iiX=iiWidth / 2
iiY=iiHeight / 2

iiiX=iX-iiX
iiiY=iY-iiY
Jpeg1.Canvas.DrawImage iiiX, iiiY, Jpeg2,0.3,&HFFFFFF  ' optional arguments omitted
jpeg1.save Server.mappath(imagename)


	set aa=nothing
	set bb=nothing
	set cc=nothing
	set ogvbox=nothing
	set logo=nothing
	set jpeg1=nothing
	set jpeg2=nothing
end sub



'=====================生成文件随机名=================================
Private Function CreateName()
Dim ranNum
	randomize
	ranNum=int(999*rnd)
	CreateName=year(now)&month(now)&day(now)&hour(now)&minute(now)&second(now)&ranNum
End Function
'___________________________________________________________





'=====================生成图片所在文件夹=============================
Private Function CreatePath()
Dim objFSO,Fsofolder,uploadpath
uploadpath=year(now)&month(now)&day(now)
On Error Resume Next
Set objFSO = Server.CreateObject("Scripting.FileSystemObject")
	If objFSO.FolderExists(Server.MapPath(FormPath&uploadpath))=False Then
	objFSO.CreateFolder Server.MapPath(FormPath&uploadpath)
	End If
	If Err.Number = 0 Then
	CreatePath=uploadpath&"/"
	Else
	CreatePath=""
	End If
set objFSO = nothing
End Function
'___________________________________________________________





'=====================检查文件夹=================================
Function checkFolder()
	If uploadto="" Or uploadto="0" Then uploadto="attached/"
	checkFolder=uploadto
End Function 
'___________________________________________________________
%>
</body>
</html>
