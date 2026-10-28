// ============================================================
// FIREBASE CONFIG: paste your Firebase web app config here.
// While apiKey is "YOUR_API_KEY", the site runs in DEMO MODE:
// comments are saved only in this browser's localStorage.
// A Firebase web config is NOT a secret (rules protect the data),
// but never put service-account keys or admin tokens in this repo.
// ============================================================
window.LP_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// Moderation switch. "approved" = comments appear right away.
// "pending" = comments wait for an admin to approve them.
// Must match newCommentStatus() in firestore.rules.
window.LP_COMMENT_STATUS = "approved";
