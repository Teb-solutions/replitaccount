// tracing-helper.js
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('custom-logger');

function trackCustomTrace(name, attributes = {}) {
  const span = tracer.startSpan(name);

  for (const [key, value] of Object.entries(attributes)) {
    span.setAttribute(key, value);
  }

  span.end(); // Ensure you end the span
}

module.exports = { trackCustomTrace };
