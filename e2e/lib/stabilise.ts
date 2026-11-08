import type { Page } from '@playwright/test';

/**
 * Init script, injected before any page script runs. It keeps the Bootstrap
 * carousel on its first slide by forcing interval:false on every instance.
 * Works for the CDN build today and the self-hosted bundle later, because it
 * wraps whatever is assigned to window.bootstrap.
 */
const PAUSE_CAROUSEL = `(() => {
  let real;
  const wrap = (b) => {
    if (!b || !b.Carousel || b.Carousel.__paused) return b;
    const Orig = b.Carousel;
    const Paused = new Proxy(Orig, {
      construct(target, args) {
        const cfg = Object.assign({}, args[1], { interval: false, ride: false, wrap: false });
        return Reflect.construct(target, [args[0], cfg], target);
      },
      get(target, prop, recv) {
        if (prop === '__paused') return true;
        return Reflect.get(target, prop, recv);
      },
    });
    b.Carousel = Paused;
    return b;
  };
  Object.defineProperty(window, 'bootstrap', {
    configurable: true,
    get() { return real; },
    set(v) { real = wrap(v); },
  });
})();`;

export async function installStabiliser(page: Page): Promise<void> {
  await page.addInitScript(PAUSE_CAROUSEL);
}

/** Runs in the page: freeze animations, force lazy images, wait for app state. */
export async function waitForSettled(page: Page, timeoutMs = 30_000): Promise<void> {
  await page.waitForFunction(() => (document.querySelector('app-root')?.childElementCount ?? 0) > 0, undefined, {
    timeout: timeoutMs,
  });
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => ((i as HTMLImageElement).loading = 'eager'));
    await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) =>
        img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); }),
      ),
    );
  });
  // Layout must be identical across three consecutive frames before we measure.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const sig = () => {
          let h = document.documentElement.scrollHeight + ':' + document.documentElement.scrollWidth;
          for (const el of Array.from(document.body.querySelectorAll('*')).slice(0, 4000)) {
            const r = el.getBoundingClientRect();
            h += `|${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`;
          }
          return h;
        };
        let last = sig();
        let same = 0;
        const tick = () => {
          const now = sig();
          same = now === last ? same + 1 : 0;
          last = now;
          if (same >= 3) resolve(true);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    undefined,
    { timeout: timeoutMs },
  );
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        const t = a.effect?.getComputedTiming().iterations;
        if (t === Infinity) a.cancel();
        else a.finish();
      } catch {
        a.cancel();
      }
    }
  });
}
