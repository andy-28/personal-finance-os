# iPhone Shortcut Capture

This Shortcut sends an unverified financial input to Coin Engine's Transaction Inbox. It does **not** create a Ledger transaction, change balances, or affect liquidity projections.

## Prerequisites

- A production Coin Engine URL served over HTTPS, for example `https://coin.example.com`.
- A Capture API Token created from Dashboard → Financial Operations → **Shortcut 設定**. The plaintext token is shown once; Coin Engine stores only its SHA-256 hash.
- The ID of an existing payment instrument owned by the same user. The Shortcut setup dialog lists active Account and Credit Card IDs. You can also obtain them from the authenticated `GET /api/accounts` response.

Capture tokens are user-scoped, revocable, and limited to `transaction-capture:create`. They cannot read accounts, statements, or Ledger data, and cannot create Ledger transactions. Never put the token in a URL or query string.

## Build the Shortcut

Create a new Apple Shortcut named **Coin Engine Capture** and add these actions in order:

1. **Ask for Input**
   - Prompt: `金額`
   - Input Type: Number
   - Save the result as variable `Amount`.
2. **Ask for Input**
   - Prompt: `名稱 / 備註`
   - Input Type: Text
   - Save the result as variable `Description`.
3. **Choose from Menu**
   - Add one option for each payment instrument, for example `Richart GoGo` and `玉山`.
   - In each branch, set variable `PaymentInstrumentId` to the corresponding ID shown in Coin Engine. Do not commit these user-specific IDs to this repository.
   - Set variable `PaymentInstrumentType` to `CreditCard` for a configured card, or `Account` for another account.
4. **Current Date**
   - Format it as ISO 8601 and save it as `OccurredAt`.
5. **Generate UUID**
   - Save it as `SourceReference`. Generate it once per real-world purchase; retrying the same request must reuse the same UUID.
6. **Get Contents of URL**
   - URL: `https://YOUR-COIN-ENGINE-HOST/api/transaction-captures`
   - Method: `POST`
   - Request Body: JSON
   - Headers:
     - `Authorization`: `Bearer YOUR_CAPTURE_TOKEN`
     - `Content-Type`: `application/json`
   - JSON fields:

```json
{
  "amount": 15960,
  "currency": "TWD",
  "occurredAt": "2026-09-18T19:30:00+08:00",
  "description": "BIGBANG",
  "merchantRaw": null,
  "paymentInstrumentType": "CreditCard",
  "paymentInstrumentId": "YOUR-CARD-ACCOUNT-ID",
  "sourceReference": "UUID-GENERATED-BY-SHORTCUT",
  "note": null
}
```

The server determines the source as `IosShortcut` from the credential. The request cannot impersonate another source.

7. **Show Result**
   - Display the response's `description`, `amount`, and `status`. A successful first submission returns HTTP `201`. Retrying the same `sourceReference` returns the existing capture and does not add another Inbox item.

## Verify in Coin Engine

Open Dashboard → Financial Operations → **待處理**. The summary's Inbox count should increase, and the Capture detail should show the payment instrument, source, timestamps, and `Pending / Unverified` status.

If the Capture is incorrect, choose **忽略**. This changes it to `Dismissed` and removes it from the pending Inbox. It still never touches Ledger, account balances, card outstanding, net worth, or projections.

## Revoke or Rotate a Token

Open **Shortcut 設定**, revoke the old token, create a replacement, and update the Shortcut's Authorization header. A revoked token is rejected immediately. At most five active Capture tokens are allowed per user.

## Security Notes

- Keep the token only in the Shortcut's header configuration. Do not paste it into URLs, screenshots, logs, or shared Shortcut exports.
- Use HTTPS in production.
- Each request is limited to 16 KB and the Capture endpoint is rate-limited.
- A token can only create a Capture for a payment instrument owned by its user.
