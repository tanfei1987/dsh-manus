> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# task.listMessages

> Lists event messages for a task with cursor-based pagination. Use this to poll for progress after [task.create](https://open.manus.ai/docs/v2/task.create) or [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage). See the [Task Lifecycle](https://open.manus.ai/docs/v2/task-lifecycle) guide for how to handle each status.

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **OAuth scope:** `create_task` or `manage_all_tasks` — see the [Open App](https://open.manus.ai/docs/v2/open-app) guide. With `create_task` scope, can only access tasks created by this Open App.
</Tip>

<Tip>
  **Shortcut:** Use `agent-default-main_task` as `task_id` to read the IM agent's conversation history.

  **Status handling:** Check `status_update` events — **`running`** → keep polling, **`stopped`** → read results, **`waiting`** → respond with [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage) or [task.confirmAction](https://open.manus.ai/docs/v2/task.confirmAction), **`error`** → read error details.

  **Structured Output:** If the task was created with `structured_output_schema`, a `structured_output_result` event appears after the task stops. See the [Structured Output](https://open.manus.ai/docs/v2/structured-output) guide.

  See the [Task Lifecycle](https://open.manus.ai/docs/v2/task-lifecycle) guide for the complete flow.
</Tip>


## OpenAPI

````yaml GET /v2/task.listMessages
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
  /v2/task.listMessages:
    get:
      summary: ListMessages
      description: >-
        Lists event messages for a task with cursor-based pagination. Use this
        to poll for progress after
        [task.create](https://open.manus.ai/docs/v2/task.create) or
        [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage). See
        the [Task Lifecycle](https://open.manus.ai/docs/v2/task-lifecycle) guide
        for how to handle each status.
      operationId: openapi.v2.OpenapiV2Service.ListMessages
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
        - name: task_id
          in: query
          required: true
          schema:
            type: string
          description: >-
            The unique identifier of the task to list messages for. Supports the
            shortcut `agent-default-main_task` for the IM agent's main task.
        - name: limit
          in: query
          schema:
            type: integer
            description: 'Number of messages to return per page. Default: 50, Range: 1-200.'
        - name: cursor
          in: query
          schema:
            type: string
            description: >-
              Pagination cursor from the previous response's next_cursor field.
              Omit for the first page.
        - name: order
          in: query
          schema:
            type: string
            enum:
              - asc
              - desc
            description: >-
              Sort direction by timestamp. "desc" (default) returns newest
              first, "asc" returns oldest first (chronological order).
        - name: verbose
          in: query
          schema:
            type: boolean
            description: >-
              When true, includes detailed events: tool_used (tools the agent
              invoked), plan_update (full plan snapshots), new_plan_step
              (individual step additions), and explanation (agent reasoning).
              Default: false — only returns user_message, assistant_message,
              error_message, status_update, and user_stop.
        - name: slides_format
          in: query
          schema:
            type: string
            enum:
              - html
              - pptx
            description: >-
              Format for slides attachments in the response. "html" (default)
              returns raw HTML slides. "pptx" auto-converts HTML slides to
              PowerPoint format.
      responses:
        '200':
          description: Messages retrieved successfully.
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
                    description: The task ID these messages belong to.
                  messages:
                    type: array
                    items:
                      $ref: '#/components/schemas/TaskEvent'
                    description: >-
                      Array of task event objects representing the conversation
                      and agent activity.
                  has_more:
                    type: boolean
                    description: Whether there are more messages beyond this page.
                  next_cursor:
                    type: string
                    description: >-
                      Cursor for fetching the next page. Only present when
                      has_more is true.
        4XX:
          description: Error response.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security: []
      x-codeSamples:
        - lang: bash
          label: cURL
          source: |-
            curl --request GET \
              --url 'https://api.manus.ai/v2/task.listMessages?task_id=<string>&order=desc&limit=10' \
              --header 'x-manus-api-key: <api-key>'
        - lang: python
          label: Python
          source: |-
            import requests

            url = "https://api.manus.ai/v2/task.listMessages"

            headers = {
                "x-manus-api-key": "<api-key>"
            }

            response = requests.get(url, headers=headers, params={
                "task_id": "<string>",
                "order": "desc",
                "limit": "10"
            })

            print(response.text)
        - lang: javascript
          label: JavaScript
          source: >-
            const options = {
              method: 'GET',
              headers: {'x-manus-api-key': '<api-key>'}
            };


            fetch('https://api.manus.ai/v2/task.listMessages?task_id=<string>&order=desc&limit=10',
            options)
              .then(res => res.json())
              .then(res => console.log(res))
              .catch(err => console.error(err));
        - lang: php
          label: PHP
          source: |-
            <?php

            $curl = curl_init();

            curl_setopt_array($curl, [
              CURLOPT_URL => "https://api.manus.ai/v2/task.listMessages?task_id=<string>&order=desc&limit=10",
              CURLOPT_RETURNTRANSFER => true,
              CURLOPT_ENCODING => "",
              CURLOPT_MAXREDIRS => 10,
              CURLOPT_TIMEOUT => 30,
              CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
              CURLOPT_CUSTOMREQUEST => "GET",
              CURLOPT_HTTPHEADER => [
                "x-manus-api-key: <api-key>"
              ],
            ]);

            $response = curl_exec($curl);
            $err = curl_error($curl);

            curl_close($curl);

            if ($err) {
              echo "cURL Error #:" . $err;
            } else {
              echo $response;
            }
        - lang: go
          label: Go
          source: "package main\n\nimport (\n\t\"fmt\"\n\t\"net/http\"\n\t\"io\"\n)\n\nfunc main() {\n\n\turl := \"https://api.manus.ai/v2/task.listMessages?task_id=<string>&order=desc&limit=10\"\n\n\treq, _ := http.NewRequest(\"GET\", url, nil)\n\n\treq.Header.Add(\"x-manus-api-key\", \"<api-key>\")\n\n\tres, _ := http.DefaultClient.Do(req)\n\n\tdefer res.Body.Close()\n\tbody, _ := io.ReadAll(res.Body)\n\n\tfmt.Println(string(body))\n\n}"
        - lang: java
          label: Java
          source: >-
            HttpResponse<String> response =
            Unirest.get("https://api.manus.ai/v2/task.listMessages?task_id=<string>&order=desc&limit=10")
              .header("x-manus-api-key", "<api-key>")
              .asString();
        - lang: ruby
          label: Ruby
          source: >-
            require 'uri'

            require 'net/http'


            url =
            URI("https://api.manus.ai/v2/task.listMessages?task_id=<string>&order=desc&limit=10")


            http = Net::HTTP.new(url.host, url.port)

            http.use_ssl = true


            request = Net::HTTP::Get.new(url)

            request["x-manus-api-key"] = '<api-key>'


            response = http.request(request)

            puts response.read_body
components:
  schemas:
    TaskEvent:
      type: object
      description: >-
        A task event representing a message, status change, or agent activity.
        Only one payload field (user_message, assistant_message, etc.) will be
        present, determined by the type field.
      properties:
        id:
          type: string
          description: Unique identifier for this event.
        type:
          type: string
          enum:
            - user_message
            - assistant_message
            - error_message
            - status_update
            - tool_used
            - plan_update
            - new_plan_step
            - explanation
            - user_stop
            - structured_output_result
          description: >-
            Event type. Determines which payload field is present. tool_used,
            plan_update, new_plan_step, and explanation are only included when
            verbose=true. structured_output_result appears after task completion
            when a structured_output_schema was provided.
        timestamp:
          type: integer
          format: int64
          description: Unix timestamp in milliseconds when this event occurred.
        user_message:
          type: object
          description: >-
            Present when type="user_message". Contains a message sent by the
            user.
          properties:
            content:
              type: string
              description: The text content of the user's message.
            message_type:
              type: string
              enum:
                - text
                - voice
              description: >-
                How the message was sent. "text" for typed input, "voice" for
                voice input.
            attachments:
              type: array
              items:
                $ref: '#/components/schemas/TaskAttachment'
              description: Files or images the user attached to their message.
        assistant_message:
          type: object
          description: >-
            Present when type="assistant_message". Contains a response from the
            agent.
          properties:
            content:
              type: string
              description: The text content of the agent's response.
            attachments:
              type: array
              items:
                $ref: '#/components/schemas/TaskAttachment'
              description: Files, images, or slides the agent generated as output.
        error_message:
          type: object
          description: >-
            Present when type="error_message". Indicates the task encountered an
            error.
          properties:
            error_type:
              type: string
              description: Category of the error.
            content:
              type: string
              description: Human-readable error description.
        status_update:
          type: object
          description: >-
            Present when type="status_update". Indicates a change in the agent's
            processing state.
          properties:
            agent_status:
              type: string
              enum:
                - running
                - stopped
                - waiting
                - error
              description: >-
                The agent's current state. "waiting" means the agent needs user
                confirmation — check status_detail for the event to confirm.
            status_detail:
              type: object
              description: >-
                Additional details when agent_status is "waiting". Contains the
                event ID needed for task.confirmAction.
              properties:
                waiting_for_event_id:
                  type: string
                  description: >-
                    The event ID to pass as event_id when calling
                    task.confirmAction.
                waiting_for_event_type:
                  type: string
                  description: >-
                    Type of action awaiting confirmation (e.g., "email_send",
                    "calendar_create").
                waiting_description:
                  type: string
                  description: Human-readable description of what the agent is waiting for.
                confirm_input_schema:
                  type: object
                  description: >-
                    JSON Schema defining the expected input format for the
                    confirmation, if additional input is needed.
            brief:
              type: string
              description: Short summary of the current agent activity.
            description:
              type: string
              description: Detailed description of what the agent is doing.
        tool_used:
          type: object
          description: >-
            Present when type="tool_used" (verbose=true only). Records a tool
            invocation by the agent.
          properties:
            tool:
              type: string
              description: >-
                Name of the tool that was used (e.g., "browser",
                "code_executor").
            action_id:
              type: string
              description: Unique identifier for this tool action.
            status:
              type: string
              enum:
                - success
                - error
                - rollback
              description: Result of the tool invocation.
            brief:
              type: string
              description: Short summary of the tool action.
            description:
              type: string
              description: Detailed description of what the tool did.
            message:
              type: object
              description: Structured details of the tool invocation.
              properties:
                action:
                  type: string
                  description: The specific action performed by the tool.
                param:
                  type: string
                  description: Parameters passed to the tool action.
        plan_update:
          type: object
          description: >-
            Present when type="plan_update" (verbose=true only). A full snapshot
            of the agent's current execution plan.
          properties:
            steps:
              type: array
              description: All steps in the current plan with their statuses.
              items:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - todo
                      - doing
                      - done
                      - failed
                    description: Current status of this plan step.
                  title:
                    type: string
                    description: Description of this plan step.
                  started_at:
                    type:
                      - integer
                      - 'null'
                    format: int64
                    description: >-
                      Unix timestamp when this step started. Null if not yet
                      started.
                  end_at:
                    type:
                      - integer
                      - 'null'
                    format: int64
                    description: >-
                      Unix timestamp when this step finished. Null if not yet
                      completed.
        new_plan_step:
          type: object
          description: >-
            Present when type="new_plan_step" (verbose=true only). A new step
            was added to the plan.
          properties:
            step_id:
              type: string
              description: Unique identifier for the new plan step.
            title:
              type: string
              description: Description of the new plan step.
        explanation:
          type: object
          description: >-
            Present when type="explanation" (verbose=true only). The agent's
            internal reasoning or thought process.
          properties:
            content:
              type: string
              description: The agent's explanation of its reasoning or approach.
        structured_output_result:
          type: object
          description: >-
            Present when type="structured_output_result". Contains the extracted
            structured data. Appears after the status_update (stopped) event
            when the task was created with a structured_output_schema.
          properties:
            success:
              type: boolean
              description: >-
                Whether the agent produced a meaningful result. When false,
                value contains schema-conforming defaults and error explains
                what happened.
            value:
              type: object
              description: >-
                The extracted value conforming to the schema provided in
                structured_output_schema. Always present and valid, even when
                success is false — see [zero-value
                rules](https://open.manus.ai/docs/v2/structured-output#when-success-is-false).
            error:
              type:
                - string
                - 'null'
              description: >-
                Error description when success is false. Null when success is
                true.
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
    TaskAttachment:
      type: object
      description: A file or media attachment in a task message.
      properties:
        type:
          type: string
          enum:
            - image
            - file
            - voice
            - slides
          description: >-
            Type of attachment. "image" for images, "file" for documents,
            "voice" for audio recordings, "slides" for presentation slides.
        filename:
          type: string
          description: Display name of the attachment file.
        url:
          type: string
          description: URL to download the attachment content.
        content_type:
          type: string
          description: MIME type of the attachment (e.g., "application/pdf", "image/png").
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-manus-api-key

````