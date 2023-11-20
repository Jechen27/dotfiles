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
const open = require("open");
function checkForPlatformRequirements(logger, state, reqs) {
    return __awaiter(this, void 0, void 0, function* () {
        let config = vscode.workspace.getConfiguration("activestate");
        let ignored = config.get("recommendations.ignore.packages");
        let ignoredSet = new Set(ignored);
        let packages;
        try {
            packages = yield state.packages();
        }
        catch (e) {
            logger.debug(`Failed to retrieve installed packages, probably because no activestate.yaml file could be found.`);
            return;
        }
        let sPackages = new Set(packages.map(p => p.package));
        for (let req of reqs) {
            logger.debug(`checking req: ${req.package}`);
            if (ignoredSet.has(req.package)) {
                logger.debug(`Skipping check for package ${req.package}`);
                continue;
            }
            if (sPackages.has(req.package)) {
                logger.debug(`${req.package} is already installed.`);
                continue;
            }
            let options = ["Manage Project and Dependencies", "Do not ask again"];
            let selection = yield vscode.window.showInformationMessage(`Add ${req.package} to your dependencies to use ${req.provides}.`, ...options);
            if (selection === options[1]) {
                ignoredSet.add(req.package);
                logger.debug(`Do not recommend installing ${req.package} again: ${[...ignoredSet]}`);
                config.update('recommendations.ignore.packages', [...ignoredSet], vscode.ConfigurationTarget.Workspace);
            }
            if (selection !== options[0]) {
                logger.debug(`User chose not to install ${req.package}.`);
                continue;
            }
            let projectURL = yield state.projectURL();
            open(projectURL);
        }
    });
}
function setupMissingDeps(logger, state, deps) {
    return __awaiter(this, void 0, void 0, function* () {
        let config = vscode.workspace.getConfiguration("activestate");
        let ignored = config.get("recommendations.ignore.extensions");
        let ignoredSet = new Set(ignored);
        for (let dep of deps) {
            logger.debug(`checking ${dep.id}`);
            if (vscode.extensions.getExtension(dep.id)) {
                logger.debug(`${dep.name} is already installed`);
                // check if packages need to be installed
                checkForPlatformRequirements(logger, state, dep.packages);
                continue;
            }
            if (ignoredSet.has(dep.id)) {
                logger.debug(`Skip recommendation to install ${dep.name}.`);
                continue;
            }
            let options = ["Check out extension", "Do not ask again"];
            let selection = yield vscode.window.showInformationMessage(`The ActiveState Platform extension works best if you install the ${dep.name} extension, would you like to check it out?`, ...options);
            if (selection === options[1]) {
                ignoredSet.add(dep.id);
                logger.debug(`Do not recommend installing ${dep.id} again: ${[...ignoredSet]}`);
                config.update('recommendations.ignore.extensions', [...ignoredSet]);
            }
            if (selection !== options[0]) {
                logger.debug(`User chose not to install ${dep.name}.`);
                continue;
            }
            open(`https://marketplace.visualstudio.com/items?itemName=${dep.id}`);
        }
    });
}
exports.setupMissingDeps = setupMissingDeps;
//# sourceMappingURL=dependency.js.map