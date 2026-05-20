export const syncManagedLabel = 'sync:backlog';
export const milestoneDescriptionPrefix = 'Imported from ';

export function milestoneDescription(sourcePath) {
  return `${milestoneDescriptionPrefix}${sourcePath}`;
}

export function milestoneSourceFromDescription(description = '') {
  return description.startsWith(milestoneDescriptionPrefix)
    ? description.slice(milestoneDescriptionPrefix.length).trim()
    : '';
}

export function taskIdFromIssue(issue) {
  const bodyTaskId = taskIdFromIssueBody(issue);
  if (bodyTaskId) return bodyTaskId;
  const titleMatch = String(issue.title || '').match(/^\[(M\d+(?:\.\d+)*\.T\d+)\]/);
  return titleMatch ? titleMatch[1] : '';
}

export function taskIdFromIssueBody(issue) {
  const bodyMatch = String(issue.body || '').match(/^Task ID:\s+(M\d+(?:\.\d+)*\.T\d+)/m);
  return bodyMatch ? bodyMatch[1] : '';
}

export function sourcePathFromIssue(issue) {
  const match = String(issue.body || '').match(/^Source:\s+`([^`]+)`/m);
  return match ? match[1].trim() : '';
}

function labelName(label) {
  return typeof label === 'string' ? label : label.name;
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function hasLabel(issue, name) {
  return (issue.labels || []).map(labelName).includes(name);
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function pushMapValue(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function error(code, message, details = {}) {
  return { code, message, details };
}

function summarize(operations, errors, warnings = []) {
  return {
    errors: errors.length,
    warnings: warnings.length,
    createLabels: operations.labels.filter((item) => item.action === 'createLabel').length,
    updateLabels: operations.labels.filter((item) => item.action === 'updateLabel').length,
    createMilestones: operations.milestones.filter((item) => item.action === 'createMilestone').length,
    updateMilestones: operations.milestones.filter((item) => item.action === 'updateMilestone').length,
    createIssues: operations.issues.filter((item) => item.action === 'createIssue').length,
    updateIssues: operations.issues.filter((item) => item.action === 'updateIssue').length,
  };
}

function buildDesiredMaps(backlog, errors) {
  const milestonesBySource = new Map();
  const milestonesByTitle = new Map();
  const issuesByTaskId = new Map();

  for (const milestone of backlog.milestones || []) {
    const desired = {
      ...milestone,
      description: milestoneDescription(milestone.sourcePath),
    };
    if (milestonesBySource.has(desired.sourcePath)) {
      errors.push(error('DUPLICATE_BACKLOG_MILESTONE_SOURCE', `Duplicate backlog milestone source: ${desired.sourcePath}`, {
        sourcePath: desired.sourcePath,
      }));
    }
    if (milestonesByTitle.has(desired.title)) {
      errors.push(error('DUPLICATE_BACKLOG_MILESTONE_TITLE', `Duplicate backlog milestone title: ${desired.title}`, {
        title: desired.title,
      }));
    }
    milestonesBySource.set(desired.sourcePath, desired);
    milestonesByTitle.set(desired.title, desired);
  }

  for (const issue of backlog.issues || []) {
    if (issuesByTaskId.has(issue.taskId)) {
      errors.push(error('DUPLICATE_BACKLOG_TASK_ID', `Duplicate backlog task id: ${issue.taskId}`, {
        taskId: issue.taskId,
      }));
    }
    issuesByTaskId.set(issue.taskId, issue);
  }

  return { milestonesBySource, milestonesByTitle, issuesByTaskId };
}

function mappedTaskByIssueNumber(githubIssueMap, errors) {
  const map = new Map();
  for (const [taskId, issueNumber] of Object.entries(githubIssueMap.taskIssues || {})) {
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
      errors.push(error('INVALID_GITHUB_MAP_ISSUE_NUMBER', `GitHub issue map has invalid issue number for ${taskId}`, {
        taskId,
        issueNumber,
      }));
      continue;
    }

    if (map.has(issueNumber)) {
      errors.push(error('DUPLICATE_GITHUB_MAP_ISSUE_NUMBER', `GitHub issue map assigns issue #${issueNumber} to multiple task ids`, {
        number: issueNumber,
        taskIds: [map.get(issueNumber), taskId],
      }));
      continue;
    }
    map.set(issueNumber, taskId);
  }
  return map;
}

function buildGithubMaps(github, desired, errors, warnings, githubIssueMap = {}) {
  const milestonesBySource = new Map();
  const milestonesByTitle = new Map();
  const issuesByTaskId = new Map();
  const labelsByName = new Map();
  const taskByMappedIssueNumber = mappedTaskByIssueNumber(githubIssueMap, errors);
  const foundMappedIssueNumbers = new Set();

  for (const milestone of github.milestones || []) {
    pushMapValue(milestonesByTitle, milestone.title, milestone);
    const sourcePath = milestoneSourceFromDescription(milestone.description || '');
    pushMapValue(milestonesBySource, sourcePath, milestone);
  }

  for (const [sourcePath, milestones] of milestonesBySource) {
    if (!sourcePath) continue;
    if (milestones.length > 1) {
      errors.push(error('DUPLICATE_GITHUB_MILESTONE_SOURCE', `Multiple GitHub milestones map to ${sourcePath}`, {
        sourcePath,
        numbers: milestones.map((item) => item.number),
      }));
    }
  }

  for (const milestone of desired.milestonesBySource.values()) {
    const sourceMatches = milestonesBySource.get(milestone.sourcePath) || [];
    if (sourceMatches.length === 0) {
      const titleMatches = milestonesByTitle.get(milestone.title) || [];
      if (titleMatches.length > 0) {
        errors.push(error('MILESTONE_TITLE_COLLISION', `GitHub milestone title exists without matching source path: ${milestone.title}`, {
          title: milestone.title,
          sourcePath: milestone.sourcePath,
          numbers: titleMatches.map((item) => item.number),
        }));
      }
    }
  }

  for (const issue of github.issues || []) {
    const mappedTaskId = taskByMappedIssueNumber.get(issue.number);
    const taskId = taskIdFromIssue(issue);

    if (mappedTaskId) {
      foundMappedIssueNumbers.add(issue.number);
      const desiredIssue = desired.issuesByTaskId.get(mappedTaskId);
      if (!desiredIssue) {
        errors.push(error('ORPHAN_MAPPED_GITHUB_ISSUE', `GitHub issue map references a task id not present in backlog: ${mappedTaskId}`, {
          taskId: mappedTaskId,
          number: issue.number,
          title: issue.title,
        }));
        continue;
      }
      const bodyTaskId = taskIdFromIssueBody(issue);
      if (bodyTaskId !== mappedTaskId) {
        errors.push(error('MAPPED_ISSUE_TASK_ID_DRIFT', `GitHub issue #${issue.number} body maps to ${bodyTaskId || '(missing)'}, but github-map.json maps it to ${mappedTaskId}`, {
          issueTaskId: bodyTaskId || '',
          mappedTaskId,
          number: issue.number,
        }));
        continue;
      }
      const sourcePath = sourcePathFromIssue(issue);
      if (sourcePath !== desiredIssue.sourcePath) {
        errors.push(error('MAPPED_ISSUE_SOURCE_DRIFT', `GitHub issue #${issue.number} source maps to ${sourcePath || '(missing)'}, but ${mappedTaskId} expects ${desiredIssue.sourcePath}`, {
          issueSourcePath: sourcePath || '',
          expectedSourcePath: desiredIssue.sourcePath,
          mappedTaskId,
          number: issue.number,
        }));
        continue;
      }
      pushMapValue(issuesByTaskId, mappedTaskId, issue);
      continue;
    }

    if (!taskId) continue;
    if (!hasLabel(issue, syncManagedLabel)) {
      warnings.push({
        code: 'UNMANAGED_TASK_LIKE_ISSUE',
        message: `Ignoring unmanaged GitHub issue with task-like text: ${taskId}`,
        details: {
          taskId,
          number: issue.number,
          title: issue.title,
        },
      });
      continue;
    }
    pushMapValue(issuesByTaskId, taskId, issue);
    if (!desired.issuesByTaskId.has(taskId)) {
      errors.push(error('ORPHAN_GITHUB_ISSUE', `GitHub issue references a task id not present in backlog: ${taskId}`, {
        taskId,
        number: issue.number,
        title: issue.title,
      }));
    }
  }

  for (const [issueNumber, taskId] of taskByMappedIssueNumber) {
    if (!foundMappedIssueNumbers.has(issueNumber) && desired.issuesByTaskId.has(taskId)) {
      errors.push(error('MISSING_MAPPED_GITHUB_ISSUE', `GitHub issue map references missing issue #${issueNumber} for ${taskId}`, {
        taskId,
        number: issueNumber,
      }));
    }
  }

  for (const [taskId, issues] of issuesByTaskId) {
    if (issues.length > 1) {
      errors.push(error('DUPLICATE_GITHUB_TASK_ID', `Multiple GitHub issues map to ${taskId}`, {
        taskId,
        numbers: issues.map((item) => item.number),
      }));
    }
  }

  for (const label of github.labels || []) {
    labelsByName.set(label.name, label);
  }

  return { milestonesBySource, milestonesByTitle, issuesByTaskId, labelsByName };
}

export function planGithubBacklogSync({ backlog, github, githubIssueMap = {} }) {
  const errors = [];
  const warnings = [];
  const operations = {
    labels: [],
    milestones: [],
    issues: [],
  };

  const desired = buildDesiredMaps(backlog, errors);
  const syncOwnedLabels = new Set((backlog.labels || []).map((label) => label.name));
  const existing = buildGithubMaps(github, desired, errors, warnings, githubIssueMap);

  if (errors.length) {
    return {
      ok: false,
      errors,
      warnings,
      syncOwnedLabels: [...syncOwnedLabels].sort((a, b) => a.localeCompare(b)),
      operations,
      summary: summarize(operations, errors, warnings),
    };
  }

  for (const label of backlog.labels || []) {
    const existingLabel = existing.labelsByName.get(label.name);
    if (!existingLabel) {
      operations.labels.push({
        action: 'createLabel',
        name: label.name,
        color: label.color,
        description: label.description,
      });
      continue;
    }

    const changes = {};
    if (String(existingLabel.color || '').toLowerCase() !== label.color.toLowerCase()) {
      changes.color = { from: existingLabel.color, to: label.color };
    }
    if ((existingLabel.description || '') !== label.description) {
      changes.description = { from: existingLabel.description || '', to: label.description };
    }
    if (Object.keys(changes).length > 0) {
      operations.labels.push({
        action: 'updateLabel',
        name: label.name,
        color: label.color,
        description: label.description,
        changes,
      });
    }
  }

  const milestoneNumberBySource = new Map();

  for (const desiredMilestone of desired.milestonesBySource.values()) {
    const existingMilestone = (existing.milestonesBySource.get(desiredMilestone.sourcePath) || [])[0];
    if (!existingMilestone) {
      operations.milestones.push({
        action: 'createMilestone',
        title: desiredMilestone.title,
        description: desiredMilestone.description,
        sourcePath: desiredMilestone.sourcePath,
      });
      continue;
    }

    milestoneNumberBySource.set(desiredMilestone.sourcePath, existingMilestone.number);
    const changes = {};
    if (existingMilestone.title !== desiredMilestone.title) {
      changes.title = { from: existingMilestone.title, to: desiredMilestone.title };
    }
    if ((existingMilestone.description || '') !== desiredMilestone.description) {
      changes.description = { from: existingMilestone.description || '', to: desiredMilestone.description };
    }
    if (Object.keys(changes).length > 0) {
      operations.milestones.push({
        action: 'updateMilestone',
        number: existingMilestone.number,
        title: desiredMilestone.title,
        description: desiredMilestone.description,
        sourcePath: desiredMilestone.sourcePath,
        changes,
      });
    }
  }

  for (const desiredIssue of desired.issuesByTaskId.values()) {
    const desiredMilestone = desired.milestonesByTitle.get(desiredIssue.milestone);
    if (!desiredMilestone) {
      errors.push(error('MISSING_BACKLOG_ISSUE_MILESTONE', `Backlog issue references missing milestone: ${desiredIssue.milestone}`, {
        taskId: desiredIssue.taskId,
        milestone: desiredIssue.milestone,
      }));
      continue;
    }

    const milestoneNumber = milestoneNumberBySource.get(desiredMilestone.sourcePath) || null;
    const desiredLabels = sortedUnique(desiredIssue.labels || []);
    const existingIssue = (existing.issuesByTaskId.get(desiredIssue.taskId) || [])[0];

    if (!existingIssue) {
      operations.issues.push({
        action: 'createIssue',
        taskId: desiredIssue.taskId,
        title: desiredIssue.title,
        body: desiredIssue.body,
        labels: desiredLabels,
        milestoneNumber,
        milestoneTitle: desiredIssue.milestone,
        milestoneSourcePath: desiredMilestone.sourcePath,
      });
      continue;
    }

    const currentLabels = sortedUnique((existingIssue.labels || []).map(labelName));
    const humanLabels = currentLabels.filter((name) => !syncOwnedLabels.has(name));
    const nextLabels = sortedUnique([...humanLabels, ...desiredLabels]);
    const changes = {};

    if (existingIssue.title !== desiredIssue.title) {
      changes.title = { from: existingIssue.title, to: desiredIssue.title };
    }
    if ((existingIssue.body || '') !== desiredIssue.body) {
      changes.body = true;
    }

    const existingMilestoneNumber = existingIssue.milestone?.number || null;
    const existingMilestoneTitle = existingIssue.milestone?.title || '';
    if (milestoneNumber) {
      if (existingMilestoneNumber !== milestoneNumber) {
        changes.milestone = {
          from: existingMilestoneTitle || existingMilestoneNumber,
          to: desiredIssue.milestone,
        };
      }
    } else if (existingMilestoneTitle !== desiredIssue.milestone) {
      changes.milestone = { from: existingMilestoneTitle, to: desiredIssue.milestone };
    }

    if (!sameArray(currentLabels, nextLabels)) {
      changes.labels = { from: currentLabels, to: nextLabels };
    }

    if (Object.keys(changes).length > 0) {
      operations.issues.push({
        action: 'updateIssue',
        number: existingIssue.number,
        taskId: desiredIssue.taskId,
        title: desiredIssue.title,
        body: desiredIssue.body,
        labels: nextLabels,
        milestoneNumber,
        milestoneTitle: desiredIssue.milestone,
        milestoneSourcePath: desiredMilestone.sourcePath,
        changes,
        expectedUpdatedAt: existingIssue.updated_at || null,
        desiredLabels,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    syncOwnedLabels: [...syncOwnedLabels].sort((a, b) => a.localeCompare(b)),
    operations,
    summary: summarize(operations, errors, warnings),
  };
}
