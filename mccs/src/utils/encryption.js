const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

const getKey = () => {
  const key = process.env.CARD_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("CARD_ENCRYPTION_KEY is not configured");
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "CARD_ENCRYPTION_KEY must be exactly 64 hexadecimal characters",
    );
  }

  return Buffer.from(key, "hex");
};

const encrypt = (text) => {
  const key = getKey();

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
};

const decrypt = (encrypted, iv, authTag) => {
  const key = getKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

module.exports = {
  encrypt,
  decrypt,
};
