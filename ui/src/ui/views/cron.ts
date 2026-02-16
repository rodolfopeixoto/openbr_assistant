import { html, nothing } from "lit";
import type { ChannelUiMetaEntry, CronJob, CronRunLogEntry, CronStatus } from "../types";
import type { CronFormState } from "../ui-types";
import { formatMs } from "../format";
import {
  formatCronPayload,
  formatCronSchedule,
  formatCronState,
  formatNextRun,
} from "../presenter";
import { icons } from "../icons";

export type CronProps = {
  loading: boolean;
  status: CronStatus | null;
  jobs: CronJob[];
  error: string | null;
  busy: boolean;
  form: CronFormState;
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];
  runsJobId: string | null;
  runs: CronRunLogEntry[];
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
};

function buildChannelOptions(props: CronProps): string[] {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.channel?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  const seen = new Set<string>();
  return options.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function resolveChannelLabel(props: CronProps, channel: string): string {
  if (channel === "last") return "last";
  const meta = props.channelMeta?.find((entry) => entry.id === channel);
  if (meta?.label) return meta.label;
  return props.channelLabels?.[channel] ?? channel;
}

export function renderCron(props: CronProps) {
  const channelOptions = buildChannelOptions(props);
  const enabledJobs = props.jobs.filter(j => j.enabled).length;
  
  return html`
    <div class="cron-container">
      <!-- Header -->
      <div class="cron-header">
        <h1 class="cron-header__title">Scheduled Jobs</h1>
        <p class="cron-header__subtitle">Create and manage automated tasks</p>
      </div>

      <!-- Stats -->
      <div class="cron-stats">
        <div class="cron-stat">
          <div class="cron-stat__value">${props.status?.jobs ?? 0}</div>
          <div class="cron-stat__label">Total Jobs</div>
        </div>
        <div class="cron-stat">
          <div class="cron-stat__value">${enabledJobs}</div>
          <div class="cron-stat__label">Active</div>
        </div>
        <div class="cron-stat">
          <div class="cron-stat__value">${formatNextRun(props.status?.nextWakeAtMs ?? null)}</div>
          <div class="cron-stat__label">Next Run</div>
        </div>
      </div>

      <!-- New Job Wizard -->
      <div class="cron-wizard">
        <div class="cron-wizard__header">
          <div class="cron-wizard__icon">${icons.plus}</div>
          <div>
            <div class="cron-wizard__title">Create New Job</div>
            <div class="cron-wizard__subtitle">Set up a scheduled task</div>
          </div>
        </div>
        
        <div class="cron-wizard__content">
          <!-- Schedule Type Tabs -->
          <div class="cron-schedule-tabs">
            <button 
              class="cron-schedule-tab ${props.form.scheduleKind === 'every' ? 'active' : ''}"
              @click=${() => props.onFormChange({ scheduleKind: 'every' })}
            >
              Every
            </button>
            <button 
              class="cron-schedule-tab ${props.form.scheduleKind === 'at' ? 'active' : ''}"
              @click=${() => props.onFormChange({ scheduleKind: 'at' })}
            >
              At
            </button>
            <button 
              class="cron-schedule-tab ${props.form.scheduleKind === 'cron' ? 'active' : ''}"
              @click=${() => props.onFormChange({ scheduleKind: 'cron' })}
            >
              Cron
            </button>
          </div>

          <div class="cron-form-grid">
            <div class="cron-field">
              <label class="cron-field__label">Job Name</label>
              <input
                class="cron-field__input"
                .value=${props.form.name}
                @input=${(e: Event) =>
                  props.onFormChange({ name: (e.target as HTMLInputElement).value })}
                placeholder="My Scheduled Task"
              />
            </div>
            
            <div class="cron-field">
              <label class="cron-field__label">Agent</label>
              <input
                class="cron-field__input"
                .value=${props.form.agentId}
                @input=${(e: Event) =>
                  props.onFormChange({ agentId: (e.target as HTMLInputElement).value })}
                placeholder="default"
              />
            </div>
          </div>

          ${renderScheduleFields(props)}

          <div class="cron-form-grid" style="margin-top: 20px;">
            <div class="cron-field">
              <label class="cron-field__label">Session</label>
              <select
                class="cron-field__select"
                .value=${props.form.sessionTarget}
                @change=${(e: Event) =>
                  props.onFormChange({
                    sessionTarget: (e.target as HTMLSelectElement)
                      .value as CronFormState["sessionTarget"],
                  })}
              >
                <option value="main">Main</option>
                <option value="isolated">Isolated</option>
              </select>
            </div>
            
            <div class="cron-field">
              <label class="cron-field__label">Wake Mode</label>
              <select
                class="cron-field__select"
                .value=${props.form.wakeMode}
                @change=${(e: Event) =>
                  props.onFormChange({
                    wakeMode: (e.target as HTMLSelectElement).value as CronFormState["wakeMode"],
                  })}
              >
                <option value="next-heartbeat">Next Heartbeat</option>
                <option value="now">Immediately</option>
              </select>
            </div>
          </div>

          <div class="cron-field" style="margin-top: 20px;">
            <label class="cron-field__label">Payload</label>
            <select
              class="cron-field__select"
              .value=${props.form.payloadKind}
              @change=${(e: Event) =>
                props.onFormChange({
                  payloadKind: (e.target as HTMLSelectElement)
                    .value as CronFormState["payloadKind"],
                })}
              style="margin-bottom: 12px;"
            >
              <option value="systemEvent">System Event</option>
              <option value="agentTurn">Agent Turn</option>
            </select>
            
            <textarea
              class="cron-field__textarea"
              .value=${props.form.payloadText}
              @input=${(e: Event) =>
                props.onFormChange({
                  payloadText: (e.target as HTMLTextAreaElement).value,
                })}
              placeholder=${props.form.payloadKind === "systemEvent" 
                ? "System event text..." 
                : "Agent message..."}
              rows="3"
            ></textarea>
          </div>

          ${props.form.payloadKind === "agentTurn" ? renderAgentOptions(props, channelOptions) : nothing}

          <div class="cron-actions">
            <label class="cron-toggle">
              <input 
                type="checkbox" 
                class="cron-toggle__input"
                .checked=${props.form.enabled}
                @change=${(e: Event) =>
                  props.onFormChange({ enabled: (e.target as HTMLInputElement).checked })}
              />
              <span class="cron-toggle__switch"></span>
              <span class="cron-toggle__label">Enable job on create</span>
            </label>
            
            <button 
              class="cron-btn cron-btn--primary" 
              ?disabled=${props.busy} 
              @click=${props.onAdd}
              style="margin-left: auto;"
            >
              ${props.busy ? icons.loader : icons.plus} ${props.busy ? "Creating..." : "Create Job"}
            </button>
          </div>

          ${props.error ? html`
            <div class="cron-field__error" style="margin-top: 16px;">
              ${icons.alertCircle} ${props.error}
            </div>
          ` : nothing}
        </div>
      </div>

      <!-- Jobs List -->
      ${renderJobsList(props)}

      <!-- Run History -->
      ${renderRunHistory(props)}
    </div>
  `;
}

function renderScheduleFields(props: CronProps) {
  const form = props.form;
  
  if (form.scheduleKind === "at") {
    return html`
      <div class="cron-field" style="margin-top: 20px;">
        <label class="cron-field__label">Run At</label>
        <input
          class="cron-field__input"
          type="datetime-local"
          .value=${form.scheduleAt}
          @input=${(e: Event) =>
            props.onFormChange({
              scheduleAt: (e.target as HTMLInputElement).value,
            })}
        />
      </div>
    `;
  }
  
  if (form.scheduleKind === "every") {
    return html`
      <div class="cron-form-grid" style="margin-top: 20px;">
        <div class="cron-field">
          <label class="cron-field__label">Every</label>
          <input
            class="cron-field__input"
            .value=${form.everyAmount}
            @input=${(e: Event) =>
              props.onFormChange({
                everyAmount: (e.target as HTMLInputElement).value,
              })}
            placeholder="5"
          />
        </div>
        <div class="cron-field">
          <label class="cron-field__label">Unit</label>
          <select
            class="cron-field__select"
            .value=${form.everyUnit}
            @change=${(e: Event) =>
              props.onFormChange({
                everyUnit: (e.target as HTMLSelectElement).value as CronFormState["everyUnit"],
              })}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>
    `;
  }
  
  return html`
    <div class="cron-form-grid" style="margin-top: 20px;">
      <div class="cron-field">
        <label class="cron-field__label">Cron Expression</label>
        <input
          class="cron-field__input"
          .value=${form.cronExpr}
          @input=${(e: Event) =>
            props.onFormChange({ cronExpr: (e.target as HTMLInputElement).value })}
          placeholder="0 9 * * 1-5"
        />
        <div class="cron-field__hint">Format: minute hour day month weekday</div>
      </div>
      
      <div class="cron-field">
        <label class="cron-field__label">Timezone (optional)</label>
        <input
          class="cron-field__input"
          .value=${form.cronTz}
          @input=${(e: Event) =>
            props.onFormChange({ cronTz: (e.target as HTMLInputElement).value })}
          placeholder="America/New_York"
        />
      </div>
    </div>
  `;
}

function renderAgentOptions(props: CronProps, channelOptions: string[]) {
  return html`
    <div class="cron-form-grid" style="margin-top: 20px;">
      <div class="cron-field">
        <label class="cron-toggle">
          <input 
            type="checkbox" 
            class="cron-toggle__input"
            .checked=${props.form.deliver}
            @change=${(e: Event) =>
              props.onFormChange({ deliver: (e.target as HTMLInputElement).checked })}
          />
          <span class="cron-toggle__switch"></span>
          <span class="cron-toggle__label">Deliver to channel</span>
        </label>
      </div>
      
      ${props.form.deliver ? html`
        <div class="cron-field">
          <label class="cron-field__label">Channel</label>
          <select
            class="cron-field__select"
            .value=${props.form.channel || "last"}
            @change=${(e: Event) =>
              props.onFormChange({
                channel: (e.target as HTMLSelectElement)
                  .value as CronFormState["channel"],
              })}
          >
            ${channelOptions.map(
              (channel) =>
                html`<option value=${channel}>${resolveChannelLabel(props, channel)}</option>`,
            )}
          </select>
        </div>
        
        <div class="cron-field">
          <label class="cron-field__label">To</label>
          <input
            class="cron-field__input"
            .value=${props.form.to}
            @input=${(e: Event) =>
              props.onFormChange({ to: (e.target as HTMLInputElement).value })}
            placeholder="+1555... or chat id"
          />
        </div>
        
        <div class="cron-field">
          <label class="cron-field__label">Timeout (seconds)</label>
          <input
            class="cron-field__input"
            .value=${props.form.timeoutSeconds}
            @input=${(e: Event) =>
              props.onFormChange({
                timeoutSeconds: (e.target as HTMLInputElement).value,
              })}
            placeholder="30"
          />
        </div>
        
        ${props.form.sessionTarget === "isolated" ? html`
          <div class="cron-field">
            <label class="cron-field__label">Post to Main Prefix</label>
            <input
              class="cron-field__input"
              .value=${props.form.postToMainPrefix}
              @input=${(e: Event) =>
                props.onFormChange({
                  postToMainPrefix: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
        ` : nothing}
      ` : nothing}
    </div>
  `;
}

function renderJobsList(props: CronProps) {
  if (props.jobs.length === 0) {
    return html`
      <div class="cron-empty" style="margin-top: 32px;">
        <div class="cron-empty__icon">${icons.clock}</div>
        <div class="cron-empty__title">No jobs yet</div>
        <div class="cron-empty__desc">Create your first scheduled job above</div>
      </div>
    `;
  }

  return html`
    <div class="cron-jobs">
      <div class="cron-jobs__header">
        <h2 class="cron-jobs__title">Your Jobs</h2>
        <span class="cron-jobs__count">${props.jobs.length}</span>
      </div>
      
      <div class="cron-job-list">
        ${props.jobs.map((job) => renderJob(job, props))}
      </div>
    </div>
  `;
}

function renderJob(job: CronJob, props: CronProps) {
  const isSelected = props.runsJobId === job.id;
  
  return html`
    <div class="cron-job ${isSelected ? 'selected' : ''}" @click=${() => props.onLoadRuns(job.id)}>
      <div class="cron-job__status ${job.enabled ? 'enabled' : 'disabled'}"></div>
      
      <div class="cron-job__info">
        <div class="cron-job__name">${job.name}</div>
        <div class="cron-job__schedule">${formatCronSchedule(job)}</div>
        
        <div class="cron-job__meta">
          <span class="cron-job__badge">${job.enabled ? '● Enabled' : '○ Disabled'}</span>
          <span class="cron-job__badge">${job.sessionTarget}</span>
          ${job.agentId ? html`<span class="cron-job__badge">Agent: ${job.agentId}</span>` : nothing}
        </div>
      </div>
      
      <div class="cron-job__actions">
        <button
          class="cron-job__action"
          ?disabled=${props.busy}
          @click=${(event: Event) => {
            event.stopPropagation();
            props.onToggle(job, !job.enabled);
          }}
          title=${job.enabled ? "Disable" : "Enable"}
        >
          ${job.enabled ? icons.pause : icons.play}
        </button>
        
        <button
          class="cron-job__action"
          ?disabled=${props.busy}
          @click=${(event: Event) => {
            event.stopPropagation();
            props.onRun(job);
          }}
          title="Run now"
        >
          ${icons.play}
        </button>
        
        <button
          class="cron-job__action"
          ?disabled=${props.busy}
          @click=${(event: Event) => {
            event.stopPropagation();
            props.onLoadRuns(job.id);
          }}
          title="View runs"
        >
          ${icons.history}
        </button>
        
        <button
          class="cron-job__action danger"
          ?disabled=${props.busy}
          @click=${(event: Event) => {
            event.stopPropagation();
            props.onRemove(job);
          }}
          title="Remove"
        >
          ${icons.trash}
        </button>
      </div>
    </div>
  `;
}

function renderRunHistory(props: CronProps) {
  if (!props.runsJobId) {
    return nothing;
  }

  const selectedJob = props.jobs.find(j => j.id === props.runsJobId);
  
  return html`
    <div class="cron-history">
      <div class="cron-history__header">
        <div class="cron-history__title">
          Run History <span class="cron-history__job-name">${selectedJob?.name ?? props.runsJobId}</span>
        </div>
        <button class="cron-btn cron-btn--secondary" @click=${() => props.onLoadRuns('')} >
          ${icons.x} Close
        </button>
      </div>
      
      <div class="cron-history__list">
        ${props.runs.length === 0 
          ? html`
            <div class="cron-empty" style="padding: 32px;">
              <div class="cron-empty__desc">No runs yet</div>
            </div>
          `
          : props.runs.map((entry) => renderRun(entry))
        }
      </div>
    </div>
  `;
}

function renderRun(entry: CronRunLogEntry) {
  const isSuccess = entry.status === "ok";
  
  return html`
    <div class="cron-run">
      <div class="cron-run__status ${isSuccess ? 'success' : 'error'}"></div>
      
      <div class="cron-run__info">
        <div class="cron-run__summary">${entry.summary ?? entry.status}</div>
        ${entry.error ? html`<div class="cron-run__error">${entry.error}</div>` : nothing}
      </div>
      
      <div class="cron-run__meta">
        <div class="cron-run__time">${formatMs(entry.ts)}</div>
        <div class="cron-run__duration">${entry.durationMs ?? 0}ms</div>
      </div>
    </div>
  `;
}
