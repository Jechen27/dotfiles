"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.osName = void 0;
const log = require("./log");
const os = require("os");
function osName() {
    switch (os.platform()) {
        case "win32":
            return "windows";
        case "darwin":
            return "osx";
        case "linux":
            return "linux";
        default:
            log.warn(`OS not recognized: ${os.platform()}, assuming linux.`);
            return "linux";
    }
}
exports.osName = osName;
//# sourceMappingURL=os.js.map