# Production Deployment Guide - Multi-Company Accounting System

## Microsoft Application Insights Integration

### Required Package
The system now includes the official Microsoft Application Insights SDK:
```bash
npm install applicationinsights
```

### Instrumentation Key
Your Application Insights resource uses:
- **Instrumentation Key**: `e04a0cf1-8129-4bc2-8707-016ae726c876`
- **Connection String**: `InstrumentationKey=e04a0cf1-8129-4bc2-8707-016ae726c876`

### Production Environment Setup

1. **Set Environment Variables**:
```bash
export NODE_ENV=production
export APPINSIGHTS_INSTRUMENTATIONKEY=e04a0cf1-8129-4bc2-8707-016ae726c876
```

2. **Use the provided .env.production file** or set these variables in your hosting environment:
```
NODE_ENV=production
APPINSIGHTS_INSTRUMENTATIONKEY=e04a0cf1-8129-4bc2-8707-016ae726c876
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=e04a0cf1-8129-4bc2-8707-016ae726c876
```

### Features Enabled in Production

When `NODE_ENV=production`, the system automatically:
- Sends all logs to Azure Application Insights
- Tracks exceptions with full stack traces
- Monitors API performance and dependencies
- Collects custom telemetry with request IDs
- Provides live metrics streaming
- Includes custom dimensions for filtering

### Log Categories in Application Insights

**Information Logs (INF)**:
- API request starts and completions
- Database query results
- System health checks
- Business logic milestones

**Warning Logs (WRN)**:
- Slow API calls (>1000ms)
- Data validation issues
- Performance degradation alerts

**Error Logs (ERR)**:
- Database connection failures
- API errors with stack traces
- Business logic exceptions
- Data integrity issues

### Custom Properties Available

Each log entry includes:
- `requestId`: Unique identifier for request tracking
- `timestamp`: ISO 8601 formatted timestamp
- `level`: Log level (INF, WRN, ERR)
- `service`: multi-company-accounting
- `version`: 1.0.0
- `environment`: production
- `server`: external-db-135.235.154.222

### Viewing Logs in Azure Portal

1. Navigate to your Application Insights resource
2. Use these KQL queries to view logs:

**All API requests**:
```kusto
traces
| where customDimensions.service == "multi-company-accounting"
| order by timestamp desc
```

**Error tracking**:
```kusto
exceptions
| where customDimensions.service == "multi-company-accounting"
| order by timestamp desc
```

**Performance monitoring**:
```kusto
traces
| where message contains "Response received"
| project timestamp, message, customDimensions.requestId
| order by timestamp desc
```

### Development vs Production

**Development** (NODE_ENV != production):
- Logs only to console
- No Application Insights transmission
- Full debugging output

**Production** (NODE_ENV = production):
- Logs to both console and Application Insights
- Automatic telemetry collection
- Performance monitoring
- Exception tracking
- Live metrics

### Installation Instructions

1. Extract the deployment package
2. Install dependencies: `npm install`
3. Copy `.env.production` to your production server
4. Set `NODE_ENV=production`
5. Start the server: `node server.cjs`

The system will automatically begin sending telemetry to your Application Insights resource.