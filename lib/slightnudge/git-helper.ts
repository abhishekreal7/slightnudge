import { execSync } from 'child_process';
import path from 'path';

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  error?: string;
}

/**
 * Creates a git commit for a single slightnudge file edit.
 */
export function commitNudgeChange(
  filePath: string,
  oldClass?: string,
  newClass?: string
): GitCommitResult {
  try {
    const cwd = process.cwd();
    const relPath = path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
    const baseName = path.basename(filePath);

    const commitMsg = `slightnudge: ${oldClass || 'add'} -> ${newClass || ''} in ${baseName}`;

    // Stage the exact modified file only
    execSync(`git add "${relPath}"`, { cwd, stdio: 'pipe' });

    // Commit with precise message
    execSync(`git commit -m "${commitMsg}"`, { cwd, stdio: 'pipe' });

    const hash = execSync('git rev-parse --short HEAD', { cwd, stdio: 'pipe' })
      .toString()
      .trim();

    return {
      success: true,
      commitHash: hash,
      message: commitMsg,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Git commit failed',
    };
  }
}

/**
 * Undoes the last slightnudge edit commit via git reset --hard HEAD~1.
 */
export function undoLastNudge(): GitCommitResult {
  try {
    const cwd = process.cwd();

    // Check last commit message
    const lastMsg = execSync('git log -1 --pretty=%B', { cwd, stdio: 'pipe' })
      .toString()
      .trim();

    if (!lastMsg.startsWith('slightnudge:')) {
      return {
        success: false,
        error: 'Latest commit is not a slightnudge commit; refusing to undo',
      };
    }

    // Reset back 1 commit
    execSync('git reset --hard HEAD~1', { cwd, stdio: 'pipe' });

    const currentHash = execSync('git rev-parse --short HEAD', { cwd, stdio: 'pipe' })
      .toString()
      .trim();

    return {
      success: true,
      commitHash: currentHash,
      message: `Undone commit: "${lastMsg}"`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Git undo failed',
    };
  }
}
