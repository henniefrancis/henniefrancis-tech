// Unit tests for the www redirect CloudFront Function.
// Run from terraform/functions with: node --test
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handler, APEX } = require('./www-redirect.js');

function event(host, uri, querystring) {
  return {
    request: {
      method: 'GET',
      uri,
      querystring: querystring || {},
      headers: host === undefined ? {} : { host: { value: host } },
    },
  };
}

test('www host gets a 301 to the apex keeping the path', () => {
  const res = handler(event('www.henniefrancis.tech', '/portfolio/cv'));
  assert.equal(res.statusCode, 301);
  assert.equal(res.headers.location.value, `https://${APEX}/portfolio/cv`);
});

test('www root redirects to the apex root', () => {
  const res = handler(event('www.henniefrancis.tech', '/'));
  assert.equal(res.headers.location.value, `https://${APEX}/`);
});

test('host match is case-insensitive', () => {
  const res = handler(event('WWW.HennieFrancis.Tech', '/x'));
  assert.equal(res.statusCode, 301);
});

test('query string is preserved, including multi values and bare keys', () => {
  const res = handler(
    event('www.henniefrancis.tech', '/search', {
      a: { value: '1' },
      b: { value: '2', multiValue: [{ value: '2' }, { value: '3' }] },
      flag: { value: '' },
    }),
  );
  assert.equal(res.headers.location.value, `https://${APEX}/search?a=1&b=2&b=3&flag`);
});

test('apex host passes through unchanged', () => {
  const ev = event('henniefrancis.tech', '/biography');
  assert.equal(handler(ev), ev.request);
});

test('other hosts pass through, so the function is not an open redirect', () => {
  for (const host of ['evil.example', 'www.henniefrancis.tech.evil.example', 'xwww.henniefrancis.tech']) {
    const ev = event(host, '/');
    assert.equal(handler(ev), ev.request, host);
  }
});

test('missing host header passes through', () => {
  const ev = event(undefined, '/');
  assert.equal(handler(ev), ev.request);
});

test('redirect target is always the apex origin', () => {
  const res = handler(event('www.henniefrancis.tech', '//evil.example/a'));
  assert.ok(res.headers.location.value.startsWith('https://henniefrancis.tech/'));
});
