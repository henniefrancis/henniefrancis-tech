import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CspError,
  applyPolicy,
  buildLoader,
  buildPolicy,
  checkPage,
  hashScript,
  isExecutableType,
  main,
  run,
} from '../src/csp.mjs';

const page = (head, body = '') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
const policyOf = (html) => /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1];

describe('isExecutableType', () => {
  it.each([
    [undefined, true],
    ['', true],
    ['  ', true],
    ['module', true],
    [' Module ', true],
    ['importmap', true],
    ['text/javascript', true],
    ['text/javascript; charset=utf-8', true],
    ['application/json', false],
    ['text/plain', false],
  ])('%j gives %s', (type, expected) => {
    expect(isExecutableType(type)).toBe(expected);
  });
});

describe('hashScript', () => {
  it('matches the known SHA-256 of the text', () => {
    expect(hashScript('alert(1)')).toBe("'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='");
  });
  it('treats CRLF and CR as LF, as browsers do', () => {
    expect(hashScript('a\r\nb\rc')).toBe(hashScript('a\nb\nc'));
  });
});

describe('buildPolicy', () => {
  it('lists the hashes between strict-dynamic and the fallbacks', () => {
    expect(buildPolicy(["'sha256-a'", "'sha256-b'"])).toBe(
      "script-src 'strict-dynamic' 'sha256-a' 'sha256-b' https: 'unsafe-inline'; object-src 'none'; base-uri 'self'",
    );
  });
  it('leaves out unsafe-inline when there is no hash (it would then allow every inline script)', () => {
    expect(buildPolicy([])).toBe("script-src 'strict-dynamic' https:; object-src 'none'; base-uri 'self'");
  });
});

describe('buildLoader', () => {
  it('writes every attribute, escaped, in order', () => {
    const loader = buildLoader([
      { src: "a b'.js", type: 'module', async: false, defer: true, integrity: 'sha384-x', crossOrigin: 'anonymous' },
      { src: 'b.js', type: undefined, async: true, defer: false, integrity: undefined, crossOrigin: undefined },
    ]);
    expect(loader).toContain(`['a%20b\\'.js', "module", false, true, "sha384-x", "anonymous"],['b.js', "", true, false, null, null]`);
    expect(loader).toContain('document.lastElementChild.appendChild(s)');
  });
  it('cannot be closed early by a value', () => {
    const loader = buildLoader([{ src: 'x', type: '</script>', async: false, defer: false, integrity: '</script>', crossOrigin: undefined }]);
    expect(loader).not.toContain('</script>');
  });
});

describe('applyPolicy', () => {
  it('hashes inline scripts and turns script tags into one hashed loader after the charset tag', () => {
    const html = page(
      '<script>window.a=1</script><script src="one.js" defer></script>\n<script src="two.js" type="module" crossorigin></script>' +
        '<script id="ng-state" type="application/json">{"a":1}</script>',
    );
    const result = applyPolicy(html);
    expect(result.html).toMatch(/^<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"/);
    expect(result.html).not.toContain('src="one.js"');
    expect(result.html).not.toContain('src="two.js"');
    expect(result.html).toContain('<script id="ng-state" type="application/json">{"a":1}</script>');
    expect(result.html.match(/<script>\(\(\) =>/g)).toHaveLength(1);
    expect(result.hashes).toHaveLength(2);
    expect(hashScript('window.a=1')).toBe(result.hashes.find((h) => h === hashScript('window.a=1')));
    const policy = policyOf(result.html);
    for (const h of result.hashes) expect(policy).toContain(h);
    expect(checkPage(result.html)).toEqual([]);
  });

  it('puts the loader of the second run of script tags in place, after a run is broken by other content', () => {
    const result = applyPolicy(page('<script src="a.js"></script><!-- note --><script src="b.js"></script>', '<p>x</p><script src="c.js"></script>'));
    expect(result.html.match(/<script>\(\(\) =>/g)).toHaveLength(2);
    expect(result.html).toContain("['a.js'");
    expect(result.html).toContain("['b.js'");
    expect(result.html).toContain("['c.js'");
  });

  it('breaks a run at an inline script and keeps the order', () => {
    const result = applyPolicy(page('<script src="a.js"></script><script>x()</script><script src="b.js"></script>'));
    const order = [...result.html.matchAll(/\['(a|b)\.js'|x\(\)/g)].map((m) => m[0]);
    expect(order).toEqual(["['a.js'", 'x()', "['b.js'"]);
  });

  it('places the policy after the head tag when there is no charset tag, using the first charset tag only', () => {
    const noCharset = applyPolicy('<!doctype html><html><head><title>t</title></head><body></body></html>');
    expect(noCharset.html).toMatch(/<head><meta http-equiv="Content-Security-Policy"/);
    expect(policyOf(noCharset.html)).toBe("script-src 'strict-dynamic' https:; object-src 'none'; base-uri 'self'");
    const two = applyPolicy('<!doctype html><html><head><meta charset="utf-8"><meta charset="utf-8"></head><body></body></html>');
    expect(two.html).toMatch(/^<!doctype html><html><head><meta charset="utf-8"><meta http-equiv/);
  });

  it('does not touch data blocks or scripts of an unknown type', () => {
    const html = page('<script type="text/plain" src="x.js"></script><script type="application/ld+json">{}</script>');
    const result = applyPolicy(html);
    expect(result.hashes).toEqual([]);
    expect(result.html).toContain('<script type="text/plain" src="x.js"></script>');
  });

  it('is deterministic', () => {
    const html = page('<script>b()</script><script>a()</script>');
    expect(applyPolicy(html).html).toBe(applyPolicy(html).html);
  });

  it('refuses a page that already has a policy, with and without content', () => {
    expect(() => applyPolicy(page('<meta http-equiv="Content-Security-Policy" content="x">'))).toThrow('already-has-policy');
    expect(() => applyPolicy(page('<meta http-equiv="content-security-policy">'))).toThrow('already-has-policy');
  });

  it('refuses inline event handlers and javascript URLs, naming only the element', () => {
    expect(() => applyPolicy(page('', '<body onload="x()"><a onclick="y()">a</a>'))).toThrow('inline-event-handler:body,inline-event-handler:a');
    expect(() => applyPolicy(page('', '<a href=" JavaScript:alert(1)">a</a>'))).toThrow('javascript-url:a');
    expect(() => applyPolicy(page('', '<a title="javascript:no">a</a>'))).not.toThrow();
  });

  it('refuses an unterminated script and a page without an explicit head', () => {
    expect(() => applyPolicy('<html><head><script>foo')).toThrow('unterminated-script');
    expect(() => applyPolicy('<html><body>x</body></html>')).toThrow('no-head');
    expect(() => applyPolicy('<html><body>x</body></html>')).toThrow(CspError);
  });
});

describe('checkPage', () => {
  const good = () => applyPolicy(page('<script>a()</script><script src="m.js"></script>')).html;

  it('accepts a processed page', () => {
    expect(checkPage(good())).toEqual([]);
  });
  it('reports a page without a policy and a page with two', () => {
    expect(checkPage(page(''))).toEqual(['no-policy']);
    const two = good().replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="x">');
    expect(checkPage(two)).toEqual(['several-policies']);
  });
  it('reports an inline script that is not hashed, an external script tag and event handlers', () => {
    expect(checkPage(good().replace('</body>', '<script>evil()</script></body>'))).toEqual(['unhashed-inline-script']);
    expect(checkPage(good().replace('</body>', '<script src="x.js"></script></body>'))).toEqual(['external-script-tag']);
    expect(checkPage(good().replace('<body>', '<body onload="x()">'))).toEqual(['inline-event-handler:body']);
  });
  it('reports a policy that lost strict-dynamic or object-src', () => {
    expect(checkPage(good().replace("'strict-dynamic'", ''))).toEqual(['weak-policy']);
    expect(checkPage(good().replace("object-src 'none'", ''))).toEqual(['weak-policy']);
  });
});

describe('run and main', () => {
  let dist;
  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'hft-csp-'));
  });
  afterEach(() => rmSync(dist, { recursive: true, force: true }));
  const put = (rel, content) => {
    const file = join(dist, rel);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, content);
  };
  const sink = () => {
    const s = { out: '', err: '' };
    return { s, io: { out: (t) => (s.out += t), err: (t) => (s.err += t) } };
  };

  it('writes the policy to every html file under the folder, then the check passes', async () => {
    put('index.html', page('<script src="m.js"></script>'));
    put('deep/er/index.html', page(''));
    put('asset.js', 'not html');
    const { s, io } = sink();
    expect(await main([dist], io)).toBe(0);
    expect(s.out).toBe('csp: policy written to 2 pages\n');
    expect(policyOf(readFileSync(join(dist, 'deep/er/index.html'), 'utf8'))).toBeDefined();
    expect(readFileSync(join(dist, 'asset.js'), 'utf8')).toBe('not html');
    const again = sink();
    expect(await main(['--check', dist], again.io)).toBe(0);
    expect(again.s.out).toBe('csp: 2 pages checked\n');
  });

  it('fails with file and rule only when a page cannot be covered or checked', async () => {
    put('ok.html', page(''));
    put('bad.html', page('', '<a onclick="x()">a</a>'));
    const { s, io } = sink();
    expect(await main([dist], io)).toBe(1);
    expect(s.err).toBe('csp: 1 problem(s)\nbad.html: inline-event-handler:a\n');
    const check = sink();
    expect(await main(['--check', dist], check.io)).toBe(1);
    expect(check.s.err).toContain('bad.html: inline-event-handler:a');
    expect(check.s.err).toContain('bad.html: no-policy');
  });

  it('needs exactly one folder', async () => {
    const { s, io } = sink();
    expect(await main([], io)).toBe(2);
    expect(await main(['a', 'b'], io)).toBe(2);
    expect(s.err).toContain('usage');
  });

  it('fails on a folder without html files and on a folder that does not exist', async () => {
    const empty = sink();
    expect(await main([dist], empty.io)).toBe(1);
    expect(empty.s.err).toBe('csp: no-html-files\n');
    const missing = sink();
    expect(await main([join(dist, 'nope')], missing.io)).toBe(1);
    expect(missing.s.err).toBe('csp: failed (ENOENT)\n');
  });

  it('passes unexpected errors up from run and reports a name when there is no code', async () => {
    const io = {
      readdir: async () => [{ name: 'a.html', isDirectory: () => false, isFile: () => true }],
      readFile: async () => {
        throw new TypeError('boom');
      },
      writeFile: async () => {},
    };
    await expect(run('x', { io })).rejects.toThrow('boom');
    const { s, io: out } = sink();
    expect(await main(['x'], { ...out, io })).toBe(1);
    expect(s.err).toBe('csp: failed (TypeError)\n');
  });
});
