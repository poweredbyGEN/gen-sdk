# gen-sdk

TypeScript SDK for the GEN Auto Content Engine API.

The SDK is organized around the **5-step content creation journey**:

1. **Set Up Your Agent** — identity, voice, look, API keys.
2. **Generate Content Ideas** — research, brainstorm, refine, lock preferences.
3. **Convert Idea to Vidsheet** — clone a template or create an engine from an idea.
4. **Edit & Generate** — rows, columns, cells, layers, uploads, generations.
5. **Export & Publish** — render the final video and publish to social.

## Installation

```bash
npm install @poweredbygen/gen-sdk
```

## Two APIs: flat or journey-namespaced

The SDK ships **both** a flat `GenClient` and a **journey-first namespace facade**. Pick whichever fits your code — they share the same instance.

```ts
import { gen } from "@poweredbygen/gen-sdk";

const { sdk, client } = gen({ apiKey: "ref_your_token_here" });

// journey-first
await sdk.setup.getMe();
await sdk.ideas.generateIdeas(agentId, { numIdeas: 5 });
await sdk.vidsheet.cloneTemplate("ugc-avatar", agentId);
await sdk.edit.createRow(agentId, engineId);
await sdk.export.renderVideo(agentId, engineId, cellId);

// flat, backward-compatible
await client.getMe();
await client.generateIdeas(agentId, { numIdeas: 5 });
```

Or construct them separately:

```ts
import { GenClient, createSdk } from "@poweredbygen/gen-sdk";

const client = new GenClient({ apiKey: "ref_..." });
const sdk = createSdk(client);
```

## End-to-end: Step 1 to Step 5

```ts
import { gen } from "@poweredbygen/gen-sdk";

const { sdk } = gen({ apiKey: process.env.GEN_API_KEY! });

// Step 1 — Set Up Your Agent
const me = await sdk.setup.getMe();
const { agent } = await sdk.setup.createAgent({
  name: "UGC Creator",
  description: "Generates TikTok-ready UGC videos.",
});
await sdk.setup.patchAgentCore(String(agent.id), {
  overview: {
    brand_name: "Acme Skincare",
    keywords: ["glowy", "clean beauty"],
    target_platforms: ["tiktok"],
    shortform: true,
  },
});

// Step 2 — Generate Content Ideas
const run = await sdk.ideas.generateIdeas(String(agent.id), {
  numIdeas: 5,
  videoType: "talking_avatar",
  requirements: ["hook in first 2 seconds", "under 15 seconds"],
});
await sdk.ideas.waitForRun(run.run_id);
const ideas = await sdk.ideas.listIdeas(String(agent.id), "generated");
const idea = ideas[0];

// Step 3 — Convert Idea to Vidsheet
const engine = await sdk.vidsheet.cloneTemplate("ugc-talking-avatar", agent.id);

// Step 4 — Edit & Generate: inject the idea's fields into the cloned vidsheet
const row = await sdk.edit.createRow(agent.id, engine.id);
const promptCell = row.cells![0];
await sdk.edit.updateCell(agent.id, engine.id, promptCell.id, idea.hook);

const gen1 = await sdk.edit.generateContent(
  agent.id,
  engine.id,
  promptCell.id,
  "text",
  { model: "gemini_2_0_flash", prompt: "Write a 15s script. Hook first." }
);
await sdk.edit.waitForGeneration(gen1.generation_id);

// Step 5 — Export & Publish
const finalCell = row.cells!.find((c) => c.role === "final_video")!;
const render = await sdk.export.renderVideo(agent.id, engine.id, finalCell.id);
const rendered = await sdk.export.waitForGeneration(render.generation_id);
const mediaUrl = rendered.output_resources![0].url;

await sdk.export.publishContent(agent.id, {
  platform: "tiktok",
  media_url: mediaUrl,
  description: idea.title + " #fyp",
  schedule_type: "now",
});
```

## Step 1 — Set Up Your Agent

```ts
// Workspaces + agents
const workspaces = await sdk.setup.listWorkspaces();
const { agent } = await sdk.setup.createAgent({ name: "My Agent" });

// Agent core (recommended single-call setup)
await sdk.setup.patchAgentCore(String(agent.id), {
  identity: { name: "My Agent" },
  overview: { brand_name: "Acme", keywords: ["fun"], target_platforms: ["tiktok"] },
  personality: "Witty and helpful",
});

// Avatars
await sdk.setup.listAgentAvatars(agent.id);
await sdk.setup.createAgentAvatar(agent.id, { degod_avatar_id: "12345" });

// API keys
const key = await sdk.setup.createApiKey("cron-runner");
console.log(key.token); // returned ONCE — store it

// Voice design flow (4-step)
const { voice_sample } = await sdk.setup.generateVoiceScript(String(agent.id));
const { voice_description } = await sdk.setup.generateVoiceDescription(String(agent.id), {
  gender: "female",
});
const { samples } = await sdk.setup.generateVoiceSamples(String(agent.id), {
  text: voice_sample,
  description: voice_description,
});
const voice = await sdk.setup.finalizeDesignedVoice(String(agent.id), {
  generation_id: samples[0].generation_id,
  name: "Primary voice",
});
```

## Step 2 — Generate Content Ideas

```ts
// Deep research to ground a brainstorm
await sdk.ideas.runResearch({
  topic: "skincare trends spring 2026",
  agentId: String(agent.id),
  depth: "default",
});

// Brainstorm
const run = await sdk.ideas.generateIdeas(String(agent.id), {
  numIdeas: 10,
  videoType: "montage",
  requirements: ["before/after", "under 12s"],
});
const finished = await sdk.ideas.waitForRun(run.run_id);

// Refine in-place
await sdk.ideas.refineIdeas(String(agent.id), run.conversation_id, "make idea 1 hook punchier");

// Lock a permanent preference
await sdk.ideas.setContentPreference(String(agent.id), "always use statement hooks");

// Ongoing monitoring to feed future brainstorms
await sdk.ideas.createMonitoringJob(agent.id, {
  platform: "tiktok",
  search_type: "hashtag",
  value: "#skincareroutine",
  monitoring: true,
  comment_monitoring: true,
  max_results: 50,
});
```

## Step 3 — Convert Idea to Vidsheet

```ts
// Option A: clone a template (fastest)
const templates = await sdk.vidsheet.listTemplates();
const engine = await sdk.vidsheet.cloneTemplate("ugc-talking-avatar", agent.id);

// Option B: create an empty engine
const empty = await sdk.vidsheet.createEngine(agent.id, "My Engine");
```

## Step 4 — Edit & Generate

```ts
// Structure
await sdk.edit.createColumn(agent.id, engine.id, { title: "hook", type: "text" });
await sdk.edit.updateColumn(agent.id, engine.id, columnId, { position: 0 });

const row = await sdk.edit.createRow(agent.id, engine.id);
await sdk.edit.updateCell(agent.id, engine.id, cellId, "hero line goes here");

// Variables (template substitution)
await sdk.edit.createVariable(agent.id, engine.id, { key: "brand", value: "Acme" });

// Upload a custom asset
const upload = await sdk.edit.createDirectUpload({
  filename: "hero.mp4",
  byte_size: 12345678,
  checksum: "base64md5==",
  content_type: "video/mp4",
});
// ...PUT the file to upload.url...
await sdk.edit.createContentResource(agent.id, { signed_id: upload.signed_id });

// Generation
const gen = await sdk.edit.generateContent(
  agent.id,
  engine.id,
  cellId,
  "video_from_text",
  { model: "veo_3", prompt: "Slow dolly in on a red lipstick", aspect_ratio: "9:16", duration: 8 }
);
await sdk.edit.waitForGeneration(gen.generation_id);
```

## Step 5 — Export & Publish

```ts
// Render final composed video
const render = await sdk.export.renderVideo(agent.id, engine.id, finalCellId);
const rendered = await sdk.export.waitForGeneration(render.generation_id);

// Publish or schedule
await sdk.export.publishContent(agent.id, {
  platform: "tiktok",
  media_url: rendered.output_resources![0].url,
  description: "Ready for you #fyp",
  schedule_type: "scheduled",
  scheduled_time: "2026-05-01T15:00:00Z",
});
```

## Generation types

Pass canonical types to `generateContent`. The SDK resolves the backend job shape for you.

| Canonical | Key `data` fields |
|-----------|-------------------|
| `text` | `model`, `prompt` |
| `image_from_text` | `prompt`, `model`, `aspect_ratio` |
| `video_from_text` | `prompt`, `model`, `aspect_ratio`, `duration` |
| `video_from_image` | `prompt`, `model`, `image_resource_id`, `aspect_ratio`, `duration` |
| `video_from_ingredients` | `prompt`, `model`, `asset_resource_ids`, `aspect_ratio`, `duration` |
| `speech_from_text` | `script`, `voice_method`, `voice_id?` |
| `lipsync` | `model`, `video_resource_id`, `audio_resource_id` |
| `captions` | `model`, `source_resource_id` |

## Error handling

```ts
import { GenClient, GenApiError } from "@poweredbygen/gen-sdk";

try {
  await client.getAgent("nonexistent");
} catch (err) {
  if (err instanceof GenApiError) {
    console.log(err.status);     // 404
    console.log(err.error);      // "Not found"
    console.log(err.errorCode);  // "not_found"
  }
}
```

## Configuration

```ts
const client = new GenClient({
  apiKey: "ref_...",                           // Required
  baseUrl: "https://api.gen.pro/v1",           // Optional
  agentBaseUrl: "https://agent.gen.pro/v1",    // Optional — chat/ideas/research
});
```

## Method index

Every method is available on both `client.methodName(...)` and on the matching namespace (e.g. `sdk.setup.methodName(...)`).

**Step 1 — `sdk.setup`:** `getMe`, `listWorkspaces`, `listAgents`, `createAgent`, `getAgent`, `updateAgent`, `deleteAgent`, `listOrganizations`, `createOrganization`, `getOrganization`, `updateOrganization`, `deleteOrganization`, `getAgentCore`, `patchAgentCore`, `addAgentInspiration`, `removeAgentInspiration`, `addAgentAccount`, `removeAgentAccount`, `getAgentProfile`, `createAgentProfile`, `updateAgentProfile`, `resetAgentProfile`, `listAgentAvatars`, `createAgentAvatar`, `deleteAgentAvatar`, `listAgentVoices`, `getElevenLabsStatus`, `connectElevenLabs`, `testElevenLabsKey`, `disconnectElevenLabs`, `generateVoiceScript`, `generateVoiceDescription`, `generateVoiceSamples`, `finalizeDesignedVoice`, `cloneVoice`, `deleteVoice`, `previewVoice`, `getVoicePreviewStatus`, `listApiKeys`, `createApiKey`, `revokeApiKey`.

**Step 2 — `sdk.ideas`:** `generateIdeas`, `refineIdeas`, `setContentPreference`, `runResearch`, `getRunStatus`, `waitForRun`, `approveRun`, `rejectRun`, `listIdeas`, `updateIdeaStatus`, `listConversations`, `getConversation`, `deleteConversation`, `createMonitoringJob`, `updateMonitoringJob`.

**Step 3 — `sdk.vidsheet`:** `listTemplates`, `getTemplate`, `cloneTemplate`, `createEngine`, `getEngine`, `cloneEngine`.

**Step 4 — `sdk.edit`:** `listRows`, `createRow`, `duplicateRow`, `listColumns`, `createColumn`, `updateColumn`, `deleteColumn`, `getCell`, `updateCell`, `createLayer`, `getLayer`, `updateLayer`, `deleteLayer`, `listVariables`, `createVariable`, `updateVariable`, `deleteVariable`, `listAssetLibraries`, `listContentResources`, `getContentResource`, `createContentResource`, `updateContentResource`, `deleteContentResource`, `createDirectUpload`, `generateContent`, `generateLayer`, `getGeneration`, `stopGeneration`, `continueGeneration`, `waitForGeneration`.

**Step 5 — `sdk.export`:** `renderVideo`, `publishContent`, `waitForGeneration`.

## License

MIT
