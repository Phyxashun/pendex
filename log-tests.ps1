# FILE-PATH: ./log-tests.ps1

# Make sure this .ps1 script file is explicitly saved with the
# encoding UTF-8 with BOM. If saved as raw UTF-8 without BOM,
# PS 5.1 will misinterpret string literals.

# Ensure console handles UTF-8 box characters correctly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

#----------------------------------------
# Model
#----------------------------------------
function Get-ScriptConfiguration {
    $scriptFolder = if ($PSScriptRoot) { $PSScriptRoot } else { "." }
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $appendage = "_tests.results.log"
    $logFileName = "${timestamp}${appendage}"

    return [PSCustomObject]@{
        MaxLogs      = 5
        MaxWidth     = 50
        LogMaxWidth  = 140
        ScriptFolder = "$scriptFolder"
        TestsPath    = "$scriptFolder/tests"
        LogDir       = "$scriptFolder/logs"
        Appendage    = "$appendage"
        LogFile      = "$logFileName"
        LogFilePath  = Join-Path -Path "$scriptFolder/logs" -ChildPath "$logFileName"
        BorderColor  = "Gray"
        BoxColor     = "Yellow"
    }
}

function Initialize-Environment {
    param ([string]$LogDir)

    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
}

function Manage-Log {
    param (
        [string]$LogDir,
        [int]$MaxLogs,
        [string]$Appendage
    )

    $existingLogs = Get-ChildItem -Path $LogDir -File |
                    Where-Object { $_.Name -like "*$Appendage" } |
                    Sort-Object Name

    $currentCount = $existingLogs.Count

    if ($currentCount -gt $MaxLogs) {
        $logsToRemoveCount = $currentCount - $MaxLogs

        # Select the oldest ones and force remove them
        $existingLogs | Select-Object -First $logsToRemoveCount | Remove-Item -Force
        return $true
    }
    return $false
}

#----------------------------------------
# View-Model - Inspired by @clack/prompts
#----------------------------------------
$script:Line = @{
    TopLeft    = [string][char]0x256D # ╭
    TopRight   = [string][char]0x256E # ╮
    BotLeft    = [string][char]0x2570 # ╰
    BotRight   = [string][char]0x256F # ╯
    Horizontal = [string][char]0x2500 # ─
    Vertical   = [string][char]0x2502 # │
    RightTee   = [string][char]0x251C # ├
    LeftTee    = [string][char]0x2524 # ┤
    Check      = [string][char]0x2713 # ✓
    Arrowhead  = [string][char]0x25B6 # ▶
}

$script:GreenCheck = "$([char]0x1b)[92m$($script:Line.Check)$([char]0x1b)[0m"

# Safely enable ANSI/VT processing for legacy PowerShell 5.1
if ($PSVersionTable.PSVersion.Major -le 5) {
    $Signatures = @'
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
'@
    $type = Add-Type -MemberDefinition $Signatures -Name "Win32Utils" -Namespace "Win32" -PassThru 2>$null
    if ($type) {
        $stdOutHandle = $type::GetStdHandle(-11) # STD_OUTPUT_HANDLE
        $mode = 0
        if ($type::GetConsoleMode($stdOutHandle, [ref]$mode)) {
            $mode = $mode -bor 0x0004 # ENABLE_VIRTUAL_TERMINAL_PROCESSING
            [void]$type::SetConsoleMode($stdOutHandle, $mode)
        }
    }
}

#----------------------------------------
# View - Inspired by @clack/prompts
#----------------------------------------
function Get-TerminalLine { param($Key) return $script:Line[$Key] }
function Get-GreenCheck { return $script:GreenCheck }

function Write-Pill {
    param ([string]$Text, [ConsoleColor]$PillColor = 'Magenta', [ConsoleColor]$TextColor = 'Black')
    Write-Host "$([char]0xE0B6)$([char]0x2588)" -ForegroundColor $PillColor -NoNewline
    Write-Host " $Text " -BackgroundColor $PillColor -ForegroundColor $TextColor -NoNewline
    Write-Host "$([char]0x2588)$([char]0xE0B4)" -ForegroundColor $PillColor
}

function Write-Intro {
    param ([string]$Title, [string]$BorderColor = "Gray")
    Write-Host
    Write-Host "$($script:Line.TopLeft)$($script:Line.Horizontal)" -ForegroundColor $BorderColor -NoNewline
    Write-Pill -Text "$([char]27)[1m $Title " -PillColor Magenta -TextColor Black
    Write-Host $script:Line.Vertical -ForegroundColor $BorderColor
}

function Write-Step {
    param ([string]$Message, [string]$MessageColor = "White", [string]$BorderColor = "Gray")
    Write-Host "$($script:Line.RightTee)$($script:Line.Horizontal) " -ForegroundColor $BorderColor -NoNewline
    Write-Host $Message -ForegroundColor $MessageColor
    Write-Host $script:Line.Vertical -ForegroundColor $BorderColor
}

function Write-Box {
    param ([string]$Text, [int]$MaxWidth = 50, [string]$BorderColor = "Gray", [string]$BoxColor = "Yellow")
    if ($Text.Length -gt ($MaxWidth - 10)) { $Text = $Text.Substring(0, $MaxWidth - 13) + "..." }
    $innerBoxWidth = $MaxWidth - 2
    $textWithEmoji = "📜 " + $Text
    $totalPadding = $innerBoxWidth - $textWithEmoji.Length
    $centeredText = (" " * [math]::Floor($totalPadding / 2)) + $textWithEmoji + (" " * [math]::Ceiling($totalPadding / 2))

    Write-Host "$($script:Line.Vertical) " -ForegroundColor $BorderColor -NoNewline
    Write-Host ($script:Line.TopLeft + ($script:Line.Horizontal * ($MaxWidth - 2)) + $script:Line.TopRight) -ForegroundColor $BoxColor
    Write-Host "$($script:Line.Vertical) " -ForegroundColor $BorderColor -NoNewline
    Write-Host $script:Line.Vertical -ForegroundColor $BoxColor -NoNewline
    Write-Host $centeredText -ForegroundColor Magenta -NoNewline
    Write-Host $script:Line.Vertical -ForegroundColor $BoxColor
    Write-Host "$($script:Line.Vertical) " -ForegroundColor $BorderColor -NoNewline
    Write-Host ($script:Line.BotLeft + ($script:Line.Horizontal * ($MaxWidth - 2)) + $script:Line.BotRight) -ForegroundColor $BoxColor
    Write-Host $script:Line.Vertical -ForegroundColor $BorderColor
}

function Write-Outro {
    param ([string]$Message, [bool]$Success, [string]$BorderColor = "Gray")
    Write-Host "$($script:Line.BotLeft)$($script:Line.Horizontal) " -ForegroundColor $BorderColor -NoNewline

    if ($Success) {
        Write-Host $Message -ForegroundColor Green
    } else {
        Write-Host $Message -ForegroundColor Red
    }
}

#----------------------------------------
# Controller - Main Script Orchestration
#----------------------------------------
function Invoke-Tests {
    # Pull settings from Model
    $config = Get-ScriptConfiguration
    Initialize-Environment -LogDir $config.LogDir

    # Render initial View layouts
    Write-Intro -Title "EXECUTING TESTS" -BorderColor $config.BorderColor
    Write-Step -Message "Running tests and logging output to:" -MessageColor Cyan -BorderColor $config.BorderColor
    Write-Box -Text $config.LogFile -MaxWidth $config.MaxWidth -BorderColor $config.BorderColor -BoxColor $config.BoxColor

    # Pull presentation symbols from ViewModel
    $prefix = "$(Get-TerminalLine 'BotLeft')$(Get-TerminalLine 'Horizontal')"
    $greenCheck = Get-GreenCheck

    # Asynchronous Spinner Thread
    $spinnerPowerShell = [powershell]::Create().AddScript({
        param($SpinnerChars, $Message, $Prefix)
        $esc = [char]27
        $blue = "$esc[94m"
        $reset = "$esc[0m"
        $i = 0
        while ($true) {
            $spinnerChar = $SpinnerChars[$i % $SpinnerChars.Length]
            [Console]::Write("`r$Prefix $blue$spinnerChar$reset $Message")
            Start-Sleep -Milliseconds 100
            $i++
        }
    }).AddArgument([char[]]'◒◐◓◑').AddArgument("Executing bun tests...").AddArgument($prefix)

    $spinnerAsyncResult = $spinnerPowerShell.BeginInvoke()

    & bun test --coverage "$($config.TestsPath)" 2>&1 | Out-File -FilePath $config.LogFilePath -Width $config.LogMaxWidth -Encoding utf8
    $exitCode = $LASTEXITCODE

    # Stop Spinner UI and clear line
    $spinnerPowerShell.Stop()
    $spinnerPowerShell.Dispose()
    [Console]::Write("`r" + (" " * 50) + "`r")

    # Update layout results
    Write-Step -Message "$greenCheck Executing bun tests... Completed." -MessageColor Gray -BorderColor $config.BorderColor

    # Safely invoke log removal utility
    $removedLogs = Manage-Log -LogDir $config.LogDir -MaxLogs $config.MaxLogs -Appendage $config.Appendage
    if ($removedLogs) {
        Write-Step -Message "$greenCheck Oldest log file(s) removed to maintain retention cap." -MessageColor Gray -BorderColor $config.BorderColor
    }

    if ($exitCode -eq 0) {
        Write-Outro -Message "✨ Tests completed successfully. All tests passed." -Success $true -BorderColor $config.BorderColor
    } else {
        Write-Outro -Message "⚠️ Some tests failed. See log for details: $($config.LogFilePath)" -Success $false -BorderColor $config.BorderColor
    }

    exit $exitCode
}

#----------------------------------------
# Execute
#----------------------------------------
Invoke-Tests
