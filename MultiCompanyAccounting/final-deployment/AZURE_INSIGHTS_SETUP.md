# Azure Application Insights Setup Guide

## Simplified Azure Telemetry Implementation

The system now uses a lightweight HTTP-based Azure Application Insights client:

- ✅ No SDK dependencies or OpenTelemetry conflicts
- ✅ Direct HTTPS transmission to South India endpoints
- ✅ Native Node.js implementation without compatibility issues
- ✅ Automatic fallback to console logging
- ✅ Zero external package dependencies

## Production Deployment

1. **Extract and install dependencies:**
```bash
tar -xzf multi-company-accounting-azure-insights-final.tar.gz
cd multi-company-accounting-azure-insights-final
cd final-deployment
npm install
```

2. **Set your Azure connection strings (both variables required):**
```bash
export NODE_ENV=production
export APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=e04a0cf1-8129-4bc2-8707-016ae726c876;IngestionEndpoint=https://southindia-0.in.applicationinsights.azure.com/;LiveEndpoint=https://southindia.livediagnostics.monitor.azure.com/;ApplicationId=da90193a-e50f-4283-b108-3450666ada97"
export AZURE_MONITOR_CONNECTION_STRING="InstrumentationKey=e04a0cf1-8129-4bc2-8707-016ae726c876;IngestionEndpoint=https://southindia-0.in.applicationinsights.azure.com/;LiveEndpoint=https://southindia.livediagnostics.monitor.azure.com/;ApplicationId=da90193a-e50f-4283-b108-3450666ada97"
```

Or use the provided .env.production file (recommended):
```bash
source .env.production
```

3. **Start production server:**
```bash
node server.cjs
```

## Expected Output

When properly configured, you'll see:
```
Simplified Application Insights telemetry initialized
Using South India endpoints for telemetry transmission
[HH:mm:ss INF] [health-xxxxx-xxxx] Health check requested
[HH:mm:ss INF] [companies-xxxxx-xxxx] Fetching companies list
```

## Telemetry Features

Your Azure Application Insights will receive:
- All API request/response logs with timing
- Error exceptions with stack traces  
- Custom dimensions for filtering
- Performance metrics for slow queries
- Request correlation across services
- Credit/Debit notes integration in AR/AP summaries
- Complete financial workflow telemetry

## Viewing Data in Azure Portal

Navigate to your Application Insights resource and use these queries:

**All application logs:**
```kusto
traces 
| where customDimensions.service == "multi-company-accounting"
| order by timestamp desc
```

**Error tracking:**
```kusto
exceptions
| where customDimensions.service == "multi-company-accounting" 
| order by timestamp desc
```

**API performance:**
```kusto
traces
| where message contains "Response received"
| project timestamp, message, customDimensions.requestId
| order by timestamp desc
```

The system maintains full functionality with console logging if Azure connectivity issues occur.