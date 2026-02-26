/**
 * GitHub Provider Implementation
 * Uses OpenClaw authentication for GitHub operations
 */

import type {
  GitProvider,
  GitCredentials,
  GitAuthToken,
  GitBranch,
  GitCommit,
  CreatePRParams,
  PullRequest,
  MergeMethod,
  PipelineRun,
  PipelineStatus,
} from "../types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:github");

export class GitHubProvider implements GitProvider {
  readonly name = "github" as const;
  private token: string | null = null;
  private baseUrl = "https://api.github.com";
  private repoOwner: string = "";
  private repoName: string = "";

  async authenticate(credentials: GitCredentials): Promise<GitAuthToken> {
    log.info("Authenticating with GitHub");

    if (credentials.type === "pat" && credentials.token) {
      this.token = credentials.token;

      // Validate token
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub authentication failed: ${error}`);
      }

      const user = await response.json();
      log.info(`Authenticated as ${user.login}`);

      return {
        token: this.token,
        type: "token",
      };
    }

    if (credentials.type === "oauth" && credentials.oauth) {
      // OAuth flow would be handled here
      // For now, require PAT
      throw new Error("OAuth not yet implemented, use PAT");
    }

    throw new Error("Invalid credentials");
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  setRepository(repoUrl: string): void {
    // Parse URL like: https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    this.repoOwner = match[1];
    this.repoName = match[2];
    log.info(`Set repository to ${this.repoOwner}/${this.repoName}`);
  }

  async createBranch(name: string, base: string): Promise<void> {
    log.info(`Creating branch ${name} from ${base}`);

    // Get the base branch SHA
    const baseResponse = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/git/refs/heads/${base}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!baseResponse.ok) {
      throw new Error(`Failed to get base branch: ${await baseResponse.text()}`);
    }

    const baseData = await baseResponse.json();
    const baseSha = baseData.object.sha;

    // Create new branch
    const createResponse = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${name}`,
          sha: baseSha,
        }),
      },
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create branch: ${error}`);
    }

    log.info(`Branch ${name} created successfully`);
  }

  async deleteBranch(name: string): Promise<void> {
    log.info(`Deleting branch ${name}`);

    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/git/refs/heads/${name}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok && response.status !== 422) {
      // 422 = already deleted
      throw new Error(`Failed to delete branch: ${await response.text()}`);
    }

    log.info(`Branch ${name} deleted`);
  }

  async getBranches(): Promise<GitBranch[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/branches?per_page=100`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get branches: ${await response.text()}`);
    }

    const branches = await response.json();

    // Get default branch
    const repoResponse = await fetch(`${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    return branches.map((b: GitHubBranch) => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected,
      default: b.name === defaultBranch,
    }));
  }

  async getCommits(branch: string, limit: number = 30): Promise<GitCommit[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/commits?sha=${branch}&per_page=${limit}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get commits: ${await response.text()}`);
    }

    const commits = await response.json();

    return commits.map((c: GitHubCommit) => ({
      sha: c.sha,
      message: c.commit.message,
      author: {
        name: c.commit.author.name,
        email: c.commit.author.email,
        date: new Date(c.commit.author.date),
      },
      committer: {
        name: c.commit.committer.name,
        email: c.commit.committer.email,
        date: new Date(c.commit.committer.date),
      },
      parents: c.parents.map((p: { sha: string }) => p.sha),
    }));
  }

  async getCommit(sha: string): Promise<GitCommit> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/commits/${sha}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get commit: ${await response.text()}`);
    }

    const c = await response.json();

    return {
      sha: c.sha,
      message: c.commit.message,
      author: {
        name: c.commit.author.name,
        email: c.commit.author.email,
        date: new Date(c.commit.author.date),
      },
      committer: {
        name: c.commit.committer.name,
        email: c.commit.committer.email,
        date: new Date(c.commit.committer.date),
      },
      parents: c.parents.map((p: { sha: string }) => p.sha),
    };
  }

  async createPR(params: CreatePRParams): Promise<PullRequest> {
    log.info(`Creating PR: ${params.title}`);

    const response = await fetch(`${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
        draft: params.draft ?? false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create PR: ${await response.text()}`);
    }

    const pr = await response.json();

    // Add labels if provided
    if (params.labels && params.labels.length > 0) {
      await fetch(
        `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/issues/${pr.number}/labels`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${this.token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ labels: params.labels }),
        },
      );
    }

    // Add reviewers if provided
    if (params.reviewers && params.reviewers.length > 0) {
      await fetch(
        `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls/${pr.number}/requested_reviewers`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${this.token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reviewers: params.reviewers }),
        },
      );
    }

    log.info(`PR created: #${pr.number}`);

    return this.mapPR(pr);
  }

  async getPR(number: number): Promise<PullRequest> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls/${number}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get PR: ${await response.text()}`);
    }

    const pr = await response.json();
    return this.mapPR(pr);
  }

  async updatePR(number: number, params: Partial<CreatePRParams>): Promise<PullRequest> {
    log.info(`Updating PR #${number}`);

    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls/${number}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          state: params.draft !== undefined ? (params.draft ? undefined : "open") : undefined,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update PR: ${await response.text()}`);
    }

    const pr = await response.json();
    return this.mapPR(pr);
  }

  async mergePR(number: number, method: MergeMethod = "squash"): Promise<void> {
    log.info(`Merging PR #${number} with method ${method}`);

    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls/${number}/merge`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merge_method: method,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to merge PR: ${await response.text()}`);
    }

    log.info(`PR #${number} merged successfully`);
  }

  async closePR(number: number): Promise<void> {
    log.info(`Closing PR #${number}`);

    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls/${number}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: "closed",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to close PR: ${await response.text()}`);
    }

    log.info(`PR #${number} closed`);
  }

  async listPRs(state: "open" | "closed" | "all" = "open"): Promise<PullRequest[]> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/pulls?state=${state}&per_page=100`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list PRs: ${await response.text()}`);
    }

    const prs = await response.json();
    return prs.map((pr: GitHubPR) => this.mapPR(pr));
  }

  async runPipeline(_name: string, _branch: string): Promise<PipelineRun> {
    // GitHub Actions - trigger workflow dispatch
    throw new Error("GitHub Actions dispatch not yet implemented");
  }

  async getPipelineStatus(_runId: string): Promise<PipelineStatus> {
    // Get workflow run status
    throw new Error("GitHub Actions status not yet implemented");
  }

  private mapPR(pr: GitHubPR): PullRequest {
    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as "open" | "closed",
      merged: pr.merged,
      draft: pr.draft,
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha,
      },
      author: {
        login: pr.user.login,
      },
      labels: pr.labels.map((l: { name: string }) => l.name),
      url: pr.html_url,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      ciStatus: this.getCIStatus(pr),
    };
  }

  private getCIStatus(pr: GitHubPR): "pending" | "success" | "failure" | "error" {
    // Check combined status
    // This is a simplified version - in production, fetch actual status
    if (pr.mergeable === false) {
      return "failure";
    }
    if (pr.mergeable === null) {
      return "pending";
    }
    return "success";
  }
}

// GitHub API types
interface GitHubBranch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
  parents: { sha: string }[];
}

interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  merged: boolean;
  draft: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string };
  labels: { name: string }[];
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  mergeable: boolean | null;
}
