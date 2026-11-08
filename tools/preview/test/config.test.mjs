import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_PORT, HELP, parseConfig } from '../src/config.mjs';

describe('parseConfig', () => {
  it('applies defaults', () => {
    const c = parseConfig(['--dir', 'site']);
    expect(c).toMatchObject({
      help: false,
      dir: 'site',
      port: DEFAULT_PORT,
      host: '0.0.0.0',
      mode: 'v1',
      cspReportOnly: false,
      edgeHeaders: false,
      imgDir: undefined,
      imgOrigin: undefined,
      originSecret: '',
    });
  });

  it('defaults env to empty', () => {
    expect(parseConfig(['--dir', 'site']).port).toBe(DEFAULT_PORT);
  });

  it('returns help without needing --dir', () => {
    expect(parseConfig(['--help'])).toEqual({ help: true });
    expect(parseConfig(['-h'])).toEqual({ help: true });
    expect(HELP).toContain('--csp-report-only');
  });

  it('reads all options', () => {
    const c = parseConfig(
      ['--dir', 'd', '--port', '5000', '--host', '127.0.0.1', '--mode', 'v2', '--csp-report-only', '--edge-headers', '--img-origin', 'https://example.com/path'],
      { PREVIEW_ORIGIN_SECRET: 's' },
    );
    expect(c).toMatchObject({
      port: 5000,
      host: '127.0.0.1',
      mode: 'v2',
      cspReportOnly: true,
      edgeHeaders: true,
      imgOrigin: 'https://example.com',
      originSecret: 's',
    });
  });

  it('takes the port from PREVIEW_PORT and lets the flag win', () => {
    expect(parseConfig(['--dir', 'd'], { PREVIEW_PORT: '5111' }).port).toBe(5111);
    expect(parseConfig(['--dir', 'd', '--port', '5222'], { PREVIEW_PORT: '5111' }).port).toBe(5222);
  });

  it('accepts an image directory', () => {
    expect(parseConfig(['--dir', 'd', '--img-dir', 'imgs']).imgDir).toBe('imgs');
  });

  it.each([
    [['--dir', 'd', '--port', 'abc'], 'invalid port'],
    [['--dir', 'd', '--port', '0'], 'invalid port'],
    [['--dir', 'd', '--port', '70000'], 'invalid port'],
    [['--dir', 'd', '--port', '1.5'], 'invalid port'],
    [['--dir', 'd', '--port', '4200'], 'reserved'],
    [['--dir', 'd', '--port', '4210'], 'reserved'],
    [[], '--dir is required'],
    [['--dir', 'd', '--mode', 'v3'], '--mode must be'],
    [['--dir', 'd', '--mode', 'v2'], 'PREVIEW_ORIGIN_SECRET'],
    [['--dir', 'd', '--img-dir', 'a', '--img-origin', 'https://x.test'], 'not both'],
    [['--dir', 'd', '--img-origin', 'not a url'], 'valid URL'],
    [['--dir', 'd', '--img-origin', 'http://x.test'], 'https'],
    [['--dir', 'd', '--img-origin', 'https://user:pw@x.test'], 'https'],
    [['--dir', 'd', '--img-origin', 'https://user@x.test'], 'https'],
    [['--dir', 'd', '--nope'], 'nope'],
  ])('rejects %j', (argv, message) => {
    expect(() => parseConfig(argv, {})).toThrow(ConfigError);
    expect(() => parseConfig(argv, {})).toThrow(message);
  });
});
