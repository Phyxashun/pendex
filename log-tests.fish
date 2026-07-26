#!/usr/bin/env fish

# FILE-PATH: ./log-tests.fish

# Make sure this .fish script file is explicitly saved with the
# encoding UTF-8 *without* BOM. Fish is UTF-8 native and a BOM
# would be parsed as part of the first command.

# Ensure console handles UTF-8 box characters correctly
if not string match -qir 'utf-?8' -- "$LANG$LC_ALL$LC_CTYPE"
    set -gx LC_ALL C.UTF-8
end

#----------------------------------------
# Model
#----------------------------------------

function Get-ScriptConfiguration
    set -l scriptFolder (status dirname)

    if test -z "$scriptFolder"
        set scriptFolder "."
    end

    set scriptFolder (path resolve $scriptFolder)
    set -l timestamp (date +"%Y-%m-%d_%H%M%S")
    set -l appendage "_tests.results.log"
    set -l logFileName "$timestamp$appendage"

    set -g config_MaxLogs      5
    set -g config_MaxWidth     50
    set -g config_LogMaxWidth  100

    set -g config_ScriptFolder "$scriptFolder"
    set -g config_TestsPath    "$scriptFolder/tests"
    set -g config_LogDir       "$scriptFolder/logs"
    set -g config_Appendage    "$appendage"
    set -g config_LogFile      "$logFileName"
    set -g config_LogFilePath  "$scriptFolder/logs/$logFileName"

    set -g config_BorderColor  "Gray"
    set -g config_BoxColor     "Yellow"
    set -g config_BarKey       "heavy_block"
end

function Initialize-Environment --argument-names LogDir
    if not test -d "$LogDir"
        mkdir -p "$LogDir"
    end
end

function Manage-Log --argument-names LogDir MaxLogs Appendage
    set -l existingLogs (find "$LogDir" -maxdepth 1 -type f -name "*$Appendage" | sort)

    set -l currentCount (count $existingLogs)

    if test $currentCount -gt $MaxLogs
        set -l logsToRemoveCount (math $currentCount - $MaxLogs)

        # Select the oldest ones and force remove them
        rm -f -- $existingLogs[1..$logsToRemoveCount]
        return 0
    end
    return 1
end

function Invoke-Bun-Test --description 'Run root and workspace bun tests natively in Fish'
    # Forward arguments ($argv) to the root test run
    bun test $argv
    set -l r1 $status

    # Forward arguments ($argv) to workspace tests if they accept them
    bun run --filter '*' test -- $argv
    set -l r2 $status

    if test $r1 -gt $r2
        return $r1
    else
        return $r2
    end
end

function Get-Bun-Test-Results --argument-names TestsPath LogFilePath LogMaxWidth BarKey
    Invoke-Bun-Test --coverage $TestsPath &| Format-Log $LogMaxWidth $BarKey >$LogFilePath

    # Capture the exit code cleanly
    return $pipestatus[1]
end

#----------------------------------------
# View-Model - Inspired by @clack/prompts
#----------------------------------------

set -g Line_TopLeft    \u256D # ╭
set -g Line_TopRight   \u256E # ╮
set -g Line_BotLeft    \u2570 # ╰
set -g Line_BotRight   \u256F # ╯
set -g Line_Horizontal \u2500 # ─
set -g Line_Vertical   \u2502 # │
set -g Line_RightTee   \u251C # ├
set -g Line_LeftTee    \u2524 # ┤
set -g Line_Check      \u2713 # ✓
set -g Line_Arrowhead  \u25B6 # ▶
set -g GreenCheck \e"[92m$Line_Check"\e"[0m"

function Get-TerminalLine --argument-names Key
    set -l name Line_$Key
    echo -n $$name
end

function Get-GreenCheck
    echo -n $GreenCheck
end

function Get-ConsoleColor --argument-names Name
    switch (string lower -- "$Name")
        case gray
            echo -n white
        case white
            echo -n brwhite
        case black
            echo -n black
        case darkgray
            echo -n brblack
        case red
            echo -n brred
        case green
            echo -n brgreen
        case yellow
            echo -n bryellow
        case blue
            echo -n brblue
        case magenta
            echo -n brmagenta
        case cyan
            echo -n brcyan
        case '*'
            echo -n normal
    end
end

function Get-BarCharacter --argument-names Key
    # Banner bar kept separate so the substitution stays readable
    set -l bar_keys asterisk line double_line equals half_block heavy_block medium_block
    set -l bar_chars '*' '─' '═' '=' '■' '█' '▒'

    # Find the index
    set -l index (contains -i "$Key" $bar_keys)
    if test -z "$index"
        set index 1
    end
    echo -n $bar_chars[$index]
end

#----------------------------------------
# View - Inspired by @clack/prompts
#----------------------------------------

function Format-Log --argument-names LogMaxWidth BarKey
    test -n "$LogMaxWidth"; or set LogMaxWidth 100
    test -n "$BarKey"; or set BarKey "heavy_block"

    # Store regex expressions as bare patterns (string replace is not sed:
    # it takes pattern and replacement as two separate arguments)
    set -l strip_colors '\x1b\[[0-9;?]*[ -/]*[@-~]'
    set -l strip_prefix '^[^[:space:]]+ test:[[:space:]]?'

    set -l bar (string repeat -n $LogMaxWidth (Get-BarCharacter $BarKey))

    # Matches a bun test-file header line: optional spaces, a path ending in
    # .test/.spec + .ts|.tsx|.js|.jsx|.mjs|.cts, a trailing ":" and nothing else
    # Capture Group 1 ($1): the test file path (without the trailing colon)
    # Define the pattern components
    set -l spacing '^[[:space:]]*'
    set -l dynamic_ext '\.(test|spec)\.[cm]?[jt]sx?'
    set -l filepath "([^[:space:]]+$dynamic_ext)"
    set -l trailing ':[[:space:]]*$'

    # Match pattern is just raw regex now
    set -l match_pattern "$spacing$filepath$trailing"
    # Replacement template uses fish-native $1 instead of \1
    set -l replacement_template "$bar\nTEST:\t\$1\n$bar\n"

    # The leading `cat` is required: a `string` builtin used as the first
    # command of a function body does not inherit the pipeline's stdin
    bat |
        string replace -ra $strip_colors '' |
        string replace -ra $strip_prefix '' |
        string replace -r $match_pattern $replacement_template |
        fold -s -w $LogMaxWidth
end

function Write-Pill --argument-names Text PillColor TextColor
    test -n "$PillColor"; or set PillColor 'Magenta'
    test -n "$TextColor"; or set TextColor 'Black'
    set_color (Get-ConsoleColor $PillColor)
    printf '%s%s' \ue0b6 \u2588
    set_color (Get-ConsoleColor $TextColor) -b (Get-ConsoleColor $PillColor)
    printf ' %s ' "$Text"
    set_color normal
    set_color (Get-ConsoleColor $PillColor)
    printf '%s%s\n' \u2588 \ue0b4
    set_color normal
end

function Write-Intro --argument-names Title BorderColor
    test -n "$BorderColor"; or set BorderColor "Gray"
    echo
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s%s' $Line_TopLeft $Line_Horizontal
    set_color normal
    Write-Pill \e"[1m $Title " Magenta Black
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s\n' $Line_Vertical
    set_color normal
end

function Write-Step --argument-names Message MessageColor BorderColor
    test -n "$MessageColor"; or set MessageColor "White"
    test -n "$BorderColor"; or set BorderColor "Gray"
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s%s ' $Line_RightTee $Line_Horizontal
    set_color (Get-ConsoleColor $MessageColor)
    printf '%s\n' "$Message"
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s\n' $Line_Vertical
    set_color normal
end

function Write-Box --argument-names Text MaxWidth BorderColor BoxColor
    test -n "$MaxWidth"; or set MaxWidth 50
    test -n "$BorderColor"; or set BorderColor "Gray"
    test -n "$BoxColor"; or set BoxColor "Yellow"
    if test (string length -- "$Text") -gt (math $MaxWidth - 10)
        set Text (string sub -l (math $MaxWidth - 13) -- "$Text")"..."
    end
    set -l innerBoxWidth (math $MaxWidth - 2)
    set -l textWithEmoji "📜 $Text"
    set -l totalPadding (math $innerBoxWidth - (string length --visible -- "$textWithEmoji"))
    set -l centeredText (printf '%*s%s%*s' (math "floor($totalPadding / 2)") "" "$textWithEmoji" (math "ceil($totalPadding / 2)") "")

    set_color (Get-ConsoleColor $BorderColor)
    printf '%s ' $Line_Vertical
    set_color (Get-ConsoleColor $BoxColor)
    printf '%s%s%s\n' $Line_TopLeft (string repeat -n (math $MaxWidth - 2) -- $Line_Horizontal) $Line_TopRight
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s ' $Line_Vertical
    set_color (Get-ConsoleColor $BoxColor)
    printf '%s' $Line_Vertical
    set_color (Get-ConsoleColor Magenta)
    printf '%s' "$centeredText"
    set_color (Get-ConsoleColor $BoxColor)
    printf '%s\n' $Line_Vertical
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s ' $Line_Vertical
    set_color (Get-ConsoleColor $BoxColor)
    printf '%s%s%s\n' $Line_BotLeft (string repeat -n (math $MaxWidth - 2) -- $Line_Horizontal) $Line_BotRight
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s\n' $Line_Vertical
    set_color normal
end

function Write-Outro --argument-names Message Success BorderColor
    test -n "$BorderColor"; or set BorderColor "Gray"
    set_color (Get-ConsoleColor $BorderColor)
    printf '%s%s ' $Line_BotLeft $Line_Horizontal

    if test "$Success" = true
        set_color (Get-ConsoleColor Green)
        printf '%s\n' "$Message"
    else
        set_color (Get-ConsoleColor Red)
        printf '%s\n' "$Message"
    end
    set_color normal
end

function Start-Spinner --argument-names Message Prefix
    # Asynchronous Spinner Thread
    fish -c '
        set -l SpinnerChars (string split "" -- $argv[1])
        set -l Message $argv[2]
        set -l Prefix $argv[3]
        set -l blue \e"[94m"
        set -l reset \e"[0m"
        set -l i 0
        while true
            set -l spinnerChar $SpinnerChars[(math "$i % "(count $SpinnerChars)" + 1")]
            printf "\r%s %s%s%s %s" $Prefix $blue $spinnerChar $reset $Message
            sleep 0.1
            set i (math $i + 1)
        end
    ' '◒◐◓◑' "$Message" "$Prefix" &
    set -g spinner_Pid $last_pid
end

function Stop-Spinner
    # Stop Spinner UI and clear line
    if set -q spinner_Pid
        kill $spinner_Pid 2>/dev/null
        wait $spinner_Pid 2>/dev/null
        set -e spinner_Pid
    end
    printf '\r%*s\r' 50 ""
end

function Show-Header
    # Render initial View layouts
    Write-Intro "EXECUTING TESTS" $config_BorderColor
    Write-Step "Running tests and logging output to:" Cyan $config_BorderColor
    Write-Box $config_LogFile $config_MaxWidth $config_BorderColor $config_BoxColor
end

function Show-TestSummary --argument-names ExitCode
    # Pull presentation symbols from ViewModel
    set -l greenCheck (Get-GreenCheck)

    # Update layout results
    Write-Step "$greenCheck Executing bun tests... Completed." Gray $config_BorderColor

    # Safely invoke log removal utility
    if Manage-Log $config_LogDir $config_MaxLogs $config_Appendage
        Write-Step "$greenCheck Oldest log file(s) removed to maintain retention cap." Gray $config_BorderColor
    end

    if test $ExitCode -eq 0
        Write-Outro "✨ Tests completed successfully. All tests passed." true $config_BorderColor
    else
        Write-Outro "⚠️  Some tests failed. See log for details." false $config_BorderColor
    end
    echo
end

#----------------------------------------
# Controller - Main Script Orchestration
#----------------------------------------

function Invoke-Tests
    # Model
    Get-ScriptConfiguration
    Initialize-Environment $config_LogDir

    # View-Model
    set -l prefix (Get-TerminalLine 'BotLeft')(Get-TerminalLine 'Horizontal')

    # View
    Show-Header
    Start-Spinner "Executing bun tests..." "$prefix"

    # Controller
    Get-Bun-Test-Results $config_TestsPath $config_LogFilePath $config_LogMaxWidth $config_BarKey
    set -l exitCode $status

    # View
    Stop-Spinner
    Show-TestSummary $exitCode

    exit 0
end

#----------------------------------------
# Execute
#----------------------------------------
Invoke-Tests
