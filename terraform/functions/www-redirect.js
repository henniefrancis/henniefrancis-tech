// CloudFront Function (runtime cloudfront-js-2.0), viewer-request event.
//
// www.<domain> answers with a 301 to https://<domain><uri><query>.
// Every other host passes through untouched.
//
// The target is a constant, never derived from the Host header, so the
// function cannot be used as an open redirect.
//
// Docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html

var APEX = 'henniefrancis.tech';
var WWW = 'www.' + APEX;

function buildQuery(querystring) {
  var parts = [];
  Object.keys(querystring || {}).forEach(function (key) {
    var entry = querystring[key];
    var values = entry.multiValue
      ? entry.multiValue.map(function (item) {
          return item.value;
        })
      : [entry.value];
    values.forEach(function (value) {
      parts.push(value === undefined || value === '' ? key : key + '=' + value);
    });
  });
  return parts.length ? '?' + parts.join('&') : '';
}

function handler(event) {
  var request = event.request;
  var hostHeader = request.headers && request.headers.host;
  var host = hostHeader && hostHeader.value ? hostHeader.value.toLowerCase() : '';

  if (host !== WWW) {
    return request;
  }

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://' + APEX + request.uri + buildQuery(request.querystring) },
      'cache-control': { value: 'public, max-age=3600' },
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handler: handler, APEX: APEX, WWW: WWW };
}
