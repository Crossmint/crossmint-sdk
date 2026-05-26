// getOtp.js
// Retrieves the 6-digit login OTP from Mailosaur for the given email address.
// Polls POST /api/messages/search until the email arrives (up to 60s), then fetches the full
// message to extract OTP codes. Mirrors apps/wallets/quickstart-devkit/tests/shared/utils/email.ts
// Flow-level env vars (MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID) are available as globals.
// EMAIL is passed via runScript.env from generateEmail.js output.
// btoa is not available in GraalJS — implemented via the standard polyfill below.

function btoa(input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}

var authHeader = "Basic " + btoa(MAILOSAUR_API_KEY + ":");

// Poll for the message — search endpoint doesn't long-poll, so we retry until timeout
var timeout = 60000;
var pollInterval = 5000;
var startTime = Date.now();
var message = null;

while (!message && Date.now() - startTime < timeout) {
    var searchResponse = http.post(
        "https://mailosaur.com/api/messages/search?server=" + MAILOSAUR_SERVER_ID,
        {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sentTo: EMAIL,
                sentFrom: "signin@crossmint.com",
            }),
        },
    );

    if (searchResponse.ok) {
        var result = json(searchResponse.body);
        if (result.items && result.items.length > 0) {
            message = result.items[0];
        }
    }

    if (!message) {
        // Spin-wait for pollInterval ms (GraalJS has no sleep/setTimeout)
        var waitUntil = Date.now() + pollInterval;
        while (Date.now() < waitUntil) {
            /* spin */
        }
    }
}

if (!message) {
    throw new Error("Timed out waiting for OTP email sent to " + EMAIL);
}

// Fetch the full message to get the text codes
var msgResponse = http.get("https://mailosaur.com/api/messages/" + message.id, {
    headers: { Authorization: authHeader },
});

if (!msgResponse.ok) {
    throw new Error("Failed to fetch message body. Status: " + msgResponse.status);
}

var fullMessage = json(msgResponse.body);
var codes = fullMessage.text && fullMessage.text.codes ? fullMessage.text.codes : [];
var otpCode = null;

// Login OTP is 6 digits (signer OTP is 9 digits — matches web test convention)
for (var i = 0; i < codes.length; i++) {
    if (codes[i].value && codes[i].value.length === 6) {
        otpCode = codes[i].value;
        break;
    }
}

if (!otpCode) {
    throw new Error("Could not find 6-digit OTP in email sent to " + EMAIL + ". Codes found: " + JSON.stringify(codes));
}

output.otp = otpCode;
