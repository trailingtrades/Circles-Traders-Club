import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Constant-cost dummy compare used when the account doesn't exist, so login
// timing doesn't reveal whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", ROUNDS);
export async function dummyVerify(): Promise<void> {
  await bcrypt.compare("not-the-password", DUMMY_HASH);
}
