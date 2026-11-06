import { ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';
import { config } from './app.config.server';

function count(c: ApplicationConfig): number {
  return (c.providers as unknown[]).length;
}

describe('application config', () => {
  it('provides the browser configuration', () => {
    expect(count(appConfig)).toBeGreaterThan(0);
  });

  it('extends the browser configuration with server rendering for prerendering', () => {
    expect(count(config)).toBeGreaterThan(count(appConfig));
  });
});
