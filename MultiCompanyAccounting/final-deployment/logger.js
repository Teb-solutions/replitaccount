const { createLogger, format, transports } = require('winston');
const telemetryClient = require('./Tracing'); // or './app' wherever you initialized it

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ level, message, timestamp }) => {
      // Send trace to Azure
      if (telemetryClient) {
        telemetryClient.trackTrace({
          message: `[${level.toUpperCase()}] ${message}`,
          severity: levelToSeverity(level),
        });
      }

      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new transports.Console()]
});

function levelToSeverity(level) {
  switch (level) {
    case 'error': return 3;
    case 'warn': return 2;
    case 'info': return 1;
    case 'debug': return 0;
    default: return 1;
  }
}

module.exports = logger;
