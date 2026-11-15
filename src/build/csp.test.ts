// The CSP step of the build: hashes of exactly the inlined script and style, inserted before them;
// pages that load anything from outside are refused.
import { createHash } from 'node:crypto';
import { cspFor, withCsp } from './csp';
import { BUILD_PROFILES, HOSTED_HEAD, profileFor, type BuildProfile } from './profiles';

const hash = (text: string) =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

const page = (head: string) =>
  `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="UTF-8" />\n${head}\n  </head>\n  <body></body>\n</html>`;

describe('withCsp', () => {
  it('allows exactly the inlined script and style by their hashes', () => {
    const script = 'console.log("ä")\n';
    const style = ':root{color:red}';
    const html = withCsp(
      page(`<script type="module" crossorigin>${script}</script><style>${style}</style>`),
    );
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${cspFor([hash(script)], [hash(style)])}" />`,
    );
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script'));
  });

  it('forbids network, eval, workers, plugins, base and form targets', () => {
    const policy = cspFor(["'sha256-a'"], ["'sha256-b'"]);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("worker-src 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("form-action 'none'");
    expect(policy).not.toMatch(/unsafe-eval|unsafe-inline|https?:/);
  });

  it('the hosted app may have its worker and manifest, but still connects nowhere', () => {
    const policy = cspFor(["'sha256-a'"], ["'sha256-b'"], BUILD_PROFILES.hosted.csp);
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain("manifest-src 'self'");
    expect(policy).toContain("img-src 'self' data: blob:");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).not.toMatch(/unsafe-eval|unsafe-inline|https?:/);
    expect(cspFor([], [], BUILD_PROFILES.file.csp)).toBe(cspFor([], []));
  });

  it('only the hosted build links a manifest and registers a worker', () => {
    expect(profileFor('hosted')).toBe(BUILD_PROFILES.hosted);
    expect(profileFor('production')).toBe(BUILD_PROFILES.file);
    expect(BUILD_PROFILES.file).toMatchObject({ hosted: false, publicDir: false, outDir: 'dist' });
    expect(HOSTED_HEAD).toContain(
      'rel="manifest" href="manifest.json" crossorigin="use-credentials"',
    );
    expect(HOSTED_HEAD).toContain('rel="apple-touch-icon"');
  });

  // Tobias 2026-11-15: the footer link „Tester einladen“ in the hosted (test) build, never in a live one
  it('only a test build carries „Tester einladen“, the plain file and any live build never', () => {
    expect(BUILD_PROFILES.hosted).toMatchObject({
      stage: 'test',
      testerInvite: '/_zugang/einladen',
    });
    expect(BUILD_PROFILES.file.testerInvite).toBe(false);
    for (const [name, profile] of Object.entries(BUILD_PROFILES)) {
      const p: BuildProfile = profile;
      if (p.testerInvite !== false) expect(p.stage, name).toBe('test');
      if (p.stage === 'live') expect(p.testerInvite, name).toBe(false);
    }
  });

  it.each([
    ['an external script', '<script src="https://example.org/x.js"></script>'],
    ['an external stylesheet', '<link rel="stylesheet" href="x.css" /><script>1</script>'],
    [
      'an existing policy',
      '<meta http-equiv="Content-Security-Policy" content="x" /><script>1</script>',
    ],
    ['no inline script', '<style>a{}</style>'],
  ])('refuses a page with %s', (_name, head) => {
    expect(() => withCsp(page(head))).toThrow();
  });
});
