import { exec as _exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
const exec = promisify(_exec);

const runUnimported = async (dir: string) => {
  try {
    await exec(`npx unimported`, { cwd: join(process.cwd(), dir) });
    return {
      success: true,
    };
  } catch (e: any) {
    if (!e) throw e;
    if ('stderr' in e && 'stdout' in e)
      return {
        success: false,
        stderr: e.stderr,
        stdout: e.stdout,
      };
    else throw e;
  }
};

export const getIdleReport = (dirs: string[]) =>
  `
## Unimported Action report
### Summary
${getReportTable(dirs.map((dir) => ({ dir })))}
`.trim();

const getErrorDetails = (title: string, files: string[]) =>
  `
<details><summary>${title} (${files.length})</summary>
<ul>
${files.map((file) => `<li>${file}</li>`).join('\n')}
</ul>
</details>
`.trim();

type ReportData = {
  entry: string[];
  unusedDependencies?: string[];
  unimportedFiles?: string[];
  unresolvedImports?: string[];
};

const getErrorReport = (dir: string, data: ReportData) =>
  `
<details><summary>${dir}</summary>
<ul>
<br>
<details><summary>Entrypoints (${data.entry.length})</summary>
<ul>
${data.entry.map((entry) => `<li>${entry}</li>`).join('\n')}
</ul>
</details>
${[
  data.unusedDependencies
    ? getErrorDetails('Unused dependencies', data.unusedDependencies)
    : '',
  data.unresolvedImports
    ? getErrorDetails('Unresolved imports', data.unresolvedImports)
    : '',
  data.unimportedFiles
    ? getErrorDetails('Unimported files', data.unimportedFiles)
    : '',
]
  .filter(Boolean)
  .join('\n')}
</ul>
</details>
`.trim();

const parseItems = (items: string[]) => {
  const result: string[] = [];
  for (const item of items) {
    if (/^\s*\d+ | /.test(item)) {
      const [, ...fileParts] = item.split('│ ');
      result.push(fileParts.join('│ '));
    }
  }
  return result;
};

const parseError = (stdout: string) => {
  const [entryString, ...rest] = stdout.split('\n\n\n');
  const entries: string[] = [];
  for (const entry of entryString.split('\n')) {
    if (/^\s*entry file \d+\s*:/.test(entry)) {
      const [, ...rest] = entry.split(':');
      entries.push(rest.join(':'));
    }
  }
  let unusedDependencies: string[] | undefined = undefined;
  let unimportedFiles: string[] | undefined = undefined;
  let unresolvedImports: string[] | undefined = undefined;
  for (const item of rest) {
    const [, title, , ...listItems] = item.split('\n');
    if (title.includes('unimported files')) {
      unimportedFiles = parseItems(listItems);
    } else if (title.includes('unused dependencies')) {
      unusedDependencies = parseItems(listItems);
    } else if (title.includes('unresolved imports')) {
      unresolvedImports = parseItems(listItems);
    }
  }
  return {
    entry: entries,
    unusedDependencies,
    unimportedFiles,
    unresolvedImports,
  };
};

type ReportTableInput = {
  dir: string;
  status?: string;
  unused?: number;
  unresolved?: number;
  unimported?: number;
};

const getReportTable = (inputs: ReportTableInput[]) =>
  `
| Project | Status | Unused Deps | Unresolved Deps | Unimported Files |
| :--- | :----- | :------ | :------- | :------ |
${inputs
  .map(({ dir, status, unused, unresolved, unimported }) =>
    `
| ${dir} | ${status || '🔄'} | ${unused || '-'} | ${unresolved || '-'} | ${
      unimported || '-'
    } |
`.trim(),
  )
  .join('\n')}
`.trim();

export const getReport = async (check: string[]) => {
  let err = 0;
  const reports = await Promise.all(
    check.map(async (dir) => {
      const { stdout } = await runUnimported(dir);
      if (stdout) {
        err++;
        const errorData = parseError(stdout);
        return { report: getErrorReport(dir, errorData), errorData, dir };
      } else {
        return { report: '', dir };
      }
    }),
  );
  return {
    errors: err,
    report:
      '## Unimported Action report\n' +
      '### Summary\n' +
      getReportTable(
        reports.map(({ dir, errorData }) => {
          if (!errorData) return { dir, status: '✅' };
          else
            return {
              dir,
              status: '❌',
              unused: errorData.unusedDependencies?.length || 0,
              unimported: errorData.unimportedFiles?.length || 0,
              unresolved: errorData.unresolvedImports?.length || 0,
            };
        }),
      ) +
      (err
        ? '\n### Error Details\n' +
          reports
            .map(({ report }) => report)
            .filter(Boolean)
            .join('\n')
        : ''),
  };
};
