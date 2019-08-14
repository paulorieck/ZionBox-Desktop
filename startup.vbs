Dim WinScriptHost, strCurDir
Set WinScriptHost = CreateObject("WScript.Shell")

Dim oFSO : Set oFSO = CreateObject("Scripting.FileSystemObject")
Dim sScriptDir : sScriptDir = oFSO.GetParentFolderName(WScript.ScriptFullName)

WinScriptHost.Run Chr(34) & sScriptDir & "\ipfs-windows-startup-script.bat" & Chr(34), 0
Set WinScriptHost = Nothing