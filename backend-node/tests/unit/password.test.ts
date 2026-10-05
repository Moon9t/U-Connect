import { hashPassword, comparePassword } from '../../src/utils/password';

describe('Unit Tests: Password Hashing', () => {
  it('should hash a password and verify matching plain text', async () => {
    const raw = 'superSecret123';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2')).toBe(true);

    const match = await comparePassword(raw, hash);
    expect(match).toBe(true);

    const mismatch = await comparePassword('wrongPassword', hash);
    expect(mismatch).toBe(false);
  });
});
