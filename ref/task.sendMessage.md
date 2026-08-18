> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# task.sendMessage

> Sends a follow-up message to a task for multi-turn conversation. Use this after [task.create](https://open.manus.ai/docs/v2/task.create) to continue talking, or to reply when `waiting_for_event_type` is `messageAskUser`. For other waiting types, use [task.confirmAction](https://open.manus.ai/docs/v2/task.confirmAction) instead.

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **OAuth scope:** `create_task` or `manage_all_tasks` — see the [Open App](https://open.manus.ai/docs/v2/open-app) guide. With `create_task` scope, can only access tasks created by this Open App.
</Tip>

<Tip>
  **Shortcut:** Use `agent-default-main_task` as `task_id` to send messages to the IM agent directly.

  **Message length:** User text in `message.content` is limited to approximately **5,000 estimated tokens**. Manus uses a lightweight text estimate, so the exact character count varies by language and content. For a ContentPart array, the limit applies to the combined text of all `text` parts; file parts do not count. Input over the limit returns `InvalidArgument` (HTTP 400).

  **Structured Output:** Pass `structured_output_schema` to extract a JSON result when the task next finishes. A new schema replaces the previous one. See the [Structured Output](https://open.manus.ai/docs/v2/structured-output) guide.

  **Attach files:** Upload via [file.upload](https://open.manus.ai/docs/v2/file.upload) and pass the `file_id` in the message content, or use `file_url` / `file_data` directly. There is no hard limit on the number of attachments.

  **Connectors:** Control this task's connectors with `message.connectors` and the top-level `clear_connectors` flag (three states):

  * **Override** — pass a non-empty `message.connectors` to replace the task's connectors with the new list. Get IDs from [connector.list](https://open.manus.ai/docs/v2/connector.list) or the [Connectors](https://open.manus.ai/docs/v2/connectors) guide.
  * **Clear** — pass `clear_connectors: true` to remove all connectors from the task.
  * **Reuse** (default) — omit both to keep the connectors configured at [task.create](https://open.manus.ai/docs/v2/task.create) time.

  Passing a non-empty `message.connectors` together with `clear_connectors: true` returns `InvalidArgument`.

  **Enable skills:** Pass skill IDs from [skill.list](https://open.manus.ai/docs/v2/skill.list) in `message.enable_skills` to control which skills are available for the agent. If omitted, the user's default enabled skills are loaded automatically.

  **Force skills:** Pass skill IDs in `message.force_skills` to ensure the agent invokes them. Forced skills are automatically available even if not listed in `enable_skills`.

  **Reference existing tasks:** Pass task IDs in `message.task_references` (up to 20 per request) to let the agent browse those tasks on demand. Unlike connectors, references **accumulate** — see the warning below. Note that this field takes bare 22-character task IDs only: the `agent-default-main_task` shortcut above is valid as `task_id` but not as a reference, and neither is a full task URL.

  **Waiting events:** Use this endpoint to reply when the agent asks a question (`messageAskUser`). For other waiting types like `gmailSendAction` or `deployAction`, use [task.confirmAction](https://open.manus.ai/docs/v2/task.confirmAction) instead.
</Tip>

<Warning>
  **Task references accumulate; they cannot be replaced or cleared.** IDs passed here are added to the references the task already has. Sending `["B"]` to a task that already references `A` leaves it referencing both. An empty array is a no-op, and there is no `clear_task_references` counterpart to `clear_connectors`.

  The 20-item cap applies per request. A task accumulating more than 20 references across several messages keeps the 20 most recently referenced and drops the oldest.
</Warning>

<Warning>
  **Malformed input does fail the request.** Every entry must be a bare 22-character alphanumeric task ID; anything else — a full task URL, or the `agent-default-main_task` shortcut — returns `InvalidArgument` (HTTP 400). More than 20 entries in one request fails the same way, and that cap is applied to the array as sent, *before* duplicates and the self-reference are removed.

  **Referencing a task you cannot open, however, does not fail the request.** Access is checked when the agent reads a reference, not when you send it. A task that does not exist, or that your account cannot open, is reported to the agent as not found — the agent continues without it. This is deliberate: failing at request time would let anyone probe which task IDs exist.

  The one exception is an OAuth App holding only the `create_task` scope. It can reference only tasks it created itself, and gets `404` at request time otherwise.

  A reference to the target task itself is silently dropped.
</Warning>

<Warning>
  **Attachment size limits** depend on how you reference the file:

  * `file_id` — a file pre-uploaded via [file.upload](https://open.manus.ai/docs/v2/file.upload). No additional limit here; it is bound only by the upload limits (≤ **512 MB** per file).
  * `file_url` — a direct URL that Manus downloads. Capped at **20 MB**.
  * `file_data` — inline base64 content. Capped at **20 MB** after decoding (\~26.7 MB of base64 text).

  These are two different paths: large files must be uploaded via [file.upload](https://open.manus.ai/docs/v2/file.upload) first and referenced by `file_id`. Inline `file_url` / `file_data` attachments cannot exceed 20 MB.
</Warning>


## OpenAPI

````yaml POST /v2/task.sendMessage
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
  /v2/task.sendMessage:
    post:
      summary: SendMessage
      description: >-
        Sends a follow-up message to a task for multi-turn conversation. Use
        this after [task.create](https://open.manus.ai/docs/v2/task.create) to
        continue talking, or to reply when `waiting_for_event_type` is
        `messageAskUser`. For other waiting types, use
        [task.confirmAction](https://open.manus.ai/docs/v2/task.confirmAction)
        instead.
      operationId: openapi.v2.OpenapiV2Service.SendMessage
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
                task_id:
                  type: string
                  description: >-
                    The unique identifier of the task to send the message to.
                    Supports the shortcut `agent-default-main_task` for the IM
                    agent's main task.
                message:
                  $ref: '#/components/schemas/Message'
                  description: >-
                    The follow-up message. Supports the same content formats as
                    task.create (plain text or multi-part with files). Note:
                    `message.connectors` behaves differently here than in
                    task.create — a non-empty list overrides the task's
                    connectors, while omitting it (or passing an empty array)
                    reuses the connectors configured at task.create time rather
                    than re-resolving project/user defaults. To remove all
                    connectors, use the top-level `clear_connectors` field
                    instead.
                agent_profile:
                  type: string
                  enum:
                    - manus-1.6
                    - manus-1.6-lite
                    - manus-1.6-max
                  description: >-
                    Agent profile to use for this turn. "manus-1.6" — standard
                    capability. "manus-1.6-lite" — lightweight, faster
                    responses. "manus-1.6-max" — maximum capability. Omit (or
                    pass empty string) to keep the task's current profile; this
                    endpoint does not default to `manus-1.6` like
                    [task.create](https://open.manus.ai/docs/v2/task.create)
                    does. Free personal accounts are downgraded to
                    `manus-1.6-lite` regardless of the requested value.
                structured_output_schema:
                  type: object
                  description: >-
                    JSON Schema for structured output extraction. Arms the
                    schema for the next time this task finishes (`stop_reason:
                    finish`). Sending a new schema replaces any previous one.
                    Omitting this field leaves the current schema state
                    unchanged — it does not clear an armed schema. See the
                    [Structured
                    Output](https://open.manus.ai/docs/v2/structured-output)
                    guide.
                clear_connectors:
                  type: boolean
                  description: >-
                    Removes all connectors from this task for this and
                    subsequent turns. Combine with `message.connectors` to form
                    three states: a non-empty `message.connectors` **overrides**
                    the task's connectors with the new list; `clear_connectors:
                    true` **clears** all connectors; omitting both **reuses**
                    the connectors configured at task.create time. Passing a
                    non-empty `message.connectors` together with
                    `clear_connectors: true` is a conflict and returns
                    `InvalidArgument`.
                  default: false
              required:
                - task_id
                - message
      responses:
        '200':
          description: Message sent successfully. The task will resume processing.
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
                    description: Unique identifier for this API request.
                  task_id:
                    type: string
                    description: The ID of the task the message was sent to.
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