// ── Types ────────────────────────────────────────────────────────────────────

/** Configuration options for the GenClient. */
export interface GenClientOptions {
  /** API key for authentication (sent as X-API-Key header). */
  apiKey: string;
  /** Base URL for the API. Defaults to "https://api.gen.pro/v1". */
  baseUrl?: string;
  /** Base URL for the Agent Chat API. Defaults to "https://agent.gen.pro/v1". */
  agentBaseUrl?: string;
  /** Optional custom fetch implementation. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
}

// ── Generation type resolver (canonical → Rails internal) ───────────────────

const SIMPLE_TYPE_MAP: Record<string, string> = {
  text: "text_generation",
  speech_from_text: "eleven_labs",
};

const MODEL_ROUTED_TYPE_MAP: Record<string, (model: string) => string> = {
  image_from_text: (model) =>
    model === "midjourney" ? "midjourney" : "gemini_image_generation",
  video_from_text: (model) => {
    if (model.startsWith("sora")) return "sora2_video_generation";
    if (model.startsWith("kling")) return "kling";
    if (model.startsWith("seedance")) return "seedance_video_generation";
    return "gemini_video_generation";
  },
  video_from_image: (model) => {
    if (model.startsWith("kling")) return "kling_image_video";
    if (model.startsWith("sora")) return "sora2_video_generation";
    if (model.startsWith("seedance")) return "seedance_video_generation";
    return "gemini_video_generation";
  },
};

function resolveGenerationType(
  canonicalType: string,
  data?: Record<string, unknown>
): string {
  if (SIMPLE_TYPE_MAP[canonicalType]) return SIMPLE_TYPE_MAP[canonicalType];
  const router = MODEL_ROUTED_TYPE_MAP[canonicalType];
  if (router) return router(String(data?.model ?? ""));
  return canonicalType;
}

/** Error response from the GEN API. */
export class GenApiError extends Error {
  /** HTTP status code. */
  public readonly status: number;
  /** Human-readable error message from the API. */
  public readonly error: string;
  /** Machine-readable error code from the API. */
  public readonly errorCode: string;

  constructor(status: number, error: string, errorCode: string) {
    super(`GEN API Error ${status}: [${errorCode}] ${error}`);
    this.name = "GenApiError";
    this.status = status;
    this.error = error;
    this.errorCode = errorCode;
  }
}

/** Options for waitForGeneration polling. */
export interface WaitForGenerationOptions {
  /** Polling interval in milliseconds. Defaults to 2000. */
  pollIntervalMs?: number;
  /** Maximum time to wait in milliseconds. Defaults to 300000 (5 minutes). */
  timeoutMs?: number;
}

// ── Response types ───────────────────────────────────────────────────────────

export interface User {
  id: number | string;
  email: string;
  name: string;
  username: string;
  created_at: string;
}

export interface Workspace {
  id: number | string;
  name: string;
}

export interface Agent {
  id: number | string;
  name: string;
  description?: string;
  organization_id?: number | string;
  time_zone?: string;
  primary_avatar_id?: number | string;
  primary_avatar_url?: string;
  role?: string;
  default_user_voice?: UserVoice;
}

export interface UserVoice {
  id: number | string;
  name: string;
  gender: string;
  language: string;
  provider: string;
  url: string;
}

export interface Organization {
  id: number | string;
  uuid?: string;
  organization_id: number | string;
  name: string;
  avatar?: { url: string; thumbnail_url: string };
  user_role: string;
  credit: number;
  available_credit?: { generic: number; aura: number };
  total_members: number;
  credit_plan?: { id: number | string; name: string; cycle: string };
}

export interface Engine {
  id: number | string;
  title?: string;
  columns?: Column[];
  rows?: Row[];
  [key: string]: unknown;
}

export interface Row {
  id: number | string;
  position?: number;
  cells?: Cell[];
  [key: string]: unknown;
}

export interface Column {
  id: number | string;
  title: string;
  type?: string;
  position?: number;
  [key: string]: unknown;
}

export interface Cell {
  id: number | string;
  value?: string;
  [key: string]: unknown;
}

export interface Layer {
  id: number | string;
  name: string;
  type: string;
  position?: number;
  [key: string]: unknown;
}

export interface GenerationResult {
  generation_id: number | string;
  status: string;
}

export interface Generation {
  id: number | string;
  status: "pending" | "processing" | "completed" | "failed" | "stopped";
  user_job_type?: string;
  result?: string;
  output_resources?: OutputResource[];
  [key: string]: unknown;
}

export interface OutputResource {
  id: number | string;
  url: string;
  thumbnail_url?: string;
  object_type?: string;
}

export interface ContentResource {
  id: number | string;
  url: string;
  thumbnail_url?: string;
  file_name: string;
  content_type: string;
}

export interface ContentResourceDetail {
  content_resource: ContentResource;
  generator?: { id: number | string; status: string; type: string } | null;
}

// ── Parameter types ──────────────────────────────────────────────────────────

export interface CreateAgentParams {
  name: string;
  description?: string;
  time_zone?: string;
  organization_id?: string | number;
  eleven_lab_api_key?: string;
  hume_ai_api_key?: string;
}

export interface UpdateAgentParams {
  name?: string;
  description?: string;
  time_zone?: string;
  eleven_lab_api_key?: string;
  hume_ai_api_key?: string;
}

export interface UpdateOrganizationParams {
  name?: string;
}

export interface CreateColumnParams {
  title: string;
  type: string;
  position?: number;
}

export interface CreateLayerParams {
  name: string;
  type: string;
  position?: number;
}

export interface ListContentResourcesParams {
  type?: "image" | "video" | "audio" | "zip" | "safe_tensors";
  project_id?: string;
  page?: number;
}

// ── Agent Chat types ────────────────────────────────────────────────────────

export interface RunResponse {
  run_id: string;
  conversation_id: string;
  status: "running";
  firebase_path: string;
}

export interface RunStatus {
  run_id: string;
  conversation_id: string;
  status: "running" | "completed" | "failed";
  messages: Array<{ role: string; content: string }>;
}

export interface Conversation {
  id: string;
  title?: string;
  pinned?: boolean;
  agent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: number;
  idea_id: number;
  agent_id: string;
  title: string;
  hook: string;
  description: string;
  video_type: string;
  video_type_id: number;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface AgentProfile {
  identity: {
    name: string;
    description?: string;
    avatar_url?: string;
    use_character?: boolean;
    persona?: string;
  };
  voice: {
    eleven_lab_api_key?: string;
    hume_ai_api_key?: string;
    default_voice?: { id: string; name: string; provider: string };
  };
  brand: {
    brand_name?: string;
    description?: string;
    goal?: string;
    keywords?: string[];
    target_platforms?: string[];
    shortform?: boolean;
    longform?: boolean;
    linked_accounts?: Array<{ id?: number; url: string; platform: string }>;
    onboarding_status?: string;
    content_idea_preferences?: string;
  } | null;
}

export interface AgentProfileInput {
  identity?: {
    name?: string;
    description?: string;
    use_character?: boolean;
    persona?: string;
  };
  voice?: {
    eleven_lab_api_key?: string;
    hume_ai_api_key?: string;
  };
  brand?: {
    brand_name?: string;
    description?: string;
    goal?: string;
    keywords?: string[];
    target_platforms?: string[];
    shortform?: boolean;
    longform?: boolean;
    content_idea_preferences?: string;
  };
}

export interface GenerateIdeasOptions {
  numIdeas?: number;
  requirements?: string[];
  videoType?: string;
  conversationId?: string;
  message?: string;
}

// ── Agent Core (GEN-2755) ───────────────────────────────────────────────────

export type VoiceSource =
  | "public"
  | "user_designed"
  | "user_trained"
  | "user_elevenlabs";

export interface InspirationItem {
  id?: number;
  url: string;
  platform?: string;
}

export interface AccountItem {
  id?: number;
  agent_id?: string;
  url: string;
  platform?: string | null;
  display_name?: string | null;
}

export interface LookReferenceImage {
  id: number;
  url: string;
}

export interface BrandOverview {
  agent_id?: string;
  brand_name?: string | null;
  description?: string | null;
  identity_type?: "brand" | "character" | null;
  goal?: string | null;
  keywords: string[];
  target_platforms: string[];
  shortform?: boolean | null;
  longform?: boolean | null;
  primary_format?: string | null;
  onboarding_status?: string | null;
}

export interface AgentCoreIdentity {
  name?: string | null;
  profile_photo_url?: string | null;
}

export interface AgentCoreVoice {
  voice_id: string;
  name?: string | null;
  source?: VoiceSource;
}

export interface AgentCoreLook {
  description?: string | null;
  reference_images: LookReferenceImage[];
}

export interface AgentCore {
  identity: AgentCoreIdentity;
  overview: BrandOverview;
  personality: string | null;
  inspiration: InspirationItem[];
  voice: AgentCoreVoice | null;
  look: AgentCoreLook;
  accounts: AccountItem[];
}

/**
 * Merge-patch payload for PATCH /v1/agents/{id}/core.
 * Any field may be omitted. Merge semantics for identity/overview/look.description.
 * Replace semantics for personality/inspiration/voice/accounts.
 */
export interface AgentCorePatch {
  identity?: Partial<AgentCoreIdentity>;
  overview?: {
    brand_name?: string;
    description?: string;
    identity_type?: "brand" | "character";
    goal?: string;
    keywords?: string[];
    target_platforms?: string[];
    shortform?: boolean;
    longform?: boolean;
    onboarding_status?: string;
  };
  personality?: string;
  inspiration?: Array<{ url: string; platform?: string }>;
  look?: { description?: string };
  voice?: { voice_id: string; source?: VoiceSource };
  accounts?: Array<{ url: string; platform?: string; display_name?: string }>;
}

/**
 * Response from PATCH /core. One entry per section that was submitted;
 * each entry has `status: "ok"` with `data`, or `status: "error"` with `error`.
 * 207 Multi-Status is returned if any section failed.
 */
export interface AgentCorePatchResultEntry {
  status: "ok" | "error";
  data?: unknown;
  error?: string;
}

export type AgentCorePatchResult = Record<string, AgentCorePatchResultEntry>;

export interface VoiceLibraryItem {
  voice_id: string;
  name: string | null;
  source: VoiceSource;
  preview_url: string | null;
}

export interface UserVoiceResource {
  id: number;
  name: string;
  gender?: string | null;
  language?: string | null;
  description?: string | null;
  hume_ai_voice_id?: string | null;
  file_url?: string | null;
}

export interface UserJob {
  id: number;
  user_job_type: string;
  status: "pending" | "processing" | "completed" | "failed" | "stopped";
  result?: unknown;
  output_resources?: OutputResource[];
  error?: string;
}

// ── Templates ───────────────────────────────────────────────────────────────

export interface Template {
  id: number | string;
  slug: string;
  title: string;
  description?: string;
  [key: string]: unknown;
}

// ── Avatars ─────────────────────────────────────────────────────────────────

export interface AgentAvatar {
  id: number | string;
  url: string;
  thumbnail_url?: string;
  primary?: boolean;
  degod_avatar_id?: string | null;
  [key: string]: unknown;
}

// ── Monitoring (Content scraping) ──────────────────────────────────────────

export type MonitoringPlatform = "tiktok" | "instagram" | "youtube";
export type MonitoringSearchType = "username" | "hashtag" | "keyword";

export interface MonitoringJobParams {
  platform: MonitoringPlatform;
  search_type: MonitoringSearchType;
  value: string;
  days?: number;
  country?: string;
  max_results?: number;
  monitoring?: boolean;
  comment_monitoring?: boolean;
}

export interface MonitoringJob {
  id: number | string;
  user_job_type: string;
  status: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Publishing ──────────────────────────────────────────────────────────────

export type PublishPlatform = "tiktok";
export type PublishScheduleType = "now" | "scheduled";
export type PublishMediaType = "VIDEO" | "IMAGE";

export interface PublishContentParams {
  platform: PublishPlatform;
  media_url: string;
  description: string;
  schedule_type: PublishScheduleType;
  title?: string;
  media_type?: PublishMediaType;
  scheduled_time?: string;
  thumbnail_url?: string;
  timezone_offset?: number;
}

export interface PublishContentResult {
  id: number | string;
  user_job_type: string;
  status: string;
  [key: string]: unknown;
}

// ── Research ────────────────────────────────────────────────────────────────

export type ResearchDepth = "quick" | "default" | "deep";

export interface RunResearchParams {
  topic: string;
  agentId: string;
  depth?: ResearchDepth;
}

export interface ResearchResult {
  run_id?: string;
  status?: string;
  findings?: unknown;
  citations?: unknown;
  [key: string]: unknown;
}

// ── Variables (global template variables) ─────────────────────────────────

export interface GlobalVariable {
  id: number | string;
  key: string;
  value: string;
  [key: string]: unknown;
}

export interface CreateVariableParams {
  key: string;
  value: string;
}

export interface UpdateVariableParams {
  key?: string;
  value?: string;
}

// ── API Keys (Personal Access Tokens) ──────────────────────────────────────

export interface ApiKey {
  id: number | string;
  name?: string;
  masked_token?: string;
  last_used_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface CreateApiKeyResult extends ApiKey {
  /** Plain-text token. Returned ONCE at creation — store securely. */
  token?: string;
}

// ── Asset Libraries ────────────────────────────────────────────────────────

export interface AssetLibraryItem {
  id: number | string;
  type: string;
  name?: string;
  url?: string;
  thumbnail_url?: string;
  [key: string]: unknown;
}

export interface ListAssetLibrariesParams {
  folder_id?: string;
  asset_type?: string;
  search?: string;
  order?: string;
  page?: string | number;
  page_size?: string | number;
}

export interface DirectUploadBlob {
  filename: string;
  byte_size: number;
  checksum: string;
  content_type: string;
}

export interface DirectUploadResult {
  signed_id: string;
  url: string;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

export interface CreateContentResourceParams {
  signed_id: string;
  asset_folder_id?: string;
}

// ── Client ───────────────────────────────────────────────────────────────────

/**
 * Client for the GEN Auto Content Engine API.
 *
 * @example
 * ```ts
 * import { GenClient } from "@poweredbygen/gen-sdk";
 *
 * const client = new GenClient({ apiKey: "ref_your_token_here" });
 * const me = await client.getMe();
 * console.log(me);
 * ```
 */
export class GenClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly agentBaseUrl: string;
  private readonly _fetch: typeof globalThis.fetch;

  constructor(options: GenClientOptions) {
    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.gen.pro/v1").replace(
      /\/$/,
      ""
    );
    this.agentBaseUrl = (
      options.agentBaseUrl ?? "https://agent.gen.pro/v1"
    ).replace(/\/$/, "");
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const res = await this._fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const errObj = data as Record<string, string> | undefined;
      const error =
        (errObj && typeof errObj === "object" && errObj.error) ||
        `HTTP ${res.status}`;
      const errorCode =
        (errObj && typeof errObj === "object" && errObj.error_code) ||
        "unknown_error";
      throw new GenApiError(res.status, error, errorCode);
    }

    return data as T;
  }

  private buildAgentQuery(agentId: string | number): string {
    return `?agent_id=${encodeURIComponent(String(agentId))}`;
  }

  private async agentRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.agentBaseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const res = await this._fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const errObj = data as Record<string, string> | undefined;
      const error =
        (errObj && typeof errObj === "object" && errObj.error) ||
        `HTTP ${res.status}`;
      const errorCode =
        (errObj && typeof errObj === "object" && errObj.error_code) ||
        "unknown_error";
      throw new GenApiError(res.status, error, errorCode);
    }

    return data as T;
  }

  // ── Discovery ────────────────────────────────────────────────────────────

  /**
   * Get the authenticated user's profile.
   * @returns The current user's profile information.
   */
  async getMe(): Promise<User> {
    return this.request<User>("GET", "/me");
  }

  /**
   * List all workspaces the authenticated user has access to.
   * @returns Array of workspaces.
   */
  async listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("GET", "/workspaces");
  }

  /**
   * List agents, optionally filtered by workspace.
   * @param workspaceId - Optional workspace ID to filter agents.
   * @returns Array of agents.
   */
  async listAgents(workspaceId?: string | number): Promise<Agent[]> {
    const params = workspaceId
      ? `?workspace_id=${encodeURIComponent(String(workspaceId))}`
      : "";
    return this.request<Agent[]>("GET", `/agents${params}`);
  }

  // ── Agents ───────────────────────────────────────────────────────────────

  /**
   * Create a new agent.
   * @param params - Agent creation parameters (name required).
   * @returns The created agent.
   */
  async createAgent(params: CreateAgentParams): Promise<{ agent: Agent }> {
    const { organization_id, ...agentFields } = params;
    const body: Record<string, unknown> = { agent: agentFields };
    if (organization_id !== undefined) body.organization_id = organization_id;
    return this.request<{ agent: Agent }>("POST", "/agents", body);
  }

  /**
   * Get full details of a specific agent.
   * @param agentId - The agent ID.
   * @returns The agent details.
   */
  async getAgent(agentId: string | number): Promise<Agent> {
    return this.request<Agent>(
      "GET",
      `/agents/${encodeURIComponent(String(agentId))}`
    );
  }

  /**
   * Update an existing agent.
   * @param agentId - The agent ID to update.
   * @param params - Fields to update.
   * @returns The updated agent.
   */
  async updateAgent(
    agentId: string | number,
    params: UpdateAgentParams
  ): Promise<{ agent: Agent }> {
    return this.request<{ agent: Agent }>(
      "PATCH",
      `/agents/${encodeURIComponent(String(agentId))}`,
      { agent: params }
    );
  }

  /**
   * Delete an agent (soft-delete).
   * @param agentId - The agent ID to delete.
   */
  async deleteAgent(agentId: string | number): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/agents/${encodeURIComponent(String(agentId))}`
    );
  }

  // ── Organizations ────────────────────────────────────────────────────────

  /**
   * List all organizations the authenticated user is a member of.
   * @returns Array of organizations with credits, role, and plan info.
   */
  async listOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>("GET", "/organizations");
  }

  /**
   * Create a new organization.
   * @param name - Display name for the organization.
   * @returns The created organization with its ID.
   */
  async createOrganization(
    name: string
  ): Promise<{ organization_id: number | string }> {
    return this.request<{ organization_id: number | string }>(
      "POST",
      "/organizations",
      { organization: { name } }
    );
  }

  /**
   * Get details of a specific organization.
   * @param orgId - The organization ID.
   * @returns The organization details.
   */
  async getOrganization(orgId: string | number): Promise<Organization> {
    return this.request<Organization>(
      "GET",
      `/organizations/${encodeURIComponent(String(orgId))}`
    );
  }

  /**
   * Update an organization (requires owner or manager role).
   * @param orgId - The organization ID to update.
   * @param params - Fields to update.
   * @returns The updated organization ID.
   */
  async updateOrganization(
    orgId: string | number,
    params: UpdateOrganizationParams
  ): Promise<{ organization_id: number | string }> {
    return this.request<{ organization_id: number | string }>(
      "PATCH",
      `/organizations/${encodeURIComponent(String(orgId))}`,
      { organization: params }
    );
  }

  /**
   * Permanently delete an organization and all associated data.
   * Requires owner role. This action is irreversible.
   * @param orgId - The organization ID to delete.
   */
  async deleteOrganization(orgId: string | number): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/organizations/${encodeURIComponent(String(orgId))}`
    );
  }

  // ── Engines ──────────────────────────────────────────────────────────────

  /**
   * Create a new Auto Content Engine for an agent.
   * @param agentId - The agent ID to create the engine for.
   * @param title - Title for the new engine.
   * @returns The created engine with columns, rows, and cells.
   */
  async createEngine(
    agentId: string | number,
    title: string
  ): Promise<Engine> {
    return this.request<Engine>(
      "POST",
      `/autocontentengine${this.buildAgentQuery(agentId)}`,
      { spreadsheet: { title } }
    );
  }

  /**
   * Get details of a specific Auto Content Engine.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID to retrieve.
   * @returns The engine with all nested data.
   */
  async getEngine(
    agentId: string | number,
    engineId: string | number
  ): Promise<Engine> {
    return this.request<Engine>(
      "GET",
      `/autocontentengine/${encodeURIComponent(String(engineId))}${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Clone an existing engine, optionally to a different agent.
   * @param agentId - The agent ID that owns the source engine.
   * @param engineId - The engine ID to clone.
   * @param targetAgentId - Optional target agent ID (defaults to same agent).
   * @returns The cloned engine.
   */
  async cloneEngine(
    agentId: string | number,
    engineId: string | number,
    targetAgentId?: string | number
  ): Promise<Engine> {
    const body: Record<string, unknown> = {};
    if (targetAgentId !== undefined)
      body.target_agent_id = targetAgentId;
    return this.request<Engine>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/clone${this.buildAgentQuery(agentId)}`,
      body
    );
  }

  // ── Rows ─────────────────────────────────────────────────────────────────

  /**
   * List all rows in an Auto Content Engine.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @returns Array of rows.
   */
  async listRows(
    agentId: string | number,
    engineId: string | number
  ): Promise<Row[]> {
    return this.request<Row[]>(
      "GET",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/rows${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Create a new row in an Auto Content Engine.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @returns The created row.
   */
  async createRow(
    agentId: string | number,
    engineId: string | number
  ): Promise<Row> {
    return this.request<Row>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/rows${this.buildAgentQuery(agentId)}`,
      {}
    );
  }

  /**
   * Duplicate an existing row in an Auto Content Engine.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param rowId - The row ID to duplicate.
   * @returns The duplicated row.
   */
  async duplicateRow(
    agentId: string | number,
    engineId: string | number,
    rowId: string | number
  ): Promise<Row> {
    return this.request<Row>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/rows/${encodeURIComponent(String(rowId))}/duplicate${this.buildAgentQuery(agentId)}`,
      {}
    );
  }

  // ── Columns ──────────────────────────────────────────────────────────────

  /**
   * List all columns in an Auto Content Engine.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @returns Array of columns.
   */
  async listColumns(
    agentId: string | number,
    engineId: string | number
  ): Promise<Column[]> {
    return this.request<Column[]>(
      "GET",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/columns${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Create a new column in an Auto Content Engine.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param params - Column creation parameters (title and type required).
   * @returns The created column.
   */
  async createColumn(
    agentId: string | number,
    engineId: string | number,
    params: CreateColumnParams
  ): Promise<Column> {
    return this.request<Column>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/columns${this.buildAgentQuery(agentId)}`,
      { spreadsheet_column: params }
    );
  }

  // ── Cells ────────────────────────────────────────────────────────────────

  /**
   * Get the value and metadata of a specific cell.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param cellId - The cell ID to retrieve.
   * @returns The cell data.
   */
  async getCell(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number
  ): Promise<Cell> {
    return this.request<Cell>(
      "GET",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Update the value of a specific cell.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param cellId - The cell ID to update.
   * @param value - The new cell value.
   * @returns The updated cell.
   */
  async updateCell(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    value: string
  ): Promise<Cell> {
    return this.request<Cell>(
      "PATCH",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}${this.buildAgentQuery(agentId)}`,
      { spreadsheet_cell: { value } }
    );
  }

  // ── Layers ───────────────────────────────────────────────────────────────

  /**
   * Create a new layer in a cell.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param cellId - The cell ID to add the layer to.
   * @param params - Layer creation parameters (name and type required).
   * @returns The created layer.
   */
  async createLayer(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    params: CreateLayerParams
  ): Promise<Layer> {
    return this.request<Layer>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/layers${this.buildAgentQuery(agentId)}`,
      { video_layer: params }
    );
  }

  /**
   * Delete a layer from a cell.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param cellId - The cell ID.
   * @param layerId - The layer ID to delete.
   */
  async deleteLayer(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    layerId: string | number
  ): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/layers/${encodeURIComponent(String(layerId))}${this.buildAgentQuery(agentId)}`
    );
  }

  // ── Generations ──────────────────────────────────────────────────────────

  /**
   * Trigger AI content generation for a cell.
   *
   * Returns a generation_id. Poll with {@link getGeneration} or use
   * {@link waitForGeneration} until status is "completed".
   *
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param cellId - The cell ID to generate content for.
   * @param generationType - The canonical generation type (e.g. "text", "image_from_text", "video_from_text", etc.).
   * @param data - Optional generation-specific parameters (prompt, model, aspect_ratio, duration, voice_id, etc.).
   * @returns Object with generation_id and status.
   */
  async generateContent(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    generationType: string,
    data?: Record<string, unknown>
  ): Promise<GenerationResult> {
    const railsType = resolveGenerationType(generationType, data);
    const body: Record<string, unknown> = { generation_type: railsType };
    if (data) body.data = data;
    return this.request<GenerationResult>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/generate${this.buildAgentQuery(agentId)}`,
      body
    );
  }

  /**
   * Trigger generation for a specific layer within a cell.
   * @param agentId - The agent ID that owns the engine.
   * @param engineId - The engine ID.
   * @param cellId - The cell ID.
   * @param layerId - The layer ID to generate.
   * @returns Object with generation_id and status.
   */
  async generateLayer(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    layerId: string | number
  ): Promise<GenerationResult> {
    return this.request<GenerationResult>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/layers/${encodeURIComponent(String(layerId))}/generate${this.buildAgentQuery(agentId)}`,
      {}
    );
  }

  /**
   * Get the status and result of a generation job.
   *
   * Status flow: pending -> processing -> completed | failed | stopped.
   * On completion: text results in `result` field, media URLs in `output_resources`.
   *
   * @param generationId - The generation ID to check.
   * @returns The generation object with status and results.
   */
  async getGeneration(generationId: string | number): Promise<Generation> {
    return this.request<Generation>(
      "GET",
      `/generations/${encodeURIComponent(String(generationId))}`
    );
  }

  /**
   * Stop a running generation job. Credits are refunded.
   * @param generationId - The generation ID to stop.
   */
  async stopGeneration(generationId: string | number): Promise<void> {
    await this.request<unknown>(
      "POST",
      `/generations/${encodeURIComponent(String(generationId))}/stop`
    );
  }

  /**
   * Poll a generation until it completes, fails, or times out.
   *
   * @param generationId - The generation ID to wait for.
   * @param options - Polling interval and timeout configuration.
   * @returns The completed generation object.
   * @throws {GenApiError} If the generation fails.
   * @throws {Error} If the timeout is exceeded.
   */
  async waitForGeneration(
    generationId: string | number,
    options?: WaitForGenerationOptions
  ): Promise<Generation> {
    const pollInterval = options?.pollIntervalMs ?? 2000;
    const timeout = options?.timeoutMs ?? 300_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const gen = await this.getGeneration(generationId);

      if (gen.status === "completed") {
        return gen;
      }
      if (gen.status === "failed") {
        throw new GenApiError(
          422,
          `Generation ${generationId} failed`,
          "generation_failed"
        );
      }
      if (gen.status === "stopped") {
        throw new GenApiError(
          422,
          `Generation ${generationId} was stopped`,
          "generation_stopped"
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Generation ${generationId} timed out after ${timeout}ms`
    );
  }

  // ── Content Resources ────────────────────────────────────────────────────

  /**
   * List content resources (files) belonging to an agent.
   * @param agentId - The agent whose resources to list.
   * @param params - Optional filters for type, project, and pagination.
   * @returns Array of content resources.
   */
  async listContentResources(
    agentId: string | number,
    params?: ListContentResourcesParams
  ): Promise<ContentResource[]> {
    const query = new URLSearchParams({
      agent_id: String(agentId),
    });
    if (params?.type) query.set("type", params.type);
    if (params?.project_id) query.set("project_id", params.project_id);
    if (params?.page !== undefined) query.set("page", String(params.page));
    return this.request<ContentResource[]>(
      "GET",
      `/content_resources?${query.toString()}`
    );
  }

  /**
   * Get full details of a content resource.
   * @param agentId - The agent that owns the resource.
   * @param resourceId - The content resource ID.
   * @returns The content resource with project node and generator info.
   */
  async getContentResource(
    agentId: string | number,
    resourceId: string | number
  ): Promise<ContentResourceDetail> {
    return this.request<ContentResourceDetail>(
      "GET",
      `/content_resources/${encodeURIComponent(String(resourceId))}${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Permanently delete a content resource and its associated file.
   * @param agentId - The agent that owns the resource.
   * @param resourceId - The content resource ID to delete.
   */
  async deleteContentResource(
    agentId: string | number,
    resourceId: string | number
  ): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/content_resources/${encodeURIComponent(String(resourceId))}${this.buildAgentQuery(agentId)}`
    );
  }

  // ── Agent Chat (agent.gen.pro) ──────────────────────────────────────────

  /**
   * Generate data-driven content ideas for an agent.
   * Returns a run — poll with {@link getRunStatus} until completed.
   */
  async generateIdeas(
    agentId: string,
    options?: GenerateIdeasOptions
  ): Promise<RunResponse> {
    let msg =
      options?.message ??
      `generate ${options?.numIdeas ?? 5} content ideas`;
    if (options?.requirements?.length)
      msg += ". Requirements: " + options.requirements.join(". ");
    if (options?.videoType) msg += `. Use ${options.videoType} format only.`;

    const body: Record<string, unknown> = { message: msg, agent_id: agentId };
    if (options?.conversationId)
      body.conversation_id = options.conversationId;
    return this.agentRequest<RunResponse>("POST", "/agent/run", body);
  }

  /**
   * Refine previously generated ideas by sending feedback in the same conversation.
   */
  async refineIdeas(
    agentId: string,
    conversationId: string,
    feedback: string
  ): Promise<RunResponse> {
    return this.agentRequest<RunResponse>("POST", "/agent/run", {
      message: feedback,
      agent_id: agentId,
      conversation_id: conversationId,
    });
  }

  /**
   * Set a persistent content generation preference for an agent.
   * Applies to ALL future generations.
   */
  async setContentPreference(
    agentId: string,
    preference: string
  ): Promise<RunResponse> {
    return this.agentRequest<RunResponse>("POST", "/agent/run", {
      message: `Remember this content preference for all future ideas: ${preference}`,
      agent_id: agentId,
    });
  }

  /**
   * Poll the status of an agent run.
   * Poll every 5 seconds until status is "completed".
   */
  async getRunStatus(runId: string): Promise<RunStatus> {
    return this.agentRequest<RunStatus>("GET", `/agent/runs/${runId}`);
  }

  /**
   * Wait for an agent run to complete, polling automatically.
   */
  async waitForRun(
    runId: string,
    options?: WaitForGenerationOptions
  ): Promise<RunStatus> {
    const pollInterval = options?.pollIntervalMs ?? 5000;
    const timeout = options?.timeoutMs ?? 300_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const run = await this.getRunStatus(runId);
      if (run.status === "completed") return run;
      if (run.status === "failed") {
        throw new GenApiError(422, `Run ${runId} failed`, "run_failed");
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    throw new Error(`Run ${runId} timed out after ${timeout}ms`);
  }

  /**
   * Approve a pending agent action.
   */
  async approveRun(runId: string): Promise<void> {
    await this.agentRequest<unknown>("POST", `/agent/runs/${runId}/approve`, {
      approved: true,
    });
  }

  /**
   * Reject a pending agent action.
   */
  async rejectRun(runId: string): Promise<void> {
    await this.agentRequest<unknown>("POST", `/agent/runs/${runId}/approve`, {
      approved: false,
    });
  }

  /**
   * List content ideas for an agent, optionally filtered by status.
   */
  async listIdeas(agentId: string, status?: string): Promise<Idea[]> {
    let path = `/agent/ideas?agent_id=${agentId}`;
    if (status) path += `&status=${status}`;
    return this.agentRequest<Idea[]>("GET", path);
  }

  /**
   * Update the status of a content idea.
   * Flow: generated -> approve_to_create -> ready_for_review -> approved_to_post -> posted
   * Edit/rejection statuses: change_idea, change_video, rejected.
   */
  async updateIdeaStatus(ideaId: string | number, status: string): Promise<void> {
    await this.agentRequest<unknown>(
      "PUT",
      `/agent/ideas/${ideaId}/status/${status}`
    );
  }

  /**
   * List agent chat conversations.
   */
  async listConversations(agentId?: string): Promise<Conversation[]> {
    let path = "/agent/conversations";
    if (agentId) path += `?agent_id=${agentId}`;
    return this.agentRequest<Conversation[]>("GET", path);
  }

  /**
   * Get a conversation with all messages.
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    return this.agentRequest<Conversation>(
      "GET",
      `/agent/conversations/${conversationId}`
    );
  }

  /**
   * Soft-delete a conversation.
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.agentRequest<unknown>(
      "DELETE",
      `/agent/conversations/${conversationId}`
    );
  }

  /**
   * Get the full agent profile (identity + voice + brand config).
   * @deprecated Prefer `getAgentCore` — single-call read of every setup section.
   */
  async getAgentProfile(agentId: string): Promise<AgentProfile> {
    return this.agentRequest<AgentProfile>(
      "GET",
      `/agent/profile?agent_id=${agentId}`
    );
  }

  /**
   * Update agent profile. Send only the sections/fields to change.
   * Array fields (keywords, platforms, linked_accounts) are replaced entirely.
   * @deprecated Prefer `patchAgentCore` — same one-call semantics with better payload structure.
   */
  async updateAgentProfile(
    agentId: string,
    profile: AgentProfileInput
  ): Promise<AgentProfile> {
    return this.agentRequest<AgentProfile>(
      "PUT",
      `/agent/profile?agent_id=${agentId}`,
      profile
    );
  }

  // ── Agent Core (GEN-2755) ─────────────────────────────────────────────
  // Single-endpoint read/write for the agent setup canvas — identity,
  // overview, personality, inspiration, voice, look, and accounts.
  // Prefer these over the legacy /agent/profile methods for new code.

  /**
   * Get every section of the agent setup canvas in one call: identity,
   * overview (brand profile), personality, inspiration, voice, look, accounts.
   */
  async getAgentCore(agentId: string): Promise<AgentCore> {
    return this.request<AgentCore>("GET", `/agents/${agentId}/core`);
  }

  /**
   * Update any combination of setup sections in one call. Merge semantics
   * for `identity`, `overview`, `look.description`; replace semantics for
   * `personality`, `inspiration`, `voice`, `accounts`.
   *
   * Returns per-section results. Throws on 207 Multi-Status only if every
   * section failed; partial failures return the mixed result map.
   */
  async patchAgentCore(
    agentId: string,
    patch: AgentCorePatch
  ): Promise<AgentCorePatchResult> {
    return this.request<AgentCorePatchResult>(
      "PATCH",
      `/agents/${agentId}/core`,
      patch
    );
  }

  /** Append one inspiration source (a creator the agent draws style from). */
  async addAgentInspiration(
    agentId: string,
    url: string,
    platform?: string
  ): Promise<InspirationItem> {
    return this.request<InspirationItem>(
      "POST",
      `/agents/${agentId}/core/inspiration`,
      { url, platform }
    );
  }

  /** Remove one inspiration source by id. */
  async removeAgentInspiration(
    agentId: string,
    itemId: number | string
  ): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/agents/${agentId}/core/inspiration/${itemId}`
    );
  }

  /** Append one of the agent's OWN social accounts. */
  async addAgentAccount(
    agentId: string,
    account: { url: string; platform?: string; display_name?: string }
  ): Promise<AccountItem> {
    return this.request<AccountItem>(
      "POST",
      `/agents/${agentId}/core/accounts`,
      account
    );
  }

  /** Remove one linked account by id. */
  async removeAgentAccount(
    agentId: string,
    accountId: number | string
  ): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/agents/${agentId}/core/accounts/${accountId}`
    );
  }

  // ── Agent Voice (GEN-2755) ────────────────────────────────────────────

  /**
   * List voices available to the agent. Sources: `public` (shared catalog),
   * `user_designed` (via prompt flow), `user_trained` (from audio), and
   * `user_elevenlabs` (from the agent's connected ElevenLabs key).
   */
  async listAgentVoices(
    agentId: string,
    source?: VoiceSource
  ): Promise<{ voices: VoiceLibraryItem[]; total: number }> {
    const suffix = source ? `?source=${source}` : "";
    return this.request<{ voices: VoiceLibraryItem[]; total: number }>(
      "GET",
      `/agents/${agentId}/voice/library${suffix}`
    );
  }

  /** Check whether the agent has an ElevenLabs key connected. */
  async getElevenLabsStatus(
    agentId: string
  ): Promise<{ connected: boolean; masked_key: string | null }> {
    return this.request("GET", `/agents/${agentId}/voice/integrations/elevenlabs`);
  }

  /**
   * Connect the user's ElevenLabs API key to the agent. Validates the key
   * against ElevenLabs /v1/user before saving. Throws GenApiError("invalid_key")
   * on 400.
   */
  async connectElevenLabs(
    agentId: string,
    apiKey: string
  ): Promise<{ connected: boolean; user?: unknown }> {
    return this.request(
      "POST",
      `/agents/${agentId}/voice/integrations/elevenlabs`,
      { api_key: apiKey }
    );
  }

  /** Test an ElevenLabs key without saving it. */
  async testElevenLabsKey(
    agentId: string,
    apiKey: string
  ): Promise<{ valid: boolean }> {
    return this.request(
      "POST",
      `/agents/${agentId}/voice/integrations/elevenlabs/test`,
      { api_key: apiKey }
    );
  }

  /** Disconnect the ElevenLabs key from the agent. */
  async disconnectElevenLabs(agentId: string): Promise<void> {
    await this.request("DELETE", `/agents/${agentId}/voice/integrations/elevenlabs`);
  }

  /**
   * Voice design step 1/4 — generate a read-aloud script the candidate
   * voice will speak in step 3.
   */
  async generateVoiceScript(
    agentId: string,
    language?: string
  ): Promise<{ voice_sample: string }> {
    return this.request(
      "POST",
      `/agents/${agentId}/voice/design/generate-script`,
      language ? { language } : {}
    );
  }

  /** Voice design step 2/4 — generate style descriptors. Requires gender. */
  async generateVoiceDescription(
    agentId: string,
    params: {
      gender: string;
      voice_description?: string;
      language?: string;
      script?: string;
    }
  ): Promise<{ voice_description: string }> {
    return this.request(
      "POST",
      `/agents/${agentId}/voice/design/generate-description`,
      params
    );
  }

  /**
   * Voice design step 3/4 — generate 3 candidate audio samples. Returns
   * `{samples: [{generation_id, audio}, ...]}`. Pick one and pass its
   * `generation_id` to `finalizeDesignedVoice`.
   */
  async generateVoiceSamples(
    agentId: string,
    params: { text: string; description?: string }
  ): Promise<{ samples: Array<{ generation_id: string; audio: string }> }> {
    return this.request(
      "POST",
      `/agents/${agentId}/voice/design/generate-samples`,
      params
    );
  }

  /** Voice design step 4/4 — persist a designed voice by generation_id. */
  async finalizeDesignedVoice(
    agentId: string,
    params: {
      generation_id: string;
      name: string;
      gender?: string;
      language?: string;
      description?: string;
    }
  ): Promise<UserVoiceResource> {
    return this.request("POST", `/agents/${agentId}/voice/design`, params);
  }

  /**
   * Clone a voice from an existing audio sample. Synchronous — returns the
   * created voice immediately. Pass EITHER `audio_url` (preferred — server
   * downloads) OR `audio_base64` (inline bytes for small clips).
   */
  async cloneVoice(
    agentId: string,
    params: {
      name: string;
      audio_url?: string;
      audio_base64?: string;
      gender?: string;
      language?: string;
      description?: string;
    }
  ): Promise<UserVoiceResource> {
    if (!params.audio_url && !params.audio_base64) {
      throw new Error("cloneVoice requires audio_url or audio_base64");
    }
    if (params.audio_url && params.audio_base64) {
      throw new Error("cloneVoice: provide audio_url OR audio_base64, not both");
    }
    return this.request("POST", `/agents/${agentId}/voice/clone`, params);
  }

  /** Delete a user-owned voice (designed, trained, or connected). */
  async deleteVoice(
    agentId: string,
    voiceId: string | number
  ): Promise<void> {
    await this.request("DELETE", `/agents/${agentId}/voice/${voiceId}`);
  }

  /**
   * Enqueue a TTS preview job. ASYNC — returns `{user_job_id}` immediately.
   * Poll with `getVoicePreviewStatus` until status=='completed', then read
   * the audio URL from the job's `output_resources`.
   */
  async previewVoice(
    agentId: string,
    voiceId: string,
    text: string
  ): Promise<{ user_job_id: number }> {
    return this.request(
      "POST",
      `/agents/${agentId}/voice/${voiceId}/preview`,
      { text }
    );
  }

  /** Poll the status of a TTS preview job. */
  async getVoicePreviewStatus(
    agentId: string,
    jobId: string | number
  ): Promise<UserJob> {
    return this.request("GET", `/agents/${agentId}/voice/preview/${jobId}`);
  }

  // ── Templates (Step 1 / Step 3 — cloning a template is the fastest path) ─

  /**
   * List available templates — pre-configured engines. Cloning a template is
   * the fastest way to start. Phase: Step 3 (Convert Idea to Vidsheet) /
   * Step 1 (Set Up Your Agent).
   */
  async listTemplates(page?: string | number): Promise<Template[]> {
    const query = page !== undefined ? `?page=${encodeURIComponent(String(page))}` : "";
    return this.request<Template[]>("GET", `/templates/projects${query}`);
  }

  /**
   * Get details of a specific template by slug, UUID, or numeric ID.
   * Phase: Step 3 (Convert Idea to Vidsheet).
   */
  async getTemplate(slug: string): Promise<Template> {
    return this.request<Template>(
      "GET",
      `/templates/projects/${encodeURIComponent(slug)}`
    );
  }

  /**
   * Clone a template into an agent's workspace. Returns the new engine with
   * pre-configured columns for a specific workflow. Phase: Step 3 (Convert
   * Idea to Vidsheet).
   */
  async cloneTemplate(
    slug: string,
    agentId: string | number
  ): Promise<Engine> {
    return this.request<Engine>(
      "POST",
      `/templates/spreadsheets/${encodeURIComponent(slug)}/clone`,
      { agent_id: agentId }
    );
  }

  // ── Columns (CRUD) ─────────────────────────────────────────────────────

  /**
   * Update a column's title, type, or position. Only ingredient-role columns
   * can be modified. Phase: Step 4 (Edit & Generate).
   */
  async updateColumn(
    agentId: string | number,
    engineId: string | number,
    columnId: string | number,
    params: { title?: string; type?: string; position?: number }
  ): Promise<Column> {
    return this.request<Column>(
      "PATCH",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/columns/${encodeURIComponent(String(columnId))}`,
      { agent_id: agentId, spreadsheet_column: params }
    );
  }

  /**
   * Delete a column from an engine. Only ingredient-role columns can be
   * deleted. Phase: Step 4 (Edit & Generate).
   */
  async deleteColumn(
    agentId: string | number,
    engineId: string | number,
    columnId: string | number
  ): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/columns/${encodeURIComponent(String(columnId))}${this.buildAgentQuery(agentId)}`
    );
  }

  // ── Layers (CRUD) ──────────────────────────────────────────────────────

  /**
   * Get details of a specific layer, including its type, position,
   * attributes, and generation history. Phase: Step 4 (Edit & Generate).
   */
  async getLayer(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    layerId: string | number
  ): Promise<Layer> {
    return this.request<Layer>(
      "GET",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/layers/${encodeURIComponent(String(layerId))}${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Update a layer's name, type, position, or additional attributes.
   * Phase: Step 4 (Edit & Generate).
   */
  async updateLayer(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number,
    layerId: string | number,
    params: {
      name?: string;
      type?: string;
      position?: number;
      additional_attributes?: Record<string, unknown>;
    }
  ): Promise<Layer> {
    return this.request<Layer>(
      "PATCH",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/layers/${encodeURIComponent(String(layerId))}`,
      { agent_id: agentId, video_layer: params }
    );
  }

  // ── Generations (resume + render) ─────────────────────────────────────

  /**
   * Continue a previously stopped generation. Credits are re-charged.
   * Phase: Step 4 (Edit & Generate).
   */
  async continueGeneration(
    generationId: string | number
  ): Promise<GenerationResult> {
    return this.request<GenerationResult>(
      "POST",
      `/generations/${encodeURIComponent(String(generationId))}/continue`
    );
  }

  /**
   * Render the final composed video for a cell — combines all layers
   * (video, audio, text, captions) into the final output. Must be a
   * `final_video` column cell. Phase: Step 5 (Export & Publish).
   */
  async renderVideo(
    agentId: string | number,
    engineId: string | number,
    cellId: string | number
  ): Promise<GenerationResult> {
    return this.request<GenerationResult>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/cells/${encodeURIComponent(String(cellId))}/render`,
      { agent_id: agentId }
    );
  }

  // ── Agent Avatars (Step 1) ─────────────────────────────────────────────

  /**
   * List avatar images for an agent, with the primary avatar first.
   * Phase: Step 1 (Set Up Your Agent).
   */
  async listAgentAvatars(
    agentId: string | number,
    cursor?: string
  ): Promise<AgentAvatar[]> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<AgentAvatar[]>(
      "GET",
      `/agents/${encodeURIComponent(String(agentId))}/avatars${query}`
    );
  }

  /**
   * Create an avatar for an agent using a DeGod avatar ID. For direct file
   * uploads, use `createDirectUpload` + `createContentResource` and attach
   * via the Rails API. Phase: Step 1 (Set Up Your Agent).
   */
  async createAgentAvatar(
    agentId: string | number,
    params?: { degod_avatar_id?: string }
  ): Promise<AgentAvatar> {
    const body = {
      agent_avatars_attributes: [
        params?.degod_avatar_id ? { degod_avatar_id: params.degod_avatar_id } : {},
      ],
    };
    return this.request<AgentAvatar>(
      "POST",
      `/agents/${encodeURIComponent(String(agentId))}/avatars`,
      body
    );
  }

  /**
   * Delete one or more avatars from an agent. For multiple IDs pass them
   * underscore-joined (e.g. `"7_8_9"`). Phase: Step 1 (Set Up Your Agent).
   */
  async deleteAgentAvatar(
    agentId: string | number,
    avatarId: string | number
  ): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/agents/${encodeURIComponent(String(agentId))}/avatars/${encodeURIComponent(String(avatarId))}`
    );
  }

  // ── Agent Profile (legacy createAgentProfile + resetAgentProfile) ─────

  /**
   * Set up an agent's profile for the first time. Prefer `patchAgentCore`
   * for new code. Phase: Step 1 (Set Up Your Agent).
   * @deprecated Prefer `patchAgentCore` — same semantics with better
   * payload structure.
   */
  async createAgentProfile(
    agentId: string,
    profile: AgentProfileInput
  ): Promise<AgentProfile> {
    return this.agentRequest<AgentProfile>(
      "POST",
      `/agent/profile?agent_id=${encodeURIComponent(agentId)}`,
      profile
    );
  }

  /**
   * Reset the agent's brand configuration. Clears brand name, keywords,
   * platforms, linked accounts, and content preferences. Does NOT delete
   * the agent or voice settings. Phase: Step 1 (Set Up Your Agent).
   */
  async resetAgentProfile(agentId: string): Promise<void> {
    await this.agentRequest<unknown>(
      "DELETE",
      `/agent/profile?agent_id=${encodeURIComponent(agentId)}`
    );
  }

  // ── API Keys (Step 1) ─────────────────────────────────────────────────

  /**
   * List all Personal Access Tokens (API keys) for the authenticated user.
   * Phase: Step 1 (Set Up Your Agent).
   */
  async listApiKeys(): Promise<ApiKey[]> {
    return this.request<ApiKey[]>("GET", "/persisted_tokens");
  }

  /**
   * Create a new Personal Access Token. The plain-text token is returned
   * ONCE — store it securely. Phase: Step 1 (Set Up Your Agent).
   */
  async createApiKey(name?: string): Promise<CreateApiKeyResult> {
    const body: Record<string, unknown> = {};
    if (name) body.name = name;
    return this.request<CreateApiKeyResult>("POST", "/persisted_tokens", body);
  }

  /**
   * Revoke (delete) a Personal Access Token. Phase: Step 1.
   */
  async revokeApiKey(tokenId: string | number): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/persisted_tokens/${encodeURIComponent(String(tokenId))}/revoke`
    );
  }

  // ── Asset Libraries (Step 1 / Step 4) ─────────────────────────────────

  /**
   * List the agent's asset library (files + folders) with filtering and
   * search. Phase: Step 1 (Set Up Your Agent) / Step 4 (Edit & Generate).
   */
  async listAssetLibraries(
    agentId: string | number,
    params?: ListAssetLibrariesParams
  ): Promise<AssetLibraryItem[]> {
    const query = new URLSearchParams({ agent_id: String(agentId) });
    if (params?.folder_id) query.set("folder_id", params.folder_id);
    if (params?.asset_type) query.set("asset_type", params.asset_type);
    if (params?.search) query.set("search", params.search);
    if (params?.order) query.set("order", params.order);
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.page_size !== undefined) query.set("page_size", String(params.page_size));
    return this.request<AssetLibraryItem[]>(
      "GET",
      `/asset_libraries?${query.toString()}`
    );
  }

  /**
   * Get a pre-signed S3 URL for direct file upload. Use the returned
   * `signed_id` with `createContentResource`. Phase: Step 4
   * (Edit & Generate).
   */
  async createDirectUpload(
    blob: DirectUploadBlob
  ): Promise<DirectUploadResult> {
    return this.request<DirectUploadResult>("POST", "/direct_upload", { blob });
  }

  /**
   * Create a content resource from a `signed_id` returned by
   * `createDirectUpload`. Phase: Step 4 (Edit & Generate).
   */
  async createContentResource(
    agentId: string | number,
    params: CreateContentResourceParams
  ): Promise<ContentResourceDetail> {
    const body: Record<string, unknown> = {
      content_resource: { file: params.signed_id },
    };
    if (params.asset_folder_id) body.asset_folder = { id: params.asset_folder_id };
    return this.request<ContentResourceDetail>(
      "POST",
      `/content_resources?agent_id=${encodeURIComponent(String(agentId))}`,
      body
    );
  }

  /**
   * Rename a content resource file. Phase: Step 4 (Edit & Generate).
   */
  async updateContentResource(
    agentId: string | number,
    resourceId: string | number,
    params: { filename: string }
  ): Promise<ContentResourceDetail> {
    return this.request<ContentResourceDetail>(
      "PATCH",
      `/content_resources/${encodeURIComponent(String(resourceId))}${this.buildAgentQuery(agentId)}`,
      { content_resource: { filename: params.filename } }
    );
  }

  // ── Global Variables (Step 4) ─────────────────────────────────────────

  /**
   * List global variables for an engine. Variables are key-value pairs used
   * for template substitution in prompts and content. Phase: Step 4
   * (Edit & Generate).
   */
  async listVariables(
    agentId: string | number,
    engineId: string | number
  ): Promise<GlobalVariable[]> {
    return this.request<GlobalVariable[]>(
      "GET",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/global_variables${this.buildAgentQuery(agentId)}`
    );
  }

  /**
   * Create a global variable on an engine. Phase: Step 4 (Edit & Generate).
   */
  async createVariable(
    agentId: string | number,
    engineId: string | number,
    params: CreateVariableParams
  ): Promise<GlobalVariable> {
    return this.request<GlobalVariable>(
      "POST",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/global_variables${this.buildAgentQuery(agentId)}`,
      { global_variable: params }
    );
  }

  /**
   * Update a global variable's key or value. Phase: Step 4
   * (Edit & Generate).
   */
  async updateVariable(
    agentId: string | number,
    engineId: string | number,
    variableId: string | number,
    params: UpdateVariableParams
  ): Promise<GlobalVariable> {
    return this.request<GlobalVariable>(
      "PATCH",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/global_variables/${encodeURIComponent(String(variableId))}${this.buildAgentQuery(agentId)}`,
      { global_variable: params }
    );
  }

  /**
   * Delete a global variable from an engine. Phase: Step 4
   * (Edit & Generate).
   */
  async deleteVariable(
    agentId: string | number,
    engineId: string | number,
    variableId: string | number
  ): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/autocontentengine/${encodeURIComponent(String(engineId))}/global_variables/${encodeURIComponent(String(variableId))}${this.buildAgentQuery(agentId)}`
    );
  }

  // ── Content Monitoring (Step 2 — research/input signal) ───────────────

  /**
   * Start monitoring or scraping social media content. Supports tiktok,
   * instagram, youtube. Set `monitoring: true` for ongoing scheduled
   * scraping, false for a one-time scrape (default). Scraped data is
   * queried through the agent chat. Paid operation. Phase: Step 2
   * (Generate Content Ideas).
   */
  async createMonitoringJob(
    agentId: string | number,
    params: MonitoringJobParams
  ): Promise<MonitoringJob> {
    const jobData: Record<string, unknown> = {
      platform: params.platform,
      type: params.search_type,
      value: params.value,
    };
    if (params.days !== undefined) jobData.days = params.days;
    if (params.country) jobData.country = params.country;
    if (params.max_results !== undefined) jobData.max_results = params.max_results;
    if (params.monitoring !== undefined) jobData.monitoring = params.monitoring;
    if (params.comment_monitoring !== undefined) {
      jobData.comment_monitoring = params.comment_monitoring;
    }

    const formData = new URLSearchParams();
    formData.set("agent_id", String(agentId));
    formData.set("user_job[user_job_type]", "train_social");
    formData.set("user_job[data]", JSON.stringify(jobData));

    return this.formRequest<MonitoringJob>(
      "POST",
      `/user_jobs?agent_id=${encodeURIComponent(String(agentId))}`,
      formData
    );
  }

  /**
   * Update an existing monitoring job. Only jobs with pending or
   * processing status can be updated. Phase: Step 2 (Generate Content
   * Ideas).
   */
  async updateMonitoringJob(
    agentId: string | number,
    jobId: string | number,
    params: MonitoringJobParams
  ): Promise<MonitoringJob> {
    const formData = new URLSearchParams();
    formData.set("agent_id", String(agentId));
    formData.set("platform", params.platform);
    formData.set("type", params.search_type);
    formData.set("value", params.value);
    if (params.days !== undefined) formData.set("days", String(params.days));
    if (params.country) formData.set("country", params.country);
    if (params.max_results !== undefined) {
      formData.set("max_results", String(params.max_results));
    }
    if (params.monitoring !== undefined) {
      formData.set("monitoring", String(params.monitoring));
    }
    if (params.comment_monitoring !== undefined) {
      formData.set("comment_monitoring", String(params.comment_monitoring));
    }

    return this.formRequest<MonitoringJob>(
      "PUT",
      `/user_jobs/${encodeURIComponent(String(jobId))}?agent_id=${encodeURIComponent(String(agentId))}`,
      formData
    );
  }

  // ── Publishing (Step 5) ───────────────────────────────────────────────

  /**
   * Publish or schedule content to a connected social account. Currently
   * supports TikTok. Paid operation. Phase: Step 5 (Export & Publish).
   */
  async publishContent(
    agentId: string | number,
    params: PublishContentParams
  ): Promise<PublishContentResult> {
    const publishData: Record<string, unknown> = {
      platform: params.platform,
      media_url: params.media_url,
      description: params.description,
      schedule_type: params.schedule_type,
    };
    if (params.title) publishData.title = params.title;
    if (params.media_type) publishData.media_type = params.media_type;
    if (params.scheduled_time) publishData.scheduled_time = params.scheduled_time;
    if (params.thumbnail_url) publishData.thumbnail_url = params.thumbnail_url;
    if (params.timezone_offset !== undefined) {
      publishData.timezone_offset = params.timezone_offset;
    }

    return this.request<PublishContentResult>(
      "POST",
      `/user_jobs?agent_id=${encodeURIComponent(String(agentId))}`,
      {
        user_job_type: "publish_content",
        data: JSON.stringify(publishData),
      }
    );
  }

  // ── Research (Step 2) ─────────────────────────────────────────────────

  /**
   * Research a topic across 10+ platforms (Reddit, X, YouTube, TikTok,
   * Instagram, HN, Perplexity, Gemini). Returns structured findings with
   * source counts, citations, and AI synthesis. Phase: Step 2 (Generate
   * Content Ideas).
   */
  async runResearch(params: RunResearchParams): Promise<ResearchResult> {
    const body: Record<string, unknown> = {
      topic: params.topic,
      agent_id: params.agentId,
    };
    if (params.depth) body.depth = params.depth;
    return this.agentRequest<ResearchResult>("POST", "/research", body);
  }

  // ── Internal form-encoded request helper (for user_jobs endpoints) ────

  private async formRequest<T>(
    method: string,
    path: string,
    formData: URLSearchParams
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const res = await this._fetch(url, {
      method,
      headers,
      body: formData.toString(),
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const errObj = data as Record<string, string> | undefined;
      const error =
        (errObj && typeof errObj === "object" && errObj.error) ||
        `HTTP ${res.status}`;
      const errorCode =
        (errObj && typeof errObj === "object" && errObj.error_code) ||
        "unknown_error";
      throw new GenApiError(res.status, error, errorCode);
    }

    return data as T;
  }
}

// ── Namespace exports (5-step user journey) ────────────────────────────────
// The `sdk` object exposes methods grouped by the 5-step journey. Each step
// maps to one namespace. Methods are bound to a `GenClient` instance when
// you call `createSdk(client)`. Flat `GenClient` methods remain supported
// for backward compatibility.

/**
 * Builds a journey-first facade around a `GenClient`. Methods are grouped
 * by the 5-step content creation journey: `setup`, `ideas`, `vidsheet`,
 * `edit`, `export`. Prefer the namespaces for new code — they make the
 * journey structure explicit and aid discoverability.
 *
 * @example
 * ```ts
 * const client = new GenClient({ apiKey });
 * const sdk = createSdk(client);
 *
 * const agent = await sdk.setup.createAgent({ name: "My Agent" });
 * const ideas = await sdk.ideas.generateIdeas(agent.agent.id, { numIdeas: 5 });
 * ```
 */
export function createSdk(client: GenClient) {
  return {
    /** Step 1 — Set Up Your Agent: identity, voice, look, API keys, avatars. */
    setup: {
      // Discovery
      getMe: client.getMe.bind(client),
      listWorkspaces: client.listWorkspaces.bind(client),
      listAgents: client.listAgents.bind(client),
      // Agents
      createAgent: client.createAgent.bind(client),
      getAgent: client.getAgent.bind(client),
      updateAgent: client.updateAgent.bind(client),
      deleteAgent: client.deleteAgent.bind(client),
      // Organizations
      listOrganizations: client.listOrganizations.bind(client),
      createOrganization: client.createOrganization.bind(client),
      getOrganization: client.getOrganization.bind(client),
      updateOrganization: client.updateOrganization.bind(client),
      deleteOrganization: client.deleteOrganization.bind(client),
      // Agent Core (canvas)
      getAgentCore: client.getAgentCore.bind(client),
      patchAgentCore: client.patchAgentCore.bind(client),
      addAgentInspiration: client.addAgentInspiration.bind(client),
      removeAgentInspiration: client.removeAgentInspiration.bind(client),
      addAgentAccount: client.addAgentAccount.bind(client),
      removeAgentAccount: client.removeAgentAccount.bind(client),
      // Legacy agent profile
      getAgentProfile: client.getAgentProfile.bind(client),
      createAgentProfile: client.createAgentProfile.bind(client),
      updateAgentProfile: client.updateAgentProfile.bind(client),
      resetAgentProfile: client.resetAgentProfile.bind(client),
      // Avatars
      listAgentAvatars: client.listAgentAvatars.bind(client),
      createAgentAvatar: client.createAgentAvatar.bind(client),
      deleteAgentAvatar: client.deleteAgentAvatar.bind(client),
      // Voice
      listAgentVoices: client.listAgentVoices.bind(client),
      getElevenLabsStatus: client.getElevenLabsStatus.bind(client),
      connectElevenLabs: client.connectElevenLabs.bind(client),
      testElevenLabsKey: client.testElevenLabsKey.bind(client),
      disconnectElevenLabs: client.disconnectElevenLabs.bind(client),
      generateVoiceScript: client.generateVoiceScript.bind(client),
      generateVoiceDescription: client.generateVoiceDescription.bind(client),
      generateVoiceSamples: client.generateVoiceSamples.bind(client),
      finalizeDesignedVoice: client.finalizeDesignedVoice.bind(client),
      cloneVoice: client.cloneVoice.bind(client),
      deleteVoice: client.deleteVoice.bind(client),
      previewVoice: client.previewVoice.bind(client),
      getVoicePreviewStatus: client.getVoicePreviewStatus.bind(client),
      // API keys
      listApiKeys: client.listApiKeys.bind(client),
      createApiKey: client.createApiKey.bind(client),
      revokeApiKey: client.revokeApiKey.bind(client),
    },

    /** Step 2 — Generate Content Ideas: research, ideas, refine, preferences. */
    ideas: {
      generateIdeas: client.generateIdeas.bind(client),
      refineIdeas: client.refineIdeas.bind(client),
      setContentPreference: client.setContentPreference.bind(client),
      runResearch: client.runResearch.bind(client),
      getRunStatus: client.getRunStatus.bind(client),
      waitForRun: client.waitForRun.bind(client),
      approveRun: client.approveRun.bind(client),
      rejectRun: client.rejectRun.bind(client),
      listIdeas: client.listIdeas.bind(client),
      updateIdeaStatus: client.updateIdeaStatus.bind(client),
      listConversations: client.listConversations.bind(client),
      getConversation: client.getConversation.bind(client),
      deleteConversation: client.deleteConversation.bind(client),
      createMonitoringJob: client.createMonitoringJob.bind(client),
      updateMonitoringJob: client.updateMonitoringJob.bind(client),
    },

    /** Step 3 — Convert Idea to Vidsheet: templates and engine scaffolding. */
    vidsheet: {
      listTemplates: client.listTemplates.bind(client),
      getTemplate: client.getTemplate.bind(client),
      cloneTemplate: client.cloneTemplate.bind(client),
      createEngine: client.createEngine.bind(client),
      getEngine: client.getEngine.bind(client),
      cloneEngine: client.cloneEngine.bind(client),
    },

    /**
     * Step 4 — Edit & Generate: rows, columns, cells, layers, variables,
     * asset uploads, and generation jobs.
     */
    edit: {
      // Rows
      listRows: client.listRows.bind(client),
      createRow: client.createRow.bind(client),
      duplicateRow: client.duplicateRow.bind(client),
      // Columns
      listColumns: client.listColumns.bind(client),
      createColumn: client.createColumn.bind(client),
      updateColumn: client.updateColumn.bind(client),
      deleteColumn: client.deleteColumn.bind(client),
      // Cells
      getCell: client.getCell.bind(client),
      updateCell: client.updateCell.bind(client),
      // Layers
      createLayer: client.createLayer.bind(client),
      getLayer: client.getLayer.bind(client),
      updateLayer: client.updateLayer.bind(client),
      deleteLayer: client.deleteLayer.bind(client),
      // Variables
      listVariables: client.listVariables.bind(client),
      createVariable: client.createVariable.bind(client),
      updateVariable: client.updateVariable.bind(client),
      deleteVariable: client.deleteVariable.bind(client),
      // Assets
      listAssetLibraries: client.listAssetLibraries.bind(client),
      listContentResources: client.listContentResources.bind(client),
      getContentResource: client.getContentResource.bind(client),
      createContentResource: client.createContentResource.bind(client),
      updateContentResource: client.updateContentResource.bind(client),
      deleteContentResource: client.deleteContentResource.bind(client),
      createDirectUpload: client.createDirectUpload.bind(client),
      // Generations
      generateContent: client.generateContent.bind(client),
      generateLayer: client.generateLayer.bind(client),
      getGeneration: client.getGeneration.bind(client),
      stopGeneration: client.stopGeneration.bind(client),
      continueGeneration: client.continueGeneration.bind(client),
      waitForGeneration: client.waitForGeneration.bind(client),
    },

    /** Step 5 — Export & Publish: render final video and publish to socials. */
    export: {
      renderVideo: client.renderVideo.bind(client),
      publishContent: client.publishContent.bind(client),
      waitForGeneration: client.waitForGeneration.bind(client),
    },
  };
}

/**
 * Convenience: builds a new `GenClient` and its journey-namespaced `sdk`
 * facade from the same options. Exposes `client` for anything the facade
 * doesn't cover.
 *
 * @example
 * ```ts
 * const { sdk, client } = gen({ apiKey: "ref_..." });
 * await sdk.setup.getMe();
 * ```
 */
export function gen(options: GenClientOptions) {
  const client = new GenClient(options);
  return { client, sdk: createSdk(client) };
}

export type Sdk = ReturnType<typeof createSdk>;
