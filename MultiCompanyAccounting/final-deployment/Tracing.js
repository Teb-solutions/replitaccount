/* require('dotenv').config();

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { AzureMonitorTraceExporter } = require('@azure/monitor-opentelemetry-exporter');

const sdk = new NodeSDK({
  traceExporter: new AzureMonitorTraceExporter({
    connectionString: "InstrumentationKey=e04a0cf1-8129-4bc2-8707-016ae726c876;IngestionEndpoint=https://southindia-0.in.applicationinsights.azure.com/;LiveEndpoint=https://southindia.livediagnostics.monitor.azure.com/;ApplicationId=da90193a-e50f-4283-b108-3450666ada97",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

async function startTracing() {
  try {
    await sdk.start();
    console.log('✅ OpenTelemetry initialized');
  } catch (error) {
    console.error('❌ Failed to start OpenTelemetry:', error);
  }

  process.on('SIGTERM', async () => {
    try {
      await sdk.shutdown();
      console.log('✅ OpenTelemetry SDK shut down');
    } catch (err) {
      console.error('❌ Error during shutdown', err);
    }
  });
}

startTracing();
 */
 
 // telemetry.js

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { AzureMonitorTraceExporter } = require('@azure/monitor-opentelemetry-exporter');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// Optional: Enable debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Replace with your Azure Monitor connection string
const connectionString = "InstrumentationKey=e04a0cf1-8129-4bc2-8707-016ae726c876;IngestionEndpoint=https://southindia-0.in.applicationinsights.azure.com/";
process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = connectionString;

const azureExporter = new AzureMonitorTraceExporter({
  connectionString,
});

const sdk = new NodeSDK({
  traceExporter: new AzureMonitorTraceExporter({
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'my-node-service', // ✅ This works in older versions
});


try {
  sdk.start();
  console.log('✅ OpenTelemetry initialized');
} catch (err) {
  console.error('❌ Error initializing OpenTelemetry:', err);
}