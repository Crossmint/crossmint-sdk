// generateEmail.js
// Generates a unique test email per run, following the same pattern as the web tests:
// test-email{timestamp}@{mailosaurServerId}.mailosaur.net
// MAILOSAUR_SERVER_ID is available as a global from the flow-level env block.

var timestamp = Date.now();
var email = "test-email" + timestamp + "@" + MAILOSAUR_SERVER_ID + ".mailosaur.net";

output.email = email;
