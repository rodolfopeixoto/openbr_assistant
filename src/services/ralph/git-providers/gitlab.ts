/**
 * GitLab Provider Implementation
 * Supports GitLab.com and self-hosted GitLab instances
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

const log = createSubsystemLogger("ralph:gitlab");

export class GitLabProvider implements GitProvider {
  readonly name = "gitlab" as const;
  private token: string | null = null;
  private baseUrl = "https://gitlab.com/api/v4";
  private projectId: string = "";

  async authenticate(credentials: GitCredentials): Promise<GitAuthToken> {
    log.info("Authenticating with GitLab");

    if (credentials.type === "pat" && credentials.token) {
      this.token = credentials.token;

      // Validate token
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          "PRIVATE-TOKEN": this.token,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitLab authentication failed: ${error}`);
      }

      const user = await response.json();
      log.info(`Authenticated as ${user.username}`);

      return {
        token: this.token,
        type: "token",
      };
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
          "PRIVATE-TOKEN": this.token,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  setProject(projectPath: string): void {
    // Encode project path for API (e.g., "group/project" becomes "group%2Fproject")
    this.projectId = encodeURIComponent(projectPath);
    log.info(`Set project to ${projectPath}`);
  }

  async createBranch(name: string, base: string): Promise<void> {
    log.info(`Creating branch ${name} from ${base}`);

    // Get base branch ref
    const baseResponse = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/repository/branches/${base}`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!baseResponse.ok) {
      throw new Error(`Failed to get base branch: ${await baseResponse.text()}`);
    }

    const baseData = await baseResponse.json();
    const _baseSha = baseData.commit.id;

    // Create new branch
    const createResponse = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/repository/branches`,
      {
        method: "POST",
        headers: {
          "PRIVATE-TOKEN": this.token || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: name,
          ref: base,
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
      `${this.baseUrl}/projects/${this.projectId}/repository/branches/${name}`,
      {
        method: "DELETE",
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete branch: ${await response.text()}`);
    }

    log.info(`Branch ${name} deleted`);
  }

  async getBranches(): Promise<GitBranch[]> {
    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/repository/branches?per_page=100`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get branches: ${await response.text()}`);
    }

    const branches = await response.json();

    return branches.map((b: GitLabBranch) => ({
      name: b.name,
      sha: b.commit.id,
      protected: b.protected,
      default: b.default,
    }));
  }

  async getCommits(branch: string, limit: number = 30): Promise<GitCommit[]> {
    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/repository/commits?ref_name=${branch}&per_page=${limit}`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get commits: ${await response.text()}`);
    }

    const commits = await response.json();

    return commits.map((c: GitLabCommit) => ({
      sha: c.id,
      message: c.message,
      author: {
        name: c.author_name,
        email: c.author_email,
        date: new Date(c.authored_date),
      },
      committer: {
        name: c.committer_name,
        email: c.committer_email,
        date: new Date(c.committed_date),
      },
      parents: c.parent_ids || [],
    }));
  }

  async getCommit(sha: string): Promise<GitCommit> {
    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/repository/commits/${sha}`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get commit: ${await response.text()}`);
    }

    const c = await response.json();

    return {
      sha: c.id,
      message: c.message,
      author: {
        name: c.author_name,
        email: c.author_email,
        date: new Date(c.authored_date),
      },
      committer: {
        name: c.committer_name,
        email: c.committer_email,
        date: new Date(c.committed_date),
      },
      parents: c.parent_ids || [],
    };
  }

  async createPR(params: CreatePRParams): Promise<PullRequest> {
    log.info(`Creating MR: ${params.title}`);

    const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/merge_requests`, {
      method: "POST",
      headers: {
        "PRIVATE-TOKEN": this.token || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        description: params.body,
        source_branch: params.head,
        target_branch: params.base,
        allow_collaboration: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create MR: ${await response.text()}`);
    }

    const mr = await response.json();

    log.info(`MR created: !${mr.iid}`);

    return this.mapMR(mr);
  }

  async getPR(number: number): Promise<PullRequest> {
    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/merge_requests/${number}`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get MR: ${await response.text()}`);
    }

    const mr = await response.json();
    return this.mapMR(mr);
  }

  async updatePR(number: number, params: Partial<CreatePRParams>): Promise<PullRequest> {
    log.info(`Updating MR !${number}`);

    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/merge_requests/${number}`,
      {
        method: "PUT",
        headers: {
          "PRIVATE-TOKEN": this.token || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: params.title,
          description: params.body,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update MR: ${await response.text()}`);
    }

    const mr = await response.json();
    return this.mapMR(mr);
  }

  async mergePR(number: number, method: MergeMethod = "squash"): Promise<void> {
    log.info(`Merging MR !${number} with method ${method}`);

    // Map merge method to GitLab format
    const squash = method === "squash";
    const shouldRemoveSourceBranch = true;

    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/merge_requests/${number}/merge`,
      {
        method: "PUT",
        headers: {
          "PRIVATE-TOKEN": this.token || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          squash_commit_message: squash ? "Squashed merge" : undefined,
          squash: squash,
          should_remove_source_branch: shouldRemoveSourceBranch,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to merge MR: ${await response.text()}`);
    }

    log.info(`MR !${number} merged successfully`);
  }

  async closePR(number: number): Promise<void> {
    log.info(`Closing MR !${number}`);

    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/merge_requests/${number}`,
      {
        method: "PUT",
        headers: {
          "PRIVATE-TOKEN": this.token || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state_event: "close",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to close MR: ${await response.text()}`);
    }

    log.info(`MR !${number} closed`);
  }

  async listPRs(state: "open" | "closed" | "all" = "open"): Promise<PullRequest[]> {
    const stateParam = state === "all" ? "all" : state;

    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/merge_requests?state=${stateParam}&per_page=100`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list MRs: ${await response.text()}`);
    }

    const mrs = await response.json();
    return mrs.map((mr: GitLabMR) => this.mapMR(mr));
  }

  async runPipeline(name: string, branch: string): Promise<PipelineRun> {
    log.info(`Triggering pipeline ${name} on ${branch}`);

    const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/pipeline`, {
      method: "POST",
      headers: {
        "PRIVATE-TOKEN": this.token || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: branch,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to run pipeline: ${await response.text()}`);
    }

    const pipeline = await response.json();

    return {
      id: String(pipeline.id),
      status: this.mapPipelineStatus(pipeline.status),
      url: pipeline.web_url,
      startedAt: new Date(pipeline.created_at),
    };
  }

  async getPipelineStatus(runId: string): Promise<PipelineStatus> {
    const response = await fetch(`${this.baseUrl}/projects/${this.projectId}/pipelines/${runId}`, {
      headers: {
        "PRIVATE-TOKEN": this.token || "",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get pipeline status: ${await response.text()}`);
    }

    const pipeline = await response.json();
    return this.mapPipelineStatus(pipeline.status);
  }

  private mapMR(mr: GitLabMR): PullRequest {
    return {
      number: mr.iid,
      title: mr.title,
      body: mr.description,
      state: mr.state === "merged" ? "closed" : (mr.state as "open" | "closed"),
      merged: mr.state === "merged",
      draft: mr.draft,
      head: {
        ref: mr.source_branch,
        sha: mr.sha || "",
      },
      base: {
        ref: mr.target_branch,
        sha: "",
      },
      author: {
        login: mr.author.username,
      },
      labels: mr.labels,
      url: mr.web_url,
      createdAt: new Date(mr.created_at),
      updatedAt: new Date(mr.updated_at),
      mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
      ciStatus: this.getCIStatus(mr),
    };
  }

  private getCIStatus(mr: GitLabMR): "pending" | "success" | "failure" | "error" {
    const pipelineStatus = mr.pipeline?.status;

    if (!pipelineStatus) {
      return "pending";
    }

    switch (pipelineStatus) {
      case "success":
        return "success";
      case "failed":
        return "failure";
      case "running":
      case "pending":
        return "pending";
      default:
        return "error";
    }
  }

  private mapPipelineStatus(status: string): PipelineStatus {
    switch (status) {
      case "created":
      case "pending":
        return "pending";
      case "running":
        return "running";
      case "success":
        return "success";
      case "failed":
        return "failure";
      case "canceled":
      case "skipped":
        return "cancelled";
      default:
        return "pending";
    }
  }
}

// GitLab API types
interface GitLabBranch {
  name: string;
  commit: { id: string };
  protected: boolean;
  default: boolean;
}

interface GitLabCommit {
  id: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  parent_ids: string[];
}

interface GitLabMR {
  iid: number;
  title: string;
  description: string;
  state: string;
  draft: boolean;
  source_branch: string;
  target_branch: string;
  sha?: string;
  author: { username: string };
  labels: string[];
  web_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  merge_status: string;
  pipeline?: {
    status: string;
  };
}
