# FILE-PATH: ./src/utils/log-tests.ps1
# Make sure this .ps1 script file is explicitly saved with the
# encoding UTF-8 with BOM. If saved as raw UTF-8 without BOM,
# PS 5.1 will misinterpret string literals.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
= [string][char]0x2715 # ✕ Failure / Cancelled / Error state
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
#==============================================================================
# VIEW: Component Rendering
#==============================================================================
class Line {
[string]$Prefix
[string]$Text
[string]$Suffix
[bool]$NoNewLine
Line () {
$this.Prefix = ""
$this.Text = ""
$this.Suffix = ""
$this.NoNewLine = $false
}
Line (
[string]$Text = "",
[bool]$NoNewLine = $false
) {
$this.Prefix = ""
$this.Text = $Text
$this.Suffix = ""
$this.NoNewLine = $NoNewLine
}
Line (
[string]$Prefix = "",
[string]$Text = "",
[string]$Suffix = "",
[bool]$NoNewLine = $false
) {
$this.Prefix = $Prefix
$this.Text = $Text
$this.Suffix = $Suffix
$this.NoNewLine = $NoNewLine
}
# Automatically converts the building blocks to a unified layout string
# by override the default .ToString() method
[string]ToString() {
# Combine the structural text segments
[string]$assembled = "$($this.Prefix)$($this.Text)$($this.Suffix)"
# Apply trailing carriage line termination characters natively if true
if ($this.NoNewLine -eq $false) {
return "$assembled`r`n"
}
else {
return $assembled
}
}
[void]Render() {
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Write($this.ToString())
}
}
class Pill {
hidden [Line]$Line
hidden [hashtable]$Glyph
hidden [hashtable]$Ansi
hidden [ConsoleColor]$TextColor
hidden [ConsoleColor]$PillColor
Pill (
[string]$Text,
[ConsoleColor]$TextColor = [ConsoleColor]::Black,
[ConsoleColor]$PillColor = [ConsoleColor]::Magenta,
[bool]$NoNewline = $false
) {
$this.Line = [Line]::new()
$this.Glyph = @{
LeftPill = [string][char]0xE0B6 # 
RightPill = [string][char]0xE0B4 # 
FullBlock = [string][char]0x2588 # █
}
$this.Ansi = @{
Esc = [string][char]0x1B
Reset = "$([string][char]0x1B)[0m"
}
$this.TextColor = $TextColor
$this.PillColor = $PillColor
$Prefix = "$($this.Glyph.LeftPill)$($this.Glyph.FullBlock)"
$Suffix = "$($this.Glyph.FullBlock)$($this.Glyph.RightPill)"
$this.Init($Prefix, $Text, $Suffix, $NoNewline)
}
# Helper method to map ConsoleColor to ANSI Foreground code
hidden [string]GetAnsiFgColor([ConsoleColor]$color) {
$map = @{
'Black' = '30'; 'DarkBlue' = '34'; 'DarkGreen' = '32'; 'DarkCyan' = '36'
'DarkRed' = '31'; 'DarkMagenta' = '35'; 'DarkYellow' = '33'; 'Gray' = '37'
'DarkGray' = '90'; 'Blue' = '94'; 'Green' = '92'; 'Cyan' = '96'
'Red' = '91'; 'Magenta' = '95'; 'Yellow' = '93'; 'White' = '97'
}
return $map[$color.ToString()]
}
# Helper method to map ConsoleColor to ANSI Background code
hidden [string]GetAnsiBgColor([ConsoleColor]$color) {
$map = @{
'Black' = '40'; 'DarkBlue' = '44'; 'DarkGreen' = '42'; 'DarkCyan' = '46'
'DarkRed' = '41'; 'DarkMagenta' = '45'; 'DarkYellow' = '43'; 'Gray' = '47'
'DarkGray' = '100'; 'Blue' = '104'; 'Green' = '102'; 'Cyan' = '106'
'Red' = '101'; 'Magenta' = '105'; 'Yellow' = '103'; 'White' = '107'
}
return $map[$color.ToString()]
}
[void]Init(
[string]$Prefix,
[string]$Text,
[string]$Suffix,
[bool]$NoNewLine
) {
$ESC = $this.Ansi.Esc
$RESET = $this.Ansi.Reset
$textFgCode = $this.GetAnsiFgColor($this.TextColor)
$textBgCode = $this.GetAnsiBgColor($this.PillColor)
$pillFgCode = $this.GetAnsiFgColor($this.PillColor)
# Build segments using ANSI colors
$this.Line.Prefix = "$ESC[${pillFgCode}m$($Prefix)$RESET"
$this.Line.Text = "$ESC[$textFgCode;${textBgCode}m$($Text)$RESET"
$this.Line.Suffix = "$ESC[${pillFgCode}m$($Suffix)$RESET"
$this.Line.NoNewLine = $NoNewLine
}
# Override the default .ToString() method
[string]ToString() {
return $this.Line.ToString()
}
[void]Render() {
$this.Line.Render()
}
}
class Bubble {
hidden [hashtable]$Glyph
hidden [string]$Text
hidden [string]$Esc
hidden [string]$Reset
hidden [string]$DarkGrayFg
Bubble ([string]$Text) {
$this.Text = ""
$this.Esc = [string][char]0x1B
$this.Reset = "$($this.Esc)[0m"
$this.DarkGrayFg = "$($this.Esc)[90m" # ANSI escape code for DarkGray Foreground
$this.Glyph = @{
# TopLeft
# TopRight
= [string][char]0x256D # ╭
= [string][char]0x256E # ╮
# BottomLeft = [string][char]0x2570 # ╰
# BottomRight = [string][char]0x256F # ╯
# Horizontal = [string][char]0x2500 # ─
# Vertical
= [string][char]0x2502 # │
TopLeft
TopRight
= [string][char]0x25DC # 
= [string][char]0x25DD # 
BottomRight = [string][char]0x25DE # 
BottomLeft = [string][char]0x25DF # 
Horizontal = " "
Vertical = " "
}
$this.Init($Text)
}
[void]Init([string]$Text) {
$width = $Text.Length + 2
$horizontalBar = $this.Glyph.Horizontal.ToString() * $width
# Color strings: Borders get DarkGrayFg, Text gets default/Reset color
$DG = $this.DarkGrayFg
$RST = $this.Reset
# Top border line
$line1 = "$DG$($this.Glyph.TopLeft)$horizontalBar$($this.Glyph.TopRight)$RST`n"
# Middle text line (Borders are dark gray, text inside is normal)
$line2 = "$DG$($this.Glyph.Vertical)$RST $($Text) $DG$($this.Glyph.Vertical)$RST`n"
# Bottom border line
$line3 = "$DG$($this.Glyph.BottomLeft)$horizontalBar$($this.Glyph.BottomRight)$RST`n"
$this.Text = "$line1$line2$line3"
}
# Override the default .ToString() method
[string]ToString() {
# Note: .ToString() usually shouldn't append newlines natively,
# because commands like Write-Host will append their own unless -NoNewline is specified.
return "$($this.Text)"
}
[void]Render() {
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host $this.ToString()
}
}
class Box {
hidden [hashtable]$Glyph
[string]$Text
hidden [string]$TextColor
hidden [string]$BackgroundColor
hidden [string]$LineColor
hidden [string]$ShadowColor
hidden [string]$Shadow
# Constructor
Box([string]$text) {
$this.Glyph = @{
TopLeft
= [string][char]0x2554 # ╔
TopRight
= [string][char]0x2557 # ╗
BottomLeft = [string][char]0x255A # ╚
BottomRight = [string][char]0x255D # ╝
Horizontal = [string][char]0x2550 # ═
Vertical
= [string][char]0x2551 # ║
ShadowBlock = [string][char]0x2588 # █
ShadedBlock = [string][char]0x2592 # ▒
}
$this.Text = $text
$this.Shadow = $this.Glyph.ShadowBlock
# Base initialization via 8-bit MS-DOS hardware index mappings
$this.SetDosColors(
'220', # Gold/Yellow Text
'18', # IBM VGA Deep Navy Blue
'43', # Border Cyan
'0'
# black shadow block
)
}
# Helper engine to build standard 8-bit ANSI sequences
hidden [string]ToAnsi([string]$FgIndex, [string]$BgIndex) {
[string]$ESC = [string][char]0x1B
return "$ESC[38;5;${FgIndex};48;5;${BgIndex}m"
}
# Direct 24-bit RGB True-Color compiler to force absolute colors
hidden [string]ToAnsiRGB([int]$R, [int]$G, [int]$B) {
[string]$ESC = [string][char]0x1B
return "$ESC[38;2;${R};${G};${B};49m"
}
# Combines 8-bit and 24-bit streams
hidden [string]ToAnsiMixed([string]$fg, [string]$bg) {
[string]$ESC = [string][char]0x1B
[string]$fgPart = ""
[string]$bgPart = ""
# Resolve Foreground
if ($fg -eq '0') {
$fgPart = "38;2;0;0;0" # Pure True-Color Black FG
}
else {
$fgPart = "38;5;${fg}" # Standard 8-bit FG
}
# Resolve Background
if ($bg -eq '0') {
$bgPart = "48;2;0;0;0" # Pure True-Color Black BG
}
else {
$bgPart = "48;5;${bg}" # Standard 8-bit BG
}
return "$ESC[${fgPart};${bgPart}m"
}
hidden [string]AnsiReset() {
[string]$ESC = [string][char]0x1B
return "$ESC[0m"
}
# Public method maps directly into the updated string storage buckets
[void] SetDosColors([string]$fg, [string]$bg, [string]$line, [string]$shadow) {
[string]$ESC = [string][char]0x1B
# 1. Compile Text Color
if ($fg -ne '0' -and $bg -ne '0') {
$this.TextColor = $this.ToAnsi($fg, $bg)
}
else {
$this.TextColor = $this.ToAnsiMixed($fg, $bg)
}
# 2. Compile Background Color
if ($fg -ne '0' -and $bg -ne '0') {
$this.BackgroundColor = $this.ToAnsi($fg, $bg)
}
else {
$this.BackgroundColor = $this.ToAnsiMixed($fg, $bg)
$this.Shadow = $this.Glyph.ShadedBlock
}
# 3. Compile Line Color
if ($line -ne '0' -and $bg -ne '0') {
$this.LineColor = $this.ToAnsi($line, $bg)
}
else {
$this.LineColor = $this.ToAnsiMixed($line, $bg)
}
# 4. Compile Shadow Color (Utilizes your ToAnsiRGB helper directly if '0')
if ($shadow -eq '0') {
$this.ShadowColor = $this.ToAnsiRGB(0, 0, 0)
}
else {
$this.ShadowColor = "$ESC[38;5;${shadow};49m"
}
}
# Custom ToString override leveraging an array of Line objects
[string] ToString() {
$lineLength = $this.Text.Length
$ansiBorder = $this.LineColor
$ansiText = $this.TextColor
$ansiShadow = $this.ShadowColor
$reset = $this.AnsiReset()
# Build raw frame string assets
$hLines = $this.Glyph.Horizontal * ($lineLength + 2)
$topRow = "$($this.Glyph.TopLeft)$hLines$($this.Glyph.TopRight)"
$bottomRow = "$($this.Glyph.BottomLeft)$hLines$($this.Glyph.BottomRight)"
$dropShadow = $this.Shadow * ($topRow.Length - 1)
# Instantiate lines into a strict type-safe array container
[Line[]]$BoxLines = @(
[Line]::new($ansiBorder, "$topRow$ansiShadow ", $reset, $false),
[Line]::new(
$ansiBorder,
"$($this.Glyph.Vertical)$ansiText $($this.Text)
$ansiBorder$($this.Glyph.Vertical)$ansiShadow$($this.Shadow)",
$reset,
$false
),
[Line]::new($ansiBorder, "$bottomRow$ansiShadow$($this.Shadow)", $reset, $false),
[Line]::new($ansiShadow, " $dropShadow", $reset, $true)
)
$outputBuilder = [System.Text.StringBuilder]::new()
foreach ($line in $BoxLines) {
[void]$outputBuilder.Append($line.ToString())
}
return $outputBuilder.ToString()
}
[void] Render() {
[Console]::Write($this.ToString())
[Console]::Write("$($this.AnsiReset())`r`n")
}
}
class Menu {
# Define hidden properties
hidden [hashtable]$Glyph
hidden [string]$TextColor
hidden [string]$BackgroundColor
hidden [string]$LineColor
hidden [string]$ShadowColor
hidden [int]$Selected
hidden [string]$Shadow
# Public class properties
[string]$Title
[string[]]$Choices
# Default Constructor
Menu([string]$title, [string[]]$choices) {
$this.Glyph = @{
TopLeft
= [string][char]0x2554 # ╔
TopRight
= [string][char]0x2557 # ╗
BottomLeft = [string][char]0x255A # ╚
BottomRight = [string][char]0x255D # ╝
Horizontal = [string][char]0x2550 # ═
Vertical
= [string][char]0x2551 # ║
ShadowBlock = [string][char]0x2588 # █ (Solid Pure Shadow)
ShadedBlock = [string][char]0x2592 # ▒
}
$this.Title = $title
$this.Choices = $choices
$this.Shadow = $this.Glyph.ShadowBlock
$this.Selected = 0
# Initialize default Norton Commander colors (Bright White text, Navy Blue background, Cyan lines,
Black shadow)
$this.SetDosColors('15', '18', '14', '0')
}
# Helper engine to build standard 8-bit ANSI sequences
hidden [string]ToAnsi([string]$FgIndex, [string]$BgIndex) {
[string]$ESC = [string][char]0x1B
return "$ESC[38;5;${FgIndex};48;5;${BgIndex}m"
}
# Direct 24-bit RGB True-Color compiler to force absolute colors
hidden [string]ToAnsiRGB([int]$R, [int]$G, [int]$B) {
[string]$ESC = [string][char]0x1B
return "$ESC[38;2;${R};${G};${B};49m"
}
# Combines 8-bit and 24-bit streams
hidden [string]ToAnsiMixed([string]$fg, [string]$bg) {
[string]$ESC = [string][char]0x1B
[string]$fgPart = ""
[string]$bgPart = ""
# Resolve Foreground
if ($fg -eq '0') {
$fgPart = "38;2;0;0;0" # Pure True-Color Black FG
}
else {
$fgPart = "38;5;${fg}" # Standard 8-bit FG
}
# Resolve Background
if ($bg -eq '0') {
$bgPart = "48;2;0;0;0" # Pure True-Color Black BG
}
else {
$bgPart = "48;5;${bg}" # Standard 8-bit BG
}
return "$ESC[${fgPart};${bgPart}m"
}
hidden [string]AnsiReset() {
[string]$ESC = [string][char]0x1B
return "$ESC[0m"
}
[void] SetDosColors([string]$fg, [string]$bg, [string]$line, [string]$shadow) {
[string]$ESC = [string][char]0x1B
# 1. Compile Text Color
if ($fg -ne '0' -and $bg -ne '0') {
$this.TextColor = $this.ToAnsi($fg, $bg)
}
else {
$this.TextColor = $this.ToAnsiMixed($fg, $bg)
}
# 2. Compile Background Color
if ($fg -ne '0' -and $bg -ne '0') {
$this.BackgroundColor = $this.ToAnsi($fg, $bg)
}
else {
$this.BackgroundColor = $this.ToAnsiMixed($fg, $bg)
$this.Shadow = $this.Glyph.ShadedBlock
}
# 3. Compile Line Color
if ($line -ne '0' -and $bg -ne '0') {
$this.LineColor = $this.ToAnsi($line, $bg)
}
else {
$this.LineColor = $this.ToAnsiMixed($line, $bg)
}
# 4. Compile Shadow Color (Utilizes your ToAnsiRGB helper directly if '0')
if ($shadow -eq '0') {
$this.ShadowColor = $this.ToAnsiRGB(0, 0, 0)
}
else {
$this.ShadowColor = "$ESC[38;5;${shadow};49m"
}
}
# Overridden interactive ToString engine
[string] ToString() {
$maxWidth = $this.Title.Length + 4
foreach ($choice in $this.Choices) {
$choiceLengthWithPadding = $choice.Length + 4
if ($choiceLengthWithPadding -gt $maxWidth) {
$maxWidth = $choiceLengthWithPadding
}
}
# Dynamic Color assignments mapped to class string properties
$cBorder = $this.LineColor
$cText = $this.TextColor
# Keep the classic active highlighted color inverted (e.g., Black text on Golden Yellow
background)
$cSelect = $this.ToAnsi('0', '11')
$cShadow = $this.ShadowColor
$reset = $this.AnsiReset()
# 1. Calculate and build the Header Border containing the Title text block
$padLeftLength = [Math]::Max(0, [Math]::Floor(($maxWidth - $this.Title.Length - 4) / 2))
$padRightLength = [Math]::Max(0, $maxWidth - $this.Title.Length - 4 - $padLeftLength)
$hLeft = $this.Glyph.Horizontal * $padLeftLength
$hRight = $this.Glyph.Horizontal * $padRightLength
$topRow = "$($this.Glyph.TopLeft)$hLeft╡ $($this.Title) ╞$hRight$($this.Glyph.TopRight)"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("$cBorder$topRow$cShadow $reset")
# 2. Build Selection Rows dynamically
for ($i = 0; $i -lt $this.Choices.Length; $i++) {
$itemText = " $($this.Choices[$i])"
$padSpacesCount = $maxWidth - $itemText.Length
$padSpaces = " " * $padSpacesCount
if ($i -eq $this.Selected) {
[void]$sb.AppendLine("$cBorder$($this.Glyph.Vertical)$cSelect$itemText$padSpaces$cBorder$($this.Glyph.
}
else {
[void]$sb.AppendLine("$cBorder$($this.Glyph.Vertical)$cText$itemText$padSpaces$cBorder$($this.Glyph.Ve
}
}
# 3. Bottom Frame + Bottom Drop Shadow floor layout
$bottomRow = $this.Glyph.BottomLeft + ($this.Glyph.Horizontal * $maxWidth) +
$this.Glyph.BottomRight
[void]$sb.AppendLine("$cBorder$bottomRow$cShadow$($this.Shadow)$reset")
$dropShadow = $this.Shadow * ($topRow.Length - 1)
[void]$sb.Append("$cShadow $dropShadow$reset")
return $sb.ToString()
}
# Loops keyboard event loops inside your active powershell session thread
[int] ShowMenu() {
[int]$result = -1
[int]$maxChoices = $this.Choices.Length
[Console]::CursorVisible = $false
$originalLeft = [Console]::CursorLeft
$originalTop = [Console]::CursorTop
[bool]$needsRender = $true
while ($true) {
if ($needsRender) {
[Console]::SetCursorPosition($originalLeft, $originalTop)
[Console]::Write($this.ToString())
$needsRender = $false
}
$pressed = [Console]::ReadKey($true)
if ($pressed.Key -eq [ConsoleKey]::UpArrow) {
$this.Selected = ($this.Selected - 1 + $maxChoices) % $maxChoices
$needsRender = $true
}
elseif ($pressed.Key -eq [ConsoleKey]::DownArrow) {
$this.Selected = ($this.Selected + 1) % $maxChoices
$needsRender = $true
}
elseif ($pressed.Key -eq [ConsoleKey]::Enter) {
[Console]::CursorVisible = $true
[Console]::WriteLine("`r`n")
$result = ($this.Selected + 1)
break
}
}
return $result
}
}
enum PromptType {
Intro
Step
Outro
Blank
}
class Prompt {
hidden [hashtable]$Glyph
hidden [hashtable]$Ansi
[string]$Message
# Default constructor (no parameters)
Prompt() {
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$this.Message = ""
$this.Glyph = @{
# Core Frames
TopLeft
TopRight
BotLeft
BotRight
Horizontal
Vertical
RightTee
LeftTee
SqTopLeft
SqBotLeft
# Pill Shapes
LeftPill
RightPill
FullBlock
= [string][char]0x256D # ╭
= [string][char]0x256E # ╮
= [string][char]0x2570 # ╰
= [string][char]0x256F # ╯
= [string][char]0x2500 # ─
= [string][char]0x2502 # │
= [string][char]0x251C # ├
= [string][char]0x2524 # ┤
= [string][char]0x250C # ┌
= [string][char]0x2514 # └
= [string][char]0xE0B6 # 0x25D6 # 
= [string][char]0xE0B4 # 0x25D7 # 
= [string][char]0x2588 # █
# Connectors & State Lines
BarMiddle
= [string][char]0x2506 # ┆ Multi-line inputs or open streams
BarDashed
StepActive
# Indicators & Alerts
Check
Cross
Info
Warning
= [string][char]0x254C # ╌ Divides sub-sections horizontally
= [string][char]0x25C9 # ◉ Active radial items / focused inputs
= [string][char]0x2713 # ✓ Success
= [string][char]0x2715 # ✕ Failure / Cancelled / Error state
= [string][char]0x2139 #  Instructions / Info block tooltips
= [string][char]0x26A0 # ⚠ Warning flags
# Pointers & Selection Geometric shapes
Arrowhead
= [string][char]0x25B6 # ▶
PointerRight
Diamond
SolidDiamond
Circle
SolidCircle
= [string][char]0x203A # ›
= [string][char]0x25c7 # ◇
= [string][char]0x25C6 # ◆
= [string][char]0x25CB # ○
= [string][char]0x25CF # ●
# Additional Unicode Glyphs
UpperHalfBlock
= [string][char]0x2580 # ▀
LowerOneEighthBlock
LowerOneQuarterBlock
= [string][char]0x2581 # ▁
= [string][char]0x2582 # ▂
LowerThreeEighthsBlock = [string][char]0x2583 # ▃
LowerHalfBlock2
= [string][char]0x2584 # ▄
LowerFiveEighthsBlock = [string][char]0x2585 # ▅
LowerThreeQuartersBlock = [string][char]0x2586 # ▆
LowerSevenEighthsBlock = [string][char]0x2587 # ▇
LeftSevenEighthsBlock = [string][char]0x2589 # ▉
LeftThreeQuartersBlock = [string][char]0x258A # ▊
LeftFiveEighthsBlock
= [string][char]0x258B # ▋
LeftHalfBlock
= [string][char]0x258C # ▌
LeftThreeEighthsBlock = [string][char]0x258D # ▍
LeftOneQuarterBlock
= [string][char]0x258E # ▎
LeftOneEighthBlock
RightHalfBlock
LightShade
MediumShade
DarkShade
UpperOneEighthBlock
RightOneEighthBlock
QuadrantLowerLeft
QuadrantLowerRight
QuadrantUpperLeft
QuadrantUL_LL_LR
QuadrantUL_LR
QuadrantUL_UR_LL
QuadrantUL_UR_LR
QuadrantUpperRight
QuadrantUR_LL
QuadrantUR_LL_LR
}
$this.Ansi = @{
# Core Modifiers & Controls
Esc
= [string][char]0x1B
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
BrightMagenta
BrightCyan
BrightWhite
= "$([char]27)[90m"
= "$([char]27)[91m"
= "$([char]27)[92m"
= "$([char]27)[93m"
= "$([char]27)[94m"
= "$([char]27)[95m"
= "$([char]27)[96m"
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
BgBrightBlack
= "$([char]27)[100m"
BgBrightRed
BgBrightGreen
= "$([char]27)[101m"
= "$([char]27)[102m"
BgBrightYellow = "$([char]27)[103m"
BgBrightBlue
= "$([char]27)[104m"
BgBrightMagenta = "$([char]27)[105m"
BgBrightCyan
= "$([char]27)[106m"
BgBrightWhite
= "$([char]27)[107m"
# Screen / Terminal Actions
ClearScreen
= "$([char]27)[2J" # Clear entire console screen window buffer
ClearLineToEnd = "$([char]27)[K" # Clear line from cursor position to right edge
CursorHome
= "$([char]27)[H" # Reset cursor back to Top-Left position (0,0)
}
}
# Helper method to map ConsoleColor to ANSI Foreground code
hidden [string]GetAnsiFgColor ([ConsoleColor]$color) {
$map = @{
'Black' = '30'; 'DarkBlue' = '34'; 'DarkGreen' = '32'; 'DarkCyan' = '36'
'DarkRed' = '31'; 'DarkMagenta' = '35'; 'DarkYellow' = '33'; 'Gray' = '37'
'DarkGray' = '90'; 'Blue' = '94'; 'Green' = '92'; 'Cyan' = '96'
'Red' = '91'; 'Magenta' = '95'; 'Yellow' = '93'; 'White' = '97'
}
return $map[$color.ToString()]
}
# Helper method to map ConsoleColor to ANSI Background code
hidden [string]GetAnsiBgColor ([ConsoleColor]$color) {
$map = @{
'Black' = '40'; 'DarkBlue' = '44'; 'DarkGreen' = '42'; 'DarkCyan' = '46'
'DarkRed' = '41'; 'DarkMagenta' = '45'; 'DarkYellow' = '43'; 'Gray' = '47'
'DarkGray' = '100'; 'Blue' = '104'; 'Green' = '102'; 'Cyan' = '106'
'Red' = '101'; 'Magenta' = '105'; 'Yellow' = '103'; 'White' = '107'
}
return $map[$color.ToString()]
}
# Helper engine to build ANSI sequences
hidden [string]ToAnsi([ConsoleColor]$Fg) {
return $this.ToAnsi($Fg, [ConsoleColor]::Black)
}
hidden [string]ToAnsi([ConsoleColor]$Fg, [ConsoleColor]$Bg) {
[string]$ESC = [string][char]0x1B
[hashtable]$fgMap = @{ 'Black' = '30'; 'DarkBlue' = '34'; 'DarkGreen' = '32'; 'DarkCyan' = '36';
'DarkRed' = '31'; 'DarkMagenta' = '35'; 'DarkYellow' = '33'; 'Gray' = '37'; 'DarkGray' = '90';
'Blue' = '94'; 'Green' = '92'; 'Cyan' = '96'; 'Red' = '91'; 'Magenta' = '95'; 'Yellow' = '93';
'White' = '97' }
[hashtable]$bgMap = @{ 'Black' = '40'; 'DarkBlue' = '44'; 'DarkGreen' = '42'; 'DarkCyan' = '46';
'DarkRed' = '41'; 'DarkMagenta' = '45'; 'DarkYellow' = '43'; 'Gray' = '47'; 'DarkGray' = '100';
'Blue' = '104'; 'Green' = '102'; 'Cyan' = '106'; 'Red' = '101'; 'Magenta' = '105'; 'Yellow' =
'103'; 'White' = '107' }
# [char]0x1B creates the absolute literal ASCII Escape character required by Windows
return "$ESC[$($fgMap[$Fg.ToString()]);$($bgMap[$Bg.ToString()])m"
}
hidden [string]AnsiReset() {
[string]$ESC = [string][char]0x1B
return "$ESC[0m"
}
[void]RenderBlankTrackLine() {
[string]$result = $this.Track([PromptType]::Blank, [ConsoleColor]::DarkGray)
[Console]::Write($result)
}
[void]RenderBlankTrackLine([ConsoleColor]$TrackColor) {
[string]$result = $this.Track([PromptType]::Blank, $TrackColor)
[Console]::Write($result)
}
# Overload 1: No parameters = blank line with vertical track
[string]Track () {
return $this.Track([PromptType]::Blank)
}
# Overload 2: Prompt Type (Default: Track color DarkGray)
[string]Track ([PromptType]$Type) {
return $this.Track($Type, [ConsoleColor]::DarkGray)
}
# Track Core Method
[string]Track ([PromptType]$Type, [ConsoleColor]$TrackColor) {
# Line builder
[Line]$LINE = [Line]::new()
# Blank Track Line
if ($Type -eq [PromptType]::Blank) {
$LINE.Prefix = $this.ToAnsi($TrackColor)
$LINE.Text = $this.Glyph.Vertical
$LINE.Suffix = $this.AnsiReset()
$LINE.NoNewLine = $true
return $LINE
}
$LINE.Prefix = $this.ToAnsi($TrackColor)
if ($Type -eq [PromptType]::Intro) {
$LINE.Text = "$($this.Glyph.SqTopLeft)$($this.Glyph.Horizontal) "
}
elseif ($Type -eq [PromptType]::Step) {
$LINE.Text = "$($this.Glyph.RightTee)$($this.Glyph.Horizontal) "
}
elseif ($Type -eq [PromptType]::Outro) {
$LINE.Text = "$($this.Glyph.SqBotLeft)$($this.Glyph.Horizontal) "
}
$LINE.Suffix = $this.AnsiReset()
$LINE.NoNewLine = $true
return $LINE.ToString()
}
# Overload 1: Minimal input (Defaults: Black text, Magenta pill, new line)
[string]Pill ([string]$Text) {
return $this.Pill($Text, [ConsoleColor]::Black)
}
# Overload 2: Custom Text Color (Defaults: Magenta pill, new line)
[string]Pill ([string]$Text, [ConsoleColor]$TextColor) {
return $this.Pill($Text, $TextColor, [ConsoleColor]::Magenta)
}
# Overload 3: Custom Colors (Default: new line)
[string]Pill ([string]$Text, [ConsoleColor]$TextColor, [ConsoleColor]$PillColor) {
return $this.Pill($Text, $TextColor, $PillColor, $false)
}
# Overload 4: The Core Method (Accepts all parameters, including the switch)
[string]Pill ([string]$Text, [ConsoleColor]$TextColor, [ConsoleColor]$PillColor, [bool]$NoNewline) {
# Instantiates original Pill class and renders it
[Pill]$result = [Pill]::new($Text, $TextColor, $PillColor, $NoNewline)
return $result.ToString()
}
# Overload 1: Minimal input (Defaults: White text, Magenta pill, NO blank trailing line)
[void]Intro ([string]$Title) {
$this.Intro($Title, [ConsoleColor]::White)
}
# Overload 2: Text and Text Color (Defaults: Magenta pill, NO blank trailing line)
[void]Intro ([string]$Title, [ConsoleColor]$TextColor) {
$this.Intro($Title, $TextColor, [ConsoleColor]::Magenta)
}
# Overload 3: Text and Pill Color (Defaults: White text, NO blank trailing line)
# NOTE: Since Overload 2 and 3 would conflict, we use a 3-parameter call for explicit variation,
# OR you can pass the Pill Color as a string here to differentiate the signatures:
[void]Intro ([string]$Title, [string]$PillColor) {
$this.Intro($Title, [ConsoleColor]::White, [ConsoleColor]$PillColor)
}
# Overload 4: Text and NewLine flag (Defaults: White text, Magenta pill)
[void]Intro ([string]$Title, [bool]$NewLine) {
$this.Intro($Title, [ConsoleColor]::White, [ConsoleColor]::Magenta, $NewLine)
}
# Overload 5: Custom Colors together (Defaults: NO blank trailing line)
[void]Intro ([string]$Title, [ConsoleColor]$TextColor, [ConsoleColor]$PillColor) {
$this.Intro($Title, $TextColor, $PillColor, $false)
}
# Overload 6: Core Method (Accepts all configurations, Track color is internal)
[void]Intro ([string]$Title, [ConsoleColor]$TextColor, [ConsoleColor]$PillColor, [bool]$NewLine) {
[Line]$LINE = [Line]::new()
$LINE.Prefix = $this.Track([PromptType]::Intro)
[string]$boldTitle = "$($this.Ansi.Bold)$Title$($this.AnsiReset())"
$LINE.Text = $this.Pill($boldTitle, $TextColor, $PillColor)
if ($NewLine -eq $false) {
$LINE.Render()
}
else {
$LINE.NoNewLine = $true
$LINE.Render()
$this.RenderBlankTrackLine()
}
}
# Overload 1: Minimal input (Defaults: White text, DarkGray track, no spacing newline)
[void]Step([string]$Message) {
$this.Step($Message, [ConsoleColor]::White, [ConsoleColor]::DarkGray, $false)
}
# Overload 2: New Line (Defaults: White text, DarkGray track)
[void]Step([string]$Message, [bool]$NewLine) {
$this.Step($Message, [ConsoleColor]::White, [ConsoleColor]::DarkGray, $NewLine)
}
# Overload 3: Custom Text Color (Defaults: DarkGray track, no spacing newline)
[void]Step([string]$Message, [string]$TextColor) {
$this.Step($Message, $TextColor, [ConsoleColor]::DarkGray, $false)
}
# Overload 4: Custom Text Color and New Line (Defaults: DarkGray track)
[void]Step([string]$Message, [string]$TextColor, [bool]$NewLine) {
$this.Step($Message, $TextColor, [ConsoleColor]::DarkGray, $NewLine)
}
# Overload 5: Custom Text and Track Color (Defaults: no spacing newline)
[void]Step([string]$Message, [string]$TextColor, [ConsoleColor]$TrackColor) {
$this.Step($Message, $TextColor, $TrackColor, $false)
}
# Overload 6: Core Method (Accepts all parameters and structural switches)
[void]Step([string]$Message, [string]$TextColor, [ConsoleColor]$TrackColor, [bool]$NewLine) {
[Line]$LINE = [Line]::new()
# Output the left-side structural step node (├─ )
$LINE.Prefix = $this.Track([PromptType]::Step, $TrackColor)
# Extract baseline ANSI color string using our local map
[string]$fallbackColor = ""
if ($this.Ansi.ContainsKey($TextColor)) {
$fallbackColor = $this.Ansi[$TextColor]
}
else {
# Fallback to standard white if the provided string color map doesn't exist
$fallbackColor = $this.Ansi.White
}
# Stream the formatted message text to the terminal host
# Utilizing $this.Ansi.Reset ensures color bleeding stops instantly at line-end
[string]$reset = $this.AnsiReset()
$LINE.Text = "$fallbackColor$Message$reset"
if ($NewLine -eq $false) {
$LINE.Render()
}
else {
$LINE.NoNewLine = $true
$LINE.Render()
$this.RenderBlankTrackLine($TrackColor)
}
}
# Overload 1: Minimal input (Defaults to Failure/Red, DarkGray track)
[void]Outro([string]$Message) {
$this.Outro($Message, $false, [ConsoleColor]::DarkGray)
}
# Overload 2: Success State (Defaults to DarkGray track)
[void]Outro([string]$Message, [bool]$Success) {
$this.Outro($Message, $Success, [ConsoleColor]::DarkGray)
}
# Overload 3: Core Method (Accepts all parameters, rejects $null)
[void]Outro([string]$Message, [bool]$Success, [ConsoleColor]$TrackColor) {
[string]$green = $this.ToAnsi('Green')
[string]$red = $this.ToAnsi('Red')
[string]$reset = $this.AnsiReset()
[Line]$LINE = [Line]::new()
# The left-side structural outro node (└─ )
[string]$track = $this.Track([PromptType]::Outro, $TrackColor)
if ($Success) {
# Use green color for successful runs
$LINE.Prefix = "$track$green"
}
else {
# Fallback to red color for warnings/cancellations/errors
$LINE.Prefix = "$track$red"
}
$LINE.Text = $Message
$LINE.Suffix = "$reset`r`n"
$LINE.Render()
}
}
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
# EXECUTION ENTRY POINT
#==============================================================================
function Invoke-PromptTest {
function Invoke-TestOne {
$Prompt = [Prompt]::new()
#
# TEST #1 - Custom intro, steps, and outro
#
Write-Host "`nTEST #1 - Custom intro, steps, and outro`n" -ForegroundColor DarkGray
# 1. Custom intro
$Prompt.Intro("1. START", "White", "DarkBlue")
# 1.A. Custom step
$Prompt.Step("1.A. FETCHING DATA", "Black", "Yellow")
# 1.B. Custom step
$Prompt.Step("1.B. Connecting to remote deployment nodes...", "Gray")
# 1.C. Custom outro
$Prompt.Outro("1.C. FINISH", "White", "DarkGreen")
}
function Invoke-TestTwo {
$Prompt = [Prompt]::new()
#
# TEST #2 - Two different intros
#
Write-Host "`nTEST #2 - Two different intros`n" -ForegroundColor DarkGray
# Example 2.A: Standard Header block, no trailing line
$Prompt.Intro("2.A. PROD DEPLOYMENT")
# Example 2.B: Header block with custom track line and a trailing line spacer
$Prompt.Intro("2.B. DATABASE MIGRATION", "DarkGray", "Cyan", $true)
}
function Invoke-TestThree {
$Prompt = [Prompt]::new()
$NewLine = $false
$Success = $true
#
# TEST #3 - Console Color Test
#
Write-Host "`nTEST #3 - Console Color Test`n" -ForegroundColor DarkGray
# Execute Intro
$block = [string][char]::ConvertFromUtf32(0x2580)
$colorBar = "$block" * 10
$Prompt.Intro("3. CONSOLE COLOR TEST", $NewLine)
# Standard Color Steps
$Prompt.Step("3.A. $colorBar Black", "Black", $NewLine)
$Prompt.Step("3.B. $colorBar Red", "Red", $NewLine)
$Prompt.Step("3.C. $colorBar Green", "Green", $NewLine)
$Prompt.Step("3.D. $colorBar Yellow", "Yellow", $NewLine)
$Prompt.Step("3.E. $colorBar Blue", "Blue", $NewLine)
$Prompt.Step("3.F. $colorBar Magenta", "Magenta", $NewLine)
$Prompt.Step("3.G. $colorBar Cyan", "Cyan", $NewLine)
$Prompt.Step("3.H. $colorBar White", "White", $NewLine)
# Bright Color Steps
$Prompt.Step("3.I. $colorBar BrightWhite", "BrightWhite", $NewLine)
$Prompt.Step("3.J. $colorBar BrightCyan", "BrightCyan", $NewLine)
$Prompt.Step("3.K. $colorBar BrightMagenta", "BrightMagenta", $NewLine)
$Prompt.Step("3.L. $colorBar BrightBlue", "BrightBlue", $NewLine)
$Prompt.Step("3.M. $colorBar BrightYellow", "BrightYellow", $NewLine)
$Prompt.Step("3.N. $colorBar BrightGreen", "BrightGreen", $NewLine)
$Prompt.Step("3.O. $colorBar BrightRed", "BrightRed", $NewLine)
$Prompt.Step("3.P. $colorBar BrightBlack", "BrightBlack/Gray", $NewLine)
# Execute Outro
$Prompt.Outro("3.Q. TEST COMPLETE", $Success)
}
function Invoke-TestFour {
# Example 4.A: Standard Header block, no trailing line
$Bubble1 = [Bubble]::new("4.A. PROD DEPLOYMENT")
$Bubble1.Render()
# Example 4.B: Header block with custom track line and a trailing line spacer
$Bubble2 = [Bubble]::new("4.B. DATABASE MIGRATION")
$Bubble2.Render()
# Example 4.C
$myBox = [Box]::new("4.C. SYSTEM ERROR: INSERT DISKETTE A")
$myBox.Render()
Write-Host "`n"
# Alternative 1: Classic MS-DOS Installation Wizard (White Text, Blue Screen, Red Error Box)
$myBox.SetDosColors('15', '124', '15', '0')
$myBox.Render()
Write-Host "`n"
# Alternative 2: Retro Matrix Terminal (Vivid Lime green text on Pitch Black, Dark green borders)
$myBox.SetDosColors('46', '0', '22', '0')
$myBox.Render()
Write-Host "`n"
}
function Invoke-TestFive {
#
# TEST #5
#
Write-Host "`nTEST #5`n" -ForegroundColor DarkGray
function CreateMenu {
[CmdletBinding()]
param()
# Interactive menu options
$menuTitle = "TEST 5. - NORTON SYSTEM SETUP"
$menuChoices = @(
"1. RUN DIAGNOSTIC SCAN",
"2. EDIT INTERRUPT VECTORS (IRQ)",
"3. REBOOT IN SAFE MODE",
"4. RETURN TO DOS PROMPT"
)
# Create interactive menu
return [Menu]::new($menuTitle, $menuChoices)
}
function GetUserChoice {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true, Position = 0)]
[Menu]$Menu
)
# Execute interactive menu
$choice = $Menu.ShowMenu()
# Output user choice to terminal
Write-Host "You selected menu index option item: " -ForegroundColor DarkGray -NoNewLine
Write-Host "$choice" -ForegroundColor Green
Write-Host "`n"
}
function GetMenu {
[CmdletBinding()]
param (
[Parameter(Mandatory = $true, Position = 0)]
[Menu]$Menu,
[Parameter(Position = 1)]
[string[]]$ColorCodes = @('15', '18', '14', '0')
)
$Menu.SetDosColors(
$ColorCodes[0],
$ColorCodes[1],
$ColorCodes[2],
$ColorCodes[3]
)
GetUserChoice -Menu $Menu
}
# Base initialization
[Menu]$myMenu = CreateMenu
# Example #1
GetMenu -Menu $myMenu
# Alternative Color Scheme Example #2
[string[]]$colors = @('15', '124', '15', '0')
GetMenu -Menu $myMenu -ColorCodes $colors
# Alternative Color Scheme Example #3
$colors = @('220', '18', '43', '0')
GetMenu -Menu $myMenu -ColorCodes $colors
# Alternative Color Scheme Example #4
$colors = @('46', '0', '22', '0')
GetMenu -Menu $myMenu -ColorCodes $colors
}
# Execute Tests
#Invoke-TestOne
#Invoke-TestTwo
#Invoke-TestThree
Invoke-TestFour
#Invoke-TestFive
}
function Invoke-Tests {
# Establish UI terminal preferences
Initialize-AnsiTerminal
Invoke-PromptTest
}
Invoke-Tests
