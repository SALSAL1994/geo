const config = require("../configurations/config");
const { format, createLogger, transports } = require("winston");
const { combine, label, timestamp, printf } = format;
require("winston-daily-rotate-file");

const { LoggingWinston } = require('@google-cloud/logging-winston');

const loggerName = config.LOGGER_NAME;

//Using the printf format.
const customFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

let _transports = [];
_transports.push(new transports.Console({
    level: 'debug'
}));

if (config.USE_FILE) {
    _transports.push(new transports.DailyRotateFile({
    filename: "logs/" + loggerName + "-%DATE%.log",
    datePattern: config.LOG_DATE_PATTERN,
    maxFiles: config.LOG_DAY_RETENTION,
    level: "debug"
}));
}

if (config.USE_CLOUD) _transports.push(new LoggingWinston());

const logger = createLogger({
    level: "debug",
    format: combine(label({ label: loggerName }), timestamp(), customFormat),
    transports: _transports
});

module.exports = logger;