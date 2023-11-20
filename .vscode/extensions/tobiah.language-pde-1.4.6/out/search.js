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
exports.openProcessingDocs = exports.prepareInput = exports.openURL = void 0;
let processingorgDocs = 'https://processing.org/reference/';
let processingorgSearchGoogle = 'https://www.google.com/search?as_sitesearch=processing.org&as_q=';
let processingorgSearchDuckDuckGo = 'https://duckduckgo.com/?q=!processing+%5C';
let p5jsDocs = 'https://p5js.org/reference/';
let p5jsSearchGoogle = 'https://www.google.com/search?as_sitesearch=p5js.org&as_q=';
let p5jsSearchDuckDuckGo = 'https://duckduckgo.com/?q=!p5+';
const vscode = require("vscode");
function openURL(search_base, s) {
    return __awaiter(this, void 0, void 0, function* () {
        if (search_base === 'open') {
            yield vscode.env.openExternal(vscode.Uri.parse(s));
        }
        else {
            const config = vscode.workspace.getConfiguration('processing');
            let processingDocs = String(config.get('docs'));
            if (!s) {
                if (processingDocs === 'p5js.org') {
                    s = p5jsDocs;
                }
                else {
                    s = processingorgDocs;
                }
            }
            else {
                let searchEngine = String(config.get('search'));
                if (searchEngine === 'DuckDuckGo') {
                    if (processingDocs === 'p5js.org') {
                        s = p5jsSearchDuckDuckGo + s;
                    }
                    else {
                        s = processingorgSearchDuckDuckGo + s;
                    }
                }
                else {
                    if (processingDocs === 'p5js.org') {
                        s = p5jsSearchGoogle + s;
                    }
                    else {
                        s = processingorgSearchGoogle + s;
                    }
                }
            }
            yield vscode.env.openExternal(vscode.Uri.parse(s));
        }
        return true;
    });
}
exports.openURL = openURL;
// Slice and Trim
function prepareInput(input, start, end) {
    // input is the whole line, part of which is selected by the user (defined by star/end)
    if (start >= end) {
        return '';
    }
    // Slice to just the selection
    input = input.slice(start, end);
    // Trim white space
    input = input.trim();
    // Possible future addition:
    // Check right here if valid variable/function name to search?
    // Everything looks good by this point, so time to open a web browser!
    return input;
}
exports.prepareInput = prepareInput;
function openProcessingDocs(input, start, end) {
    // Use the node module "opn" to open a web browser
    openURL('docs', prepareInput(input, start, end));
}
exports.openProcessingDocs = openProcessingDocs;
//# sourceMappingURL=search.js.map