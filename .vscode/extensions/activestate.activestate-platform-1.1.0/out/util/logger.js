"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LoggingLevel = void 0;
const vscode = require("vscode");
var LoggingLevel;
(function (LoggingLevel) {
    LoggingLevel[LoggingLevel["Debug"] = 1] = "Debug";
    LoggingLevel[LoggingLevel["Info"] = 2] = "Info";
    LoggingLevel[LoggingLevel["Warn"] = 3] = "Warn";
    LoggingLevel[LoggingLevel["Error"] = 4] = "Error";
})(LoggingLevel = exports.LoggingLevel || (exports.LoggingLevel = {}));
class Logger {
    constructor(level, rollbar) {
        this.channel = vscode.window.createOutputChannel("ActiveState Platform");
        ;
        this.level = level;
        this.rollbar = rollbar;
    }
    log(message, level) {
        if (level < this.level) {
            return;
        }
        this.channel.appendLine(message);
    }
    debug(message) { this.log("[DEBUG] " + message, LoggingLevel.Debug); }
    info(message) { this.log("[INFO] " + message, LoggingLevel.Info); }
    warn(message) { this.log("[WARN] " + message, LoggingLevel.Warn); }
    error(message) { this.log("[ERROR] " + message, LoggingLevel.Error); }
    report(message) { this.rollbar.error(message); }
    errorAndReport(message) {
        this.error(message);
        this.report(message);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map