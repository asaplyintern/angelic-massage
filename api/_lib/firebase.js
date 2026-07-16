const admin = require("firebase-admin");

function normalizePrivateKey(value) {
  let key = String(value || "").trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n");
  if (!key.includes("-----BEGIN PRIVATE KEY-----") || !key.includes("-----END PRIVATE KEY-----")) {
    throw new Error("FIREBASE_PRIVATE_KEY must include the full BEGIN and END PRIVATE KEY text");
  }
  return key;
}

function credentialFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
    }
    return admin.credential.cert(serviceAccount);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase server credentials");
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  });
}

function getFirebaseApp() {
  if (admin.apps.length) return admin.apps[0];
  return admin.initializeApp({
    credential: credentialFromEnv(),
  });
}

function getFirestore() {
  return getFirebaseApp().firestore();
}

module.exports = { getFirestore };
