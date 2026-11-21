import * as argon2 from 'argon2';


const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => argon2.hash(plain, OPTIONS);
export const verifyPassword = (hash: string, plain: string) => argon2.verify(hash, plain);

// Used when the email doesn't exist, so "unknown user" takes as long as "wrong password".
let dummyHash: Promise<string> | undefined;
export const getDummyHash = () => (dummyHash ??= argon2.hash('timing-equaliser-not-a-password', OPTIONS));