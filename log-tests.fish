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
    # $PSScriptRoot is absolute, so resolve the relative dirname too
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

function test_bun --description 'Run root and workspace bun tests natively in Fish'
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

#----------------------------------------
# View - Inspired by @clack/prompts
#----------------------------------------
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

#----------------------------------------
# Controller - Main Script Orchestration
#----------------------------------------
function Invoke-Tests
    # Pull settings from Model
    Get-ScriptConfiguration
    Initialize-Environment $config_LogDir

    # Render initial View layouts
    Write-Intro "EXECUTING TESTS" $config_BorderColor
    Write-Step "Running tests and logging output to:" Cyan $config_BorderColor
    Write-Box $config_LogFile $config_MaxWidth $config_BorderColor $config_BoxColor

    # Pull presentation symbols from ViewModel
    set -l prefix (Get-TerminalLine 'BotLeft')(Get-TerminalLine 'Horizontal')
    set -l greenCheck (Get-GreenCheck)

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
    ' '◒◐◓◑' "Executing bun tests..." "$prefix" &
    set -l spinnerPid $last_pid

# Store regex expressions safely using hex characters
set -l strip_colors 's/\x1b\x5b[0-9;]*m//g'
set -l strip_prefix 's|^[^[:space:]]+ test:[[:space:]]?||'

# 1. Matches lines that start with optional spaces and have "bun test v"
# 2. Capture Group 1 (\1): The entire line text block
# 3. Capture Group 2 (\2): Extracted test file path at the end of the line
set -l add_styled_blocks 's@^[[:space:]]*(bun test v.*[[:space:]]+([^[:space:]]+):)@\n//=====================================-< START >-=====================================\n// TEST: \2\n//=====================================-< START >-=====================================\n\n\1@'

# Run the fixed pipeline safely on one line
test_bun --coverage $config_TestsPath |& sed -E -e "$strip_colors" -e "$strip_prefix" -e "$add_styled_blocks" | fold -s -w $config_LogMaxWidth > $config_LogFilePath

# Capture the exit code cleanly
set -l exitCode $pipestatus[1]


    # Stop Spinner UI and clear line
    kill $spinnerPid 2>/dev/null
    wait $spinnerPid 2>/dev/null
    printf '\r%*s\r' 50 ""

    # Update layout results
    Write-Step "$greenCheck Executing bun tests... Completed." Gray $config_BorderColor

    # Safely invoke log removal utility
    if Manage-Log $config_LogDir $config_MaxLogs $config_Appendage
        Write-Step "$greenCheck Oldest log file(s) removed to maintain retention cap." Gray $config_BorderColor
    end

    if test $exitCode -eq 0
        Write-Outro "✨ Tests completed successfully. All tests passed." true $config_BorderColor
        echo
        exit 0
    else
        Write-Outro "⚠️  Some tests failed. See log for details." false $config_BorderColor
        echo
        exit 0
    end

    echo
    exit $exitCode
end

#----------------------------------------
# Execute
#----------------------------------------
Invoke-Tests
