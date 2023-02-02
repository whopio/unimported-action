import * as github from '@actions/github';
import * as core from '@actions/core';
import { getIdleReport, getReport } from './report';

const reportPrefix = '[unimported]:report-comment';
const addPrefix = (report: string) =>
  `
${reportPrefix}
${report}
`.trim();

const findComment = async (
  octo: ReturnType<(typeof github)['getOctokit']>,
  issueCommon: { repo: string; owner: string; issue_number: number },
) => {
  for await (const { data: comments } of octo.paginate.iterator(
    octo.rest.issues.listComments,
    { ...issueCommon, author: 'github-actions[bot]' },
  ))
    for (const { body, id } of comments) {
      if (body && body.startsWith(reportPrefix)) return id;
    }
};

async function run() {
  try {
    const {
      payload: { pull_request: { number: issue_number } = {} },
      repo,
    } = github.context;
    if (!issue_number) return;

    const GITHUB_TOKEN = core.getInput('token', { required: true });

    const octo = github.getOctokit(GITHUB_TOKEN);
    const issueCommon = { ...repo, issue_number: issue_number };

    const commentIdPromise = findComment(octo, issueCommon);
    const dirs = core.getInput('projects').split(',');
    const reportPromise = getReport(dirs);

    let commentId = await commentIdPromise;
    const idleReport = getIdleReport(dirs);

    if (commentId) {
      await octo.rest.issues.updateComment({
        ...issueCommon,
        comment_id: commentId,
        body: addPrefix(idleReport),
      });
    } else {
      commentId = await octo.rest.issues
        .createComment({
          ...issueCommon,
          body: addPrefix(idleReport),
        })
        .then(({ data: { id } }) => id);
    }

    const { errors, report } = await reportPromise;

    await octo.rest.issues.updateComment({
      ...issueCommon,
      // this is safe to cast as a comment is created if there is none in the first
      // place when the idle comment is posted.
      comment_id: commentId as number,
      body: addPrefix(report),
    });

    if (errors) core.setFailed(`${errors} out of ${dirs.length} had errors.`);
  } catch (error: unknown) {
    if (error instanceof Error) core.setFailed(error);
    else core.setFailed('Unknown Error in run()');
  }
}

run();
