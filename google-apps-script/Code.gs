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

function sendVoucherEmail_(booking) {
  MailApp.sendEmail({
    to: booking.email,
    subject: 'Your Siam Voyage Booking — ' + booking.bookingId,
    htmlBody: buildVoucherHtml_(booking),
    name: 'Siam Voyage'
  });
}

function buildVoucherHtml_(booking) {
  var name = escapeHtml_(booking.name);
  var bookingId = escapeHtml_(booking.bookingId);
  var pkg = escapeHtml_(booking.package);
  var travelDate = escapeHtml_(formatTravelDate_(booking.travelDate));
  var guests = escapeHtml_(guestCountLabel_(booking.guestCount));
  var qrUrl = escapeHtml_(emailQrImageUrl_(booking.bookingId));

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Your Siam Voyage Booking</title></head>' +
    '<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:24px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">' +
    '<tr><td style="background:linear-gradient(135deg,#ea580c 0%,#2563eb 100%);padding:28px 24px;text-align:center;">' +
    '<div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:bold;">Siam Voyage</div>' +
    '<div style="font-size:28px;line-height:1.2;font-weight:bold;color:#ffffff;margin-top:8px;">Your booking is confirmed</div>' +
    '</td></tr>' +
    '<tr><td style="padding:28px 24px 8px;font-size:16px;line-height:1.6;color:#334155;">' +
    'Hi ' + name + ',<br><br>Thank you for booking with Siam Voyage. Your adventure details are below.' +
    '</td></tr>' +
    '<tr><td style="padding:8px 24px 24px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #f1f5f9;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:16px 18px;background-color:#fff7ed;border-bottom:1px solid #f1f5f9;">' +
    '<div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Booking Reference</div>' +
    '<div style="font-size:20px;font-weight:bold;color:#0f172a;font-family:Consolas,Monaco,monospace;letter-spacing:0.05em;margin-top:4px;">' + bookingId + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:16px 18px;border-bottom:1px solid #f1f5f9;">' +
    '<div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Package</div>' +
    '<div style="font-size:16px;font-weight:bold;color:#0f172a;margin-top:4px;">' + pkg + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:16px 18px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td width="50%" valign="top" style="padding-right:8px;">' +
    '<div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Travel Date</div>' +
    '<div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:4px;">' + travelDate + '</div>' +
    '</td>' +
    '<td width="50%" valign="top" style="padding-left:8px;">' +
    '<div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Guests</div>' +
    '<div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:4px;">' + guests + '</div>' +
    '</td></tr></table>' +
    '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td style="padding:0 24px 24px;" align="center">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="border:2px solid #f1f5f9;border-radius:12px;background-color:#fff;padding:20px;">' +
    '<tr><td align="center">' +
    '<div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:bold;margin-bottom:12px;">Check-in QR Code</div>' +
    '<img src="' + qrUrl + '" width="180" height="180" alt="Booking QR code" style="display:block;border-radius:8px;" />' +
    '<div style="font-family:Consolas,Monaco,monospace;font-size:14px;font-weight:bold;color:#0f172a;margin-top:12px;letter-spacing:0.05em;">' + bookingId + '</div>' +
    '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td style="padding:0 24px 24px;font-size:14px;line-height:1.6;color:#64748b;">' +
    'Our travel team will contact you within 24 hours to confirm every detail. No payment is required right now.' +
    '</td></tr>' +
    '<tr><td style="padding:20px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;line-height:1.6;color:#94a3b8;">' +
    '&copy; Siam Voyage &middot; Tailored journeys across Thailand' +
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
