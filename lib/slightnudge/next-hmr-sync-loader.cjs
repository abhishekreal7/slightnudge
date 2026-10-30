/* eslint-disable */
/** Next 16.4.3 broadcasts SYNC when another preview connects. Its client
 * remembers only the initial hash, so a healthy later build followed by a new
 * iframe connection looks like a server restart. Track acknowledged BUILT
 * hashes too. Genuine reconnects without an acknowledged build still reload.
 * This transforms development output only; installed dependencies are intact. */
module.exports = function slightNudgeHmrSyncLoader(input) {
  const source = input.toString();
  const marker = '// Track webpack compilation hash for server restart detection';
  if (!source.includes(marker) || !source.includes('mostRecentCompilationHash !== message.hash')) {
    throw new Error('Next.js HMR changed. Recheck the source-canvas sync compatibility loader before enabling this preview.');
  }
  return source.replace(marker, `// Keep the restart checkpoint current after ordinary successful builds.
                if (message.type === _hotreloadertypes.HMR_MESSAGE_SENT_TO_BROWSER.BUILT && 'hash' in message && !(message.errors && message.errors.length)) {
                    mostRecentCompilationHash = message.hash;
                }
                ${marker}`);
};
