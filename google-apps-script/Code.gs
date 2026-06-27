/**
 * Siam Voyage — Bookings API (Google Apps Script Web App)
 * Deploy as Web App: Execute as Me, Anyone can access.
 */

var SHEET_NAME = 'Bookings';

var HEADERS = [
  'bookingId',
  'name',
  'email',
  'phone',
  'country',
  'countryCode',
  'package',
  'packageSlug',
  'travelDate',
  'guestCount',
  'notes',
  'status',
  'createdAt',
  'paidAt',
  'cancelledAt',
  'cancellationReason',
  'emailSentAt',
  'updatedAt'
];

var ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';
    if (action === 'list') {
      return jsonResponse(listBookings());
    }
    if (action === 'listOffice') {
      return jsonResponse(listOfficeBookings());
    }
    if (action === 'get') {
      return jsonResponse(getBooking_(e.parameter.bookingId));
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'Missing request body' });
    }
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'create') {
      return jsonResponse(createBooking(body));
    }
    if (body.action === 'updateStatus') {
      return jsonResponse(updateBookingStatus_(body));
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: String(err.message || err) });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }
  var firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell !== 'bookingId') {
    sheet.insertRowsBefore(1, 1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function generateBookingId_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  var existingIds = {};
  if (lastRow > 1) {
    var idColumn = sheet.getRange(2, 1, lastRow, 1).getValues();
    for (var i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0]) existingIds[idColumn[i][0]] = true;
    }
  }
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  for (var attempt = 0; attempt < 25; attempt++) {
    var suffix = '';
    for (var j = 0; j < 4; j++) {
      suffix += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
    }
    var candidate = 'SV-' + dateStr + '-' + suffix;
    if (!existingIds[candidate]) return candidate;
  }
  throw new Error('Could not generate unique booking ID');
}

function createBooking(body) {
  var name = trim_(body.name);
  var email = trim_(body.email);
  var phone = trim_(body.phone);
  var country = trim_(body.country);
  var countryCode = trim_(body.countryCode);
  var pkg = trim_(body.package);
  var packageSlug = trim_(body.packageSlug);
  var travelDate = trim_(body.travelDate);
  var guestCount = parseInt(body.guestCount, 10);
  var notes = trim_(body.notes || '');

  if (!name) throw new Error('Name is required');
  if (!email) throw new Error('Email is required');
  if (!phone) throw new Error('Phone is required');
  if (!country) throw new Error('Country is required');
  if (!countryCode) throw new Error('Country code is required');
  if (!pkg) throw new Error('Package is required');
  if (!packageSlug) throw new Error('Package slug is required');
  if (!travelDate) throw new Error('Travel date is required');
  if (!guestCount || guestCount < 1) throw new Error('Guest count is required');

  var bookingId = generateBookingId_();
  var createdAt = new Date().toISOString();
  var row = [
    bookingId,
    name,
    email,
    phone,
    country,
    countryCode,
    pkg,
    packageSlug,
    travelDate,
    guestCount,
    notes,
    'Pending',
    createdAt,
    '',
    '',
    '',
    '',
    ''
  ];

  var sheet = getSheet_();
  sheet.appendRow(row);

  var booking = {
    bookingId: bookingId,
    name: name,
    email: email,
    phone: phone,
    country: country,
    countryCode: countryCode,
    package: pkg,
    packageSlug: packageSlug,
    travelDate: travelDate,
    guestCount: guestCount,
    notes: notes,
    status: 'Pending',
    createdAt: createdAt
  };

  try {
    sendVoucherEmail_(booking);
    updateEmailSentAt_(bookingId, new Date().toISOString());
  } catch (emailErr) {
    Logger.log('Voucher email failed for ' + bookingId + ': ' + emailErr);
  }

  return booking;
}

function listBookings() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow, HEADERS.length).getValues();
  var results = [];

  for (var i = 0; i < values.length; i++) {
    var row = rowToObject_(values[i]);
    if (row.status === 'Cancelled') continue;
    if (!row.bookingId) continue;
    results.push({
      bookingId: row.bookingId,
      name: row.name,
      country: row.country,
      countryCode: row.countryCode,
      package: row.package,
      travelDate: row.travelDate,
      guestCount: Number(row.guestCount) || 1,
      status: row.status,
      createdAt: row.createdAt
    });
  }

  results.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return results;
}

function listOfficeBookings() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow, HEADERS.length).getValues();
  var results = [];

  for (var i = 0; i < values.length; i++) {
    var row = rowToObject_(values[i]);
    if (!row.bookingId) continue;
    results.push(bookingToResponse_(row));
  }

  results.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return results;
}

function getBooking_(bookingId) {
  var id = trim_(bookingId);
  if (!id) throw new Error('bookingId is required');
  var rowIndex = findRowByBookingId_(id);
  if (rowIndex < 0) throw new Error('Booking not found');
  var sheet = getSheet_();
  var row = rowToObject_(sheet.getRange(rowIndex, 1, rowIndex, HEADERS.length).getValues()[0]);
  return bookingToResponse_(row);
}

function updateBookingStatus_(body) {
  var bookingId = trim_(body.bookingId);
  var status = trim_(body.status);
  if (!bookingId) throw new Error('bookingId is required');
  if (!status) throw new Error('status is required');
  if (status === 'Cancelled' && !trim_(body.cancellationReason)) {
    throw new Error('Cancellation reason is required');
  }

  var rowIndex = findRowByBookingId_(bookingId);
  if (rowIndex < 0) throw new Error('Booking not found');

  var sheet = getSheet_();
  var row = rowToObject_(sheet.getRange(rowIndex, 1, rowIndex, HEADERS.length).getValues()[0]);
  row.status = status;
  row.updatedAt = trim_(body.updatedAt) || new Date().toISOString();

  if (body.paidAt) row.paidAt = body.paidAt;
  if (body.cancelledAt) row.cancelledAt = body.cancelledAt;
  if (body.cancellationReason) row.cancellationReason = body.cancellationReason;

  var values = HEADERS.map(function (header) { return row[header]; });
  sheet.getRange(rowIndex, 1, rowIndex, HEADERS.length).setValues([values]);

  return bookingToResponse_(row);
}

function findRowByBookingId_(bookingId) {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === bookingId) return i + 2;
  }
  return -1;
}

function bookingToResponse_(row) {
  return {
    bookingId: row.bookingId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    countryCode: row.countryCode,
    package: row.package,
    packageSlug: row.packageSlug,
    travelDate: row.travelDate,
    guestCount: Number(row.guestCount) || 1,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt,
    paidAt: row.paidAt || '',
    cancelledAt: row.cancelledAt || '',
    cancellationReason: row.cancellationReason || '',
    emailSentAt: row.emailSentAt || '',
    updatedAt: row.updatedAt || ''
  };
}

function rowToObject_(row) {
  var obj = {};
  for (var i = 0; i < HEADERS.length; i++) {
    obj[HEADERS[i]] = row[i] != null ? row[i] : '';
  }
  return obj;
}

function trim_(value) {
  return String(value || '').trim();
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTravelDate_(isoDate) {
  try {
    var parts = String(isoDate).split('-');
    if (parts.length !== 3) return isoDate;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
  } catch (e) {
    return isoDate;
  }
}

function guestCountLabel_(count) {
  var n = Number(count) || 1;
  return n === 1 ? '1 guest' : n + ' guests';
}

function emailQrImageUrl_(bookingId) {
  var data = '/office/booking/' + bookingId;
  return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(data);
}

function packagePrice_(pkg) {
  var prices = {
    'Phi Phi Island Escape': 6900,
    'Bangkok Cultural Journey': 2900,
    'Chiang Mai Mountain Retreat': 8500,
    'Krabi Beach Paradise': 11900,
    'Ayutthaya Historic Tour': 2500,
    'Koh Samui Luxury Getaway': 24900,
    'Hua Hin Royal Seaside': 9500,
    'Koh Phangan Full Moon Escape': 10900
  };
  return prices[pkg] || 0;
}

function formatBaht_(amount) {
  return '฿' + (Number(amount) || 0).toLocaleString('en-US');
}

function sendVoucherEmail_(booking) {
  MailApp.sendEmail({
    to: booking.email,
    subject: 'Your Siam Voyage Booking — ' + booking.bookingId,
    htmlBody: buildVoucherHtml_(booking),
    name: 'Siam Voyage'
  });
}

/**
 * TEST HELPER — run this from the Apps Script editor's Run button.
 *
 * Sends the latest voucher email design to the script owner's own Gmail
 * (Session.getActiveUser()) using a fake booking. Useful for:
 *  - Verifying which version of buildVoucherHtml_ is actually deployed
 *  - Iterating on the design without needing a real booking
 *  - Confirming Gmail rendered the HTML correctly
 *
 * After updating Code.gs in the Apps Script editor:
 *   1. Save (Ctrl+S)
 *   2. Run -> sendTestVoucherEmail (top dropdown)
 *   3. Check your inbox — that's exactly the email new bookings will get
 *      ONCE you redeploy (Deploy -> Manage Deployments -> Edit existing
 *      deployment -> Version "New version" -> Deploy).
 */
function sendTestVoucherEmail() {
  var to = Session.getActiveUser().getEmail();
  if (!to) {
    throw new Error('Could not determine the active user email — open this script while signed into the owner account.');
  }
  var booking = {
    bookingId: 'SV-TESTPREVIEW-0001',
    name: 'Riven Myat',
    email: to,
    phone: '+66 95 028 7983',
    country: 'Thailand',
    countryCode: 'TH',
    package: 'Phi Phi Island Escape',
    packageSlug: 'phi-phi-island-escape',
    travelDate: '2026-09-15',
    guestCount: 2,
    notes: 'Anniversary trip — vegetarian breakfast preferred.',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  MailApp.sendEmail({
    to: to,
    subject: '[TEST] Siam Voyage voucher preview — ' + booking.bookingId,
    htmlBody: buildVoucherHtml_(booking),
    name: 'Siam Voyage (Test)'
  });
  Logger.log('Test voucher sent to ' + to);
}

function buildVoucherHtml_(booking) {
  var name = escapeHtml_(booking.name);
  var bookingId = escapeHtml_(booking.bookingId);
  var pkg = escapeHtml_(booking.package);
  var travelDate = escapeHtml_(formatTravelDate_(booking.travelDate));
  var guests = escapeHtml_(guestCountLabel_(booking.guestCount));
  var qrUrl = escapeHtml_(emailQrImageUrl_(booking.bookingId));
  var pricePerPerson = packagePrice_(booking.package);
  var total = pricePerPerson * (Number(booking.guestCount) || 1);
  var pricePerPersonText = escapeHtml_(formatBaht_(pricePerPerson));
  var totalText = escapeHtml_(formatBaht_(total));

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Your Siam Voyage Booking</title>' +
    '<style>@media only screen and (max-width:620px){.sv-container{width:100%!important}.sv-pad{padding-left:18px!important;padding-right:18px!important}.sv-stack{display:block!important;width:100%!important}.sv-divider{border-left:0!important;border-top:1px dashed #d6c7ad!important}.sv-qr{padding-top:24px!important}.sv-title{font-size:30px!important}.sv-detail{width:100%!important;display:block!important;padding-right:0!important;padding-left:0!important}}</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#172033;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe6;padding:30px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" class="sv-container" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background-color:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #decfb8;box-shadow:0 18px 48px rgba(23,32,51,0.16);">' +
    '<tr><td class="sv-pad" style="padding:30px 32px 26px;background-color:#111827;background-image:linear-gradient(135deg,#111827 0%,#1f2937 58%,#7c3f16 100%);">' +
    '<div style="font-size:12px;letter-spacing:0.26em;text-transform:uppercase;color:#f7b267;font-weight:bold;">Siam Voyage</div>' +
    '<div class="sv-title" style="font-size:36px;line-height:1.1;font-weight:bold;color:#ffffff;margin-top:10px;font-family:Georgia,Times,serif;">Booking Confirmed</div>' +
    '<div style="font-size:14px;line-height:1.7;color:#e5e7eb;margin-top:12px;max-width:520px;">Your premium Thailand travel voucher is ready. Present the check-in code inside this ticket when you meet our team.</div>' +
    '</td></tr>' +
    '<tr><td class="sv-pad" style="padding:28px 28px 10px;background-color:#ffffff;">' +
    '<div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;font-weight:bold;">Travel Voucher Card</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #d9c7ac;border-radius:20px;overflow:hidden;background-color:#fffaf2;">' +
    '<tr><td colspan="2" style="padding:16px 20px;background-color:#fbf3e4;border-bottom:1px solid #eadcc6;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#9a6a28;font-weight:bold;">Excursion Voucher</td>' +
    '<td align="right" style="font-size:12px;color:#6b7280;font-family:Consolas,Monaco,monospace;">' + bookingId + '</td>' +
    '</tr></table>' +
    '</td></tr>' +
    '<tr>' +
    '<td class="sv-stack" width="68%" valign="top" style="width:68%;padding:24px 24px 22px;background-color:#ffffff;">' +
    '<div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;font-weight:bold;">Booking Information</div>' +
    '<div style="font-size:22px;line-height:1.25;font-weight:bold;color:#111827;margin-top:8px;font-family:Georgia,Times,serif;">' + pkg + '</div>' +
    '<div style="font-size:13px;color:#6b7280;margin-top:7px;">Prepared for ' + name + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">' +
    '<tr>' +
    '<td class="sv-detail" width="50%" valign="top" style="width:50%;padding:0 12px 16px 0;">' +
    '<div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;font-weight:bold;">Booking ID</div>' +
    '<div style="font-size:14px;font-weight:bold;color:#111827;font-family:Consolas,Monaco,monospace;letter-spacing:0.04em;margin-top:5px;">' + bookingId + '</div>' +
    '</td>' +
    '<td class="sv-detail" width="50%" valign="top" style="width:50%;padding:0 0 16px 12px;">' +
    '<div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;font-weight:bold;">Guest Name</div>' +
    '<div style="font-size:14px;font-weight:bold;color:#111827;margin-top:5px;">' + name + '</div>' +
    '</td></tr>' +
    '<tr>' +
    '<td class="sv-detail" width="50%" valign="top" style="width:50%;padding:0 12px 16px 0;">' +
    '<div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;font-weight:bold;">Travel Date</div>' +
    '<div style="font-size:14px;font-weight:bold;color:#111827;margin-top:5px;">' + travelDate + '</div>' +
    '</td>' +
    '<td class="sv-detail" width="50%" valign="top" style="width:50%;padding:0 0 16px 12px;">' +
    '<div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;font-weight:bold;">Guest Count</div>' +
    '<div style="font-size:14px;font-weight:bold;color:#111827;margin-top:5px;">' + guests + '</div>' +
    '</td></tr>' +
    '<tr>' +
    '<td class="sv-detail" width="50%" valign="top" style="width:50%;padding:0 12px 0 0;">' +
    '<div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;font-weight:bold;">Price Per Person</div>' +
    '<div style="font-size:15px;font-weight:bold;color:#111827;margin-top:5px;">' + pricePerPersonText + '</div>' +
    '</td>' +
    '<td class="sv-detail" width="50%" valign="top" style="width:50%;padding:0 0 0 12px;">' +
    '<div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#b45309;font-weight:bold;">Total Amount</div>' +
    '<div style="font-size:20px;font-weight:bold;color:#111827;margin-top:4px;">' + totalText + '</div>' +
    '</td></tr></table>' +
    '</td>' +
    '<td class="sv-stack sv-divider sv-qr" width="32%" valign="middle" align="center" style="width:32%;background-color:#182133;border-left:1px dashed #d6c7ad;padding:24px 18px;">' +
    '<div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#f7b267;font-weight:bold;margin-bottom:14px;">QR Check-In Voucher</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:14px;border:1px solid #eadcc6;"><tr><td style="padding:10px;">' +
    '<img src="' + qrUrl + '" width="138" height="138" alt="Booking QR code" style="display:block;border:0;outline:none;text-decoration:none;" />' +
    '</td></tr></table>' +
    '<div style="font-size:13px;color:#ffffff;font-family:Consolas,Monaco,monospace;font-weight:bold;letter-spacing:0.05em;margin-top:13px;">' + bookingId + '</div>' +
    '<div style="font-size:11px;line-height:1.5;color:#cbd5e1;margin-top:6px;">Show this code to Siam Voyage staff at check-in.</div>' +
    '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td class="sv-pad" style="padding:18px 32px 28px;background-color:#ffffff;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee2cf;padding-top:18px;">' +
    '<tr><td style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#9a6a28;font-weight:bold;padding-bottom:8px;">Contact Information</td></tr>' +
    '<tr><td style="font-size:14px;line-height:1.7;color:#5b6472;">Our travel team will contact you within 24 hours to confirm pickup details and any special requests. No payment is required right now.<br>Email: hello@siamvoyage.com</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '<tr><td style="padding:20px 24px;background-color:#0f172a;text-align:center;font-size:12px;line-height:1.6;color:#cbd5e1;">' +
    '&copy; Siam Voyage &middot; Premium journeys across Thailand' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function updateEmailSentAt_(bookingId, sentAt) {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  var emailSentCol = HEADERS.indexOf('emailSentAt') + 1;
  for (var r = 2; r <= lastRow; r++) {
    if (sheet.getRange(r, 1).getValue() === bookingId) {
      sheet.getRange(r, emailSentCol).setValue(sentAt);
      return;
    }
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
