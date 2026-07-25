#!/usr/bin/fish

# FILE-PATH: ./log-tests.fish


# ==========================================
# VIEW-MODEL —
# box-drawing & symbol glyphs
# (inspired by @clack/prompts)
# ==========================================

set -g CHAR_TOP_LEFT ╭
set -g CHAR_TOP_RIGHT ╮
set -g CHAR_BOT_LEFT ╰
set -g CHAR_BOT_RIGHT ╯
set -g CHAR_HORIZONTAL ─
set -g CHAR_VERTICAL │
set -g CHAR_RIGHT_TEE ├
set -g CHAR_LEFT_TEE ┤
set -g CHAR_CHECK ✓
set -g CHAR_PILL_LEFT
set -g CHAR_PILL_RIGHT
set -g CHAR_BLOCK █

set -g GREEN_CHECK (set_color -o green)"$CHAR_CHECK"(set_color normal)
set -g SPINNER_FRAMES ◒ ◐ ◓ ◑

# ==========================================
# SPINNER DAEMON MODE
# ==========================================
# Fish does not reliably background a plain function/builtin job
# (no fork happens without an external command), so the spinner is
# rendered by re-invoking this same script file as a child `fish`
# process, which backgrounds like any other external command.
if test (count $argv) -ge 3; and test "$argv[1]" = "--spinner-daemon"
    set -l message $argv[2]
    set -l prefix $argv[3]
    set -l i 1
    while true
        set -l frame $SPINNER_FRAMES[(math "($i - 1) % 4 + 1")]
        printf '\r%s %s%s%s %s' "$prefix" (set_color brblue) "$frame" (set_color normal) "$message"
        sleep 0.1
        set i (math $i + 1)
    end
    exit 0
end

# ==========================================
# MODEL —
# configuration
# ==========================================

function get_script_configuration
    set -l script_folder (dirname (status -f))
    set -l timestamp (date +%Y-%m-%d_%H%M%S)
    set -l appendage _tests.results.log
    set -l log_file "$timestamp$appendage"

    set -g MAX_LOGS 5
    set -g MAX_WIDTH 50
    set -g LOG_MAX_WIDTH 140
    set -g SCRIPT_FOLDER $script_folder
    # NOTE: no TESTS_PATH here anymore — see invoke_tests. Pinning this
    # to "$script_folder/tests" is exactly the bug that was silently
    # limiting every run to the root suite: it scoped bun test to one
    # directory, so packages/*/tests never ran. `bun run test` is now
    # the single place that knows how to run everything (root + every
    # workspace package); this script just calls it and captures output.
    set -g LOG_DIR "$script_folder/logs"
    set -g APPENDAGE $appendage
    set -g LOG_FILE $log_file
    set -g LOG_FILE_PATH "$LOG_DIR/$log_file"
    set -g BORDER_COLOR white
    set -g BOX_COLOR yellow
end

function initialize_environment
    if not test -d $LOG_DIR
        mkdir -p $LOG_DIR
    end
end

function manage_log
    set -l existing_logs (find $LOG_DIR -maxdepth 1 -type f -name "*$APPENDAGE" | sort)
    set -l current_count (count $existing_logs)

    if test $current_count -gt $MAX_LOGS
        set -l remove_count (math $current_count - $MAX_LOGS)
        for f in $existing_logs[1..$remove_count]
            rm -f $f
        end
        return 0
    end
    return 1
end

# ==========================================
# VIEW —
# rendering (inspired by @clack/prompts)
# ==========================================

function write_pill
    set -l text $argv[1]
    set -l pill_color magenta
    set -l text_color black
    set -l bold 0
    if test (count $argv) -ge 2; and test -n "$argv[2]"
        set pill_color $argv[2]
    end
    if test (count $argv) -ge 3; and test -n "$argv[3]"
        set text_color $argv[3]
    end
    if test (count $argv) -ge 4; and test "$argv[4]" = bold
        set bold 1
    end

    set_color $pill_color
    printf '%s%s' $CHAR_PILL_LEFT $CHAR_BLOCK
    set_color normal

    if test $bold -eq 1
        set_color -o $text_color -b $pill_color
    else
        set_color $text_color -b $pill_color
    end
    printf ' %s ' "$text"
    set_color normal

    set_color $pill_color
    printf '%s%s\n' $CHAR_BLOCK $CHAR_PILL_RIGHT
    set_color normal
end

function write_intro
    set -l title $argv[1]
    echo
    set_color $BORDER_COLOR
    printf '%s%s' $CHAR_TOP_LEFT $CHAR_HORIZONTAL
    set_color normal
    write_pill $title magenta black bold
    set_color $BORDER_COLOR
    echo $CHAR_VERTICAL
    set_color normal
end

function write_step
    set -l message $argv[1]
    set -l message_color white
    if test (count $argv) -ge 2; and test -n "$argv[2]"
        set message_color $argv[2]
    end

    set_color $BORDER_COLOR
    printf '%s%s ' $CHAR_RIGHT_TEE $CHAR_HORIZONTAL
    set_color normal
    set_color $message_color
    echo $message
    set_color normal
    set_color $BORDER_COLOR
    echo $CHAR_VERTICAL
    set_color normal
end

function write_box
    set -l text $argv[1]
    set -l max_width $MAX_WIDTH

    if test (string length -- "$text") -gt (math $max_width - 10)
        set text (string sub -l (math $max_width - 13) -- "$text")"..."
    end

    set -l inner_width (math $max_width - 2)
    set -l labeled_text "📜 $text"
    set -l label_len (math (string length -- "$labeled_text") + 1)
    set -l total_padding (math $inner_width - $label_len)
    set -l left_pad 0
    set -l right_pad 0
    if test $total_padding -gt 0
        set left_pad (math -s0 "$total_padding / 2")
        set right_pad (math "$total_padding - $left_pad")
    end

    set -l left_spaces ""
    set -l right_spaces ""
    if test $left_pad -gt 0
        set left_spaces (string repeat -n $left_pad " ")
    end
    if test $right_pad -gt 0
        set right_spaces (string repeat -n $right_pad " ")
    end

    set -l horiz (string repeat -n (math $max_width - 2) $CHAR_HORIZONTAL)

    set_color $BORDER_COLOR
    printf '%s ' $CHAR_VERTICAL
    set_color $BOX_COLOR
    printf '%s%s%s\n' $CHAR_TOP_LEFT "$horiz" $CHAR_TOP_RIGHT
    set_color normal

    set_color $BORDER_COLOR
    printf '%s ' $CHAR_VERTICAL
    set_color $BOX_COLOR
    printf '%s' $CHAR_VERTICAL
    set_color magenta
    printf '%s%s%s' "$left_spaces" "$labeled_text" "$right_spaces"
    set_color $BOX_COLOR
    printf '%s\n' $CHAR_VERTICAL
    set_color normal

    set_color $BORDER_COLOR
    printf '%s ' $CHAR_VERTICAL
    set_color $BOX_COLOR
    printf '%s%s%s\n' $CHAR_BOT_LEFT "$horiz" $CHAR_BOT_RIGHT
    set_color normal

    set_color $BORDER_COLOR
    echo $CHAR_VERTICAL
    set_color normal
end

function write_outro
    set -l message $argv[1]
    set -l success $argv[2]

    set_color $BORDER_COLOR
    printf '%s%s ' $CHAR_BOT_LEFT $CHAR_HORIZONTAL
    set_color normal

    if test "$success" = true
        set_color green
    else
        set_color red
    end
    echo $message
    set_color normal
end

# ==========================================
# CONTROLLER —
# main orchestration
# ==========================================

function invoke_tests
    # Pull settings from Model
    get_script_configuration
    initialize_environment

    # Render initial View layouts
    write_intro "EXECUTING TESTS"
    write_step "Running tests and logging output to:" cyan
    write_box $LOG_FILE

    # Kick off the spinner as a background child process
    set -l spinner_prefix "$CHAR_BOT_LEFT$CHAR_HORIZONTAL"
    fish (status -f) --spinner-daemon "Executing bun tests..." $spinner_prefix &
    set -l spinner_pid $last_pid
    disown $spinner_pid 2>/dev/null

    set -x COLUMNS $LOG_MAX_WIDTH
    bun run test >$LOG_FILE_PATH 2>&1

    bun test --coverage $config_tests_path &| string sub -l $config_log_max_width > $LOG_FILE_PATH
    set -l exit_code $status

    # Stop spinner and clear its line
    kill $spinner_pid 2>/dev/null
    sleep 0.15
    printf '\r%s\r' (string repeat -n 60 " ")

    # Update layout results
    write_step "$GREEN_CHECK Executing bun tests... Completed." white

    # Safely invoke log removal utility
    if manage_log
        write_step "$GREEN_CHECK Oldest log file(s) removed to maintain retention cap." white
    end

    if test $exit_code -eq 0
        write_outro "✨ Tests completed successfully. All tests passed." true
    else
        write_outro "⚠️  Some tests failed. See log for details: $LOG_FILE_PATH" false
        printf '\n'
        exit 0
    end

    printf '\n'
    exit 0
end

# ==========================================
# EXECUTE
# ==========================================
invoke_tests
