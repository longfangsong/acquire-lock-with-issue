import * as core from "@actions/core";
import * as github from "@actions/github";
import {GitHub} from "@actions/github/lib/utils";


function sleep(time: number) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}

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
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);
    const issueId = parseInt(core.getInput('issueId'));
    const thisRunId = github.context.runId;
    while (true) {
        let currentHolder = await currentLockHolder(octokit, issueId);
        if (currentHolder === null) {
            console.log(`Seems no body is holding the lock, try to acquire it...`);
            octokit.issues.update({
                ...github.context.repo,
                issue_number: issueId,
                body: thisRunId.toString()
            });
        } else if (currentHolder === thisRunId) {
            console.log("Seems I got the lock successfully, waiting for any possible concurrent running locker...");
            await sleep(10000);
            let currentHolderAfterWait = await currentLockHolder(octokit, issueId);
            if (currentHolderAfterWait === thisRunId) {
                console.log("I still have the lock! Acquire success!");
                break;
            } else {
                console.log("I lost the lock TAT, I'll retry ...");
            }
        } else {
            console.log(`Blocked by ${currentHolder}, wait and retry ...`);
            await sleep(10000 + Math.random() * 10000);
        }
    }
})();
