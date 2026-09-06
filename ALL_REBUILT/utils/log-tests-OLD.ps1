# FILE-PATH: ./src/utils/log-tests.ps1
# Make sure this .ps1 script file is explicitly saved with the
# encoding UTF-8 with BOM. If saved as raw UTF-8 without BOM,
# PS 5.1 will misinterpret string literals.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
#==============================================================================
# MODEL: Business Logic & Data Structures
#==============================================================================
class ProjectModel {
# Only responsible for resolving paths and managing file actions
static [string] GetProjectRootPath() {
# Using local assignment to satisfy the PS 5.1 compiler context
$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { "." }
$currentDir = [System.IO.Path]::GetFullPath($scriptRoot)
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
$parentDir = Split-Path $currentDir -Parent
if ($parentDir -eq $currentDir) { break }
$currentDir = $parentDir
}
if ($firstPackageJsonFound) { return $firstPackageJsonFound }
return $scriptRoot
}
static [PSCustomObject] GetConfiguration() {
# Get path/directory names
$projectRootPath = [ProjectModel]::GetProjectRootPath()
$scriptPath = if ($PSScriptRoot) { $PSScriptRoot } else { "." }
# Chronological numeric sorting for files
$logTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$appendage = "_tests_results.log"
$logFileName = "${logTimestamp}${appendage}"
# View-centric Constants
$width = 125
$shortWidth = 50
$dash = "-" * $width
$star = "*" * $width
$shortDash = "-" * $shortWidth
$shortStar = "*" * $shortWidth
$headerStart = "=== [1/2] PROJECT ROOT TEST START ==="
$headerMid = "=== *[2/2]* WORKSPACE TEST START *==="
$workspace = "=== *[---]* WORKSPACE TEST START *==="
$result = [PSCustomObject]@{
# Log Constants
MaxLogCount
= 5
MaxLogFileWidth = $width
MaxLogTextWidth = $shortWidth
TrackColor
= "Gray"
BoxColor
SpinnerColor
JUnitColor
= "Yellow"
= "BrightMagenta"
= "Yellow"
# Directories
ProjectRootDir = $projectRootPath
ScriptDir
= $scriptPath
# Paths
TestsPath
LogPath
LogFilePath
# File Name
Appendage
LogFileName
= Join-Path $projectRootPath "tests"
= Join-Path $projectRootPath "logs"
= Join-Path $projectRootPath "logs/$logFileName"
= $appendage
= $logFileName
# Injected Log Divider Strings
DashDivider
= "`n$shortDash`n"
StarDivider
LogHeader
LogDivider
TestDivider
}
# Ensure 'logs' directory exists
[ProjectModel]::AssertDirectory($result.LogPath)
return $result
}
static [void] AssertDirectory([string]$dir) {
if (-not (Test-Path $dir)) {
New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
}
static [bool] CleanOldLogs() {
$config = [ProjectModel]::GetConfiguration()
# Prevent race conditions
if (-not (Test-Path $config.LogPath)) { return $false }
# Get files matching the pattern
$existingLogs = Get-ChildItem -Path $config.LogPath -File |
Where-Object { $_.Name -like "*$($config.Appendage)" } |
Sort-Object CreationTime # Safest way to find truly "old" logs
# Skip the newest logs, and immediately delete whatever remains
if ($existingLogs.Count -gt $config.MaxLogCount) {
$existingLogs |
Select-Object -First ($existingLogs.Count - $config.MaxLogCount) |
Remove-Item -Force
return $true
}
return $false
}
}
#==============================================================================
# VIEW-MODEL: State Translation & UI Definitions
#==============================================================================
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
}
}
function Initialize-AnsiTerminal {
[CmdletBinding()]
param()
# Safely enable Virtual Terminal Processing outside of a class structure
if ($PSVersionTable.PSVersion.Major -le 5) {
$Signatures = @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
'@
$type = Add-Type -MemberDefinition $Signatures -Name "Win32Utils" -Namespace "Win32" -PassThru
2>$null
if ($type) {
$stdOutHandle = $type::GetStdHandle(-11) # STD_OUTPUT_HANDLE
$mode = 0
if ($type::GetConsoleMode($stdOutHandle, [ref]$mode)) {
$mode = $mode -bor 0x0004 # ENABLE_VIRTUAL_TERMINAL_PROCESSING
[void]$type::SetConsoleMode($stdOutHandle, $mode)
}
}
}
}
#==============================================================================
# VIEW: Component Rendering
#==============================================================================
function Edit-Text {
param (
[Parameter(Mandatory = $true)]
[string]$Message,
[Parameter(Mandatory = $true)]
[string]$Color
)
$resetColor = $script:ViewModel.Ansi.Reset
# If there are no internal resets, return the message unchanged
if (-not $Message.Contains($resetColor)) { return $Message }
# If a reset occurs at the very end of the string, it is intentional
# Only replace internal resets that cut off text colors mid-string
if ($Message.EndsWith($resetColor)) {
# Temporarily strip the final reset to process mid-string overrides cleanly
$subMessage = $Message.Substring(0, $Message.Length - $resetColor.Length)
if ($subMessage.Contains($resetColor)) {
$subMessage = $subMessage.Replace($resetColor, "$resetColor$Color")
}
return "$subMessage$resetColor"
}
# Replace all internal resets with the cascading fallback color
return $Message.Replace($resetColor, "$resetColor$Color")
}
function Get-Color {
param (
[Parameter(Mandatory = $true)]
$Color
)
# Safely extract string identity
$colorKey = [string]$Color
# Normalize traditional ConsoleColor names to view model keys
if ($colorKey -eq 'DarkGray') { $colorKey = 'Gray' }
if ($colorKey -eq 'Gray') { $colorKey = 'Gray' }
# Check your Ansi collection using dynamic bracket evaluation explicitly
if ($script:ViewModel.Ansi.ContainsKey($colorKey)) {
return $script:ViewModel.Ansi[$colorKey]
}
return $script:ViewModel.Ansi.White
}
function Write-Track {
param (
[ConsoleColor]$Color = 'DarkGray',
[switch]$Intro,
[switch]$Step,
[switch]$Outro,
[switch]$Blank
)
$TopLeft = $script:ViewModel.Glyph.SqTopLeft
$BotLeft = $script:ViewModel.Glyph.SqBotLeft
$Horizontal = $script:ViewModel.Glyph.Horizontal
$Vertical = $script:ViewModel.Glyph.Vertical
$RightTee = $script:ViewModel.Glyph.RightTee
if ($Blank) {
Write-Host $Vertical -ForegroundColor $Color
return
}
$Output = @()
switch ($true) {
$Intro {
$Output += $TopLeft
break
}
$Step {
$Output += $RightTee
break
}
$Outro {
$Output += $BotLeft
break
}
}
$Output += $Horizontal
$Output += " "
if ($Output.Count -gt 0) {
$Result = $Output -join ""
Write-Host $Result -ForegroundColor $Color -NoNewline
}
}
function Write-Pill {
param (
[Parameter(Mandatory = $true)]
[string]$Text,
[ConsoleColor]$TextColor = 'Black',
[ConsoleColor]$Color = 'Magenta',
[switch]$NoNewline
)
$Left = "$([char]0xE0B6)$([char]0x2588)"
$Right = "$([char]0x2588)$([char]0xE0B4)"
Write-Host $Left -ForegroundColor $Color -NoNewline
Write-Host " $Text " -BackgroundColor $Color -ForegroundColor $TextColor -NoNewline
if ($NoNewline) {
Write-Host $Right -ForegroundColor $Color -NoNewline
}
else {
Write-Host $Right -ForegroundColor $Color
}
}
function Write-Intro {
param (
[Parameter(Mandatory = $true)]
[string]$Title,
[ConsoleColor]$TrackColor = 'DarkGray',
[switch]$NewLine
)
Write-Track -Color $TrackColor -Intro
Write-Pill -Text "$($script:ViewModel.Ansi.Bold)$Title"
if ($NewLine) {
Write-Track -Color $TrackColor -Blank
}
}
function Write-Step {
param (
[Parameter(Mandatory = $true)]
[string]$Message,
$Color = 'White',
[ConsoleColor]$TrackColor = 'DarkGray',
[switch]$NewLine
)
# Output vertical tracking line node
Write-Track -Color $TrackColor -Step
# Extract baseline ANSI color string
$fallbackColor = Get-Color -Color $Color
# Check message for internal ANSI strings
$processedMessage = Edit-Text -Message $Message -Color $fallbackColor
# Stream to terminal
Write-Host "$fallbackColor$processedMessage$($script:ViewModel.Ansi['Reset'])"
# Continue vertical tracking line for next step
if ($NewLine) {
Write-Track -Color $TrackColor -Blank
}
}
function Write-Box {
param (
[Parameter(Mandatory = $true)]
[string]$Text,
[int]$MaxWidth = 50,
[ConsoleColor]$TrackColor = 'DarkGray',
[ConsoleColor]$BoxColor = 'Yellow'
)
$ansiRegex = "$([char]27)\[[0-9;]*[a-zA-Z]"
$cleanText = $Text -replace $ansiRegex, ""
$displayEmoji = " "
if ($cleanText.Length -gt ($MaxWidth - 12)) {
# Recalculate truncation length safely based on clean un-colored text
$truncLength = [math]::Max(0, ($MaxWidth - 15))
$Text = $cleanText.Substring(0, $truncLength) + "..."
$cleanText = $Text
}
$innerBoxWidth = $MaxWidth - 2
$displayText = $displayEmoji + $Text
$displayCleanText = $displayEmoji + $cleanText
# Padding math calculations must use the stripped clean string length to prevent width bloat
$totalPadding = $innerBoxWidth - $displayCleanText.Length
$padLeft = [math]::Max(0, [math]::Floor($totalPadding / 2))
$padRight = [math]::Max(0, [math]::Ceiling($totalPadding / 2))
$leftSpaces = " " * $padLeft
$rightSpaces = " " * $padRight
# Line 1: Box Top Frame
Write-Host "$($script:ViewModel.Glyph.Vertical) " -ForegroundColor $TrackColor -NoNewline
Write-Host ($script:ViewModel.Glyph.TopLeft + ($script:ViewModel.Glyph.Horizontal * ($MaxWidth - 2)) +
$script:ViewModel.Glyph.TopRight) -ForegroundColor $BoxColor
# Line 2: Text Payload Line (Outputs ANSI natively without forced Foreground parameters)
Write-Host "$($script:ViewModel.Glyph.Vertical) " -ForegroundColor $TrackColor -NoNewline
Write-Host $script:ViewModel.Glyph.Vertical -ForegroundColor $BoxColor -NoNewline
Write-Host "$leftSpaces$($script:ViewModel.Ansi.Magenta)$displayText$rightSpaces" -NoNewline
Write-Host $script:ViewModel.Glyph.Vertical -ForegroundColor $BoxColor
# Line 3: Box Bottom Frame
Write-Host "$($script:ViewModel.Glyph.Vertical) " -ForegroundColor $TrackColor -NoNewline
Write-Host ($script:ViewModel.Glyph.BotLeft + ($script:ViewModel.Glyph.Horizontal * ($MaxWidth - 2)) +
$script:ViewModel.Glyph.BotRight) -ForegroundColor $BoxColor
Write-Host $script:ViewModel.Glyph.Vertical -ForegroundColor $TrackColor
}
function Write-Outro {
param (
[Parameter(Mandatory = $true)]
[string]$Message,
[switch]$Success,
[ConsoleColor]$TrackColor = 'DarkGray'
)
# Terminate vertical track line
Write-Track -Color $TrackColor -Outro
# Extract context color
$targetColor = if ($Success) { 'Green' } else { 'Red' }
$color = Get-Color -Color $targetColor
$reset = $script:ViewModel.Ansi.Reset
# Process internal ANSI
$processedMessage = Edit-Text -Message $Message -Color $color
# Stream to terminal
Write-Host "$color$processedMessage$reset"
}
function Get-SpinnerInstance {
param (
[char[]]$Chars,
[string]$Message,
[string]$Prefix,
[string]$Color,
[string]$Reset
)
# The background worker thread does not have access to parent scopes.
# All necessary properties must be completely self-contained and passed as arguments.
return [powershell]::Create().AddScript({
param(
[char[]]$Chrs,
[string]$Msg,
[string]$Pfx,
[string]$Clr,
[string]$Rst
)
$index = 0
while ($true) {
$char = $Chrs[$index % $Chrs.Length]
[Console]::Write("`r$Pfx $Clr$char$Rst $Msg")
Start-Sleep -Milliseconds 100
$index++
}
}).AddArgument($Chars).AddArgument($Message).AddArgument($Prefix).AddArgument($Color).AddArgument($Reset)
}
function Start-Spinner {
[CmdletBinding()]
param(
[Parameter(Mandatory = $true)]
[string]$Message,
[string]$Prefix,
[string]$Color = 'BrightBlue'
)
if (-not $Prefix) {
$Prefix = "$($script:ViewModel.Glyph.BotLeft)$($script:ViewModel.Glyph.Horizontal)"
}
# Extract ANSI sequences from view model
$spinnerColor = Get-Color -Color $Color
if (-not $spinnerColor) { $spinnerColor = $script:ViewModel.Ansi.BrightBlue }
$spinnerFrames = [char[]]''
# Build instance using our isolated creation helper function
$instance = Get-SpinnerInstance -Chars $spinnerFrames -Message $Message -Prefix $Prefix -Color
$spinnerColor -Reset $script:ViewModel.Ansi.Reset
# Trigger async invocation handle loop
[void]$instance.BeginInvoke()
return $instance
}
function Stop-Spinner {
param(
[Parameter(Mandatory = $true)]
[System.Management.Automation.PowerShell]$SpinnerInstance
)
# Force kill and dispose the asynchronous background pipeline thread safely
$SpinnerInstance.Stop()
$SpinnerInstance.Dispose()
# Reset cursor position to column zero
[Console]::Write("`r")
# Extract ANSI codes from view model map
$clearSequence = $script:ViewModel.Ansi.ClearLineToEnd
if ($clearSequence) {
[Console]::Write($clearSequence)
}
else {
$width = if ([Console]::WindowWidth -gt 0) { [Console]::WindowWidth - 1 } else { 80 }
[Console]::Write((" " * $width) + "`r")
}
}
function Get-Padding {
param (
[string]$Character = ' ',
[int]$Count = 40
)
$Character * $Count
}
#==============================================================================
# CONTROLLER: Flow Orchestration
#==============================================================================
$script:evaluator = {
param($match)
$removedPrefixLength = $match.Groups['prefix'].Length
$remainingPath = $match.Groups['suffix'].Value
$terminatorType = $match.Groups['type'].Value
if ($terminatorType -eq ':') {
return $remainingPath
}
$paddingSpaces = Get-Padding -Count $removedPrefixLength
return "${remainingPath}${paddingSpaces}"
}
function Invoke-PostProcessing {
param(
[Parameter(Mandatory = $true)]
[string]$FilePath,
[Parameter(Mandatory = $true)]
[string]$Divider
)
$maxWidth = 125
if (Test-Path $FilePath) {
$logContent = Get-Content -Path $FilePath -Raw
# 1. ALWAYS Scrub ANSI Escape sequences completely first
$ansiPattern = '\x1b\[[0-9;]*[a-zA-Z]'
$logContent = $logContent -replace $ansiPattern, ''
# 2. Scrub the stream error wrapper string and leave an intentional blank line gap
# Using `r`n ensures cross-platform line break compatibility on Windows systems
$errorWrapperPattern = '(?m)^System\.Management\.Automation\.RemoteException\r?\n?'
$logContent = $logContent -replace $errorWrapperPattern, "`r`n"
# 3. Inject divider exactly BEFORE every new workspace test block starts
$workspaceStartPattern = '(?m)^(?=.*?\bbun test Vertical\d)'
$logContent = $logContent -replace $workspaceStartPattern, $Divider
# 4. Strip out the monorepo workspace prefix (e.g., '@pendex/color test: ')
$workspacePrefixPattern = '(?m)^@?[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+ test: '
$logContent = $logContent -replace $workspacePrefixPattern, ''
# 5. Replace all literal '(fail)' strings with '(Error)'
# Parentheses must be escaped with backslashes in regex
$failPattern = '\(fail\)'
$logContent = $logContent -replace $failPattern, '(Error)'
# 6. Replace all literal '(fail)' strings with '(Error)'
# Parentheses must be escaped with backslashes in regex
$failPattern = '\(pass\)'
$logContent = $logContent -replace $failPattern, "('pass')"
# 7. Shorten path and shift remaining path by the removed prefix length
$pathPattern = '(?m)^(?<prefix>.*?(?=pendex\\))(?<suffix>pendex\\[^|:\r\n]*?)(?=\s*(?<type>\||:))'
$logContent = [regex]::Replace($logContent, $pathPattern, $script:evaluator)
# 8. Format nested test descriptions by breaking onto clean, indented lines
$logContent = $logContent -replace ' > ', "`r`n`t> "
# 9. Search for two consecutive blank lines and reduce to one
# Three consecutive line breaks create two empty visual lines
$blankLinesPattern = '(?m)(\r?\n){3}'
$logContent = $logContent -replace $blankLinesPattern, "`r`n`r`n"
# Write the segmented content back to the log file
$logContent |
Out-File -FilePath $FilePath -Width $maxWidth -Encoding utf8 -Force
}
}
function Invoke-BunCommand {
param(
[Parameter(Mandatory = $true)]
[PSCustomObject]$Config
)
$oldPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
# Write the initial section header directly to the log file
$Config.LogHeader | Out-File -FilePath $Config.LogFilePath -Width $Config.MaxLogFileWidth
-Encoding utf8
# Execute main root coverage tests
& bun test --coverage -- $Config.TestsPath 2>&1 |
ForEach-Object { $_.ToString() } |
Out-File -FilePath $Config.LogFilePath -Append -Width $Config.MaxLogFileWidth -Encoding utf8
$exit1 = $LASTEXITCODE
# Append the structural divider string to the log file
$Config.LogDivider | Out-File -FilePath $Config.LogFilePath -Append -Width $Config.MaxLogFileWidth
-Encoding utf8
# Execute monorepo workspace tests
& bun run --workspaces test 2>&1 |
ForEach-Object { $_.ToString() } |
Out-File -FilePath $Config.LogFilePath -Append -Width $Config.MaxLogFileWidth -Encoding utf8
$exit2 = $LASTEXITCODE
Invoke-PostProcessing -FilePath $Config.LogFilePath -Divider $Config.TestDivider
if ($exit1 -ne 0) {
return $exit1
}
return $exit2
}
catch {
throw $_
}
finally {
$ErrorActionPreference = $oldPreference
}
}
function Invoke-TestController {
param(
[Parameter(Mandatory = $true)]
[PSCustomObject]$Config
)
$greenCheck =
"$($script:ViewModel.Ansi.Green)$($script:ViewModel.Glyph.Check)$($script:ViewModel.Ansi.Reset)"
# Render Header
Write-Host
Write-Intro -Title "EXECUTING TESTS" -TrackColor $Config.TrackColor -NewLine
# Render Step
Write-Step -Message "Running tests and logging output to:" -Color Cyan -TrackColor $Config.TrackColor
Write-Box -Text $Config.LogFileName -MaxWidth $Config.MaxLogTextWidth -TrackColor $Config.TrackColor
-BoxColor $Config.BoxColor
# Execute Test Runner Task with Active Spinner UI
$spinner = Start-Spinner -Message "Executing bun tests..."
$exitCode = 1
try {
$exitCode = Invoke-BunCommand -Config $Config
}
finally {
Stop-Spinner -SpinnerInstance $spinner
}
# Render Footer
Write-Step -Message "$greenCheck Executing bun tests... Completed." -Color Green -TrackColor
$Config.TrackColor -NewLine
$removedLogs = [ProjectModel]::CleanOldLogs()
if ($removedLogs) {
Write-Step -Message "$greenCheck Oldest log file(s) removed to maintain retention cap." -Color
Gray -TrackColor $Config.TrackColor -NewLine
}
if ($exitCode -eq 0) {
Write-Outro -Message " Complete. All tests passed. See log for details." -Success -TrackColor
$Config.TrackColor
}
else {
Write-Outro -Message "⚠ Complete. Some tests failed. See log for details." -TrackColor
$Config.TrackColor
}
return $exitCode
}
function Remove-OldCombinedLogs {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true)]
[string]$LogPath,
[Parameter(Mandatory = $true)]
[PSCustomObject]$Config,
[boolean]$IsVerbose = $false
)
$greenCheck =
"$($script:ViewModel.Ansi.Green)$($script:ViewModel.Glyph.Check)$($script:ViewModel.Ansi.Reset)"
# Target files matching the combined naming convention pattern
$OldCombinedFiles = Get-ChildItem -Path $LogPath -Filter "*_junit_combined_*.xml" -File
foreach ($File in $OldCombinedFiles) {
try {
Remove-Item -Path $File.FullName -Force -ErrorAction Stop
}
catch {
Write-Error " Failed to remove old file $($File.FullName): $_"
}
}
if ($IsVerbose) {
Write-Step "$greenCheck Removed old combined JUnit log(s)." -Color $config.JUnitColor -TrackColor
$config.TrackColor -NewLine
}
}
function Resolve-LogDirectory {
param ([string]$Path)
if (Test-Path $Path -PathType Leaf) {
$Path = Split-Path -Path $Path -Parent
}
if (-not (Test-Path $Path -PathType Container)) {
Write-Error " Error. Log directory path does not exist: $Path"
return $null
}
return $Path
}
function Invoke-XmlMerge {
param (
[System.Xml.XmlDocument]$CombinedXml,
[System.Object[]]$XmlFiles
)
foreach ($file in $XmlFiles) {
try {
$individualXml = New-Object System.Xml.XmlDocument
$individualXml.Load($file.FullName)
$testSuites = $individualXml.SelectNodes("//testsuite")
foreach ($suite in $testSuites) {
$importedSuite = $combinedXml.ImportNode($suite, $true)
$null = $combinedXml.DocumentElement.AppendChild($importedSuite)
}
}
catch {
Write-Error " Error. Failed to parse XML file: $($file.FullName). $_"
}
}
}
function Merge-JunitLogs {
[CmdletBinding()]
param ()
$greenCheck =
"$($script:ViewModel.Ansi.Green)$($script:ViewModel.Glyph.Check)$($script:ViewModel.Ansi.Reset)"
$IsVerbose = $PSBoundParameters.ContainsKey('Verbose') -or ($VerbosePreference -eq 'Continue')
$config = [ProjectModel]::GetConfiguration()
$LogPath = Resolve-LogDirectory -Path $config.LogPath
if (-not $LogPath) { return }
if ($IsVerbose) {
Write-Host
Write-Intro -Title "MERGE JUNIT FILES" -TrackColor $config.TrackColor -NewLine
}
# Execute the requested old log cleanup BEFORE path processing and creation
Remove-OldCombinedLogs -LogPath $LogPath -Config $config -IsVerbose $IsVerbose
# Filename timestamp settings
$datestamp = Get-Date -Format "yyyyMMdd"
$timestamp = Get-Date -Format "HHmmss"
$combinedFileName = "${datestamp}_junit_combined_${timestamp}.xml"
$combinedFilePath = Join-Path $LogPath $combinedFileName
# Gather matching source junit test files
$xmlFiles = @(Get-ChildItem -Path $LogPath -Filter "junit*.xml" -File |
Where-Object { $_.Name -ne $combinedFileName -and $_.Extension -eq '.xml' })
if ($xmlFiles.Count -eq 0) {
if ($IsVerbose) {
Write-Host " Error. No JUnit XML files found to merge.`n"
}
return
}
# Initialize master XML document
$combinedXml = New-Object System.Xml.XmlDocument
$rootNode = $combinedXml.CreateElement("testsuites")
$null = $combinedXml.AppendChild($rootNode)
# Process XML tree compilation via helper
Invoke-XmlMerge -CombinedXml $combinedXml -XmlFiles $xmlFiles
# File output IO routine
try {
$combinedXml.Save($combinedFilePath)
if ($IsVerbose) {
Write-Step "Merging JUNIT test files to:" -Color $config.JUnitColor -TrackColor
$config.TrackColor
Write-Box $combinedFileName -TrackColor $config.TrackColor
}
# Purge localized source files
$xmlFiles | Remove-Item -Force
if ($IsVerbose) {
Write-Step "$greenCheck Deleted original package JUnit Logs." -Color $config.JUnitColor
-TrackColor $config.TrackColor -NewLine
}
}
catch {
Write-Error " Error. Failed to save the combined XML file or purge originals. $_"
}
# Final wrap-up output alerts
if ($IsVerbose) {
Write-Outro "$greenCheck Complete." -Success -TrackColor $config.TrackColor
}
else {
$fallbackColor = Get-Color -Color Green
$message = "`n$greenCheck Merging JUNIT test files complete."
$processedMessage = Edit-Text -Message $message -Color $fallbackColor
Write-Host $processedMessage
}
}
#==============================================================================
# EXECUTION ENTRY POINT
#==============================================================================
function Invoke-TerminalScriptError {
[CmdletBinding()]
param(
[Parameter(Mandatory = $true)]
[int]$Code
)
$greenCheck =
"$($script:ViewModel.Ansi.Green)$($script:ViewModel.Glyph.Check)$($script:ViewModel.Ansi.Reset)"
$IsVerbose = $PSBoundParameters.ContainsKey('Verbose') -or ($VerbosePreference -eq 'Continue')
if ($Code -ne 0) {
# Clear any accidental error stream pollution to keep terminal clean
$global:Error.Clear()
# Grab ANSI codes
$reset = $script:ViewModel.Ansi.Reset
$bold = $script:ViewModel.Ansi.Bold
$red = $script:ViewModel.Ansi.Red
# Check if the environment variable has a value
$scriptName = $env:npm_lifecycle_event
if (-not $scriptName) { $scriptName = "unknown" }
if ($IsVerbose) {
# Output custom error message to the terminal
Write-Host "`n${red}Error${reset}: script ${bold}`"$scriptName`"${reset} exited with code
$Code"
}
}
else {
if ($IsVerbose) {
$color = Get-Color -Color Green
$message = "`n$greenCheck ALL TESTING COMPLETE."
$processedMessage = Edit-Text -Message $message -Color $color
# Output custom error message to the terminal
Write-Host $processedMessage
}
}
# Exit back to the calling process without throwing native exceptions
[Environment]::Exit($Code)
}
function Invoke-Tests {
# Establish UI terminal preferences
Initialize-AnsiTerminal
# Instantiate application configurations
$config = [ProjectModel]::GetConfiguration()
# Handover control to the MVVMC loop
$exitCode = Invoke-TestController -Config $config
# Combine junit xml files if they exist
Merge-JunitLogs
# Exit
Invoke-TerminalScriptError -Code $exitCode
}
Invoke-Tests
