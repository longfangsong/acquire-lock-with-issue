import * as core from "@actions/core";
import * as github from "@actions/github";
import {GitHub} from "@actions/github/lib/utils";

async function currentLockHolder(octokit: InstanceType<typeof GitHub>, issueId: number): Promise<number | null> {
    const {data: issue} = await octokit.issues.get({
        ...github.context.repo,
        issue_number: issueId
    });
    const currentHolder = parseInt(issue.body || "");
    if (isNaN(currentHolder)) {
        return null;
    } else {
        return currentHolder;
    }
}

(async function () {
    const autoUnlock = core.getInput("autoUnlock") == "true";
    const forceUnlockOnly = core.getInput("forceUnlockOnly") == "true";
    if (autoUnlock || forceUnlockOnly) {
        const token = core.getInput('token');
        const issueId = parseInt(core.getInput('issueId'));
        const octokit = github.getOctokit(token);
        const thisRunId = github.context.runId;
        const currentHolder = await currentLockHolder(octokit, issueId);
        if (forceUnlockOnly) {
            console.log("Force unlock ...")
        } else if (currentHolder !== thisRunId) {
            console.warn(`I'm not the holder of the lock! Current holder is ${currentHolder}, maybe someone has done something nasty.`);
        }
        octokit.issues.update({
            ...github.context.repo,
            issue_number: issueId,
            body: ""
        });
        console.log("Lock released!");
    } else {
        console.log("Not required to unlock!");
    }
})();