# SIAM VOYAGE BOOKING WORKFLOW V1

## PROJECT RULES

Before making any changes:

* Preserve existing design system.
* Preserve colors.
* Preserve typography.
* Preserve spacing.
* Preserve existing layouts.
* Preserve existing components.
* Do NOT redesign the website.
* Extend functionality only.

---

# PHASE 1 - PROJECT ANALYSIS

Analyze current project.

Output only:

* Current booking flow
* Current booking storage method
* Voucher generation flow
* Components involved
* Files involved

Do NOT write code.

---

# PHASE 2 - DESIGN SYSTEM DOCUMENTATION

Create:

DESIGN_SYSTEM.md

Document:

* Color palette
* Typography
* Button styles
* Form styles
* Card styles
* Shadows
* Border radius
* Layout structure

Do NOT modify any code.

---

# PHASE 3 - GOOGLE SHEETS BOOKING STORAGE

Replace local browser storage.

Store bookings in Google Sheets.

Generate Booking ID automatically.

Example:

SV-20260622-A7K9

Store:

* Booking ID
* Name
* Email
* Phone
* Country
* Package
* Travel Date
* Guest Count
* Notes
* Status
* Created Date

Default Status:

Pending

Preserve existing booking experience.

Preserve current voucher screen.

---

# PHASE 4 - PACKAGE DETAIL PAGE

Replace booking modal.

Create dedicated package pages.

Example:

/packages/bangkok-cultural-journey

Each package page should contain:

* Hero section
* Gallery section
* Package details
* Highlights
* Included services
* Booking form

Keep existing visual design.

---

# PHASE 5 - EMAIL VOUCHER SYSTEM

After successful booking:

Send responsive HTML email.

Include:

* Booking Reference
* Customer Name
* Package Name
* Travel Date
* Guest Count
* QR Code
* Siam Voyage branding

Do NOT generate PDF.

Use HTML email template.

---

# PHASE 6 - QR CODE SYSTEM

Generate QR automatically.

QR content should be:

https://siamvoyage.netlify.app/office/booking/{bookingId}

Example:

https://siamvoyage.netlify.app/office/booking/SV-20260622-A7K9

Display QR:

* Voucher screen
* Email voucher

---

# PHASE 7 - OFFICE DASHBOARD

Create route:

/office

Purpose:

Internal travel agency management.

Display:

* Total Bookings
* Pending Bookings
* Paid Bookings
* Cancelled Bookings
* Include the button for QR scanning

Booking table columns:

* Booking ID
* Customer Name
* Package
* Travel Date
* Guest Count
* Status

Use existing design language.

---

# PHASE 8 - BOOKING DETAIL PAGE

Route:

/office/booking/{bookingId}

Display:

* Booking ID
* Customer Name
* Email
* Phone
* Country
* Package
* Travel Date
* Guest Count
* Notes
* QR Code
* Current Status

Actions:

* Mark Paid
* Cancel Booking

---

# PHASE 9 - CANCEL BOOKING WORKFLOW

When staff clicks Cancel Booking:

Open modal.

Require:

Cancellation Reason

Staff must enter reason.

Booking should NOT be deleted.

Instead:

Status = Cancelled

Store:

* Cancellation Reason
* Cancelled Date

Keep record permanently.

---

# PHASE 10 - QR SCANNER

Create route:

/office/scan

Mobile-first experience.

Requirements:

* Open camera
* Scan QR
* Open booking automatically

No search step.

No manual lookup step.

---

# PHASE 11 - PEOPLE BOOKING NOW

Data Source Priority:

1. Real bookings from Google Sheets

If none exist:

2. SocialProof Google Sheet

SocialProof Sheet fields:

* Name
* Country
* Package
* Guest Count

Rotate records automatically.

Do NOT mix real and fake bookings together.

---

# PHASE 12 - COUNTRY DISPLAY

Current:

TH
GB
CA
ES

Replace with: proper country flag rendering.

Maintain current layout.

---

# PHASE 13 - FINAL VALIDATION

Verify:

✓ Google Sheets storage works

✓ Booking IDs generated

✓ Package pages work

✓ Gallery section works

✓ Voucher screen works

✓ Email voucher works

✓ QR generation works

✓ Office dashboard works

✓ Booking detail page works

✓ Payment status updates work

✓ Cancellation reason tracking works

✓ QR scanner works

✓ Existing design system unchanged
