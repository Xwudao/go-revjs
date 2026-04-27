---
name: playwright-cli
description: Automate browser interactions, test web pages and work with Playwright tests.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# Browser Automation with playwright-cli

## Quick start

```bash
playwright-cli open                          # open new browser
playwright-cli goto https://playwright.dev   # navigate
playwright-cli snapshot                      # get accessibility tree with element refs (e.g. e15)
playwright-cli click e15
playwright-cli type "search query"
playwright-cli fill e5 "user@example.com" --submit
playwright-cli press Enter
playwright-cli screenshot
playwright-cli close
```

## Commands

```bash
# Interaction
playwright-cli click <ref>
playwright-cli dblclick <ref>
playwright-cli fill <ref> "value" [--submit]
playwright-cli type "text"
playwright-cli drag <ref-from> <ref-to>
playwright-cli hover <ref>
playwright-cli select <ref> "option-value"
playwright-cli upload ./file.pdf
playwright-cli check <ref>
playwright-cli uncheck <ref>
playwright-cli eval "expression" [ref]
playwright-cli dialog-accept ["text"]
playwright-cli dialog-dismiss
playwright-cli resize <width> <height>

# Navigation
playwright-cli goto <url>
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload

# Keyboard
playwright-cli press <Key>
playwright-cli keydown <Key>
playwright-cli keyup <Key>

# Tabs
playwright-cli tab-list
playwright-cli tab-new [url]
playwright-cli tab-close [index]
playwright-cli tab-select <index>

# Output
playwright-cli snapshot [ref] [--filename=file.yml] [--depth=N]
playwright-cli screenshot [ref] [--filename=page.png]
playwright-cli pdf [--filename=page.pdf]

# Storage
playwright-cli state-save [file]
playwright-cli state-load <file>
playwright-cli cookie-get <name>
playwright-cli cookie-set <name> <value>
playwright-cli localstorage-get <key>
playwright-cli localstorage-set <key> <value>

# Session management
playwright-cli -s=<name> open [url] [--persistent] [--profile=<path>]
playwright-cli list
playwright-cli close-all
```

## Targeting elements

Prefer refs from `snapshot` output (e.g. `e15`). Also accepts CSS selectors and Playwright locators:

```bash
playwright-cli click "#main > button.submit"
playwright-cli click "getByRole('button', { name: 'Submit' })"
playwright-cli click "getByTestId('submit-button')"
```

## Raw output

Pass `--raw` to strip status/snapshot sections and return only the result value — useful for piping:

```bash
playwright-cli --raw eval "document.title"
playwright-cli --raw localstorage-get theme
playwright-cli --raw snapshot > before.yml
```

## Open options

```bash
playwright-cli open --browser=chrome|firefox|webkit|msedge
playwright-cli open --persistent [--profile=/path/to/profile]
playwright-cli attach --extension
```

## Installation

If `playwright-cli` is not installed globally:

```bash
npm install -g @playwright/cli@latest
# or use local version:
npx --no-install playwright-cli --version
```
