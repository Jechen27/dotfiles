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
exports.processEnvironmentData = exports.processError = exports.execState = exports.StateCmdOutputError = exports.StateCmdError = void 0;
const log = require("../../lib/log");
const shell_1 = require("../../lib/shell");
const state = require("../../lib/state");
const vscode_1 = require("../../lib/vscode");
// StateCmdError is thrown for errors happening during execution of a state command with execState()
class StateCmdError extends Error {
    constructor(m) {
        super(m);
        log.error(m);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, StateCmdError.prototype);
    }
}
exports.StateCmdError = StateCmdError;
// StateCmdOutputError is thrown if a state command returns with a non-zero exit code.
// It parses the JSON formatted errors and creates a human read-able message including the exit code and all error messages.
class StateCmdOutputError extends StateCmdError {
    constructor(m, res) {
        let parsedErrors = res.messages.map(b => Object(b)["Error"]).filter(b => b !== undefined);
        log.debug("res.messages" + JSON.stringify(res.messages));
        let errors = parsedErrors.join("\n");
        super(`${m}:\n${errors}\nProcess returned with exit code ${res.code}.`);
        this.parsedErrors = parsedErrors;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, StateCmdOutputError.prototype);
    }
    getParsedErrors() {
        return this.parsedErrors;
    }
}
exports.StateCmdOutputError = StateCmdOutputError;
// execState executes a state tool sub-command `cmd` with `args` and handles occurring errors.
function execState(cmd, args, ...sensitive) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vscode_1.workspaceDir()) {
            throw new StateCmdError("State Tool cannot operate without an active workspace.");
        }
        args = args || "";
        let res;
        try {
            res = yield shell_1.exec(`${state.executable()} ${cmd} --output editor ${args}`, ...sensitive);
        }
        catch (e) {
            throw new StateCmdError(`state ${cmd} ran into error ${e}`);
        }
        if (!res || res.code !== 0) {
            throw new StateCmdOutputError(`state ${cmd} exited with error`, res);
        }
        return res;
    });
}
exports.execState = execState;
function processError(data) {
    if (!data) {
        return;
    }
    let err = data;
    if (err.Error && err.Error !== "") {
        log.debug("Returning error");
        return err;
    }
}
exports.processError = processError;
function processEnvironmentData(data) {
    if (!data) {
        return;
    }
    let env = data;
    if (!env.PATH) {
        log.debug(`Not an env object, keys: ${Object.keys(env).join(", ")}`);
        return;
    }
    return env;
}
exports.processEnvironmentData = processEnvironmentData;
//# sourceMappingURL=common.js.map