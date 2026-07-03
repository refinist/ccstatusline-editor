// The whole config as a single-quoted JSON arg — readable, and pastes as one line.
// Single quotes shield JSON's double-quotes / $ / backticks from the shell; a single
// quote inside the config is escaped as '\'' (close quote, literal ', reopen). The npx
// package backs up the current settings.json to a timestamped copy under
// ~/.config/ccsa/, then writes this config to ~/.config/ccstatusline/settings.json.
// `-y` skips npx's install-confirmation prompt; `@latest` pins the resolve so a stale
// npx cache never runs an old cached version silently.
export function buildApplyCommand(config: unknown): string {
  const json = JSON.stringify(config);
  const arg = json.split("'").join("'\\''");
  return `npx -y @refinist/ccsa@latest '${arg}'`;
}
