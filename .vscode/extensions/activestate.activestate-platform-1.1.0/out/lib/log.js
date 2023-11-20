"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorAndReport = exports.report = exports.error = exports.warn = exports.info = exports.debug = exports.setRollbar = exports.rollbar = exports.level = exports.channel = exports.LoggingLevel = void 0;
const vscode = require("vscode");
var LoggingLevel;
(function (LoggingLevel) {
    LoggingLevel[LoggingLevel["Debug"] = 1] = "Debug";
    LoggingLevel[LoggingLevel["Info"] = 2] = "Info";
    LoggingLevel[LoggingLevel["Warn"] = 3] = "Warn";
    LoggingLevel[LoggingLevel["Error"] = 4] = "Error";
})(LoggingLevel = exports.LoggingLevel || (exports.LoggingLevel = {}));
;
// This lib is using globals since we'd otherwise have to start passing state for functions that really don't need it
// aside from some logging calls
exports.channel = vscode.window.createOutputChannel("ActiveState Platform");
exports.level = LoggingLevel.Debug;
function setRollbar(r) {
    exports.rollbar = r;
}
exports.setRollbar = setRollbar;
function log(message, level) {
    if (level < level) {
        return;
    }
    exports.channel.appendLine(message);
}
function debug(message) {
    log("[DEBUG] " + message, LoggingLevel.Debug);
}
exports.debug = debug;
function info(message) {
    log("[INFO] " + message, LoggingLevel.Info);
}
exports.info = info;
function warn(message) {
    log("[WARN] " + message, LoggingLevel.Warn);
}
exports.warn = warn;
function error(message) {
    log("[ERROR] " + message, LoggingLevel.Error);
}
exports.error = error;
function report(message, ...args) {
    if (!exports.rollbar) {
        warn("Could not report message as rollbar was not initialized, message: " + message);
        return;
    }
    exports.rollbar.error(message, ...args);
}
exports.report = report;
function errorAndReport(message, ...args) {
    error(message);
    report(message, ...args);
}
exports.errorAndReport = errorAndReport;
//# sourceMappingURL=log.js.map