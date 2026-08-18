> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Introduction

> Integrate Manus AI agents into your workflows with the Manus API

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Warning>
  **You are viewing API v2** — the latest version of the Manus API. API v1 has been deprecated and will be removed in the future. If you still need the v1 docs, see [API v1 documentation](https://open.manus.ai/docs/v1/overview).
</Warning>

# Manus API

The Manus API allows you to programmatically create and manage AI agent tasks. Build automations, orchestrate multi-step workflows, and integrate Manus into your applications through a simple REST API.

<CardGroup cols={2}>
  <Card title="Get your API key" icon="key" href="/docs/v2/authentication">
    Before making API calls, you'll need to create an API key. Head over to Authentication to get started.
  </Card>

  <Card title="Install the API skill" icon="wand-magic-sparkles" href="/docs/v2/manus-api-skill">
    Give Codex and other compatible coding agents current Manus API integration guidance.
  </Card>
</CardGroup>

## What you can do

<CardGroup cols={2}>
  <Card title="Tasks" icon="list-check" href="/docs/v2/create-task">
    Create tasks, send follow-up messages, and retrieve results — full multi-turn conversation support
  </Card>

  <Card title="Projects" icon="folder" href="/docs/v2/create-project">
    Organize tasks with shared instructions that apply automatically
  </Card>

  <Card title="Files" icon="file" href="/docs/v2/upload-file">
    Upload files as task attachments — PDFs, images, CSVs, and more
  </Card>

  <Card title="Webhooks" icon="webhook" href="/docs/v2/create-webhook">
    Get real-time notifications when tasks complete or need input
  </Card>

  <Card title="Skills" icon="wand-magic-sparkles" href="/docs/v2/list-skills">
    Extend agent capabilities with built-in and custom skills
  </Card>

  <Card title="Agents" icon="robot" href="/docs/v2/list-agents">
    Manage and configure your custom agents
  </Card>
</CardGroup>

## Base URL

All API requests are made to:

```
https://api.manus.ai
```

## Response format

All responses use a consistent wrapper:

**Success:**

```json theme={null}
{
  "ok": true,
  "request_id": "req_abc123",
  ...
}
```

**Error:**

```json theme={null}
{
  "ok": false,
  "request_id": "req_abc123",
  "error": {
    "code": "invalid_argument",
    "message": "task_id is required"
  }
}
```

| Error code          | Description                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `invalid_argument`  | Missing or invalid request parameters                                                                                         |
| `not_found`         | The requested resource does not exist                                                                                         |
| `permission_denied` | API key lacks permission for this action                                                                                      |
| `rate_limited`      | Too many requests — see [Rate Limits](https://open.manus.ai/docs/v2/rate-limits) for per-endpoint limits and backoff guidance |
