"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("./lib/log");
const terminal_1 = require("./runners/terminal");
log.debug("Uninstall invoked");
new terminal_1.UnconfigureTerminal().runWithCatcher();
//# sourceMappingURL=uninstall.js.map