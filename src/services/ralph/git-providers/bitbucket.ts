/**
 * Bitbucket Provider Implementation
 * Supports Bitbucket Cloud (bitbucket.org)
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

const log = createSubsystemLogger("ralph:bitbucket");

export class BitbucketProvider implements GitProvider {
  readonly name = "bitbucket" as const;
  private token: string | null = null;
  private username: string = "";
  private baseUrl = "https://api.bitbucket.org/2.0";
  private workspace: string = "";
  private repoSlug: string = "";

  async authenticate(credentials: GitCredentials): Promise<GitAuthToken> {
    log.info("Authenticating with Bitbucket");

    if (credentials.type === "pat" && credentials.token) {
      this.token = credentials.token;
      this.username = credentials.username || "";

      // Validate token
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Bitbucket authentication failed: ${error}`);
      }

      const user = await response.json();
      this.username = user.username;
      log.info(`Authenticated as ${user.username}`);

      return {
        token: this.token,
        type: "bearer",
      };
    }

    if (credentials.type === "oauth" && credentials.oauth) {
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
          Authorization: `Bearer ${this.token}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  setRepository(repoUrl: string): void {
    // Parse URL like: https://bitbucket.org/workspace/repo.git
    const match = repoUrl.match(/bitbucket\.org\/([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    this.workspace = match[1];
    this.repoSlug = match[2];
    log.info(`Set repository to ${this.workspace}/${this.repoSlug}`);
  }

  async createBranch(name: string, base: string): Promise<void> {
    log.info(`Creating branch ${name} from ${base}`);

    // In Bitbucket, branches are created via refs API
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/refs/branches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          target: {
            hash: `refs/heads/${base}`,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create branch: ${error}`);
    }

    log.info(`Branch ${name} created successfully`);
  }

  async deleteBranch(name: string): Promise<void> {
    log.info(`Deleting branch ${name}`);

    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/refs/branches/${name}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
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
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/refs/branches?pagelen=100`,
      {
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get branches: ${await response.text()}`);
    }

    const data = await response.json();

    return data.values.map((b: BitbucketBranch) => ({
      name: b.name,
      sha: b.target.hash,
      protected: false, // Bitbucket doesn't have a simple protection API
      default: false,
    }));
  }

  async getCommits(branch: string, limit: number = 30): Promise<GitCommit[]> {
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/commits/${branch}?pagelen=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get commits: ${await response.text()}`);
    }

    const data = await response.json();

    return data.values.map((c: BitbucketCommit) => ({
      sha: c.hash,
      message: c.message,
      author: {
        name: c.author.raw.split("<")[0].trim(),
        email: c.author.raw.match(/<(.+)>/)?.[1] || "",
        date: new Date(c.date),
      },
      committer: {
        name: c.author.raw.split("<")[0].trim(),
        email: c.author.raw.match(/<(.+)>/)?.[1] || "",
        date: new Date(c.date),
      },
      parents: c.parents?.map((p: { hash: string }) => p.hash) || [],
    }));
  }

  async getCommit(sha: string): Promise<GitCommit> {
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/commit/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get commit: ${await response.text()}`);
    }

    const c = await response.json();

    return {
      sha: c.hash,
      message: c.message,
      author: {
        name: c.author.raw.split("<")[0].trim(),
        email: c.author.raw.match(/<(.+)>/)?.[1] || "",
        date: new Date(c.date),
      },
      committer: {
        name: c.author.raw.split("<")[0].trim(),
        email: c.author.raw.match(/<(.+)>/)?.[1] || "",
        date: new Date(c.date),
      },
      parents: c.parents?.map((p: { hash: string }) => p.hash) || [],
    };
  }

  async createPR(params: CreatePRParams): Promise<PullRequest> {
    log.info(`Creating PR: ${params.title}`);

    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: params.title,
          description: params.body,
          source: {
            branch: {
              name: params.head,
            },
          },
          destination: {
            branch: {
              name: params.base,
            },
          },
          close_source_branch: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create PR: ${await response.text()}`);
    }

    const pr = await response.json();

    log.info(`PR created: #${pr.id}`);

    return this.mapPR(pr);
  }

  async getPR(number: number): Promise<PullRequest> {
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${number}`,
      {
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
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
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${number}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: params.title,
          description: params.body,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update PR: ${await response.text()}`);
    }

    const pr = await response.json();
    return this.mapPR(pr);
  }

  async mergePR(number: number, _method: MergeMethod = "squash"): Promise<void> {
    log.info(`Merging PR #${number}`);

    // Bitbucket uses merge endpoint
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${number}/merge`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          close_source_branch: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to merge PR: ${await response.text()}`);
    }

    log.info(`PR #${number} merged successfully`);
  }

  async closePR(number: number): Promise<void> {
    log.info(`Declining PR #${number}`);

    // Bitbucket uses "decline" instead of close
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${number}/decline`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to decline PR: ${await response.text()}`);
    }

    log.info(`PR #${number} declined`);
  }

  async listPRs(state: "open" | "closed" | "all" = "open"): Promise<PullRequest[]> {
    const stateParam = state === "all" ? "" : `?state=${state}`;

    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pullrequests${stateParam}`,
      {
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list PRs: ${await response.text()}`);
    }

    const data = await response.json();
    return data.values.map((pr: BitbucketPR) => this.mapPR(pr));
  }

  async runPipeline(name: string, branch: string): Promise<PipelineRun> {
    log.info(`Triggering pipeline for ${name} on ${branch}`);

    // Bitbucket Pipelines - trigger via pipeline config
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pipelines/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: {
            type: "pipeline_ref_target",
            ref_type: "branch",
            ref_name: branch,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to run pipeline: ${await response.text()}`);
    }

    const pipeline = await response.json();

    return {
      id: String(pipeline.uuid),
      status: this.mapPipelineStatus(pipeline.state.name),
      url: pipeline.links?.html?.href || "",
      startedAt: new Date(pipeline.created_on),
    };
  }

  async getPipelineStatus(runId: string): Promise<PipelineStatus> {
    // Bitbucket uses UUIDs for pipelines, need to handle differently
    const response = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${this.repoSlug}/pipelines/${runId}`,
      {
        headers: {
          Authorization: `Bearer ${this.token || ""}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get pipeline status: ${await response.text()}`);
    }

    const pipeline = await response.json();
    return this.mapPipelineStatus(pipeline.state.name);
  }

  private mapPR(pr: BitbucketPR): PullRequest {
    return {
      number: pr.id,
      title: pr.title,
      body: pr.description || "",
      state: pr.state === "MERGED" || pr.state === "DECLINED" ? "closed" : "open",
      merged: pr.state === "MERGED",
      draft: false, // Bitbucket doesn't have draft PRs
      head: {
        ref: pr.source.branch.name,
        sha: pr.source.commit.hash,
      },
      base: {
        ref: pr.destination.branch.name,
        sha: pr.destination.commit.hash,
      },
      author: {
        login: pr.author.username,
      },
      labels: [],
      url: pr.links?.html?.href || "",
      createdAt: new Date(pr.created_on),
      updatedAt: new Date(pr.updated_on),
      mergedAt: pr.state === "MERGED" ? new Date(pr.updated_on) : undefined,
      ciStatus: this.getCIStatus(pr),
    };
  }

  private getCIStatus(pr: BitbucketPR): "pending" | "success" | "failure" | "error" {
    // Check if build info is available
    if (!pr.build_info) {
      return "pending";
    }

    const status = pr.build_info.state;

    switch (status) {
      case "SUCCESSFUL":
        return "success";
      case "FAILED":
        return "failure";
      case "INPROGRESS":
      case "PENDING":
        return "pending";
      default:
        return "error";
    }
  }

  private mapPipelineStatus(state: string): PipelineStatus {
    switch (state) {
      case "IN_PROGRESS":
        return "running";
      case "COMPLETED":
      case "SUCCESSFUL":
        return "success";
      case "FAILED":
        return "failure";
      case "HALTED":
      case "STOPPED":
        return "cancelled";
      case "PENDING":
        return "pending";
      default:
        return "pending";
    }
  }
}

// Bitbucket API types
interface BitbucketBranch {
  name: string;
  target: { hash: string };
}

interface BitbucketCommit {
  hash: string;
  message: string;
  author: { raw: string };
  date: string;
  parents?: { hash: string }[];
}

interface BitbucketPR {
  id: number;
  title: string;
  description?: string;
  state: string;
  source: {
    branch: { name: string };
    commit: { hash: string };
  };
  destination: {
    branch: { name: string };
    commit: { hash: string };
  };
  author: { username: string };
  links?: {
    html?: { href: string };
  };
  created_on: string;
  updated_on: string;
  build_info?: {
    state: string;
  };
}
