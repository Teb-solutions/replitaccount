// tracing-helper.js - Helper functions for custom tracing
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('multi-company-accounting-tracer');

function trackCustomTrace(message, attributes = {}) {
  const span = tracer.startSpan('custom-trace');
  
  try {
    // Add message as an event
    span.addEvent(message);
    
    // Add custom attributes
    Object.keys(attributes).forEach(key => {
      span.setAttribute(key, attributes[key]);
    });
    
    // Add default attributes
    span.setAttribute('service.name', 'multi-company-accounting');
    span.setAttribute('trace.timestamp', new Date().toISOString());
    
  } finally {
    span.end();
  }
}

module.exports = {
  trackCustomTrace,
  tracer
};