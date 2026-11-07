import bcrypt from 'bcryptjs';

const COST = 10;

// Compared against when the email does not exist, so a failed login takes the same time either way
// and response timing does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', COST);

export function hashPassword(password) {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password, hash) {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && matches;
}
