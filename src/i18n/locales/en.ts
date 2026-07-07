export default {
  app: {
    title: 'CCStatusline Editor',
    undo: 'Undo',
    redo: 'Redo',
    clear: 'Clear',
    clearConfirm: 'Clear all widgets?',
    clearDesc:
      'This removes every widget from all lines. You can undo with ⌘/Ctrl+Z.',
    cancel: 'Cancel',
    more: 'More'
  },
  theme: {
    label: 'Theme'
  },
  palette: {
    title: 'Widgets',
    hint: 'Drag to any line, or double-click to add to line 1',
    search: 'Search widgets…',
    empty: 'No widgets match',
    count: '{n} widgets',
    added: 'Added to the active line'
  },
  categories: {
    All: 'All',
    Core: 'Core',
    Git: 'Git',
    Jujutsu: 'Jujutsu',
    Environment: 'Environment',
    Tokens: 'Tokens',
    Cache: 'Cache',
    'Token Speed': 'Token Speed',
    Context: 'Context',
    Session: 'Session',
    Usage: 'Usage',
    Custom: 'Custom',
    Layout: 'Layout'
  },
  editor: {
    title: 'Status line',
    hint: 'WYSIWYG · sample data',
    dropHint: 'Drop widgets here',
    dropHintActive: 'Drop widgets here · or double-click to add',
    copied: 'Copied — press ⌘/Ctrl+V to paste',
    remove: 'Remove',
    sepLeft: 'Insert separator on the left',
    sepRight: 'Insert separator on the right',
    preview: 'Live preview',
    previewEmpty: 'Add widgets to see the live terminal preview',
    dragLine: 'Drag to reorder lines',
    deleteLine: 'Delete line',
    addLine: 'Add line',
    maxLines: 'Up to {n} lines',
    deleteLineConfirm: 'Delete this line?',
    deleteLineDesc:
      'All widgets on this line will be removed. You can undo with ⌘/Ctrl+Z.',
    tips: {
      dblclick:
        'Double-click a widget on the left to add it to the active line',
      activeLine: 'Click a line to make it the double-click target',
      copyPaste:
        'With a widget selected: ⌘/Ctrl + C to copy, ⌘/Ctrl + V to paste',
      arrows:
        'With a widget selected: ← / → to move to the previous / next one',
      del: 'With a widget selected: Delete / Backspace to remove it',
      reorder: 'Drag the grip on the left to reorder lines',
      terminalResize:
        "Drag the preview terminal's right edge to simulate a narrower terminal; double-click the edge to smoothly snap it back to 100% width"
    }
  },
  preview: {
    width: 'Width',
    cols: 'cols',
    context: 'Context',
    usable: 'usable',
    modeFull: 'Full',
    modeMinus40: 'Full − 40',
    modeCompacted: 'Full − 40 (compacted)',
    modeUncompacted: 'Full (not compacted)',
    reservedHint: "40 columns reserved for Claude's auto-compact notice",
    thresholdNote: 'Reserves 40 cols when context usage ≥ {n}%',
    stateCompacted: 'now: compacted',
    stateFull: 'now: full'
  },
  json: {
    title: 'JSON config',
    tab: 'JSON',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    tabExport: 'Export',
    tabImport: 'Import',
    importFile: 'Choose file',
    importPlaceholder:
      "Paste config JSON here… (e.g. from npx -y {'@'}refinist/ccsa{'@'}latest export)",
    importInvalidJson: 'Invalid JSON: {message}',
    importInvalidShape:
      'This isn\'t a valid ccstatusline config (missing a "lines" array)',
    importApply: 'Import',
    importConfirmTitle: 'Import this config?',
    importConfirmDesc:
      "This replaces everything currently in the editor and can't be undone (it clears the undo history). Continue?",
    imported: 'Imported the config — feel free to keep adjusting it'
  },
  share: {
    label: 'Share',
    hint: 'Generate a link — opening it loads your config into the editor for friends to view and tweak, then apply to their own terminal if they want',
    copied: 'Share link copied — valid for 7 days',
    rateLimited: 'Sharing too fast — wait a minute and retry',
    unavailable: 'Sharing is temporarily unavailable — try again later'
  },
  applyCmd: {
    label: 'Copy command',
    hint: 'Copies a one-line command — paste it into your terminal to apply this exact config to your machine',
    copied: 'Command copied — open your terminal and paste it to apply'
  },
  showcase: {
    label: 'Save image',
    hint: 'Downloads a high-res screenshot and copies it to the clipboard, ready to share wherever you like',
    done: 'Screenshot downloaded',
    doneCopied: 'Screenshot downloaded and copied to the clipboard',
    failed: "Couldn't generate the screenshot — try again"
  },
  inspector: {
    tab: 'Inspector',
    empty:
      'Click any widget in the center to edit its colors, style and options here.',
    groupStyle: 'Style',
    groupValue: 'Value',
    groupSpecific: 'Options',
    groupLayout: 'Layout',
    foreground: 'Foreground',
    background: 'Background',
    bold: 'Bold',
    dim: 'Dim',
    off: 'Off',
    dimWhole: 'Whole',
    dimParens: 'Parens',
    rawValue: 'Raw value (no label/icon)',
    mergeNext: 'Merge next',
    merge: 'Merge',
    mergeNoPad: 'No-pad',
    hide: 'Hide this widget',
    clone: 'Clone',
    delete: 'Delete',
    resetDefaults: 'Restore defaults',
    resetDefaultsConfirm:
      "This clears the widget's color, style, and specific options back to their initial state. Continue?",
    id: 'ID',
    copyId: 'Click to copy ID',
    copied: 'Copied',
    default: 'Default',
    none: 'None',
    custom: 'Custom',
    depthHint:
      'More color formats need a higher color depth — adjust it in Global Settings',
    snap256Hint: 'Pick any color — it snaps to the nearest 256-color index',
    mode: { named: 'Named', '256': '256', hex: 'Hex', gradient: 'Gradient' }
  },
  global: {
    tab: 'Global',
    title: 'Global Settings',
    groupTerminal: 'Terminal',
    groupOverrides: 'Global Overrides',
    groupPerf: 'Performance',
    flexMode: 'Width mode',
    flex: {
      full: 'Full',
      minus40: 'Full −40',
      untilCompact: 'Full until compact'
    },
    compactThreshold: 'Compact threshold %',
    colorLevel: 'Color depth',
    level: { none: 'None', basic: 'Basic', c256: '256', true: 'True' },
    colorLevelWarn:
      'Lowering color depth makes per-widget custom hex/256 colors invalid in the terminal (ccstatusline resets them on load).',
    globalBold: 'Global bold',
    minimalist: 'Minimalist (strip icons/prefixes)',
    overrideFg: 'Override foreground',
    overrideBg: 'Override background',
    defaultSeparator: 'Default separator',
    defaultPadding: 'Default padding',
    inheritSepColors: 'Separators inherit colors',
    on: 'on',
    plEnable: 'Enable Powerline',
    plTheme: 'Theme',
    plSeparator: 'Separator glyph',
    plStartCap: 'Start cap',
    plEndCap: 'End cap',
    pl: {
      sepTriRight: 'Triangle ▶',
      sepTriLeft: 'Triangle ◀',
      sepRoundRight: 'Round ▶',
      sepRoundLeft: 'Round ◀',
      capNone: 'None',
      capTri: 'Triangle',
      capRound: 'Round',
      capLowerTri: 'Lower triangle',
      capDiag: 'Diagonal'
    },
    plAutoAlign: 'Auto-align into columns',
    plContinue: 'Continue theme across lines',
    gitCacheTtl: 'Git cache (s)',
    refreshInterval: 'Refresh interval (s)',
    ph: { none: 'none', default: 'default' },
    groupEditor: 'Editor preferences',
    autoSeparator: 'Auto-insert separator on add',
    autoSeparatorDesc:
      'Adding a widget to a non-empty line slips a separator in before it.',
    removeTrailingSep: 'Also remove the separator after it',
    removeTrailingSepDesc:
      'Removing a widget also removes the separator right after it.',
    restoreDefaults: 'Restore defaults',
    guard: {
      stripPLTitle: 'Powerline Setup',
      confirm: 'Continue',
      stripPL:
        'Enabling Powerline mode will remove all existing manual separators from your status lines. Powerline mode uses its own separator system and is incompatible with manual separators.',
      restoreDefaults:
        'Reset all global settings to their defaults (your widget lines are untouched). Continue?'
    },
    copyright: '© 2026 REFINIST. All Rights Reserved.'
  },
  wopt: {
    hideNoGit: 'Hide when no git',
    hideNoJj: 'Hide when no jj',
    hideNoRemote: 'Hide when no remote',
    linkToRepo: 'Link to repo',
    hideWhenNotFork: 'Hide when not a fork',
    hideStatus: 'Hide status',
    hideTitle: 'Hide title',
    ownerOnlyWhenFork: 'Owner only when fork',
    hideWhenEmpty: 'Hide when empty',
    hideIfDisabled: 'Hide if feature disabled',
    cacheSession: 'Session totals',
    invert: 'Invert fill',
    cursor: 'Progress cursor',
    compact: 'Compact time',
    absolute: 'Timestamp',
    hour12: '12-hour',
    weekday: 'Weekday',
    hours: 'Hours only',
    nerdFont: 'Nerd Font icons',
    showTriggers: 'Split by trigger',
    showReclaimed: 'Tokens reclaimed',
    hideZero: 'Hide when zero',
    abbreviateHome: 'Abbreviate home ~',
    fishStyle: 'Fish-style path',
    segments: 'Path segments',
    preserveColors: 'Preserve command colors',
    inverse: 'Show remaining',
    display: 'Display',
    contextDisplay: 'Display',
    format: 'Format',
    mode: 'View',
    ideLink: 'IDE link',
    separatorChar: 'Separator',
    listLimit: 'List limit',
    window: 'Speed window (s)',
    maxWidth: 'Max width',
    timeout: 'Timeout (ms)',
    glyph: 'Glyph',
    symbolAhead: 'Ahead symbol',
    symbolBehind: 'Behind symbol',
    symbolConflicts: 'Conflicts symbol',
    symbolStaged: 'Staged symbol',
    symbolUnstaged: 'Unstaged symbol',
    symbolUntracked: 'Untracked symbol',
    symbolReclaimed: 'Reclaimed symbol',
    url: 'URL',
    linkText: 'Link text',
    customText: 'Text',
    customSymbol: 'Symbol',
    commandPath: 'Command',
    timezone: 'Timezone',
    locale: 'Locale',
    opt: {
      longBar: 'Long',
      medBar: 'Medium',
      shortBar: 'Short',
      shortBarOnly: 'Short only',
      percent: 'Percent',
      timeText: 'Time',
      number: 'Number',
      iconDashLetter: 'icon-L',
      iconLetter: 'iconL',
      icon: 'Icon',
      letter: 'Letter',
      word: 'Word',
      iconText: 'Icon+text',
      text: 'Text',
      labelCheck: 'Label ✅',
      labelMark: 'Label ✓',
      iconNumber: 'Icon N',
      textNumber: 'Text+N',
      numberOnly: 'Number only',
      lastUsed: 'Last used',
      totalCount: 'Total count',
      uniqueList: 'Unique list',
      none: 'None',
      vscode: 'VS Code',
      cursor: 'Cursor',
      pipe: "{'|'}",
      dash: '-',
      comma: ',',
      space: 'Space'
    },
    ph: {
      default: 'default',
      timezone: 'e.g. Asia/Shanghai',
      locale: 'e.g. zh-CN',
      full: 'full path',
      sessionAvg: 'session avg',
      noLimit: 'no limit',
      text: 'Enter text…',
      symbol: 'e.g. ⬢',
      command: 'echo "hi"',
      timeout: '1000',
      url: 'https://…',
      linkText: 'label'
    }
  },
  widgets: {
    model: 'Model',
    'output-style': 'Output Style',
    'git-branch': 'Git Branch',
    'git-changes': 'Git Changes',
    'git-insertions': 'Git Insertions',
    'git-deletions': 'Git Deletions',
    'git-staged-files': 'Git Staged Files',
    'git-unstaged-files': 'Git Unstaged Files',
    'git-untracked-files': 'Git Untracked Files',
    'git-clean-status': 'Git Clean Status',
    'git-root-dir': 'Git Root Dir',
    'git-review': 'Git PR/MR',
    'git-worktree': 'Git Worktree',
    'git-status': 'Git Status',
    'git-staged': 'Git Staged',
    'git-unstaged': 'Git Unstaged',
    'git-untracked': 'Git Untracked',
    'git-ahead-behind': 'Git Ahead/Behind',
    'git-conflicts': 'Git Conflicts',
    'git-sha': 'Git SHA',
    'git-origin-owner': 'Git Origin Owner',
    'git-origin-repo': 'Git Origin Repo',
    'git-origin-owner-repo': 'Git Origin Owner/Repo',
    'git-upstream-owner': 'Git Upstream Owner',
    'git-upstream-repo': 'Git Upstream Repo',
    'git-upstream-owner-repo': 'Git Upstream Owner/Repo',
    'git-is-fork': 'Git Is Fork',
    'jj-bookmarks': 'JJ Bookmarks',
    'jj-workspace': 'JJ Workspace',
    'jj-root-dir': 'JJ Root Dir',
    'jj-changes': 'JJ Changes',
    'jj-insertions': 'JJ Insertions',
    'jj-deletions': 'JJ Deletions',
    'jj-description': 'JJ Description',
    'jj-revision': 'JJ Revision',
    'current-working-dir': 'Current Working Dir',
    'tokens-input': 'Tokens Input',
    'tokens-output': 'Tokens Output',
    'tokens-cached': 'Tokens Cached',
    'tokens-total': 'Tokens Total',
    'cache-hit-rate': 'Cache Hit Rate',
    'cache-read': 'Cache Read',
    'cache-write': 'Cache Write',
    'input-speed': 'Input Speed',
    'output-speed': 'Output Speed',
    'total-speed': 'Total Speed',
    'context-length': 'Context Length',
    'context-window': 'Context Window',
    'context-percentage': 'Context %',
    'context-percentage-usable': 'Context % (usable)',
    'session-clock': 'Session Clock',
    'session-cost': 'Session Cost',
    'block-timer': 'Block Timer',
    'terminal-width': 'Terminal Width',
    version: 'Version',
    'custom-text': 'Custom Text',
    'custom-symbol': 'Custom Symbol',
    'custom-command': 'Custom Command',
    link: 'Link',
    'claude-session-id': 'Claude Session ID',
    'claude-account-email': 'Claude Account Email',
    'session-name': 'Session Name',
    'free-memory': 'Memory Usage',
    'session-usage': 'Session Usage',
    'weekly-usage': 'Weekly Usage',
    'extra-usage-utilization': 'Extra Usage Utilization',
    'extra-usage-remaining': 'Extra Usage Remaining',
    'extra-usage-used': 'Extra Usage Used',
    'weekly-sonnet-usage': 'Weekly Sonnet Usage',
    'weekly-opus-usage': 'Weekly Opus Usage',
    'reset-timer': 'Block Reset Timer',
    'weekly-reset-timer': 'Weekly Reset Timer',
    'context-bar': 'Context Bar',
    skills: 'Skills',
    'thinking-effort': 'Thinking Effort',
    'vim-mode': 'Vim Mode',
    'voice-status': 'Voice Status',
    'remote-control-status': 'Remote Control Status',
    'worktree-mode': 'Git Worktree Mode',
    'worktree-name': 'Git Worktree Name',
    'worktree-branch': 'Git Worktree Branch',
    'worktree-original-branch': 'Git Worktree Original Branch',
    'compaction-counter': 'Compaction Counter',
    separator: 'Separator',
    'flex-separator': 'Flex Separator'
  },
  widgetDesc: {
    model: 'Displays the current Claude model name',
    'output-style': 'Shows the current Claude Code output style',
    'git-branch': 'Shows the current git branch name',
    'git-changes': 'Shows git changes count (+insertions, -deletions)',
    'git-insertions': 'Shows git insertions count',
    'git-deletions': 'Shows git deletions count',
    'git-staged-files': 'Shows count of staged files',
    'git-unstaged-files': 'Shows count of unstaged files',
    'git-untracked-files': 'Shows count of untracked files',
    'git-clean-status':
      'Shows ✓ when the working tree is clean and ✗ when it is dirty',
    'git-root-dir': 'Shows the git repository root directory name',
    'git-review': 'Shows PR/MR info for the current branch',
    'git-worktree': 'Shows the current git worktree name',
    'git-status':
      'Shows git status indicators: + staged, * unstaged, ? untracked, ! conflicts',
    'git-staged': 'Shows + when there are staged changes',
    'git-unstaged': 'Shows * when there are unstaged changes',
    'git-untracked': 'Shows ? when there are untracked files',
    'git-ahead-behind': 'Shows commits ahead/behind upstream',
    'git-conflicts': 'Shows count of merge conflicts',
    'git-sha': 'Shows short commit hash (SHA)',
    'git-origin-owner': 'Shows the origin remote owner/organization',
    'git-origin-repo': 'Shows the origin remote repository name',
    'git-origin-owner-repo': 'Shows the origin remote as owner/repo',
    'git-upstream-owner': 'Shows the upstream remote owner/organization',
    'git-upstream-repo': 'Shows the upstream remote repository name',
    'git-upstream-owner-repo': 'Shows the upstream remote as owner/repo',
    'git-is-fork': 'Shows fork indicator when repo is a fork of upstream',
    'jj-bookmarks': 'Shows the current jujutsu bookmark(s)',
    'jj-workspace': 'Shows the current jujutsu workspace name',
    'jj-root-dir': 'Shows the jujutsu repository root directory name',
    'jj-changes': 'Shows jujutsu changes count (+insertions, -deletions)',
    'jj-insertions': 'Shows jujutsu insertions count',
    'jj-deletions': 'Shows jujutsu deletions count',
    'jj-description': 'Shows the current jujutsu change description',
    'jj-revision': 'Shows the current jujutsu change ID (short)',
    'current-working-dir': 'Shows the current working directory',
    'tokens-input': 'Shows input token count for the current session',
    'tokens-output': 'Shows output token count for the current session',
    'tokens-cached': 'Shows cached token count for the current session',
    'tokens-total':
      'Shows total token count (input + output + cache) for the current session',
    'cache-hit-rate':
      'Shows prompt cache hit rate (cache reads vs cache writes)',
    'cache-read':
      'Shows cache read tokens served from cache, with context share',
    'cache-write':
      'Shows cache write tokens written to cache, with context share',
    'input-speed': 'Shows session-average input token speed (tokens/sec).',
    'output-speed': 'Shows session-average output token speed (tokens/sec).',
    'total-speed': 'Shows session-average total token speed (tokens/sec).',
    'context-length': 'Shows the current context window size in tokens',
    'context-window':
      'Shows the total context window size for the current model',
    'context-percentage':
      'Shows percentage of context window used or remaining',
    'context-percentage-usable':
      'Shows percentage of usable context window used or remaining (80% of max before auto-compact)',
    'session-clock': 'Shows elapsed time since current session started',
    'session-cost': 'Shows the total session cost in USD',
    'block-timer': 'Shows current 5hr block elapsed time or progress',
    'terminal-width': 'Shows current terminal width in columns',
    version: 'Shows Claude Code CLI version number',
    'custom-text': 'Displays user-defined custom text',
    'custom-symbol': 'Displays a custom symbol or emoji (single character)',
    'custom-command': 'Executes a custom shell command and displays output',
    link: 'Displays a clickable terminal hyperlink using OSC 8',
    'claude-session-id': 'Shows the current Claude Code session ID',
    'claude-account-email':
      'Displays the email of the currently logged-in Claude account',
    'session-name':
      'Shows the session name set via /rename command in Claude Code',
    'free-memory': 'Shows system memory usage (used/total)',
    'session-usage': 'Shows daily/session API usage percentage',
    'weekly-usage': 'Shows weekly API usage percentage',
    'extra-usage-utilization':
      'Shows extra usage (pay-as-you-go) utilization percentage',
    'extra-usage-remaining':
      'Shows remaining USD of your monthly extra usage limit',
    'extra-usage-used':
      'Shows USD spent on extra usage (pay-as-you-go overage)',
    'weekly-sonnet-usage': 'Shows weekly Sonnet API usage percentage',
    'weekly-opus-usage': 'Shows weekly Opus API usage percentage',
    'reset-timer': 'Shows time remaining until current 5hr block reset window',
    'weekly-reset-timer': 'Shows time remaining until weekly usage reset',
    'context-bar': 'Shows context usage as a progress bar',
    skills: 'Shows Claude Code skill invocations from hook data',
    'thinking-effort':
      'Displays the current thinking effort level (low, medium, high, xhigh, max).\\nClaude Code reports Ultracode as xhigh in status line data; Ultracode is not exposed as a separate effort level.\\nUnknown levels are shown with a trailing "?" (e.g. "super-max?").\\nMay be incorrect when multiple Claude Code sessions are running due to current Claude Code limitations.',
    'vim-mode': 'Displays current vim editor mode',
    'voice-status': 'Shows whether Claude Code voice input is enabled',
    'remote-control-status':
      'Shows whether Claude Code remote control is attached to the current session',
    'worktree-mode': 'Shows indicator when Claude Code is in worktree mode',
    'worktree-name': "Shows the active worktree's name",
    'worktree-branch': 'Shows the git branch name for the active worktree',
    'worktree-original-branch':
      'Git branch checked out before entering the worktree',
    'compaction-counter':
      'Count of context compaction events in the current session.',
    separator: 'A separator character between status line widgets',
    'flex-separator': 'Expands to fill available terminal width'
  },
  playground: {
    tab: 'Use in Terminal',
    step1Title: 'Install ccstatusline',
    step1Desc:
      'Requires ccstatusline installed and set as your statusLine command — see the {link}.',
    step1LinkText: 'README',
    step2Title: 'Copy the apply command',
    tip: 'The status line refreshes automatically — no restart needed.',
    revertNote:
      'To undo, run the command below — it restores the most recent backup:',
    copy: 'Copy command',
    copied: 'Copied'
  },
  nav: {
    menu: 'Menu',
    templates: 'Templates',
    editor: 'Editor',
    rotation: 'Rotation',
    new: 'New',
    help: 'Help'
  },
  rotation: {
    period: 'Switch every',
    period_hour: 'Hour',
    period_day: 'Day',
    period_week: 'Week',
    period_weeklyPreset: 'Weekly plan',
    period_custom: 'Custom',
    customEvery: 'every',
    unit_minute: 'minutes',
    unit_hour: 'hours',
    unit_day: 'days',
    strategy: 'Strategy',
    strategy_cycle: 'Cycle',
    strategy_random: 'Random',
    defaultName: 'Theme',
    nameLabel: 'Theme name',
    nameDuplicate: 'A theme named "{name}" already exists — pick another name',
    added: 'Added "{name}" to the rotation pool',
    emptyPool: 'The pool is empty — add your first theme:',
    needOneMore: 'Rotation needs at least two themes — add one more:',
    poolFull: 'The pool holds at most {n} themes — remove some first',
    addCurrent: 'From the editor',
    addCurrentHint: "Saves the editor's current config as a theme",
    addImport: 'From JSON',
    addTemplate: 'From a template',
    importAdd: 'Add to pool',
    dayFillBtn: 'Fill this day',
    dayFilled: 'Updated the look for {day}',
    dayImportTitle: 'Import JSON · {day}',
    editInEditor: 'Open this theme in the editor',
    editBtn: 'Edit',
    liveEditing: 'Editing rotation theme:',
    closeEditor: 'Back to rotation',
    remove: 'Remove',
    removeConfirm: 'Remove "{name}" from the pool?',
    clearPool: 'Clear pool',
    clearConfirmTitle: 'Clear the rotation pool?',
    clearConfirmDesc: "This removes all {n} themes and can't be undone.",
    exportTitle: 'Use in Terminal',
    exportNeedTwo: 'Add at least 2 themes to enable rotation',
    exportStep1: 'Download the rotation bundle',
    download: 'Download {file}',
    exportStep2: 'Run it in your terminal',
    exportStep2Desc:
      'Adjust the path if the file landed somewhere other than ~/Downloads. The command saves your current config, registers the schedule, and applies the current theme right away.',
    inlineAlt: 'Or as a single command, no file needed:',
    offNote:
      'Turn rotation off anytime — this unregisters the schedule and restores the config you had before:',
    copyCommand: 'Copy',
    commandCopied: 'Command copied — paste it into your terminal',
    importBundle: 'Import a rotation bundle',
    importBundleDesc:
      'Restore a whole rotation from a downloaded bundle file — replaces the current period, strategy, and themes.',
    importBundleLocalTip:
      'Rotation already on in your terminal? Its live bundle imports too:',
    bundleInvalid: "This isn't a valid rotation bundle file",
    bundleImported: 'Imported {n} themes from the bundle',
    bundleImportedTruncated:
      'Imported {n} themes; dropped {dropped} over the {max}-theme limit',
    bundleReplaceTitle: 'Replace the current pool?',
    bundleReplaceDesc:
      "This overwrites the current period, strategy, and all themes with the file's contents, and can't be undone.",
    weeklyLoaded:
      'Weekly plan ready — seven day cards, Sunday through Saturday. Edit each one to style that day.',
    weeklyReplaceTitle: 'Switch to the weekly plan?',
    weeklyReplaceDesc:
      "This replaces the current period, strategy, and all themes with seven editor-default cards, one per weekday (Sunday through Saturday), and can't be undone. Style each day afterwards.",
    weeklyLeaveTitle: 'Leave the weekly plan?',
    weeklyLeaveConfirm: 'Clear and switch',
    weeklyLeaveDesc:
      "The weekly plan and the ordinary periods are mutually exclusive, so switching clears its seven weekday cards. This can't be undone.",
    weeklyDay0: 'Sun',
    weeklyDay1: 'Mon',
    weeklyDay2: 'Tue',
    weeklyDay3: 'Wed',
    weeklyDay4: 'Thu',
    weeklyDay5: 'Fri',
    weeklyDay6: 'Sat'
  },
  templates: {
    subtitle:
      '"Share" copies a link that reopens the editor with this config loaded, so you can see it working and then tweak it. "Copy command" applies it to your local ccstatusline settings directly.',
    share: 'Share',
    shareCopied: 'Share link copied',
    shareFailed: "Couldn't create a share link — try again shortly",
    copyCommand: 'Copy command',
    commandCopied: 'Command copied — open your terminal and paste it to apply',
    apply: 'Use this template',
    applyBtn: 'Apply',
    applyConfirmTitle: 'Overwrite current config?',
    applyConfirmDesc:
      'This replaces your editor\'s current config with "{name}" and can\'t be undone. Continue?',
    imported: 'Loaded the shared config — feel free to keep adjusting it',
    importFailed: 'This share link is invalid or has expired',
    authorTitle: "View {'@'}{author}'s GitHub profile",
    items: {
      'daily-driver': {
        name: 'Daily driver',
        desc: "The author's actual three-line config: cwd / git / node version, model / thinking effort / context, then usage and reset countdowns. The cursor on the usage bars tracks time — whenever usage falls behind it, quota is quietly going to waste: time to pedal the AI harder 🤣."
      },
      'daily-driver-powerline': {
        name: 'Daily driver — powerline',
        desc: "The same three lines as the daily driver above, just restyled as powerline segments (Nord Aurora theme) instead of separator glyphs — the author's first powerline template."
      }
    },
    submitCta: {
      title: 'Share your config',
      desc: 'Got a status line worth showing off? Submit it and it might end up featured here.😄',
      button: 'Submit'
    },
    moreTemplates: 'More templates'
  },
  help: {
    title: 'Help Center',
    copy: 'Copy',
    copied: 'Copied',
    intro: {
      title: 'What this project does',
      desc: 'This is a visual editor for {link} — the status line tool for Claude Code. Compose your status line here and see exactly what your terminal will render.',
      features: {
        preview:
          'True-to-terminal preview in the browser: 256-color / truecolor and powerline arrows are drawn as SVG, so you see the final result without installing a Nerd Font.',
        widgets:
          'Every widget and option is point-and-click: git status, model, context usage, quota countdowns, custom text and more.',
        templates:
          'Ready-made templates you can apply in one click, then tweak.',
        share:
          'Share links that reopen the editor with your exact config loaded.',
        roundtrip:
          'Round-trip editing: apply a config from the editor, pull it back later with "{\'@\'}refinist/ccsa export", and keep refining.'
      }
    },
    workflow: {
      title: 'The workflow',
      step1: 'Build your status line in the editor.',
      step2: 'Open "Use in Terminal" and copy the generated command.',
      step3:
        'Paste it into your terminal — the CLI backs up and writes the config. The status line refreshes on its own, no restart needed.'
    },
    cli: {
      title: "{'@'}refinist/ccsa — the bridge from browser to disk",
      desc: "A web page can't write files on your machine, so the companion CLI does it: it takes the config the editor generated and writes it to ~/.config/ccstatusline/settings.json, safely.",
      cmdApply:
        'Apply a config (raw JSON or base64; -f <file> and --stdin also work). "apply" is the default command, so the word may be omitted.',
      cmdList:
        'Show the current config and every backup in the pool (with sizes, oldest first) — see what you have before restoring or cleaning.',
      cmdRestore:
        'Roll back to the newest backup. The current file is backed up first, so a restore is itself undoable.',
      cmdExport:
        'Print the current config to stdout (and copy it to the clipboard) so you can paste it back into the editor and keep editing.',
      cmdClean:
        'Delete every backup. Irreversible — but the live settings.json is never touched.',
      safetyTitle: 'Built-in safety',
      safety: {
        backup:
          'Every apply saves a timestamped backup under ~/.config/ccsa/ — a folder of its own that ccstatusline upgrades never touch.',
        merge:
          'Keys ccstatusline manages itself (e.g. "installation") are preserved on apply.',
        atomic:
          "Writes are atomic (temp file + rename) and keep the file's permission bits.",
        symlink:
          'Symlinked configs (stow / chezmoi dotfiles) are written through the link instead of replacing it.'
      }
    },
    rotation: {
      title: 'Theme rotation — a fresh look on a schedule',
      desc: 'Collect a pool of status-line themes and let the CLI switch between them automatically. Open it from the "Rotation" tab in the editor header, then export the pool to your terminal.',
      modes: {
        schedule:
          'Set how often the look changes — every hour, day, or week, or a custom "every N minutes / hours / days".',
        strategy:
          'Pick the order: "Cycle" walks the pool top to bottom on repeat; "Random" picks one each time. Card order is the cycle order — drag to rearrange.',
        weekly:
          'Or use the Weekly plan: seven cards, one per weekday (Sunday through Saturday), each styled on its own — the status line wears "that day\'s" look every week.',
        edit: "Every theme is a full config: edit it in the built-in editor with live preview, save the editor's current config as a theme, import JSON, or start from a template. Up to 20 themes."
      },
      cmdTitle: 'Turning it on and off',
      cmdOn:
        'Start rotating from a downloaded bundle. It saves your current config, registers the schedule, and applies the current theme right away. Grab this command — and the bundle file — from "Use in Terminal" on the rotation page.',
      cmdOff:
        'Stop rotating — unregisters the schedule and restores the config you had before it started.',
      entry:
        'Already rotating on this machine? "Import a rotation bundle" reads the live bundle back from ~/.config/ccsa/rotation.json, so you can tweak it and re-export.'
    },
    pitfalls: {
      title: 'Pitfalls from real-world use',
      subtitle:
        "These cost real debugging time — recorded here so they don't cost you any.",
      fnm: {
        title:
          'fnm / nvm users: a globally installed ccstatusline breaks when the Node version changes',
        intro:
          'ccstatusline runs two ways: "npx -y ccstatusline{\'@\'}latest" (no install, re-resolved on every status-line refresh) or a global install ("npm i -g ccstatusline"). This record is about the global-install setup — the faster one, and the one that fnm / nvm trip up.',
        symptomLabel: 'Symptom:',
        symptom:
          'The status line works in some projects but goes blank in projects that use a different Node version.',
        causeLabel: 'Cause:',
        cause:
          'fnm / nvm isolate global npm packages per Node version, so ccstatusline only exists in the version it was installed into.',
        fixLabel: 'Fix (fnm):',
        fixIntro:
          'Pin the command to one Node version in ~/.claude/settings.json, independent of what the current project uses:',
        fixNote:
          'Point --using at a version that has ccstatusline installed; bump it after upgrading Node.',
        aliasIntro: 'Or target the "default" alias to skip the version bumps:',
        aliasNote:
          'The default alias must point to a version with ccstatusline installed, or it fails silently.',
        nvmIntro: 'Same idea for nvm, via absolute paths:',
        npxLabel: 'Tip:',
        npxNote:
          '"npx -y ccstatusline{\'@\'}latest" also works without a global install — it just re-resolves the package on every refresh, so it is slower.'
      }
    },
    faq: {
      title: 'FAQ',
      nerdFont: {
        q: 'The preview looks perfect in the browser, but my terminal shows broken arrows or boxes',
        a: 'Powerline separators are Nerd Font glyphs. The editor draws them as SVG, so the browser never needs the font — your terminal does. Install a Nerd Font (nerdfonts.com) and set it as your terminal font.'
      },
      colorLevel: {
        q: 'My custom colors were discarded after I changed the color depth',
        a: "Color depth (colorLevel) is a capability ceiling: 0 monochrome, 1 basic 16, 2 = 256 colors (default), 3 truecolor. Lowering it discards custom hex / 256-palette colors the new ceiling can't express — that's what the warning dialog is about. Raise it back before picking custom colors."
      },
      separators: {
        q: 'Why did enabling powerline (or a separator widget) remove my other separators?',
        a: 'There are three separator mechanisms — the auto-inserted default separator, manual separator widgets, and powerline segment separators — and they are mutually exclusive by design. Switching to one cleans up the others (after a confirmation) so they never stack.'
      },
      flexMode: {
        q: 'What do flexMode and compactThreshold actually do?',
        a: 'flexMode controls how a line uses terminal width: "full" takes it all; "full-minus-40" (the default) reserves 40 columns so the auto-compact notice from Claude Code never wraps the line; "full-until-compact" uses the full width until context usage reaches compactThreshold — a context percentage, not a column count.'
      }
    }
  }
};
