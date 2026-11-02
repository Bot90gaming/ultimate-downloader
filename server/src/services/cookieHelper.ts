import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class CookieHelper {
  private static cachedCookiePath: string | null = null;

  /**
   * Resolves yt-dlp arguments for authentication / cookies.
   */
  public static getCookieArgs(): string[] {
    const cookiePath = this.resolveCookieFilePath();
    if (cookiePath && fs.existsSync(cookiePath)) {
      return ['--cookies', cookiePath];
    }

    const browserCandidate = this.resolveBrowserCandidate();
    if (browserCandidate) {
      return ['--cookies-from-browser', browserCandidate];
    }

    return [];
  }

  /**
   * Returns path to a valid cookies.txt file if present.
   */
  public static resolveCookieFilePath(): string | null {
    if (this.cachedCookiePath && fs.existsSync(this.cachedCookiePath)) {
      try {
        if (fs.statSync(this.cachedCookiePath).size > 100) {
          return this.cachedCookiePath;
        }
      } catch {}
    }

    const home = os.homedir();
    const candidates = [
      process.env.YTDLP_COOKIES_PATH,
      path.join(__dirname, '../../cookies.txt'),
      path.join(__dirname, '../../../cookies.txt'),
      path.join(process.cwd(), 'cookies.txt'),
      path.join(process.cwd(), 'server/cookies.txt'),
      path.join(home, '.config/yt-dlp/cookies.txt'),
      path.join(home, 'cookies.txt'),
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          if (fs.statSync(c).size > 100) {
            this.cachedCookiePath = c;
            return c;
          }
        } catch {}
      }
    }

    return null;
  }

  /**
   * Scans for local browser profiles (Zen, Firefox, Chrome, Chromium).
   */
  public static resolveBrowserCandidate(): string | null {
    const home = os.homedir();

    // 1. Zen browser (Firefox fork)
    const zenDir = path.join(home, '.config/zen');
    if (fs.existsSync(zenDir)) {
      try {
        const files = fs.readdirSync(zenDir);
        const profile = files.find(
          (f) => f.includes('Default') && fs.existsSync(path.join(zenDir, f, 'cookies.sqlite'))
        );
        if (profile) {
          return `firefox:${path.join(zenDir, profile)}`;
        }
      } catch {}
    }

    // 2. Firefox standard profile
    const mozillaDir = path.join(home, '.mozilla/firefox');
    if (fs.existsSync(mozillaDir)) {
      try {
        const files = fs.readdirSync(mozillaDir);
        const profile = files.find(
          (f) =>
            (f.includes('default') || f.includes('release')) &&
            fs.existsSync(path.join(mozillaDir, f, 'cookies.sqlite'))
        );
        if (profile) {
          return `firefox:${path.join(mozillaDir, profile)}`;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Saves uploaded/pasted cookies.txt content to disk.
   */
  public static saveCookies(content: string): string {
    const targetDir = path.join(__dirname, '../../');
    const targetFile = path.join(targetDir, 'cookies.txt');
    fs.writeFileSync(targetFile, content.trim(), 'utf8');
    this.cachedCookiePath = targetFile;
    return targetFile;
  }

  /**
   * Returns whether a valid cookie file is currently loaded.
   */
  public static hasCookies(): boolean {
    return !!this.resolveCookieFilePath() || !!this.resolveBrowserCandidate();
  }
}
