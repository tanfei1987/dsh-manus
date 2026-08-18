> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# task.create

> Creates a new task. The task runs asynchronously. Poll for progress with [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages), send follow-ups with [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage). See the [Task Lifecycle](https://open.manus.ai/docs/v2/task-lifecycle) guide for the complete flow.

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **OAuth scope:** `create_task` or `manage_all_tasks` — see the [Open App](https://open.manus.ai/docs/v2/open-app) guide. With `create_task` scope, tasks created via OAuth are scoped to the app — only tokens from the same Open App can access them.
</Tip>

<Tip>
  **Talk to an agent:** To send a message to an existing agent instead of creating a new task, use [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage) with `agent-default-main_task` as `task_id`. See the [Agents](https://open.manus.ai/docs/v2/agents-overview) guide.

  **Message length:** User text in `message.content` is limited to approximately **5,000 estimated tokens**. Manus uses a lightweight text estimate, so the exact character count varies by language and content. For a ContentPart array, the limit applies to the combined text of all `text` parts; file parts do not count. Input over the limit returns `InvalidArgument` (HTTP 400).

  **Structured Output:** Pass `structured_output_schema` to get the agent's result in a specific JSON format. See the [Structured Output](https://open.manus.ai/docs/v2/structured-output) guide.

  **Attach files:** Upload via [file.upload](https://open.manus.ai/docs/v2/file.upload) and pass the `file_id` in the message content, or use `file_url` / `file_data` directly. There is no hard limit on the number of attachments.

  **Connectors:** Pass connector IDs in `message.connectors`. Get IDs from [connector.list](https://open.manus.ai/docs/v2/connector.list) or the [Connectors](https://open.manus.ai/docs/v2/connectors) guide. If omitted and `project_id` is set, the project's default connectors will be used.

  **Enable skills:** Pass skill IDs from [skill.list](https://open.manus.ai/docs/v2/skill.list) in `message.enable_skills` to control which skills are available for the agent. If omitted, the user's default enabled skills are loaded automatically.

  **Force skills:** Pass skill IDs in `message.force_skills` to ensure the agent invokes them. Forced skills are automatically available even if not listed in `enable_skills`.

  **Reference existing tasks:** Pass task IDs in `message.task_references` (up to 20) to let the agent browse those tasks. The agent reads them on demand — it can outline a task, search its conversation and files, and read specific parts — rather than receiving their full content upfront. Get task IDs from the `task_id` of a create response or from [task.list](https://open.manus.ai/docs/v2/task.list). If you take one from a task URL, pass only the trailing 22-character ID, not the whole URL.
</Tip>

<Warning>
  **Attachment size limits** depend on how you reference the file:

  * `file_id` — a file pre-uploaded via [file.upload](https://open.manus.ai/docs/v2/file.upload). No additional limit here; it is bound only by the upload limits (≤ **512 MB** per file).
  * `file_url` — a direct URL that Manus downloads. Capped at **20 MB**.
  * `file_data` — inline base64 content. Capped at **20 MB** after decoding (\~26.7 MB of base64 text).

  These are two different paths: large files must be uploaded via [file.upload](https://open.manus.ai/docs/v2/file.upload) first and referenced by `file_id`. Inline `file_url` / `file_data` attachments cannot exceed 20 MB.
</Warning>

<Warning>
  **Malformed input does fail the request.** Every entry must be a bare 22-character alphanumeric task ID; anything else — a full task URL, a shortcut value — returns `InvalidArgument` (HTTP 400). More than 20 entries fails the same way, and that cap is applied to the array as sent, *before* duplicates are removed: 21 entries fail even if some of them repeat.

  **Referencing a task you cannot open, however, does not fail the request.** Access is checked when the agent reads a reference, not when you send it. A task that does not exist, or that your account cannot open, is reported to the agent as not found — the agent continues without it. This is deliberate: failing at request time would let anyone probe which task IDs exist.

  The one exception is an OAuth App holding only the `create_task` scope. It can reference only tasks it created itself, and gets `404` at request time otherwise — the same boundary as [task.detail](https://open.manus.ai/docs/v2/task.detail) and [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages).
</Warning>


## OpenAPI

````yaml POST /v2/task.create
openapi: 3.1.0
info:
  title: Manus OpenAPI v2
  description: >-
    API for integrating Manus into your workflow. All responses are wrapped with
    {"ok": true, "request_id": "...", ...} for success and {"ok": false,
    "request_id": "...", "error": {"code": "...", "message": "..."}} for errors.
  version: 2.0.0
servers:
  - url: https://api.manus.ai
security:
  - ApiKeyAuth: []
paths:
  /v2/task.create:
    post:
      summary: CreateTask
      description: >-
        Creates a new task. The task runs asynchronously. Poll for progress with
        [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages),
        send follow-ups with
        [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage). See
        the [Task Lifecycle](https://open.manus.ai/docs/v2/task-lifecycle) guide
        for the complete flow.
      operationId: openapi.v2.OpenapiV2Service.CreateTask
      parameters:
        - name: x-manus-api-key
          in: header
          required: false
          schema:
            type: string
          description: >-
            API key for direct authentication. Provide either this or
            `Authorization`, not both. See
            [Authentication](https://open.manus.ai/docs/v2/authentication).
        - name: Authorization
          in: header
          required: false
          schema:
            type: string
            example: Bearer {access_token}
          description: >-
            OAuth2 access token in `Bearer {token}` format. Provide either this
            or `x-manus-api-key`, not both. See the [Open
            App](https://open.manus.ai/docs/v2/open-app) guide.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  $ref: '#/components/schemas/Message'
                  description: >-
                    The message to start the task with. Contains the prompt
                    text, optional file attachments, and connector/skill
                    configuration.
                project_id:
                  type: string
                  description: >-
                    Project ID to associate this task with. The project's
                    instruction will be automatically applied. Use
                    [project.list](https://open.manus.ai/docs/v2/project.list)
                    to get available project IDs.
                locale:
                  type: string
                  description: >-
                    Locale for the task output language (e.g., "en", "zh-CN",
                    "ja"). Defaults to the user's account locale setting.
                interactive_mode:
                  type: boolean
                  description: >-
                    When enabled, the agent may pause and ask follow-up
                    questions if the input is insufficient. When disabled
                    (default), the agent proceeds with best-effort execution
                    without asking.
                  default: false
                hide_in_task_list:
                  type: boolean
                  description: >-
                    When true, the task will not appear in the Manus webapp task
                    list. The task is still accessible via the task_url in the
                    response. Useful for automated/background tasks.
                  default: false
                share_visibility:
                  type: string
                  enum:
                    - private
                    - team
                    - public
                  description: >-
                    Controls who can view the task. "private" (default) — only
                    the task creator can view. "team" — all team members can
                    view. "public" — anyone with the share_url can view without
                    authentication.
                  default: private
                agent_profile:
                  type: string
                  enum:
                    - manus-1.6
                    - manus-1.6-lite
                    - manus-1.6-max
                  description: >-
                    Agent profile to use for the task. "manus-1.6" (default) —
                    standard capability. "manus-1.6-lite" — lightweight, faster
                    responses. "manus-1.6-max" — maximum capability. Free
                    personal accounts are downgraded to `manus-1.6-lite`
                    regardless of the requested value.
                  default: manus-1.6
                title:
                  type: string
                  description: >-
                    Custom title for the task. If not provided, a title will be
                    auto-generated based on the input message.
                structured_output_schema:
                  type: object
                  description: >-
                    JSON Schema for structured output extraction. When provided,
                    the agent runs normally, then a post-processing step
                    extracts a result conforming to your schema. The schema must
                    follow the [Structured
                    Output](https://open.manus.ai/docs/v2/structured-output)
                    subset of JSON Schema: all object properties must be listed
                    in `required`, and `additionalProperties` must be `false`.
                    See the [Structured
                    Output](https://open.manus.ai/docs/v2/structured-output)
                    guide.
              required:
                - message
      responses:
        '200':
          description: Task created successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                    example: true
                    description: Whether the request was successful.
                  request_id:
                    type: string
                    description: >-
                      Unique identifier for this API request, useful for
                      debugging.
                  task_id:
                    type: string
                    description: >-
                      Unique identifier for the created task. Use this to track,
                      update, or delete the task.
                  task_title:
                    type: string
                    description: >-
                      Title for the task. Returns the custom title if one was
                      provided in the request, otherwise an auto-generated title
                      based on the input message.
                  task_url:
                    type: string
                    description: >-
                      URL to view the task in the Manus webapp (e.g.,
                      https://manus.im/app/{task_id}).
                  share_url:
                    type: string
                    description: >-
                      Publicly accessible URL for sharing. Only present when
                      share_visibility is not "private".
                  share_visibility:
                    type: string
                    enum:
                      - private
                      - team
                      - public
                    description: The actual visibility state of the task.
        4XX:
          description: Error response.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security: []
components:
  schemas:
    Message:
      type: object
      description: A message to send to a task.
      properties:
        content:
          description: >-
            String (plain text) or array of ContentPart objects. User text is
            limited to approximately 5,000 estimated tokens per request; the
            exact character count varies by language and content. For an array,
            the limit applies to the combined text of all text parts; file parts
            do not count. Input over the limit returns InvalidArgument (HTTP
            400).
          oneOf:
            - type: array
              items:
                $ref: '#/components/schemas/ContentPart'
            - type: string
        connectors:
          type: array
          items:
            type: string
          description: >-
            List of connector IDs to enable for this task. Resolution order when
            omitted: 1) if the task belongs to a project, the project's default
            connectors are used; 2) otherwise, the user's default enabled
            connectors are used. Use
            [connector.list](https://open.manus.ai/docs/v2/connector.list) to
            get the connectors installed in your account.
        enable_skills:
          type: array
          items:
            type: string
          description: >-
            Skill IDs to enable for this task. If empty or omitted, loads the
            skills the user has enabled in their account settings. Use
            [skill.list](https://open.manus.ai/docs/v2/skill.list) to retrieve
            available skill IDs.
        force_skills:
          type: array
          items:
            type: string
          description: >-
            Skill IDs the agent must invoke during this task. Forced skills are
            automatically available even if not listed in enable_skills.
        task_references:
          type: array
          items:
            type: string
            pattern: ^[A-Za-z0-9]{22}$
          maxItems: 20
          description: >-
            Task IDs of existing tasks to reference from this message. The agent
            can then browse the conversation and files of those tasks on demand.
            Each entry must be a bare 22-character alphanumeric task ID — a full
            task URL, or a shortcut value such as `agent-default-main_task`, is
            rejected. Validated at request time: any malformed ID, or more than
            20 entries, fails with `InvalidArgument` (HTTP 400). The 20-item cap
            is applied to the array as sent, before duplicates are removed, so
            21 entries fail even if some repeat. References accumulate: IDs
            passed to
            [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage)
            are added to the references the task already has, and an empty array
            does not clear them. Duplicates are dropped, and so is a
            self-reference on task.sendMessage. Beyond those request-time
            checks, access is enforced when the agent reads a reference, not
            when you send it: a task you cannot open is reported to the agent as
            not found and your request still succeeds. One exception: an OAuth
            App that holds only the create_task scope can reference only tasks
            it created itself, and gets 404 at request time otherwise.
      required:
        - content
    ErrorResponse:
      type: object
      description: Standard error response format returned when a request fails.
      properties:
        ok:
          type: boolean
          example: false
          description: Always false for error responses.
        request_id:
          type: string
          description: >-
            Unique identifier for this API request, useful for debugging with
            support.
        error:
          type: object
          description: Error details.
          properties:
            code:
              type: string
              description: >-
                Machine-readable error code (e.g., "invalid_argument",
                "not_found", "permission_denied", "rate_limited").
            message:
              type: string
              description: Human-readable error description explaining what went wrong.
    ContentPart:
      oneOf:
        - type: object
          title: Text
          properties:
            type:
              type: string
              enum:
                - text
              description: Must be "text".
            text:
              type: string
              description: >-
                The text content of the message. Across a ContentPart array, all
                text parts must contain no more than approximately 5,000
                estimated tokens in total.
          required:
            - type
            - text
        - type: object
          title: File
          description: '**Provide the file via one of: file_id, file_url, or file_data.**'
          properties:
            type:
              type: string
              enum:
                - file
              description: Must be "file".
            file_id:
              type: string
              description: >-
                ID of a previously uploaded file. Upload via
                [file.upload](https://open.manus.ai/docs/v2/file.upload) first
                to get the file ID.
            file_url:
              type: string
              description: >-
                Publicly accessible URL to the file. The agent will download it
                directly.
            file_data:
              type: string
              description: >-
                Base64 encoded file content. Format:
                `data:<mime_type>;base64,<encoded_content>` (e.g.,
                `data:application/pdf;base64,JVBERi0...`).
            filename:
              type: string
              description: >-
                Display name of the file including extension (e.g.,
                "report.pdf"). Required when using file_data; recommended for
                file_url.
            mime_type:
              type: string
              description: >-
                MIME type of the file (e.g., "application/pdf", "image/png").
                Optional; auto-detected from filename if omitted.
          required:
            - type
        - type: object
          title: Voice
          description: '**Provide the audio via one of: file_id, file_url, or file_data.**'
          properties:
            type:
              type: string
              enum:
                - voice
              description: Must be "voice".
            file_id:
              type: string
              description: >-
                ID of a previously uploaded audio file. Upload via
                [file.upload](https://open.manus.ai/docs/v2/file.upload) first
                to get the file ID.
            file_url:
              type: string
              description: >-
                Publicly accessible URL to the audio file. The agent will
                download and transcribe it.
            file_data:
              type: string
              description: >-
                Base64 encoded audio content. Format:
                `data:<mime_type>;base64,<encoded_content>` (e.g.,
                `data:audio/wav;base64,UklGRi...`).
            filename:
              type: string
              description: >-
                Display name of the audio file including extension (e.g.,
                "recording.wav"). Required when using file_data.
            mime_type:
              type: string
              description: >-
                MIME type of the audio file (e.g., "audio/wav", "audio/mp3").
                Optional; auto-detected from filename if omitted.
          required:
            - type
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-manus-api-key

````