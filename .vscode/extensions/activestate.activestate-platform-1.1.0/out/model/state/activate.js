"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.ActivateEvent = exports.Emitter = void 0;
const vscode_1 = require("../../lib/vscode");
const log = require("../../lib/log");
const common_1 = require("./common");
const events = require("events");
exports.Emitter = new events.EventEmitter();
exports.ActivateEvent = "activate";
function activate() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vscode_1.workspaceDir()) {
            log.debug("No workspace");
            return;
        }
        let res = yield common_1.execState("activate");
        for (let d of res.messages) {
            let err = common_1.processError(d);
            if (err && err.Error.indexOf("No activestate.yaml file exists") === -1) { // todo: use exit code to convey this instead
                throw new Error(err.Error);
            }
            let env = common_1.processEnvironmentData(d);
            if (env) {
                log.debug("Returning environment after processing");
                exports.Emitter.emit(exports.ActivateEvent, env);
                return env;
            }
        }
        log.error(`No environment data was found in stdout:\n${res.stdout}.\nstderr: ${res.stderr}`);
        throw new Error("Could not retrieve environment information from project");
    });
}
exports.activate = activate;
//# sourceMappingURL=activate.js.map