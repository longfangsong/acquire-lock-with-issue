"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function sleep(time) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}
function currentLockHolder(octokit, issueId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: issue } = yield octokit.issues.get(Object.assign(Object.assign({}, github.context.repo), { issue_number: issueId }));
        const currentHolder = parseInt(issue.body || "");
        if (isNaN(currentHolder)) {
            return null;
        }
        else {
            return currentHolder;
        }
    });
}
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const forceUnlockOnly = core.getInput("forceUnlockOnly") == "true";
        if (forceUnlockOnly) {
            console.log("Unlock only job, skip locking.");
        }
        else {
            const token = core.getInput('token');
            const octokit = github.getOctokit(token);
            const issueId = parseInt(core.getInput('issueId'));
            const thisRunId = github.context.runId;
            while (true) {
                let currentHolder = yield currentLockHolder(octokit, issueId);
                if (currentHolder === null) {
                    console.log(`Seems no body is holding the lock, try to acquire it...`);
                    octokit.issues.update(Object.assign(Object.assign({}, github.context.repo), { issue_number: issueId, body: thisRunId.toString() }));
                }
                else if (currentHolder === thisRunId) {
                    console.log("Seems I got the lock successfully, waiting for any possible concurrent running locker...");
                    yield sleep(10000);
                    let currentHolderAfterWait = yield currentLockHolder(octokit, issueId);
                    if (currentHolderAfterWait === thisRunId) {
                        console.log("I still have the lock! Acquire success!");
                        break;
                    }
                    else {
                        console.log("I lost the lock TAT, I'll retry ...");
                    }
                }
                else {
                    console.log(`Blocked by ${currentHolder}, wait and retry ...`);
                    yield sleep(10000 + Math.random() * 10000);
                }
            }
        }
    });
})();
