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
exports.setupMissingDeps = void 0;
const vscode = require("vscode");
const log = require("./log");
const open = require("open");
const packages_1 = require("../model/state/packages");
const project_1 = require("../model/state/project");
function checkForPlatformRequirements(reqs) {
    return __awaiter(this, void 0, void 0, function* () {
        let config = vscode.workspace.getConfiguration("activestate");
        let ignored = config.get("recommendations.ignore.packages");
        let ignoredSet = new Set(ignored);
        let pkgs;
        try {
            pkgs = yield packages_1.packages();
        }
        catch (e) {
            log.debug(`Failed to retrieve installed packages, probably because no activestate.yaml file could be found.`);
            return;
        }
        let sPackages = new Set(pkgs.map(p => p.package));
        for (let req of reqs) {
            log.debug(`checking req: ${req.package}`);
            if (ignoredSet.has(req.package)) {
                log.debug(`Skipping check for package ${req.package}`);
                continue;
            }
            if (sPackages.has(req.package)) {
                log.debug(`${req.package} is already installed.`);
                continue;
            }
            let options = ["Manage Project and Dependencies", "Do not ask again"];
            let selection = yield vscode.window.showInformationMessage(`Add ${req.package} to your dependencies to use ${req.provides}.`, ...options);
            if (selection === options[1]) {
                ignoredSet.add(req.package);
                log.debug(`Do not recommend installing ${req.package} again: ${[...ignoredSet]}`);
                config.update('recommendations.ignore.packages', [...ignoredSet], vscode.ConfigurationTarget.Workspace);
            }
            if (selection !== options[0]) {
                log.debug(`User chose not to install ${req.package}.`);
                continue;
            }
            open(yield project_1.projectURL());
        }
    });
}
function setupMissingDeps(deps) {
    return __awaiter(this, void 0, void 0, function* () {
        let config = vscode.workspace.getConfiguration("activestate");
        let ignored = config.get("recommendations.ignore.extensions");
        let ignoredSet = new Set(ignored);
        for (let dep of deps) {
            log.debug(`checking ${dep.id}`);
            if (vscode.extensions.getExtension(dep.id)) {
                log.debug(`${dep.name} is already installed`);
                // check if packages need to be installed
                checkForPlatformRequirements(dep.packages);
                continue;
            }
            if (ignoredSet.has(dep.id)) {
                log.debug(`Skip recommendation to install ${dep.name}.`);
                continue;
            }
            let options = ["Check out extension", "Do not ask again"];
            let selection = yield vscode.window.showInformationMessage(`The ActiveState Platform extension works best if you install the ${dep.name} extension, would you like to check it out?`, ...options);
            if (selection === options[1]) {
                ignoredSet.add(dep.id);
                log.debug(`Do not recommend installing ${dep.id} again: ${[...ignoredSet]}`);
                config.update('recommendations.ignore.extensions', [...ignoredSet]);
            }
            if (selection !== options[0]) {
                log.debug(`User chose not to install ${dep.name}.`);
                continue;
            }
            open(`https://marketplace.visualstudio.com/items?itemName=${dep.id}`);
        }
    });
}
exports.setupMissingDeps = setupMissingDeps;
//# sourceMappingURL=dependency.js.map