# FILE-PATH: ./utils/log-tests.ps1
#
# Requires Windows PowerShell 5.1
#
# IMPORTANT:
# Save this file explicitly as UTF-8 WITH BOM for Windows PowerShell 5.1.
# Raw UTF-8 without BOM can cause PS 5.1 to misread string literals.
#
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
#==============================================================================
# VIEW-MODEL: State Translation & UI Definitions
#==============================================================================
# Enable ANSI/VT rendering in PS 5.1 console hosts
function Initialize-AnsiTerminal {
[CmdletBinding()]
param()
# Only needed for Windows PowerShell 5.1 and earlier
if ($PSVersionTable.PSVersion.Major -gt 5) {
return $true
}
# Win32 API signatures required to toggle console VT modes
$Signatures = @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
'@
# Load type only once — suppress warnings and errors
$type = ("Win32.Win32Utils" -as [type])
if (-not $type) {
$type = Add-Type -MemberDefinition $Signatures `
-Namespace "Win32" `
-Name "Win32Utils" `
-PassThru `
-ErrorAction SilentlyContinue `
2>$null
}
# If type failed to load, ANSI cannot be enabled
if (-not $type) {
return $false
}
# Standard output handle
$STD_OUTPUT_HANDLE = -11
$stdOut = $type::GetStdHandle($STD_OUTPUT_HANDLE)
# Non-console hosts return 0 or -1 — avoid errors
if ($stdOut -eq 0) {
return $false
}
# Try to retrieve current console mode
$mode = 0
if (-not $type::GetConsoleMode($stdOut, [ref]$mode)) {
# Non-interactive hosts will fail here
return $false
}
# Enable VT processing + improved newline behavior
$ENABLE_VTP = 0x0004 # ENABLE_VIRTUAL_TERMINAL_PROCESSING
$newMode = $mode -bor $ENABLE_VTP
# Apply updated mode
$success = $type::SetConsoleMode($stdOut, $newMode)
# Optionally ensure future consoles inherit VT support
try {
New-Item -Path HKCU:\Console -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty -Path HKCU:\Console -Name VirtualTerminalLevel -Type DWord -Value 1 -ErrorAction
SilentlyContinue
}
catch {
# Registry access is optional; ignore any failure
}
return $success
}
$script:ViewModel = @{
Glyph = @{
# Core Frames
TopLeft
TopRight
BotLeft
BotRight
= [string][char]0x256D # ╭
= [string][char]0x256E # ╮
= [string][char]0x2570 # ╰
= [string][char]0x256F # ╯
Horizontal = [string][char]0x2500 # ─
Vertical
= [string][char]0x2502 # │
RightTee
LeftTee
SqTopLeft
SqBotLeft
= [string][char]0x251C # ├
= [string][char]0x2524 # ┤
= [string][char]0x250C # ┌
= [string][char]0x2514 # └
# Missing Clack Connectors & State Lines
BarMiddle
= [string][char]0x2506 # ┆ Multi-line inputs or open streams
BarDashed
= [string][char]0x254C # ╌ Divides sub-sections horizontally
StepActive = [string][char]0x25C9 # ◉ Active radial items / focused inputs
# Indicators & Alerts
Check
= [string][char]0x2713 # ✓ Success
Cross
Info
Warning
= [string][char]0x2715 # ✕ Failure / Canceled / Error state
= [string][char]0x2139 #  Instructions / Info block tooltips
= [string][char]0x26A0 # ⚠ Warning flags
# Pointers & Selection Geometric shapes
Arrowhead
= [string][char]0x25B6 # ▶
PointerRight = [string][char]0x203A # ›
Diamond
= [string][char]0x25c7 # ◇
SolidDiamond = [string][char]0x25C6 # ◆
Circle
= [string][char]0x25CB # ○
SolidCircle = [string][char]0x25CF # ●
# Powerline Pill
PillLeftA
= [string][char]0xE0B6 # 
PillLeftB
= [string][char]0x2588 # █
PillRightA = [string][char]0x2588 # █
PillRightB = [string][char]0xE0B4 # 
}
Ansi = @{
# Core Modifiers & Controls
Esc
= [char]27
Reset
Bold
Dim
Underline
Invert
Hidden
= "$([char]27)[0m"
= "$([char]27)[1m"
= "$([char]27)[2m"
= "$([char]27)[4m"
= "$([char]27)[7m"
= "$([char]27)[8m"
# Standard Foreground Colors
Black
= "$([char]27)[30m"
Red
Green
Yellow
Blue
Magenta
Cyan
White
= "$([char]27)[31m"
= "$([char]27)[32m"
= "$([char]27)[33m"
= "$([char]27)[34m"
= "$([char]27)[35m"
= "$([char]27)[36m"
= "$([char]27)[37m"
# Bright Foreground Colors
BrightBlack
= "$([char]27)[90m"
Gray
BrightRed
BrightGreen
BrightYellow
BrightBlue
= "$([char]27)[90m"
= "$([char]27)[91m"
= "$([char]27)[92m"
= "$([char]27)[93m"
= "$([char]27)[94m"
BrightMagenta = "$([char]27)[95m"
BrightCyan
= "$([char]27)[96m"
BrightWhite
= "$([char]27)[97m"
# Standard Background Colors
BgBlack
= "$([char]27)[40m"
BgRed
BgGreen
BgYellow
BgBlue
BgMagenta
BgCyan
BgWhite
= "$([char]27)[41m"
= "$([char]27)[42m"
= "$([char]27)[43m"
= "$([char]27)[44m"
= "$([char]27)[45m"
= "$([char]27)[46m"
= "$([char]27)[47m"
# Bright Background Colors
BgBrightBlack = "$([char]27)[100m"
BgBrightRed
= "$([char]27)[101m"
BgBrightGreen = "$([char]27)[102m"
BgBrightYellow = "$([char]27)[103m"
BgBrightBlue
= "$([char]27)[104m"
BgBrightMagenta = "$([char]27)[105m"
BgBrightCyan
= "$([char]27)[106m"
BgBrightWhite = "$([char]27)[107m"
# Screen / Terminal Actions
ClearScreen
= "$([char]27)[2J" # Clear entire console screen window buffer
ClearLineToEnd = "$([char]27)[K" # Clear line from cursor position to right edge
CursorHome
= "$([char]27)[H" # Reset cursor back to Top-Left position (0,0)
# Default Track Line Color
DimDarkGray
= "$([char]27)[2m$([char]27)[90m"
BgDimDarkGray = "$([char]27)[2m$([char]27)[100m"
DarkGray
= "$([char]27)[90m"
BgDarkGray
}
Spinner = @{
Arc
Line
= @('', '', '', '')
= @('|', '/', '-', '\')
Braille = @('', '', '', '', '', '', '', '', '', '')
#  Emoji Spinners
Moon1 = @('', '', '', '', '', '', '', '')
Moon2 = @('', '', '', '', '', '', '', '')
Clock = @('', '', '', '', '', '', '', '', '', '', '', '')
Earth = @('', '', '')
Heart = @('', '', '', '', '')
#  Unicode & Terminal Symbol Spinners
Bar
= @('▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃')
Block = @('▖', '▘', '▝', '▗')
Ball
= @('(● )', '( ● )', '( ● )', '( ●)', '( ● )', '( ● )')
Arcs = @('', '', '', '')
Pulse = @('█', '▉', '▊', '▋', '▌', '▍', '▎', '▏', '▎', '▍', '▌', '▋', '▊', '▉')
}
Cli
= @{
# Success / Verification
Success = "" # Green Check Mark
Check = "" # Light Check Mark
# Errors / Failures
Error = "" # Red Cross Mark
Cross = "" # Heavy Multiplication X
Warning = "⚠" # Warning / Triangle
# Information / Status
Info = "" # Information Source
Bullet = "•" # Bullet Point
Sparkle = "" # Sparkles
# Progress / Time
Wait = "" # Hourglass Flowing Sand
Clock = "" # Hourglass Done
Rocket = "" # Rocket (Surrogate pair for UTF-16)
# Cursor
Hide
Show
= "$([char]27)[?25l"
= "$([char]27)[?25h"
}
}
#==============================================================================
# MODEL: Business Logic & Data Structures
#==============================================================================
class ProjectPaths {
[string]$ScriptDir
[string]$ProjectRootDir
[string]$TestsDir
[string]$LogsDir
ProjectPaths() {
if ($PSScriptRoot) {
$this.ScriptDir = [System.IO.Path]::GetFullPath($PSScriptRoot)
}
else {
$this.ScriptDir = [System.IO.Path]::GetFullPath(".")
}
$this.ProjectRootDir = [ProjectPaths]::GetProjectRootPath($this.ScriptDir)
$this.TestsDir = Join-Path $this.ProjectRootDir "tests"
$this.LogsDir = Join-Path $this.ProjectRootDir "logs"
}
static [string] GetProjectRootPath([string]$StartDir) {
$currentDir = [System.IO.Path]::GetFullPath($StartDir)
$firstPackageJsonFound = $null
while ($currentDir -and (Test-Path $currentDir)) {
if (
(Test-Path (Join-Path $currentDir ".git")) -or
(Test-Path (Join-Path $currentDir "package.json")) -or
(Test-Path (Join-Path $currentDir "tsconfig.json")) -or
(Test-Path (Join-Path $currentDir "bun.lock"))
) {
return $currentDir
}
if ((Test-Path (Join-Path $currentDir "package.json")) -and (-not $firstPackageJsonFound)) {
$firstPackageJsonFound = $currentDir
}
$parentDir = Split-Path -Path $currentDir -Parent
if ($parentDir -eq $currentDir) {
break
}
$currentDir = $parentDir
}
if ($firstPackageJsonFound) {
return $firstPackageJsonFound
}
return [System.IO.Path]::GetFullPath($StartDir)
}
}
class TestLogConfig {
[ProjectPaths]$Paths
[int]$MaxLogCount
[int]$MaxLogFileWidth
[int]$MaxLogTextWidth
[int]$SpinnerClearWidth
[string]$Appendage
[string]$LogFileName
[string]$LogFilePath
# Structural / theme colors
[string]$TrackColor
[string]$BoxColor
[string]$SpinnerColor
[string]$JUnitColor
[string]$PillColor
[string]$PillTextColor
# Semantic / text colors
[string]$SuccessColor
[string]$WarningColor
[string]$ErrorColor
[string]$InfoColor
[string]$MutedColor
[string]$TextColor
[string]$TextAccentColor
[string]$White
# Style selections
[string]$SpinnerStyle
[string]$SpinnerPolicy
[int]$SpinnerInterval
[string]$LogHeader
[string]$LogDivider
[string]$TestDivider
TestLogConfig([ProjectPaths]$paths) {
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$width = 125
$shortWidth = 50
$dash = "-" * $width
$star = "*" * $width
$headerStart = "=== [1/2] PROJECT ROOT TEST START ==="
$headerMid = "=== *[2/2]* WORKSPACE TEST START *==="
$workspace = "=== *[---]* WORKSPACE TEST START *==="
$this.Paths = $paths
$this.MaxLogCount = 5
$this.MaxLogFileWidth = $width
$this.MaxLogTextWidth = $shortWidth
$this.SpinnerClearWidth = 80
$this.Appendage = "_tests_results.log"
$this.LogFileName = "{0}{1}" -f $timestamp, $this.Appendage
$this.LogFilePath = Join-Path $paths.LogsDir $this.LogFileName
# Structural / theme colors
$this.TrackColor = "DarkGray"
$this.BoxColor = "Yellow"
$this.SpinnerColor = "BrightMagenta"
$this.JUnitColor = "Yellow"
$this.PillColor = "Magenta"
$this.PillTextColor = "Black"
# Semantic / text colors
$this.SuccessColor = "Green"
$this.WarningColor = "Yellow"
$this.ErrorColor = "Red"
$this.InfoColor = "Cyan"
$this.MutedColor = "DarkGray"
$this.TextColor = "Gray"
$this.TextAccentColor = "Magenta"
$this.White = "White"
# Style selections
$this.SpinnerStyle = "Moon2"
$this.SpinnerPolicy = "Logical"
$this.SpinnerInterval = 100
$this.LogHeader = "`r`n$dash`r`n$headerStart`r`n$dash`r`n"
$this.LogDivider = "`r`n$dash`r`n$headerMid`r`n$dash`r`n"
$this.TestDivider = "`r`n`r`n$star`r`n$star`r`n$workspace`r`n$star`r`n$star`r`n`r`n`r`n"
}
}
class LogManager {
[TestLogConfig]$Config
LogManager([TestLogConfig]$Config) {
$this.Config = $Config
}
[void] EnsureLogDirectory() {
if (-not (Test-Path $this.Config.Paths.LogsDir -PathType Container)) {
New-Item -ItemType Directory -Path $this.Config.Paths.LogsDir -Force | Out-Null
}
}
[bool] CleanOldLogs() {
if (-not (Test-Path $this.Config.Paths.LogsDir -PathType Container)) {
return $false
}
$existingLogs = Get-ChildItem -Path $this.Config.Paths.LogsDir -File |
Where-Object { $_.Name -like ("*" + $this.Config.Appendage) } |
Sort-Object Name
if ($null -eq $existingLogs) {
return $false
}
$count = @($existingLogs).Count
if ($count -le $this.Config.MaxLogCount) {
return $false
}
$removeCount = $count - $this.Config.MaxLogCount
$existingLogs |
Select-Object -First $removeCount |
ForEach-Object {
Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
}
return $true
}
[void] RemoveOldCombinedLogs() {
$logPath = $this.Config.Paths.LogsDir
if (-not (Test-Path $logPath -PathType Container)) {
return
}
$oldCombinedFiles = Get-ChildItem -Path $logPath -Filter "*_junit_combined_*.xml" -File
-ErrorAction SilentlyContinue
foreach ($file in $oldCombinedFiles) {
try {
Remove-Item -Path $file.FullName -Force -ErrorAction Stop
}
catch {
Write-Error "Failed to remove old file $($file.FullName): $_"
}
}
}
[void] NormalizeLog() {
$filePath = $this.Config.LogFilePath
$maxWidth = $this.Config.MaxLogFileWidth
$divider = $this.Config.TestDivider
if (-not (Test-Path $filePath -PathType Leaf)) {
return
}
$logContent = Get-Content -Path $filePath -Raw
# 1. Strip ANSI escape sequences
$ansiPattern = '\x1b\[[0-9; ]*[a-zA-Z]'
$logContent = $logContent -replace $ansiPattern, ''
# 2. Strip PowerShell stream wrapper line
$errorWrapperPattern = '(?m)^System\.Management\.Automation\.RemoteException\r?\n?'
$logContent = $logContent -replace $errorWrapperPattern, "`r`n"
# 3. Inject divider before workspace blocks
$workspaceStartPattern = '(?m)^(?=.*?\bbun test Vertical\d)'
$logContent = $logContent -replace $workspaceStartPattern, $divider
# 4. Strip monorepo workspace prefix
$workspacePrefixPattern = '(?m)^@?[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+ test: '
$logContent = $logContent -replace $workspacePrefixPattern, ''
# 5. Break nested test descriptions onto clean, indented lines
$logContent = $logContent -replace ' > ', "`r`n`t> "
# 6. Reduce 3+ line breaks to 2
$blankLinesPattern = '(?m)(\r?\n) { 3, }'
$logContent = $logContent -replace $blankLinesPattern, "`r`n`r`n"
$logContent |
Out-File -FilePath $filePath -Width $maxWidth -Encoding utf8 -Force
}
}
class BunTestRunner {
# Public Class Properties
[TestLogConfig]$Config
[LogManager]$LogManager
# Constructor
BunTestRunner(
[TestLogConfig]$Config,
[LogManager]$LogManager
) {
$this.Config = $Config
$this.LogManager = $LogManager
}
# Public Run Method
[int] Run() {
$this.Config.LogHeader |
Out-File `
-FilePath $this.Config.LogFilePath `
-Width $this.Config.MaxLogFileWidth `
-Encoding utf8
& bun test --coverage -- $this.Config.Paths.TestsDir 2>&1 |
ForEach-Object { $_.ToString() } |
Out-File `
-FilePath $this.Config.LogFilePath `
-Append `
-Width $this.Config.MaxLogFileWidth `
-Encoding utf8
$exit1 = $LASTEXITCODE
$this.Config.LogDivider |
Out-File `
-FilePath $this.Config.LogFilePath `
-Append `
-Width $this.Config.MaxLogFileWidth `
-Encoding utf8
& bun run --workspaces test 2>&1 |
ForEach-Object { $_.ToString() } |
Out-File `
-FilePath $this.Config.LogFilePath `
-Append `
-Width $this.Config.MaxLogFileWidth `
-Encoding utf8
$exit2 = $LASTEXITCODE
$this.LogManager.NormalizeLog()
if ($exit1 -ne 0) {
return $exit1
}
return $exit2
}
}
#==============================================================================
# VIEW HELPERS
#==============================================================================
function Get-Color {
[CmdletBinding()]
param(
[Parameter(Mandatory = $true)]
[string]$Color
)
if ($script:ViewModel.Ansi.ContainsKey($Color)) {
return $script:ViewModel.Ansi[$Color]
}
return $script:ViewModel.Ansi.White
}
function Get-Padding {
[CmdletBinding()]
param (
[string]$Character = ' ',
[int]$Count = 40
)
$Character * $Count
}
function Edit-Text {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$Message,
[string]$Color = $script:ViewModel.Ansi.White
)
$ansiPattern = [regex]::Escape([char]27 + "[")
if ($Message -match $ansiPattern) {
return $Message + $script:ViewModel.Ansi.Reset
}
return $Color + $Message + $script:ViewModel.Ansi.Reset
}
function Write-Track {
[CmdletBinding(DefaultParameterSetName = 'Step')]
param (
[Parameter(Mandatory)]
[TestLogConfig]$Config,
[Parameter(ParameterSetName = 'Intro', Mandatory)]
[switch]$Intro,
[Parameter(ParameterSetName = 'Step', Mandatory)]
[switch]$Step,
[Parameter(ParameterSetName = 'Outro', Mandatory)]
[switch]$Outro,
[Parameter(ParameterSetName = 'Blank', Mandatory)]
[switch]$Blank
)
$trackAnsi = Get-Color -Color $Config.TrackColor
$resetAnsi = $script:ViewModel.Ansi.Reset
if ($Blank) {
Write-Host (
$trackAnsi +
$script:ViewModel.Glyph.Vertical +
$resetAnsi
)
return
}
$glyph = $script:ViewModel.Glyph.RightTee
if ($Intro) {
$glyph = $script:ViewModel.Glyph.TopLeft
}
elseif ($Outro) {
$glyph = $script:ViewModel.Glyph.BotLeft
}
Write-Host (
$trackAnsi +
$glyph +
$script:ViewModel.Glyph.Horizontal +
' ' +
$resetAnsi
) -NoNewline
}
function Write-Pill {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$Text,
[Parameter(Mandatory = $true)]
[TestLogConfig]$Config,
[Parameter(ParameterSetName = 'Success')]
[switch]$Success,
[Parameter(ParameterSetName = 'Warning')]
[switch]$Warning,
[Parameter(ParameterSetName = 'Error')]
[switch]$Err,
[Parameter(ParameterSetName = 'Info')]
[switch]$Info,
[Parameter(ParameterSetName = 'Muted')]
[switch]$Muted,
[switch]$NoNewline
)
$pillAnsi = Get-Color -Color $Config.PillColor
$textAnsi = Get-Color -Color $Config.PillTextColor
$bgAnsi = Get-Color -Color ("Bg" + $Config.PillColor)
switch ($true) {
$Info {
$pillAnsi = Get-Color -Color $Config.InfoColor
$bgAnsi = Get-Color -Color ("Bg" + $Config.InfoColor)
break
}
$Success {
$pillAnsi = Get-Color -Color $Config.SuccessColor
$bgAnsi = Get-Color -Color ("Bg" + $Config.SuccessColor)
break
}
$Warning {
$pillAnsi = Get-Color -Color $Config.WarningColor
$bgAnsi = Get-Color -Color ("Bg" + $Config.WarningColor)
break
}
$Muted {
$pillAnsi = Get-Color -Color $Config.MutedColor
$textAnsi = Get-Color -Color $Config.White
$bgAnsi = Get-Color -Color ("Bg" + $Config.MutedColor)
break
}
$Err {
$pillAnsi = Get-Color -Color $Config.ErrorColor
$textAnsi = Get-Color -Color $Config.White
$bgAnsi = Get-Color -Color ("Bg" + $Config.ErrorColor)
break
}
default {
$pillAnsi = Get-Color -Color $Config.PillColor
$textAnsi = Get-Color -Color $Config.PillTextColor
$bgAnsi = Get-Color -Color ("Bg" + $Config.PillColor)
break
}
}
$resetAnsi = $script:ViewModel.Ansi.Reset
$left = "$($script:ViewModel.Glyph.PillLeftA)$($script:ViewModel.Glyph.PillLeftB)"
$right = "$($script:ViewModel.Glyph.PillRightA)$($script:ViewModel.Glyph.PillRightB)"
$output =
$pillAnsi + $left +
$bgAnsi + $textAnsi + " $Text " + $resetAnsi +
$pillAnsi + $right + $resetAnsi
if ($NoNewline) {
Write-Host $output -NoNewline
}
else {
Write-Host $output
}
}
function Write-Intro {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$Title,
[Parameter(Mandatory = $true)]
[TestLogConfig]$Config,
[Parameter(ParameterSetName = 'Success')]
[switch]$Success,
[Parameter(ParameterSetName = 'Warning')]
[switch]$Warning,
[Parameter(ParameterSetName = 'Error')]
[switch]$Err,
[Parameter(ParameterSetName = 'Info')]
[switch]$Info,
[Parameter(ParameterSetName = 'Muted')]
[switch]$Muted,
[switch]$NewLine
)
Write-Track -Config $Config -Intro
$text = "$($script:ViewModel.Ansi.Bold)$Title"
switch ($true) {
$Info {
Write-Pill -Text $text -Config $Config -Info
break
}
$Success {
Write-Pill -Text $text -Config $Config -Success
break
}
$Warning {
Write-Pill -Text $text -Config $Config -Warning
break
}
$Muted {
Write-Pill -Text $text -Config $Config -Muted
break
}
$Err {
Write-Pill -Text $text -Config $Config -Err
break
}
default {
Write-Pill -Text $text -Config $Config
break
}
}
if ($NewLine) {
Write-Track -Config $Config -Blank
}
}
function Write-Step {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$Message,
[Parameter(Mandatory = $true)]
[TestLogConfig]$Config,
[Parameter(ParameterSetName = 'Success')]
[switch]$Success,
[Parameter(ParameterSetName = 'Warning')]
[switch]$Warning,
[Parameter(ParameterSetName = 'Error')]
[switch]$Err,
[Parameter(ParameterSetName = 'Info')]
[switch]$Info,
[Parameter(ParameterSetName = 'Muted')]
[switch]$Muted,
[switch]$NewLine,
[switch]$NoTrack
)
if ($NoTrack) {
}
else {
Write-Track -Config $Config -Step
}
$colorName = $Config.TextColor
switch ($true) {
$Info {
$colorName = $Config.InfoColor
break
}
$Success {
$colorName = $Config.SuccessColor
break
}
$Warning {
$colorName = $Config.WarningColor
break
}
$Muted {
$colorName = $Config.MutedColor
break
}
default {
$colorName = $Config.TextColor
break
}
}
$fallbackColor = Get-Color -Color $colorName
$processedMessage = Edit-Text -Message $Message -Color $fallbackColor
Write-Host $processedMessage
Write-Track -Config $Config -Blank
}
function Write-Box {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$Text,
[Parameter(Mandatory = $true)]
[TestLogConfig]$Config
)
$MaxWidth = $Config.MaxLogTextWidth
if ($MaxWidth -lt 4) {
$MaxWidth = 4
}
$trackAnsi = Get-Color -Color $Config.TrackColor
$boxAnsi = Get-Color -Color $Config.BoxColor
$textAnsi = Get-Color -Color $Config.TextAccentColor
$resetAnsi = $script:ViewModel.Ansi.Reset
$displayText = $Text
if ($displayText.Length -gt ($MaxWidth - 4)) {
$displayText = $displayText.Substring(0, $MaxWidth - 4)
}
$innerWidth = $MaxWidth - 2
$paddingTotal = $innerWidth - $displayText.Length
if ($paddingTotal -lt 0) {
$paddingTotal = 0
}
$padLeft = [Math]::Floor($paddingTotal / 2)
$padRight = $paddingTotal - $padLeft
$leftSpaces = " " * $padLeft
$rightSpaces = " " * $padRight
$topBorder = $script:ViewModel.Glyph.TopLeft + ($script:ViewModel.Glyph.Horizontal * ($MaxWidth - 2))
+ $script:ViewModel.Glyph.TopRight
$bottomBorder = $script:ViewModel.Glyph.BotLeft + ($script:ViewModel.Glyph.Horizontal * ($MaxWidth -
2)) + $script:ViewModel.Glyph.BotRight
Write-Host ($trackAnsi + $script:ViewModel.Glyph.Vertical + " " + $resetAnsi) -NoNewline
Write-Host ($boxAnsi + $topBorder + $resetAnsi)
Write-Host ($trackAnsi + $script:ViewModel.Glyph.Vertical + " " + $resetAnsi) -NoNewline
Write-Host ($boxAnsi + $script:ViewModel.Glyph.Vertical + $resetAnsi) -NoNewline
Write-Host ($leftSpaces + $textAnsi + $displayText + $resetAnsi + $rightSpaces) -NoNewline
Write-Host ($boxAnsi + $script:ViewModel.Glyph.Vertical + $resetAnsi)
Write-Host ($trackAnsi + $script:ViewModel.Glyph.Vertical + " " + $resetAnsi) -NoNewline
Write-Host ($boxAnsi + $bottomBorder + $resetAnsi)
Write-Host ($trackAnsi + $script:ViewModel.Glyph.Vertical + $resetAnsi)
}
function Write-Outro {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$Message,
[Parameter(Mandatory = $true)]
[TestLogConfig]$Config,
[Parameter(ParameterSetName = 'Success')]
[switch]$Success,
[Parameter(ParameterSetName = 'Warning')]
[switch]$Warning,
[Parameter(ParameterSetName = 'Error')]
[switch]$Err,
[Parameter(ParameterSetName = 'Info')]
[switch]$Info,
[Parameter(ParameterSetName = 'Muted')]
[switch]$Muted
)
Write-Track -Config $Config -Outro
if ($Success) {
$color = Get-Color -Color $Config.SuccessColor
$processedMessage = Edit-Text -Message $Message -Color $color
}
elseif ($Warning) {
$color = Get-Color -Color $Config.WarningColor
$processedMessage = Edit-Text -Message $Message -Color $color
}
elseif ($Err) {
$color = Get-Color -Color $Config.ErrorColor
$processedMessage = Edit-Text -Message $Message -Color $color
}
else {
$color = Get-Color -Color $Config.ErrorColor
$processedMessage = Edit-Text -Message $Message -Color $color
}
Write-Host $processedMessage
}
#==============================================================================
# SPINNER
#==============================================================================
function Test-ConsoleMeasurementAvailable {
[CmdletBinding()]
param()
# ISE does not expose reliable console cursor measurements.
if ($Host -and $Host.Name -like '*ISE*') {
return $false
}
try {
if ([Console]::IsOutputRedirected -or [Console]::IsErrorRedirected) {
return $false
}
$null = [Console]::BufferWidth
$null = [Console]::CursorLeft
$null = [Console]::CursorTop
return $true
}
catch {
return $false
}
}
function Get-UnicodeCodePoints {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$String
)
$codePoints = New-Object System.Collections.Generic.List[int]
$characters = $String.ToCharArray()
$index = 0
while ($index -lt $characters.Length) {
if (
($index + 1) -lt $characters.Length -and
[char]::IsHighSurrogate($characters[$index]) -and
[char]::IsLowSurrogate($characters[$index + 1])
) {
$codePoints.Add(
[char]::ConvertToUtf32(
$characters[$index],
$characters[$index + 1]
)
)
$index += 2
}
else {
$codePoints.Add([int]$characters[$index])
$index++
}
}
return $codePoints.ToArray()
}
function Test-IsVariationSelector {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int]$CodePoint
)
return (
($CodePoint -ge 0xFE00 -and $CodePoint -le 0xFE0F) -or
($CodePoint -ge 0xE0100 -and $CodePoint -le 0xE01EF)
)
}
function Test-IsEmojiModifier {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int]$CodePoint
)
return ($CodePoint -ge 0x1F3FB -and $CodePoint -le 0x1F3FF)
}
function Test-IsRegionalIndicator {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int]$CodePoint
)
return ($CodePoint -ge 0x1F1E6 -and $CodePoint -le 0x1F1FF)
}
function Test-IsEmojiCore {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int]$CodePoint
)
return (
($CodePoint -ge 0x1F000 -and $CodePoint -le 0x1FAFF) -or
($CodePoint -ge 0x2600 -and $CodePoint -le 0x27BF)
)
}
function Test-IsCombiningMark {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int]$CodePoint
)
if ($CodePoint -le 0xFFFF) {
try {
$category = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory(
[string][char]$CodePoint,
0
)
if (
$category -eq [System.Globalization.UnicodeCategory]::NonSpacingMark -or
$category -eq [System.Globalization.UnicodeCategory]::SpacingCombiningMark -or
$category -eq [System.Globalization.UnicodeCategory]::EnclosingMark
) {
return $true
}
}
catch {
# Continue to explicit combining-mark range checks.
}
}
return (
($CodePoint -ge 0x1AB0 -and $CodePoint -le 0x1AFF) -or
($CodePoint -ge 0x1DC0 -and $CodePoint -le 0x1DFF) -or
($CodePoint -ge 0x20D0 -and $CodePoint -le 0x20FF) -or
($CodePoint -ge 0xFE20 -and $CodePoint -le 0xFE2F)
)
}
function Test-IsClusterExtension {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int]$CodePoint
)
return (
(Test-IsVariationSelector -CodePoint $CodePoint) -or
(Test-IsEmojiModifier -CodePoint $CodePoint) -or
(Test-IsCombiningMark -CodePoint $CodePoint) -or
$CodePoint -eq 0x20E3 -or
($CodePoint -ge 0xE0020 -and $CodePoint -le 0xE007F)
)
}
function Get-LogicalClusterWidth {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[int[]]$CodePoints
)
if ($CodePoints.Count -eq 0) {
return 0
}
$hasZwj = $false
$hasKeycap = $false
$hasEmoji = $false
$regionalIndicatorCount = 0
$baseCodePoint = $null
$hasVariationSelector = $false
foreach ($codePoint in $CodePoints) {
if ($codePoint -eq 0x200D) {
$hasZwj = $true
continue
}
if (Test-IsVariationSelector -CodePoint $codePoint) {
$hasVariationSelector = $true
continue
}
if ($codePoint -eq 0x20E3) {
$hasKeycap = $true
continue
}
if (Test-IsClusterExtension -CodePoint $codePoint) {
continue
}
if ($null -eq $baseCodePoint) {
$baseCodePoint = $codePoint
}
if (Test-IsRegionalIndicator -CodePoint $codePoint) {
$regionalIndicatorCount++
}
if (Test-IsEmojiCore -CodePoint $codePoint) {
$hasEmoji = $true
}
}
if ($null -eq $baseCodePoint) {
return 0
}
# Flag sequences: two regional indicators form one wide flag glyph.
if ($regionalIndicatorCount -ge 2) {
return 2
}
# A single regional indicator is still treated as emoji-width.
if ($regionalIndicatorCount -eq 1) {
return 2
}
# Keycap sequences, for example: 1, #, *.
if ($hasKeycap) {
return 2
}
# Emoji joined by U+200D are treated as one wide glyph.
if ($hasZwj) {
return 2
}
# Logical rendering contract:
# , , and  occupy one column.
if ($baseCodePoint -eq 0x2764) {
return 1
}
# Some BMP symbols become emoji only when paired with VS16.
if (
$hasVariationSelector -and
(
$baseCodePoint -eq 0x00A9 -or
$baseCodePoint -eq 0x00AE -or
$baseCodePoint -eq 0x203C -or
$baseCodePoint -eq 0x2049 -or
$baseCodePoint -eq 0x2122 -or
$baseCodePoint -eq 0x2139 -or
($baseCodePoint -ge 0x0023 -and $baseCodePoint -le 0x0039)
)
) {
return 2
}
if ($hasEmoji) {
return 2
}
# East Asian Wide / Fullwidth ranges.
if (
($baseCodePoint -ge 0x1100 -and $baseCodePoint -le 0x115F) -or
($baseCodePoint -ge 0x2329 -and $baseCodePoint -le 0x232A) -or
($baseCodePoint -ge 0x2E80 -and $baseCodePoint -le 0xA4CF) -or
($baseCodePoint -ge 0xAC00 -and $baseCodePoint -le 0xD7A3) -or
($baseCodePoint -ge 0xF900 -and $baseCodePoint -le 0xFAFF) -or
($baseCodePoint -ge 0xFE10 -and $baseCodePoint -le 0xFE19) -or
($baseCodePoint -ge 0xFE30 -and $baseCodePoint -le 0xFE6F) -or
($baseCodePoint -ge 0xFF00 -and $baseCodePoint -le 0xFF60) -or
($baseCodePoint -ge 0xFFE0 -and $baseCodePoint -le 0xFFE6) -or
($baseCodePoint -ge 0x20000 -and $baseCodePoint -le 0x3FFFD)
) {
return 2
}
return 1
}
function Get-LogicalStringWidth {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$String
)
$codePoints = @(Get-UnicodeCodePoints -String $String)
$totalWidth = 0
$index = 0
while ($index -lt $codePoints.Count) {
$cluster = New-Object System.Collections.Generic.List[int]
$current = $codePoints[$index]
# A standalone extension has no independent display width.
if (
(Test-IsClusterExtension -CodePoint $current) -or
$current -eq 0x200D
) {
$index++
continue
}
# Pair regional indicators into one flag cluster where possible.
if (
(Test-IsRegionalIndicator -CodePoint $current) -and
(($index + 1) -lt $codePoints.Count) -and
(Test-IsRegionalIndicator -CodePoint $codePoints[$index + 1])
) {
$cluster.Add($current)
$cluster.Add($codePoints[$index + 1])
$index += 2
}
else {
$cluster.Add($current)
$index++
}
$continueCluster = $true
while ($continueCluster -and $index -lt $codePoints.Count) {
# Attach modifiers, variation selectors, combining marks, tags,
# and keycap markers to the current base glyph.
while (
$index -lt $codePoints.Count -and
(Test-IsClusterExtension -CodePoint $codePoints[$index])
) {
$cluster.Add($codePoints[$index])
$index++
}
# Join the preceding glyph with the next glyph in ZWJ sequences.
if (
$index -lt $codePoints.Count -and
$codePoints[$index] -eq 0x200D
) {
$cluster.Add($codePoints[$index])
$index++
if ($index -lt $codePoints.Count) {
$cluster.Add($codePoints[$index])
$index++
}
else {
$continueCluster = $false
}
}
else {
$continueCluster = $false
}
}
$totalWidth += Get-LogicalClusterWidth -CodePoints $cluster.ToArray()
}
return $totalWidth
}
function Get-RenderedStringWidth {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$String
)
if (-not (Test-ConsoleMeasurementAvailable)) {
return $null
}
try {
$left = [Console]::CursorLeft
$top = [Console]::CursorTop
$bufferWidth = [Console]::BufferWidth
# Keep a safe margin so measurement cannot wrap the line.
$minimumRemainingColumns = [Math]::Max(16, $String.Length + 4)
if (($bufferWidth - $left) -lt $minimumRemainingColumns) {
return $null
}
[Console]::Write($String)
$afterLeft = [Console]::CursorLeft
$afterTop = [Console]::CursorTop
$delta = (($afterTop - $top) * $bufferWidth) + ($afterLeft - $left)
# A negative value indicates that the host scrolled or otherwise
# changed cursor state unexpectedly. Reject the measurement.
if ($delta -lt 0) {
[Console]::SetCursorPosition($left, $top)
return $null
}
# Erase the probe and restore the original cursor position.
[Console]::SetCursorPosition($left, $top)
if ($delta -gt 0) {
[Console]::Write((' ' * $delta))
[Console]::SetCursorPosition($left, $top)
}
return $delta
}
catch {
return $null
}
}
function Get-DisplayStringWidth {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$String,
[Parameter(Mandatory)]
[TestLogConfig]$Config
)
$logicalWidth = Get-LogicalStringWidth -String $String
$policy = $Config.SpinnerPolicy
if ([string]::IsNullOrWhiteSpace($policy)) {
$policy = 'Logical'
}
if ($policy -eq 'Logical') {
return $logicalWidth
}
if ($policy -eq 'PreferLogical') {
return $logicalWidth
}
$physicalWidth = Get-RenderedStringWidth -String $String
if ($null -eq $physicalWidth -or $physicalWidth -le 0) {
return $logicalWidth
}
if ($policy -eq 'Physical') {
return $physicalWidth
}
if ($policy -eq 'PreferPhysical') {
return $physicalWidth
}
# LogicalOnDisagreement
if ($physicalWidth -eq $logicalWidth) {
return $physicalWidth
}
return $logicalWidth
}
function Format-SpinnerFrame {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$Frame,
[Parameter(Mandatory)]
[ValidateRange(0, 1000)]
[int]$TargetWidth,
[Parameter(Mandatory)]
[ValidateRange(0, 1000)]
[int]$DisplayWidth
)
if ($DisplayWidth -ge $TargetWidth) {
return $Frame
}
return $Frame + (' ' * ($TargetWidth - $DisplayWidth))
}
function Format-SpinnerFrames {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[ValidateNotNullOrEmpty()]
[string[]]$Frames,
[Parameter(Mandatory)]
[TestLogConfig]$Config
)
$widths = New-Object System.Collections.Generic.List[int]
$maximumWidth = 0
foreach ($frame in $Frames) {
if ($null -eq $frame) {
throw 'Spinner frames cannot contain null values.'
}
$width = Get-DisplayStringWidth `
-String $frame `
-Config $Config
$widths.Add([int]$width)
if ($width -gt $maximumWidth) {
$maximumWidth = $width
}
}
$formattedFrames = New-Object System.Collections.Generic.List[string]
for ($index = 0; $index -lt $Frames.Length; $index++) {
$formattedFrames.Add(
(Format-SpinnerFrame `
-Frame $Frames[$index] `
-TargetWidth $maximumWidth `
-DisplayWidth $widths[$index])
)
}
return $formattedFrames.ToArray()
}
function New-SpinnerState {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$Message,
[Parameter(Mandatory)]
[TestLogConfig]$Config,
[string]$Prefix
)
if ([string]::IsNullOrWhiteSpace($Prefix)) {
$rawPrefix = (
"$($script:ViewModel.Glyph.BotLeft)" +
"$($script:ViewModel.Glyph.Horizontal)"
)
}
else {
$rawPrefix = $Prefix
}
$style = $Config.SpinnerStyle
if ([string]::IsNullOrWhiteSpace($style)) {
$style = 'Moon2'
}
if (-not $script:ViewModel.Spinner.ContainsKey($style)) {
$availableStyles = (
$script:ViewModel.Spinner.Keys |
Sort-Object
) -join ', '
throw "Unknown spinner style '$style'. Available styles: $availableStyles"
}
$rawFrames = @(
$script:ViewModel.Spinner[$style] |
ForEach-Object {
[string]$_
}
)
if ($rawFrames.Count -eq 0) {
throw "Spinner style '$style' does not contain any frames."
}
$trackAnsi = Get-Color -Color $Config.TrackColor
if (-not $trackAnsi) {
$trackAnsi = $script:ViewModel.Ansi.Gray
}
$spinnerAnsi = Get-Color -Color $Config.SpinnerColor
if (-not $spinnerAnsi) {
$spinnerAnsi = $script:ViewModel.Ansi.BrightMagenta
}
$interval = $Config.SpinnerInterval
if ($interval -lt 25) {
$interval = 100
}
$useAnsi = $false
try {
if (Initialize-AnsiTerminal) {
$useAnsi = $true
}
}
catch {
$useAnsi = $false
}
return [PSCustomObject]@{
Frames
= Format-SpinnerFrames `
-Frames $rawFrames `
-Config $Config
Message
Prefix
Color
Reset
ClearLineToEnd
UseAnsi
= $Message
= $trackAnsi + $rawPrefix + $script:ViewModel.Ansi.Reset
= $spinnerAnsi
= $script:ViewModel.Ansi.Reset
= $script:ViewModel.Ansi.ClearLineToEnd
= [bool]$useAnsi
IntervalMilliseconds = [int]$interval
}
}
function Get-SpinnerInstance {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[PSCustomObject]$State
)
return [System.Management.Automation.PowerShell]::Create().AddScript({
param(
[PSCustomObject]$SpinnerState
)
if ($SpinnerState.UseAnsi) {
[Console]::Write("$([char]27)[?25l")
}
try {
$index = 0
while ($true) {
$frame = $SpinnerState.Frames[
$index % $SpinnerState.Frames.Length
]
[Console]::Write(
"`r$($SpinnerState.Prefix) " +
"$($SpinnerState.Color)$frame" +
"$($SpinnerState.Reset) " +
"$($SpinnerState.Message)" +
"$($SpinnerState.ClearLineToEnd)"
)
Start-Sleep -Milliseconds $SpinnerState.IntervalMilliseconds
$index++
}
}
finally {
if ($SpinnerState.UseAnsi) {
[Console]::Write("$([char]27)[?25h")
}
[Console]::Write("`r")
if ($SpinnerState.ClearLineToEnd) {
[Console]::Write($SpinnerState.ClearLineToEnd)
}
}
}).AddArgument($State)
}
function Start-Spinner {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[string]$Message,
[Parameter(Mandatory)]
[TestLogConfig]$Config,
[string]$Prefix
)
$spinnerState = New-SpinnerState `
-Message $Message `
-Config $Config `
-Prefix $Prefix
$instance = Get-SpinnerInstance -State $spinnerState
[void]$instance.BeginInvoke()
return $instance
}
function Stop-Spinner {
[CmdletBinding()]
param(
[AllowNull()]
[System.Management.Automation.PowerShell]$SpinnerInstance,
[Parameter(Mandatory)]
[TestLogConfig]$Config
)
if ($null -ne $SpinnerInstance) {
try {
$SpinnerInstance.Stop()
}
catch {
# The worker may already be stopped.
}
try {
$SpinnerInstance.Dispose()
}
catch {
# Ignore disposal failures during cleanup.
}
}
try {
[Console]::Write("`r")
$clearSequence = [string]$script:ViewModel.Ansi.ClearLineToEnd
if ($clearSequence) {
[Console]::Write($clearSequence)
return
}
$width = $Config.SpinnerClearWidth
if ($width -lt 1) {
$width = 80
}
[Console]::Write((' ' * $width) + "`r")
}
catch {
# No usable console is available.
}
}
#==============================================================================
# CONTROLLER
#==============================================================================
function Invoke-TestController {
[CmdletBinding()]
param(
[Parameter(Mandatory)]
[TestLogConfig]$Config
)
$logManager = New-Object LogManager($Config)
$runner = New-Object BunTestRunner($Config, $logManager)
$exitCode = 1
$successColor = "$(Get-Color -Color $config.SuccessColor)"
$check = "$($script:ViewModel.Glyph.Check)"
$greenCheck = "$successColor$check$($script:ViewModel.Ansi.Reset)"
# Model setup
$logManager.EnsureLogDirectory()
$logManager.RemoveOldCombinedLogs()
$STRINGS = @{
Title = "EXECUTING TESTS"
Step1 = @{
Start
= "$([char]27)[100m"
= "`n$shortStar`n"
= "`n$dash`n$headerStart`n$dash`n"
= "`n$dash`n$headerMid`n$dash`n"
= "`n`n$star`n$star`n$workspace`n$star`n$star`n`n`n"
= "Running tests and logging output to:"
FileName = "$($config.LogFileName)"
}
Step2 = @{
Spinner = "Executing bun tests..."
Complete = "$greenCheck Executing bun tests... Completed."
}
Step3 = "$greenCheck Oldest log file(s) removed to maintain retention cap."
Outro = @{
Success = " Complete. All tests passed. See log for details."
Failure = "⚠ Complete. Some tests failed. See log for details."
}
}
# View: Header
Write-Host
Write-Intro -Title $STRINGS.Title -Config $config -NewLine -Err
# View: Step 1: Log target info
Write-Step -Message $STRINGS.Step1.Start -Config $config -Info
Write-Box -Text $STRINGS.Step1.FileName -Config $config
# View + Controller: Step 2: Spinner-wrapped execution
$spinner = Start-Spinner -Message $STRINGS.Step2.Spinner -Config $config
try {
# Step 2.A.: Perform work here.
$exitCode = $runner.Run()
}
finally {
# Step 2.B.: Stop Spinner here.
Stop-Spinner -SpinnerInstance $spinner -Config $Config
}
# View: Step 2 (Cont): Completion step
Write-Step -Message $STRINGS.Step2.Complete -Config $config -Success -NewLine
# Model + View: Step 3: retention cleanup
$removedLogs = $logManager.CleanOldLogs()
if ($removedLogs) {
Write-Step -Message $STRINGS.Step3 -Config $config -Muted -NewLine
}
# View: Step 4: Final outro
if ($exitCode -eq 0) {
Write-Outro -Message $STRINGS.Outro.Success -Config $config -Success
}
else {
Write-Outro -Message $STRINGS.Outro.Failure -Config $config -Warning
}
return $exitCode
}
#==============================================================================
# EXECUTE
#==============================================================================
function Start-TestLog {
[CmdletBinding()]
param()
# Assign default exit code
$script:finalExitCode = 1
$ansiEnabled = $false
$paths = $null
$config = $null
try {
$ansiEnabled = Initialize-AnsiTerminal
$paths = New-Object ProjectPaths
$config = New-Object TestLogConfig($paths)
# Cursor ownership belongs to the application lifecycle, not an
# individual spinner. This prevents the cursor from reappearing
# between multiple spinner instances.
if ($ansiEnabled) {
[Console]::Write("$([char]27)[?25l")
}
$script:finalExitCode = Invoke-TestController -Config $config
}
catch {
$originalError = $_
try {
# Initialize only what is required to render a controlled failure
# message if startup failed before Config construction completed.
if ($null -eq $config) {
if ($null -eq $paths) {
$paths = New-Object ProjectPaths
}
$config = New-Object TestLogConfig($paths)
}
$message1 = (
"$($script:ViewModel.Cli.Warning) " +
'Unhandled error while executing log-tests.ps1'
)
$message2 = (
"$($script:ViewModel.Cli.Error) " +
$originalError.Exception.Message
)
Write-Track -Config $config -Blank
Write-Intro -Title $message1 -Config $config -Warning -NewLine
Write-Outro -Message $message2 -Config $config -Err
}
catch {
# Do not replace the original failure with an error-rendering
# failure. Emit the original exception to the PowerShell stream.
Write-Error $originalError
}
$script:finalExitCode = 1
}
finally {
# Show the cursor
if ($ansiEnabled) {
try {
[Console]::Write("$([char]27)[?25h")
}
catch {
# No usable console is available.
}
}
}
exit $script:finalExitCode
}
Start-TestLog
