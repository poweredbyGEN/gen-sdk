import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenClient, GenApiError } from "./index.js";

function mockFetch(
  status: number,
  body: unknown,
  headers?: Record<string, string>
): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(headers),
  }) as unknown as typeof globalThis.fetch;
}

describe("GenClient", () => {
  describe("constructor", () => {
    it("should throw if apiKey is empty", () => {
      expect(() => new GenClient({ apiKey: "" })).toThrow("apiKey is required");
    });

    it("should use default base URL", () => {
      const fetchFn = mockFetch(200, { id: 1 });
      const client = new GenClient({ apiKey: "test-key", fetch: fetchFn });
      client.getMe();
      expect(fetchFn).toHaveBeenCalledWith(
        "https://api.gen.pro/v1/me",
        expect.any(Object)
      );
    });

    it("should accept custom base URL and strip trailing slash", () => {
      const fetchFn = mockFetch(200, { id: 1 });
      const client = new GenClient({
        apiKey: "test-key",
        baseUrl: "https://custom.api.com/v2/",
        fetch: fetchFn,
      });
      client.getMe();
      expect(fetchFn).toHaveBeenCalledWith(
        "https://custom.api.com/v2/me",
        expect.any(Object)
      );
    });
  });

  describe("authentication", () => {
    it("should send X-API-Key header", async () => {
      const fetchFn = mockFetch(200, { id: 1 });
      const client = new GenClient({ apiKey: "my-secret-key", fetch: fetchFn });
      await client.getMe();
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-API-Key": "my-secret-key" }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should throw GenApiError on 401", async () => {
      const fetchFn = mockFetch(401, {
        error: "Invalid API key",
        error_code: "unauthorized",
      });
      const client = new GenClient({ apiKey: "bad-key", fetch: fetchFn });
      await expect(client.getMe()).rejects.toThrow(GenApiError);
      await expect(client.getMe()).rejects.toMatchObject({
        status: 401,
        error: "Invalid API key",
        errorCode: "unauthorized",
      });
    });

    it("should throw GenApiError on 404", async () => {
      const fetchFn = mockFetch(404, {
        error: "Not found",
        error_code: "not_found",
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await expect(client.getAgent("999")).rejects.toThrow(GenApiError);
    });

    it("should handle non-JSON error responses", async () => {
      const fetchFn = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      }) as unknown as typeof globalThis.fetch;
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await expect(client.getMe()).rejects.toThrow(GenApiError);
    });
  });

  describe("discovery", () => {
    let client: GenClient;
    let fetchFn: ReturnType<typeof mockFetch>;

    beforeEach(() => {
      fetchFn = mockFetch(200, []);
      client = new GenClient({ apiKey: "key", fetch: fetchFn });
    });

    it("getMe should GET /me", async () => {
      const fetchFn2 = mockFetch(200, {
        id: 1,
        email: "test@example.com",
        name: "Test",
      });
      const c = new GenClient({ apiKey: "key", fetch: fetchFn2 });
      const result = await c.getMe();
      expect(result).toEqual({
        id: 1,
        email: "test@example.com",
        name: "Test",
      });
    });

    it("listWorkspaces should GET /workspaces", async () => {
      await client.listWorkspaces();
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/workspaces"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("listAgents should include workspace_id when provided", async () => {
      await client.listAgents("ws-123");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/agents?workspace_id=ws-123"),
        expect.any(Object)
      );
    });

    it("listAgents should not include workspace_id when omitted", async () => {
      await client.listAgents();
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringMatching(/\/agents$/),
        expect.any(Object)
      );
    });
  });

  describe("agents", () => {
    it("createAgent should POST /agents with body", async () => {
      const fetchFn = mockFetch(200, { agent: { id: 1, name: "Test Agent" } });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const result = await client.createAgent({
        name: "Test Agent",
        organization_id: "org-1",
      });
      expect(result.agent.name).toBe("Test Agent");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/agents"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            agent: { name: "Test Agent" },
            organization_id: "org-1",
          }),
        })
      );
    });

    it("deleteAgent should DELETE /agents/:id", async () => {
      const fetchFn = mockFetch(200, {});
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.deleteAgent("42");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/agents/42"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("engines", () => {
    it("createEngine should POST /vidsheet with agent_id query and title body", async () => {
      const fetchFn = mockFetch(200, { id: 1, title: "My Engine" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.createEngine("agent-1", "My Engine");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/vidsheet?agent_id=agent-1"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ spreadsheet: { title: "My Engine" } }),
        })
      );
    });

    it("getEngine should GET /vidsheet/:id with agent_id", async () => {
      const fetchFn = mockFetch(200, { id: 5 });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.getEngine("a1", "e5");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/vidsheet/e5?agent_id=a1"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("cloneEngine should POST clone endpoint with optional target_agent_id", async () => {
      const fetchFn = mockFetch(200, { id: 6 });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.cloneEngine("a1", "e5", "a2");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/vidsheet/e5/clone?agent_id=a1"),
        expect.objectContaining({
          body: JSON.stringify({ target_agent_id: "a2" }),
        })
      );
    });
  });

  describe("generations", () => {
    it("generateContent should POST generate endpoint with correct body", async () => {
      const fetchFn = mockFetch(200, {
        generation_id: 99,
        status: "pending",
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const result = await client.generateContent(
        "a1",
        "e1",
        "c1",
        "text_generation",
        { model: "gemini", prompt: "Hello" }
      );
      expect(result.generation_id).toBe(99);
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining(
          "/vidsheet/e1/cells/c1/generate?agent_id=a1"
        ),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            generation_type: "text_generation",
            data: { model: "gemini", prompt: "Hello" },
          }),
        })
      );
    });

    it("stopGeneration should POST /generations/:id/stop", async () => {
      const fetchFn = mockFetch(200, {});
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.stopGeneration("gen-42");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/generations/gen-42/stop"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("waitForGeneration should resolve when status is completed", async () => {
      let callCount = 0;
      const fetchFn = vi.fn().mockImplementation(() => {
        callCount++;
        const status =
          callCount <= 2 ? "processing" : "completed";
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 1,
                status,
                result: status === "completed" ? "done" : null,
              })
            ),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const result = await client.waitForGeneration("gen-1", {
        pollIntervalMs: 10,
        timeoutMs: 5000,
      });
      expect(result.status).toBe("completed");
      expect(callCount).toBe(3);
    });

    it("waitForGeneration should throw on failed generation", async () => {
      const fetchFn = mockFetch(200, { id: 1, status: "failed" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await expect(
        client.waitForGeneration("gen-1", {
          pollIntervalMs: 10,
          timeoutMs: 1000,
        })
      ).rejects.toThrow(GenApiError);
    });

    it("waitForGeneration should throw on timeout", async () => {
      const fetchFn = mockFetch(200, { id: 1, status: "processing" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await expect(
        client.waitForGeneration("gen-1", {
          pollIntervalMs: 10,
          timeoutMs: 50,
        })
      ).rejects.toThrow("timed out");
    });
  });

  describe("content resources", () => {
    it("listContentResources should build query params correctly", async () => {
      const fetchFn = mockFetch(200, []);
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.listContentResources("a1", {
        type: "video",
        page: 2,
      });
      const url = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("agent_id=a1");
      expect(url).toContain("type=video");
      expect(url).toContain("page=2");
    });

    it("deleteContentResource should DELETE /content_resources/:id", async () => {
      const fetchFn = mockFetch(200, {});
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.deleteContentResource("a1", "r42");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/content_resources/r42?agent_id=a1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("createContentResource should POST only public resource fields", async () => {
      const fetchFn = mockFetch(201, {
        content_resource: { id: "r1", url: "https://cdn.gen.pro/r1.png" },
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.createContentResource("a1", {
        signed_id: "signed-1",
        asset_folder_id: "folder-1",
      });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/content_resources?agent_id=a1"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            content_resource: { file: "signed-1" },
            asset_folder: { id: "folder-1" },
          }),
        })
      );
    });
  });

  describe("cells", () => {
    it("updateCell should PATCH with spreadsheet_cell body", async () => {
      const fetchFn = mockFetch(200, { id: 1, value: "new" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.updateCell("a1", "e1", "c1", "new value");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/vidsheet/e1/cells/c1?agent_id=a1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ spreadsheet_cell: { value: "new value" } }),
        })
      );
    });
  });

  describe("layers", () => {
    it("createLayer should POST with video_layer body", async () => {
      const fetchFn = mockFetch(200, { id: 1, name: "overlay", type: "text" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.createLayer("a1", "e1", "c1", {
        name: "overlay",
        type: "text",
        position: 0,
      });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining(
          "/vidsheet/e1/cells/c1/layers?agent_id=a1"
        ),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            video_layer: { name: "overlay", type: "text", position: 0 },
          }),
        })
      );
    });

    it("deleteLayer should DELETE layer endpoint", async () => {
      const fetchFn = mockFetch(200, {});
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.deleteLayer("a1", "e1", "c1", "l1");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining(
          "/vidsheet/e1/cells/c1/layers/l1?agent_id=a1"
        ),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("organizations", () => {
    it("createOrganization should POST with name", async () => {
      const fetchFn = mockFetch(200, { organization_id: 1 });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const result = await client.createOrganization("My Org");
      expect(result.organization_id).toBe(1);
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/organizations"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ organization: { name: "My Org" } }),
        })
      );
    });
  });

  describe("generation type resolver", () => {
    it("should resolve 'text' to 'text_generation' when calling generateContent", async () => {
      const fetchFn = mockFetch(201, { generation_id: "gen-1", status: "pending" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateContent("agent-1", "eng-1", "cell-1", "text", { prompt: "hello" });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"generation_type":"text_generation"'),
        })
      );
    });

    it("should resolve 'image_from_text' to 'gemini_image_generation' for gemini models", async () => {
      const fetchFn = mockFetch(201, { generation_id: "gen-1", status: "pending" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateContent("agent-1", "eng-1", "cell-1", "image_from_text", { prompt: "cat", model: "gemini_pro_image" });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"generation_type":"gemini_image_generation"'),
        })
      );
    });

    it("should resolve 'image_from_text' to 'midjourney' for midjourney model", async () => {
      const fetchFn = mockFetch(201, { generation_id: "gen-1", status: "pending" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateContent("agent-1", "eng-1", "cell-1", "image_from_text", { prompt: "cat", model: "midjourney" });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"generation_type":"midjourney"'),
        })
      );
    });

    it("should resolve 'video_from_text' to 'kling' for kling models", async () => {
      const fetchFn = mockFetch(201, { generation_id: "gen-1", status: "pending" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateContent("agent-1", "eng-1", "cell-1", "video_from_text", { prompt: "dance", model: "kling_1_6" });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"generation_type":"kling"'),
        })
      );
    });

    it("should resolve 'speech_from_text' to 'eleven_labs'", async () => {
      const fetchFn = mockFetch(201, { generation_id: "gen-1", status: "pending" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateContent("agent-1", "eng-1", "cell-1", "speech_from_text", { script: "hello" });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"generation_type":"eleven_labs"'),
        })
      );
    });

    it("should pass through legacy names unchanged", async () => {
      const fetchFn = mockFetch(201, { generation_id: "gen-1", status: "pending" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateContent("agent-1", "eng-1", "cell-1", "lipsync", { model: "sync_so" });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"generation_type":"lipsync"'),
        })
      );
    });
  });

  describe("agent chat", () => {
    it("generateIdeas should POST to agent.gen.pro", async () => {
      const fetchFn = mockFetch(202, { run_id: "run-1", conversation_id: "conv-1", status: "running", firebase_path: "/agent_runs/1/run-1/" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const result = await client.generateIdeas("agent-1", { numIdeas: 3 });
      expect(result.run_id).toBe("run-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agent/run",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("generateIdeas should include requirements in message", async () => {
      const fetchFn = mockFetch(202, { run_id: "run-1", conversation_id: "conv-1", status: "running", firebase_path: "/" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.generateIdeas("agent-1", { requirements: ["under 12 seconds", "no talking avatar"] });
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("under 12 seconds"),
        })
      );
    });

    it("refineIdeas should pass conversation_id", async () => {
      const fetchFn = mockFetch(202, { run_id: "run-2", conversation_id: "conv-1", status: "running", firebase_path: "/" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.refineIdeas("agent-1", "conv-1", "make idea 1 punchier");
      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"conversation_id":"conv-1"'),
        })
      );
    });

    it("getRunStatus should GET from agent.gen.pro", async () => {
      const fetchFn = mockFetch(200, { run_id: "run-1", status: "completed", messages: [] });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const result = await client.getRunStatus("run-1");
      expect(result.status).toBe("completed");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agent/runs/run-1",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("approveRun should send approved true to the approve endpoint", async () => {
      const fetchFn = mockFetch(200, { run_id: "run-1", status: "running" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.approveRun("run-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agent/runs/run-1/approve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ approved: true }),
        })
      );
    });

    it("rejectRun should send approved false to the approve endpoint", async () => {
      const fetchFn = mockFetch(200, { run_id: "run-1", status: "failed" });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.rejectRun("run-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agent/runs/run-1/approve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ approved: false }),
        })
      );
    });

    it("listIdeas should include status filter", async () => {
      const fetchFn = mockFetch(200, []);
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.listIdeas("agent-1", "generated");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agent/ideas?agent_id=agent-1&status=generated",
        expect.any(Object)
      );
    });

    it("getAgentProfile should GET from agent.gen.pro", async () => {
      const fetchFn = mockFetch(200, { identity: { name: "Test" }, voice: {}, brand: null });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const profile = await client.getAgentProfile("agent-1");
      expect(profile.identity.name).toBe("Test");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agent/profile?agent_id=agent-1",
        expect.any(Object)
      );
    });

    it("should use custom agentBaseUrl when provided", async () => {
      const fetchFn = mockFetch(200, { run_id: "r", status: "completed", messages: [] });
      const client = new GenClient({
        apiKey: "key",
        agentBaseUrl: "https://custom-agent.example.com/v1",
        fetch: fetchFn,
      });
      await client.getRunStatus("run-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://custom-agent.example.com/v1/agent/runs/run-1",
        expect.any(Object)
      );
    });
  });

  describe("Step 3 (Monitoring): Watchlists (agent-core.gen.pro)", () => {
    it("listWatchlists hits agent-core base URL", async () => {
      const fetchFn = mockFetch(200, []);
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.listWatchlists("agent-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent-core.gen.pro/v1/agents/agent-1/watchlists",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("createWatchlist POSTs the body with sources", async () => {
      const fetchFn = mockFetch(201, {
        id: "wl1",
        user_id: "11",
        agent_id: "agent-1",
        name: "crypto watch",
        intent_active: true,
        sources: [],
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.createWatchlist("agent-1", {
        name: "crypto watch",
        sources: [
          { platform: "tiktok", target_type: "keyword", target_value: "btc" },
        ],
      });
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe(
        "https://agent-core.gen.pro/v1/agents/agent-1/watchlists"
      );
      expect(JSON.parse(call[1].body)).toEqual({
        name: "crypto watch",
        sources: [
          { platform: "tiktok", target_type: "keyword", target_value: "btc" },
        ],
      });
    });

    it("pauseWatchlist sends intent_active=false", async () => {
      const fetchFn = mockFetch(200, {
        id: "wl1",
        user_id: "11",
        agent_id: "agent-1",
        name: "x",
        intent_active: false,
        sources: [],
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.pauseWatchlist("agent-1", "wl1");
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].method).toBe("PATCH");
      expect(JSON.parse(call[1].body)).toEqual({ intent_active: false });
    });

    it("removeWatchlistSource by sourceId hits the id path", async () => {
      const fetchFn = mockFetch(200, { ok: true, removed: true });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.removeWatchlistSource("agent-1", "wl1", { sourceId: "src9" });
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent-core.gen.pro/v1/agents/agent-1/watchlists/wl1/sources/src9",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("removeWatchlistSource by key uses query string", async () => {
      const fetchFn = mockFetch(200, { ok: true, removed: true });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.removeWatchlistSource("agent-1", "wl1", {
        platform: "tiktok",
        target_type: "keyword",
        target_value: "btc",
      });
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain(
        "/agents/agent-1/watchlists/wl1/sources?"
      );
      expect(call[0]).toContain("platform=tiktok");
      expect(call[0]).toContain("target_type=keyword");
      expect(call[0]).toContain("target_value=btc");
    });

    it("should use custom agentCoreBaseUrl when provided", async () => {
      const fetchFn = mockFetch(200, []);
      const client = new GenClient({
        apiKey: "key",
        agentCoreBaseUrl: "https://agent-core-staging.example.com/v1",
        fetch: fetchFn,
      });
      await client.listWatchlists("agent-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent-core-staging.example.com/v1/agents/agent-1/watchlists",
        expect.any(Object)
      );
    });
  });

  describe("Step 4 (Assets): Proof of Genesis (agent-core.gen.pro)", () => {
    it("listProofOfGenesisBackups hits agent-core base URL", async () => {
      const fetchFn = mockFetch(200, { backups: [] });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.listProofOfGenesisBackups("agent-1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent-core.gen.pro/v1/agents/agent-1/proof-of-genesis/backups",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("listProofOfGenesisBackups can include removed rows", async () => {
      const fetchFn = mockFetch(200, { backups: [] });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.listProofOfGenesisBackups("agent-1", { includeRemoved: true });
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent-core.gen.pro/v1/agents/agent-1/proof-of-genesis/backups?include_removed=true",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("createProofOfGenesisBackup POSTs asset backup body", async () => {
      const fetchFn = mockFetch(201, {
        id: 101,
        agent_id: "agent-1",
        status: "synced",
        source_event: "manual",
        source_url: "https://assets.gen.pro/final.mp4",
        asset_type: "video",
        visibility: "public",
        encrypted: false,
        billing_operation: "backup_to_blockchain",
        billing_outboxed: false,
        created_at: "2026-06-05T16:00:00Z",
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.createProofOfGenesisBackup("agent-1", {
        asset_url: "https://assets.gen.pro/final.mp4",
        asset_type: "video",
        visibility: "public",
        encrypted: false,
        source_event: "manual",
        idempotency_key: "content-resource-4821-v1",
        metadata: { content_resource_id: 4821 },
      });
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe(
        "https://agent-core.gen.pro/v1/agents/agent-1/proof-of-genesis/backups"
      );
      expect(JSON.parse(call[1].body)).toEqual({
        asset_url: "https://assets.gen.pro/final.mp4",
        asset_type: "video",
        visibility: "public",
        encrypted: false,
        source_event: "manual",
        idempotency_key: "content-resource-4821-v1",
        metadata: { content_resource_id: 4821 },
      });
    });

    it("removeProofOfGenesisBackup soft-removes by id", async () => {
      const fetchFn = mockFetch(200, {
        id: 101,
        agent_id: "agent-1",
        status: "synced",
        source_event: "manual",
        source_url: "https://assets.gen.pro/final.mp4",
        asset_type: "video",
        visibility: "public",
        billing_operation: "backup_to_blockchain",
        billing_outboxed: false,
        removed_at: "2026-06-05T17:00:00Z",
        created_at: "2026-06-05T16:00:00Z",
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.removeProofOfGenesisBackup("agent-1", 101);
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent-core.gen.pro/v1/agents/agent-1/proof-of-genesis/backups/101",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Step 3 (Monitoring): Recurring Jobs (agent.gen.pro)", () => {
    it("listRecurringJobs hits agent.gen.pro", async () => {
      const fetchFn = mockFetch(200, { recurring_jobs: [] });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      const res = await client.listRecurringJobs("agent-1");
      expect(res).toEqual({ recurring_jobs: [] });
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agents/agent-1/recurring-jobs",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("createRecurringJob POSTs the full body", async () => {
      const fetchFn = mockFetch(201, {
        id: "j1",
        user_id: 11,
        agent_id: "agent-1",
        name: "daily ideas",
        job_type: "generate_content_ideas",
        prompt: "Generate content ideas",
        schedule: { cadence: "daily", timezone: "UTC", time_of_day: "09:00" },
        delivery: { type: "chat_only" },
        status: "active",
        created_at: "2026-05-27T00:00:00Z",
        updated_at: "2026-05-27T00:00:00Z",
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.createRecurringJob("agent-1", {
        job_type: "generate_content_ideas",
        prompt: "Generate content ideas",
        schedule: { cadence: "daily", timezone: "UTC", time_of_day: "09:00" },
        delivery: { type: "chat_only" },
      });
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe(
        "https://agent.gen.pro/v1/agents/agent-1/recurring-jobs"
      );
      expect(JSON.parse(call[1].body)).toEqual({
        job_type: "generate_content_ideas",
        prompt: "Generate content ideas",
        schedule: { cadence: "daily", timezone: "UTC", time_of_day: "09:00" },
        delivery: { type: "chat_only" },
      });
    });

    it("pauseRecurringJob POSTs to /pause", async () => {
      const fetchFn = mockFetch(200, {
        id: "j1",
        user_id: 11,
        agent_id: "agent-1",
        name: "x",
        job_type: "generate_content_ideas",
        prompt: "p",
        schedule: { cadence: "daily", timezone: "UTC" },
        delivery: { type: "chat_only" },
        status: "paused",
        created_at: "x",
        updated_at: "x",
      });
      const client = new GenClient({ apiKey: "key", fetch: fetchFn });
      await client.pauseRecurringJob("agent-1", "j1");
      expect(fetchFn).toHaveBeenCalledWith(
        "https://agent.gen.pro/v1/agents/agent-1/recurring-jobs/j1/pause",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
