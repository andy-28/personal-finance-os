# Coin Engine — Wallet Capture iOS Shortcut

This document is the implementation specification for the **Coin Engine Wallet Capture** shortcut.
It is based on the repository implementation at commit `86febfa` and the production public endpoint:

```text
POST https://personal-finance-os-sandy.vercel.app/api/transaction-captures
```

Do not place a real capture token or a real payment-instrument ID in this repository.

## Current Architecture

```text
Wallet notification
  -> iOS personal automation
  -> Coin Engine Wallet Capture shortcut
  -> Vercel /api/transaction-captures
  -> Next.js catch-all BFF proxy
  -> ASP.NET Core POST /api/transaction-captures
  -> CaptureToken authentication
  -> TransactionCapture(Pending)
  -> PostgreSQL transaction_captures
  -> Dashboard Capture Inbox
```

The BFF forwards `Authorization`, `Content-Type`, the query string, and the raw request body. It only removes
hop-by-hop headers and `Cookie`. Successful and ordinary error response bodies are forwarded to the caller.
For backend status 408, 502, 503, or 504, the BFF returns its own JSON problem response.

An unauthenticated production probe was performed with an empty JSON body. It returned:

```text
HTTP 401 Unauthorized
X-Matched-Path: /api/[...backend]
X-Render-Origin-Server: Kestrel
Content-Length: 0
```

This confirms that the public Vercel route reaches the ASP.NET Core service. It also explains why immediately
applying **Get Dictionary Value** to an authentication failure produces a Shortcuts conversion error: the current
401 response has an empty body, so there is no JSON dictionary to read.

## Root-cause assessment

The verified failure is in the response-debugging assumption:

```text
Get Contents of URL -> always treat result as Dictionary
```

That assumption is false. A successful capture returns a JSON object, but a missing, malformed, unknown, or revoked
capture token currently produces an empty 401 response. Network failures can also stop **Get Contents of URL** before
it produces a value.

The production route itself is correct and the BFF-to-Render chain is live. Because no plaintext capture token or
real payment-instrument ID is stored in the repository, an authenticated production insertion was intentionally not
performed. Therefore the evidence does not prove which of these inputs caused the 401 in the existing shortcut. Check
them in this order:

1. Header name is exactly `Authorization`.
2. Header value is one text value: `Bearer ce_capture_...`.
3. There is exactly one ordinary space after `Bearer`.
4. The token has not been revoked and belongs to the production user.
5. `paymentInstrumentId` is the production account GUID shown by Shortcut Settings, not a local account GUID.
6. Production migrations include `AddTransactionCaptureInbox`.

If authentication succeeds but validation fails, the API normally returns JSON Problem Details rather than an empty
body. Render logs provide the definitive server-side result for a failed authenticated attempt.

## Verified API contract

### Authentication and transport

```text
Method: POST
URL: https://personal-finance-os-sandy.vercel.app/api/transaction-captures
Authorization: Bearer <CAPTURE_TOKEN>
Accept: application/json
Content-Type: application/json
Maximum body: 16 KiB
Rate limit: 30 requests per minute per resolved client IP
```

The client must not send `source`. The server derives it from the authenticated identity:

- Capture Token -> `IosShortcut`
- Normal JWT -> `Manual`

### Request body

| JSON field | Type | Required | Rules |
| --- | --- | --- | --- |
| `amount` | number/decimal | yes | `> 0`, `<= 999999999999`; stored at two decimal places |
| `currency` | string or null | no | three letters; blank/null becomes `TWD`; stored uppercase |
| `occurredAt` | ISO 8601 date-time string | yes in this shortcut | maps to `DateTimeOffset`; include `Z` or an explicit offset |
| `description` | string | yes | nonblank, maximum 160 characters |
| `merchantRaw` | string or null | no | maximum 200 characters |
| `paymentInstrumentType` | enum string | yes | `Account` or `CreditCard` |
| `paymentInstrumentId` | GUID string | yes | active account owned by the token user |
| `sourceReference` | string | yes for Capture Token | nonblank for iOS, maximum 120 characters |
| `note` | string or null | no | maximum 1000 characters |

For `paymentInstrumentType: CreditCard`, the GUID must refer to an active account configured as a credit card. A
credit-card account cannot be submitted with `paymentInstrumentType: Account`.

The API has no request fields named `merchant` or `rawText`. Use `merchantRaw` for the unnormalized merchant and `note`
for the original notification text. Unknown JSON properties such as `source`, `merchant`, and `rawText` are not part
of the contract and must not be used.

### Canonical request example

```json
{
  "amount": 184,
  "currency": "TWD",
  "occurredAt": "2026-10-03T18:30:00+08:00",
  "description": "McDonald's",
  "merchantRaw": "McDonald's",
  "paymentInstrumentType": "CreditCard",
  "paymentInstrumentId": "<RICHART_GOGO_PAYMENT_INSTRUMENT_ID>",
  "sourceReference": "<SHA256_OR_UUID_FOR_THIS_NOTIFICATION>",
  "note": "Wallet Notification\nApp: 錢包\nTitle: 台新銀行\nSubtitle: $184.00\nBody:\nMcDonald's\n$184.00"
}
```

### Idempotency

For iOS captures, `sourceReference` is mandatory. The server searches by:

```text
token user + source(IosShortcut) + trimmed sourceReference
```

Submitting the same reference again returns the existing capture and does not insert another Inbox item. PostgreSQL
also has a unique filtered index over the same logical key.

Generate the reference once near the beginning of a shortcut run and reuse it for every HTTP retry in that run.
Preferred strategies:

1. If the notification input exposes a stable notification date/identifier, hash that stable value with the title,
   subtitle, and body.
2. Otherwise, capture `Current Date` once, format it to minute precision, combine it with the notification fields, and
   hash the result with SHA-256.

Recommended fallback hash input:

```text
Wallet|<Title>|<Subtitle>|<Body>|<yyyy-MM-dd'T'HH:mmXXX>
```

Do not recompute Current Date during an HTTP retry. A content-only hash is not recommended because two legitimate
purchases at the same merchant for the same amount would collide forever. Minute bucketing has a small residual risk
when two identical purchases happen in the same minute; a stable notification timestamp/identifier is better when
available.

### Success response

The first successful request returns HTTP `201 Created` and a JSON object similar to:

```json
{
  "id": "43eb1d5c-f741-4a19-96e7-1a37f024f177",
  "source": "IosShortcut",
  "amount": 184,
  "currency": "TWD",
  "occurredAt": "2026-10-03T10:30:00+00:00",
  "capturedAt": "2026-10-03T10:30:03+00:00",
  "description": "McDonald's",
  "merchantRaw": "McDonald's",
  "paymentInstrumentType": "CreditCard",
  "paymentInstrumentId": "<RICHART_GOGO_PAYMENT_INSTRUMENT_ID>",
  "paymentInstrumentName": "Richart GoGo",
  "status": "Pending",
  "sourceReference": "<SOURCE_REFERENCE>",
  "note": "<RAW_NOTIFICATION_NOTE>",
  "dismissedAt": null,
  "relatedFinancialEvent": null
}
```

An idempotent retry also returns the existing capture. The endpoint still uses the Created response mapping, so the
client should determine success from the response object and its `id`/`status`, not from an assumption that every
retry has a different status code.

### Error responses

- `400`: validation failed; normally JSON Problem Details with an `errors` array.
- `401`: missing, malformed, unknown, or revoked token. The current authentication response may have an empty body.
- `404`: `paymentInstrumentId` does not exist for the token user or is archived.
- `429`: capture rate limit exceeded.
- `500`: unhandled backend/database failure; normally JSON Problem Details.
- `502`, `503`, `504`: BFF-generated JSON describing an unavailable or waking backend.

The BFF does not consume a normal response body. It forwards the backend stream and content type after removing
hop-by-hop response headers.

## Shortcut design

Create a shortcut named **Coin Engine Wallet Capture**. The automation passes the Wallet notification as Shortcut
Input. Keep the token and payment-instrument ID only on the device.

Action names can vary slightly by the device language and iOS release. Use the named action or its localized
equivalent. When an action accepts a magic variable, tap the variable and select the indicated Notification detail.

### Configuration values

At the beginning of the shortcut, create these three Text actions:

```text
CaptureApiUrl = https://personal-finance-os-sandy.vercel.app/api/transaction-captures
CaptureToken = <CAPTURE_TOKEN>
PaymentInstrumentId = <RICHART_GOGO_PAYMENT_INSTRUMENT_ID>
```

Set a fourth value:

```text
DebugMode = true
```

After successful setup, change `DebugMode` to `false`.

### Action 01 — Receive notification input

Input: `Shortcut Input` from the Wallet notification automation.

In the automation, configure **Run Shortcut → Coin Engine Wallet Capture** and pass the Notification magic variable as
the shortcut input.

### Actions 02–05 — Extract notification fields

Read these details from `Shortcut Input`, saving each result as a named variable:

```text
NotificationTitle    = Notification.Title
NotificationSubtitle = Notification.Subtitle
NotificationBody     = Notification.Body
NotificationApp      = Notification.App
```

If the editor presents Notification details directly on the Shortcut Input magic variable, select the detail there.
Otherwise use the corresponding **Get Details of Notification** action.

### Action 06 — Capture one stable execution date

Action: **Current Date**

Save as:

```text
CaptureDate
```

All later date formatting and hashing must use this same variable.

### Actions 07–12 — Parse amount

Use `NotificationSubtitle` as the primary amount source.

1. **Replace Text**: replace `NT$` with an empty string.
2. **Replace Text**: replace `$` with an empty string.
3. **Replace Text**: replace `,` with an empty string.
4. **Trim Whitespace**.
5. **Get Numbers from Input**.
6. **Get First Item from List** and save it as `Amount`.

If `Amount` has no value, repeat **Get Numbers from Input** using `NotificationBody`. If it is still missing or is not
greater than zero:

```text
Show Notification: Coin Engine Capture Failed — 找不到有效金額
Stop This Shortcut
```

For the sample subtitle `$184.00`, `Amount` must be the Number value `184`, not the Text value `$184.00`.

### Actions 13–17 — Parse merchant

1. **Split Text** `NotificationBody` by new lines.
2. **Get First Item from List**.
3. **Trim Whitespace** and save as `MerchantRaw`.
4. If `MerchantRaw` is empty or contains only the same amount text, set `MerchantRaw` to `NotificationTitle`.
5. Set `Description` to `MerchantRaw`.

Do not translate or categorize the merchant in this shortcut. Merchant normalization belongs in Capture review.

For the sample body:

```text
McDonald's
$184.00
```

the result is:

```text
MerchantRaw = McDonald's
Description = McDonald's
```

### Actions 18–20 — Format occurredAt

1. **Format Date** using `CaptureDate`.
2. Select ISO 8601 and include time and time-zone offset.
3. Save as `OccurredAt`.

Expected shape:

```text
2026-10-03T18:30:00+08:00
```

### Actions 21–24 — Build sourceReference

If a stable notification timestamp/identifier is available, use it instead of the minute-formatted `CaptureDate`.
Otherwise:

1. Format `CaptureDate` with a custom format containing year, month, day, hour, minute, and time-zone offset.
2. Create Text:

   ```text
   Wallet|<NotificationTitle>|<NotificationSubtitle>|<NotificationBody>|<FormattedCaptureMinute>
   ```

3. Use **Hash** with SHA-256.
4. Convert the hash result to Text if necessary and save as `SourceReference`.

Do not generate a new reference inside a retry branch.

### Actions 25–26 — Build raw notification note

Create Text:

```text
Wallet Notification
App: <NotificationApp>
Title: <NotificationTitle>
Subtitle: <NotificationSubtitle>
Body:
<NotificationBody>
```

Save as `RawNotificationNote`. If it exceeds 1000 characters, truncate it before submitting.

### Action 27 — Build JSON dictionary

Add a **Dictionary** action with exactly these entries. Values in angle brackets are magic variables, not literal
placeholder strings:

| Key | Value type | Value |
| --- | --- | --- |
| `amount` | Number | `Amount` |
| `currency` | Text | `TWD` |
| `occurredAt` | Text | `OccurredAt` |
| `description` | Text | `Description` |
| `merchantRaw` | Text | `MerchantRaw` |
| `paymentInstrumentType` | Text | `CreditCard` |
| `paymentInstrumentId` | Text | `PaymentInstrumentId` |
| `sourceReference` | Text | `SourceReference` |
| `note` | Text | `RawNotificationNote` |

Do not add `source`, `merchant`, or `rawText`.

### Action 28 — POST capture

Action: **Get Contents of URL**

```text
URL: CaptureApiUrl
Method: POST
Request Body: JSON
JSON value: the Dictionary from Action 27
```

Headers:

```text
Authorization: Bearer <CaptureToken magic variable>
Accept: application/json
Content-Type: application/json
```

The Authorization value must be one value made from the literal `Bearer`, one normal space, and the token. Do not add
quotation marks. Do not put the token in the URL.

Save the action result as `ApiResponse`.

### Actions 29–35 — Handle the response without assuming a dictionary

Do not connect `ApiResponse` directly to **Get Dictionary Value**.

1. Use **Get Text from Input** on `ApiResponse`; save as `ResponseText`.
2. If `ResponseText` has no value:
   - Show Notification: `Coin Engine Capture Failed — API 無回應內容；檢查 Capture Token / 401`.
   - If `DebugMode` is true, show `URL、目前時間、Response 為空` but never show the token.
   - Stop the shortcut.
3. Use **Match Text** on `ResponseText` with:

   ```regex
   ^\s*\{
   ```

4. If there is no match:
   - Show Notification: `Coin Engine Capture Failed — 非 JSON 回應`.
   - If `DebugMode` is true, show `ResponseText`.
   - Stop the shortcut.
5. Only in the JSON branch, use **Get Dictionary from Input** on `ResponseText`; save as `ResponseDictionary`.
6. Read `id`, `status`, `description`, `amount`, and optional `detail` from `ResponseDictionary`.
7. Treat the response as success only when `id` has a value and `status` equals `Pending` or `Dismissed`.

Important platform limitation: depending on the iOS release, **Get Contents of URL** may stop the shortcut immediately
on some network/HTTP errors instead of returning a value. In that case the action's own error card is the diagnostic.
The current server's empty 401 body cannot be converted into a dictionary.

### Actions 36–37 — User feedback

Success notification:

```text
Coin Engine 已捕捉 $<Amount> · <Description>
```

If `DebugMode` is true, additionally use **Show Result** with:

```text
Capture ID: <id>
Status: <status>
Source Reference: <SourceReference>
Response: <ResponseText>
```

Never include the capture token in a notification, log, note, or debug result.

## Installation

A signed `.shortcut` artifact is not generated by this repository task. The current execution host is Windows and has
no Apple `shortcuts` CLI. Apple documents that exported shortcuts are validated during sharing and that the macOS CLI
can sign an already exported shortcut with `shortcuts sign`. Creating an undocumented plist/binary on Windows would
not produce a reliably importable, Apple-validated shortcut.

Build the shortcut from the action specification above, then:

1. Open Dashboard → Financial Operations → **Shortcut 設定**.
2. Create or rotate a Capture Token. Copy it once into the on-device `CaptureToken` Text action.
3. Copy the production Richart GoGo GUID into `PaymentInstrumentId`.
4. In Shortcuts → Automation, select the Wallet notification trigger.
5. Add **Run Shortcut → Coin Engine Wallet Capture** and pass the Notification as input.
6. Disable **Ask Before Running** only after the debug test succeeds.
7. Keep `DebugMode = true` for the first test, then set it to `false`.
8. After building it on an Apple device, export/share it through Apple's supported Shortcut sharing flow if desired.

Official Apple references:

- Shortcuts command line and signing: <https://support.apple.com/guide/shortcuts-mac/-apd455c82f02/mac>
- Share/export a shortcut on iPhone or iPad: <https://support.apple.com/guide/shortcuts/apdf01f8c054/ios>
- Add setup/import questions: <https://support.apple.com/guide/shortcuts/apdf330fd3a0/ios>

## Validation procedure

### Parser fixture

Input:

```text
Title: 台新銀行
Subtitle: $184.00
Body:
McDonald's
$184.00
App: 錢包
```

Expected values:

```text
Amount: 184
Currency: TWD
MerchantRaw: McDonald's
Description: McDonald's
PaymentInstrumentType: CreditCard
Status after successful API capture: Pending
```

### Safe end-to-end test

1. Confirm production migrations are current.
2. Use a newly generated production Capture Token.
3. Use the production Richart GoGo payment-instrument GUID.
4. Trigger one Wallet notification or run a controlled test with `Amount = 1`.
5. Confirm the Shortcut receives a JSON object containing `id`, `source = IosShortcut`, and `status = Pending`.
6. Open Dashboard → Financial Operations → Pending/Capture Inbox and find the same `sourceReference`.
7. Retry the same request using the same `sourceReference`; confirm no second Inbox item appears.
8. Confirm account balance, credit-card outstanding, net worth, and liquidity projection did not change.

### Ledger boundary

The capture handler only adds a `TransactionCapture`. It does not add a `Transaction` or `TransactionEntry`, and the
capture remains `Pending`. Captures are intentionally excluded from Ledger balances and liquidity projections until a
separate, explicit review/promotion flow is performed.

For an auditable verification, record transaction and entry counts before the isolated capture, submit the capture,
then confirm those counts are unchanged while the capture count increases by one. Do this only through an approved
read-only production query or observability path; never expose database credentials in the shortcut or this document.
