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
exports.Watcher = void 0;
const vscode = require("vscode");
const os = require("os");
const exec_1 = require("./exec");
var Event;
(function (Event) {
    Event[Event["StateActivated"] = 1] = "StateActivated";
})(Event || (Event = {}));
class Watcher {
    constructor(logger) {
        this.osName = os.platform().toString() === "darwin" ? "osx" : os.platform().toString();
        this.watchers = {
            [Event.StateActivated]: []
        };
        this.logger = logger;
    }
    activateWorkspace() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
                this.logger.debug("No workspace");
                return;
            }
            let workspace = vscode.workspace.workspaceFolders[0];
            let cwd = workspace.uri.fsPath;
            let dots;
            let interval = setInterval(() => {
                dots += ".";
                if (dots.length > 3) {
                    dots = ".";
                }
                vscode.window.setStatusBarMessage("Activating Runtime Environment " + dots, 2000);
            }, 1000);
            let res;
            try {
                res = yield exec_1.exec("state activate --output editor", this.logger);
            }
            catch (e) {
                this.logger.error(`exec ran into error: ${e}`);
            }
            finally {
                clearInterval(interval);
            }
            if (!res || res.code !== 0) {
                vscode.window.setStatusBarMessage("Runtime Environment failed to activate, see 'ActiveState Platform' output channel.", 5000);
                return;
            }
            let datas = res.stdout.split('\x00');
            for (let d of datas) {
                this.processData(d);
            }
            vscode.window.setStatusBarMessage("Runtime Environment activated", 5000);
        });
    }
    processData(data) {
        if (!data || data.trim() === "") {
            return;
        }
        let env;
        try {
            this.logger.debug(`Parsing: ${data}`);
            env = JSON.parse(data);
        }
        catch (e) {
            this.logger.error(`Could not parse JSON, error: ${e}`);
            return;
        }
        if (!env.PATH) {
            this.logger.debug(`Not an env object, keys: ${Object.keys(env).join(", ")}`);
            return;
        }
        for (let cb of this.watchers[Event.StateActivated]) {
            cb(env);
        }
    }
    onStateActivate(cb) {
        this.watchers[Event.StateActivated].push(cb);
    }
}
exports.Watcher = Watcher;
//# sourceMappingURL=watcher.js.map