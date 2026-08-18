> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# file.detail

> Retrieves a file's details including upload status, size, and expiration time. Check that `status` is `uploaded` before using the file in [task.create](https://open.manus.ai/docs/v2/task.create). Files expire 48 hours after upload.

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **OAuth scope:** `create_task` or `manage_all_tasks` — see the [Open App](https://open.manus.ai/docs/v2/open-app) guide.
</Tip>


## OpenAPI

````yaml GET /v2/file.detail
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
  /v2/file.detail:
    get:
      summary: GetFile
      description: >-
        Retrieves a file's details including upload status, size, and expiration
        time. Check that `status` is `uploaded` before using the file in
        [task.create](https://open.manus.ai/docs/v2/task.create). Files expire
        48 hours after upload.
      operationId: openapi.v2.OpenapiV2Service.GetFile
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
        - name: file_id
          in: query
          required: true
          schema:
            type: string
          description: The unique identifier of the file to retrieve.
      responses:
        '200':
          description: File retrieved successfully.
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
                  file:
                    $ref: '#/components/schemas/FileDetail'
                    description: The file object with full details.
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
              --url 'https://api.manus.ai/v2/file.detail?file_id=<string>' \
              --header 'x-manus-api-key: <api-key>'
        - lang: python
          label: Python
          source: >-
            import requests


            url = "https://api.manus.ai/v2/file.detail"


            headers = {
                "x-manus-api-key": "<api-key>"
            }


            response = requests.get(url, headers=headers, params={"file_id":
            "<string>"})


            print(response.text)
        - lang: javascript
          label: JavaScript
          source: >-
            const options = {
              method: 'GET',
              headers: {'x-manus-api-key': '<api-key>'}
            };


            fetch('https://api.manus.ai/v2/file.detail?file_id=<string>',
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
              CURLOPT_URL => "https://api.manus.ai/v2/file.detail?file_id=<string>",
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
          source: "package main\n\nimport (\n\t\"fmt\"\n\t\"net/http\"\n\t\"io\"\n)\n\nfunc main() {\n\n\turl := \"https://api.manus.ai/v2/file.detail?file_id=<string>\"\n\n\treq, _ := http.NewRequest(\"GET\", url, nil)\n\n\treq.Header.Add(\"x-manus-api-key\", \"<api-key>\")\n\n\tres, _ := http.DefaultClient.Do(req)\n\n\tdefer res.Body.Close()\n\tbody, _ := io.ReadAll(res.Body)\n\n\tfmt.Println(string(body))\n\n}"
        - lang: java
          label: Java
          source: >-
            HttpResponse<String> response =
            Unirest.get("https://api.manus.ai/v2/file.detail?file_id=<string>")
              .header("x-manus-api-key", "<api-key>")
              .asString();
        - lang: ruby
          label: Ruby
          source: |-
            require 'uri'
            require 'net/http'

            url = URI("https://api.manus.ai/v2/file.detail?file_id=<string>")

            http = Net::HTTP.new(url.host, url.port)
            http.use_ssl = true

            request = Net::HTTP::Get.new(url)
            request["x-manus-api-key"] = '<api-key>'

            response = http.request(request)
            puts response.read_body
components:
  schemas:
    FileDetail:
      type: object
      description: Full file information returned by file.detail.
      properties:
        id:
          type: string
          description: Unique identifier for the file.
        filename:
          type: string
          description: Name of the file.
        status:
          type: string
          enum:
            - pending
            - uploaded
            - deleted
            - error
          description: >-
            File status. "pending" — waiting for upload. "uploaded" — ready to
            use. "deleted" — file has been deleted. "error" — upload failed.
        created_at:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the file record was created.
        bytes:
          type:
            - integer
            - 'null'
          format: int64
          description: File size in bytes. Only available after upload is complete.
        content_type:
          type: string
          description: MIME type of the file (e.g., "application/pdf", "text/csv").
        expires_at:
          type: integer
          format: int64
          description: >-
            Unix timestamp (seconds) when the file will be automatically deleted
            (48 hours after upload).
        error_message:
          type:
            - string
            - 'null'
          description: Error description if the file status is "error".
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