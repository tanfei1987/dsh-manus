> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# task.detail

> Retrieves a task's status and metadata. Use [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages) for the full event history, or [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage) to continue the conversation.

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **OAuth scope:** `create_task` or `manage_all_tasks` — see the [Open App](https://open.manus.ai/docs/v2/open-app) guide. With `create_task` scope, can only access tasks created by this Open App.
</Tip>

<Tip>
  **Status only:** This endpoint returns status and metadata. Use [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages) for the full conversation history and agent outputs.

  **Shortcut:** Use `agent-default-main_task` as `task_id` to check the IM agent's main task.
</Tip>


## OpenAPI

````yaml GET /v2/task.detail
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
  /v2/task.detail:
    get:
      summary: GetTask
      description: >-
        Retrieves a task's status and metadata. Use
        [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages) for
        the full event history, or
        [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage) to
        continue the conversation.
      operationId: openapi.v2.OpenapiV2Service.GetTask
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
            The unique identifier of the task to retrieve. Supports the shortcut
            `agent-default-main_task` for the IM agent's main task.
      responses:
        '200':
          description: Task retrieved successfully.
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
                  task:
                    $ref: '#/components/schemas/Task'
                    description: The task object with current status and metadata.
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
              --url 'https://api.manus.ai/v2/task.detail?task_id=<string>' \
              --header 'x-manus-api-key: <api-key>'
        - lang: python
          label: Python
          source: >-
            import requests


            url = "https://api.manus.ai/v2/task.detail"


            headers = {
                "x-manus-api-key": "<api-key>"
            }


            response = requests.get(url, headers=headers, params={"task_id":
            "<string>"})


            print(response.text)
        - lang: javascript
          label: JavaScript
          source: >-
            const options = {
              method: 'GET',
              headers: {'x-manus-api-key': '<api-key>'}
            };


            fetch('https://api.manus.ai/v2/task.detail?task_id=<string>',
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
              CURLOPT_URL => "https://api.manus.ai/v2/task.detail?task_id=<string>",
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
          source: "package main\n\nimport (\n\t\"fmt\"\n\t\"net/http\"\n\t\"io\"\n)\n\nfunc main() {\n\n\turl := \"https://api.manus.ai/v2/task.detail?task_id=<string>\"\n\n\treq, _ := http.NewRequest(\"GET\", url, nil)\n\n\treq.Header.Add(\"x-manus-api-key\", \"<api-key>\")\n\n\tres, _ := http.DefaultClient.Do(req)\n\n\tdefer res.Body.Close()\n\tbody, _ := io.ReadAll(res.Body)\n\n\tfmt.Println(string(body))\n\n}"
        - lang: java
          label: Java
          source: >-
            HttpResponse<String> response =
            Unirest.get("https://api.manus.ai/v2/task.detail?task_id=<string>")
              .header("x-manus-api-key", "<api-key>")
              .asString();
        - lang: ruby
          label: Ruby
          source: |-
            require 'uri'
            require 'net/http'

            url = URI("https://api.manus.ai/v2/task.detail?task_id=<string>")

            http = Net::HTTP.new(url.host, url.port)
            http.use_ssl = true

            request = Net::HTTP::Get.new(url)
            request["x-manus-api-key"] = '<api-key>'

            response = http.request(request)
            puts response.read_body
components:
  schemas:
    Task:
      type: object
      description: Represents a task with its current status and metadata.
      properties:
        id:
          type: string
          description: Unique identifier for the task.
        status:
          type: string
          enum:
            - running
            - stopped
            - waiting
            - error
          description: >-
            Current task status. "running" — agent is actively working.
            "stopped" — task has finished or been stopped. "waiting" — agent is
            paused and waiting for user input or confirmation. "error" — task
            encountered an unrecoverable error.
        created_at:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the task was created.
        updated_at:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the task was last updated.
        task_type:
          type: string
          enum:
            - standard
            - project
            - agent_subtask
          description: >-
            Type of the task. "standard" — a regular standalone task. "project"
            — a task within a project. "agent_subtask" — a subtask created by an
            agent. Use [task.list](https://open.manus.ai/docs/v2/task.list) with
            `scope` to filter by task type.
        share_visibility:
          type: string
          enum:
            - private
            - team
            - public
          description: >-
            Who can view the task. "private" — only the task creator. "team" —
            all team members. "public" — anyone with the share link.
        title:
          type: string
          description: Title of the task.
        credit_usage:
          type: integer
          format: int32
          description: >-
            Total credits consumed by the task. Only present when the task has
            consumed credits.
        task_url:
          type: string
          description: >-
            URL to view the task in the Manus webapp (e.g.,
            https://manus.im/app/{task_id}).
        created_by_api_key:
          type: object
          nullable: true
          description: >-
            The API key that created this task. Present when the task was
            created via the API; null or absent when created through the UI or
            other means. The name reflects the API key's current name, not a
            snapshot from creation time.
          properties:
            id:
              type: string
              description: The API key ID.
            name:
              type: string
              description: The current display name of the API key.
        agent_profile:
          type: string
          enum:
            - manus-1.6
            - manus-1.6-lite
            - manus-1.6-max
          description: >-
            Agent profile most recently used by the task — reflects the latest
            turn (e.g. an
            [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage)
            override), not just the value supplied at task creation. Omitted
            when this information is not available (e.g. older tasks).
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
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-manus-api-key

````