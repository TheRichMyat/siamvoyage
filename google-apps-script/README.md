# Siam Voyage — Google Apps Script Bookings API

This folder contains the Google Apps Script Web App that persists bookings to Google Sheets.

## Setup

### 1. Create the spreadsheet

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet (e.g. **Siam Voyage Bookings**).
2. Rename the first tab to **Bookings** (or let the script create it on first run).

### 2. Add the script

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete any default code in `Code.gs`.
3. Paste the contents of [`Code.gs`](./Code.gs) from this folder.
4. Optionally add `appsscript.json` via **Project Settings → Show "appsscript.json" manifest file** and paste from this folder.
5. Save the project (e.g. name it **Siam Voyage Bookings API**).

### 3. Header row (optional)

The script auto-creates headers on first request. Expected columns:

| bookingId | name | email | phone | country | countryCode | package | packageSlug | travelDate | guestCount | notes | status | createdAt | paidAt | cancelledAt | cancellationReason | emailSentAt | updatedAt |

### 4. Deploy as Web App

1. **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy and copy the **Web app URL** (ends in `/exec`).

### 5. Connect the React app

Add to `.env` in the project root:

```
VITE_BOOKING_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Redeploy the script after code changes (**Deploy → Manage deployments → Edit → New version**).

## API

### `GET ?action=list`

Returns non-cancelled bookings for the live feed (newest first).

### `GET ?action=listOffice`

Returns all bookings (including cancelled) for the staff dashboard.

### `GET ?action=get&bookingId=SV-...`

Returns a single full booking row for the detail page.

### `POST` JSON body — create

```json
{
  "action": "create",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+44 7700 900000",
  "country": "United Kingdom",
  "countryCode": "GB",
  "package": "Bangkok Cultural Journey",
  "packageSlug": "bangkok-cultural-journey",
  "travelDate": "2026-07-15",
  "guestCount": 2,
  "notes": ""
}
```

Returns the created booking including `bookingId` (e.g. `SV-20260622-A7K9`) and `status: "Pending"`.

A responsive HTML voucher email is sent immediately via `MailApp` to the customer's email address. The booking is saved even if the email fails; on success, the `emailSentAt` column is updated. The email includes a QR code for staff check-in.

### `POST` JSON body — update status

```json
{
  "action": "updateStatus",
  "bookingId": "SV-20260622-A7K9",
  "status": "Paid",
  "paidAt": "2026-06-22T12:00:00.000Z",
  "updatedAt": "2026-06-22T12:00:00.000Z"
}
```

For cancellation, include `status: "Cancelled"`, `cancellationReason`, and `cancelledAt`.

## Email voucher (MailApp)

After each successful booking row is written, the script sends a confirmation email containing:

- Booking Reference (`bookingId`)
- Customer Name
- Package Name
- Travel Date
- Guest Count
- Siam Voyage branding

### Authorization

After updating `Code.gs` with email support:

1. Open the Apps Script editor and run any function once, or submit a test booking.
2. Approve the new **Send email** permission when prompted.
3. **Deploy → Manage deployments → Edit → New version → Deploy** so the Web App uses the latest code.

Emails are sent from the Google account that owns the script (**Execute as: Me**). Daily sending limits apply to consumer Gmail accounts (typically 100 emails/day).

## Manual test

```bash
curl "YOUR_WEB_APP_URL?action=list"

curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"create","name":"Test User","email":"test@example.com","phone":"+66000000000","country":"Thailand","countryCode":"TH","package":"Bangkok Cultural Journey","packageSlug":"bangkok-cultural-journey","travelDate":"2026-08-01","guestCount":2,"notes":""}'
```
