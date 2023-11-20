"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processingTaskFilename = exports.processingCommand = exports.buildProcessingArgs = void 0;
const path = require("path");
/**
 * Dynamically build the args to pass to the `processing-java` command.
 *
 * @param base the base directory of the sketch
 */
function buildProcessingArgs(base) {
    return [
        '--force',
        `--sketch=${base}`,
        path.join(`--output=${base}`, 'out'),
        '--run'
    ];
}
exports.buildProcessingArgs = buildProcessingArgs;
exports.processingCommand = 'processing-java';
exports.processingTaskFilename = 'ProcessingTasks.json';
//# sourceMappingURL=processing-tasks.js.map