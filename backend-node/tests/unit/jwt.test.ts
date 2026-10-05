import { generateToken, verifyToken } from '../../src/utils/jwt';

describe('Unit Tests: JWT Utilities', () => {
  const payload = {
    user_id: 10,
    email: 'test@uconnect.edu',
    role: 'student' as const,
  };

  it('should generate a valid JWT and decode claims correctly', () => {
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = verifyToken(token);
    expect(decoded.user_id).toBe(10);
    expect(decoded.email).toBe('test@uconnect.edu');
    expect(decoded.role).toBe('student');
  });

  it('should throw an error on invalid or tampered token', () => {
    expect(() => verifyToken('invalid.token.signature')).toThrow();
  });
});
