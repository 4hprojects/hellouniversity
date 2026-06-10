const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadAuthClient(fetchImpl) {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'public', 'js', 'authClient.js'),
    'utf8',
  );
  const context = {
    console,
    fetch: fetchImpl,
    URL,
    URLSearchParams,
    window: {
      location: {
        origin: 'https://example.test',
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.authClient;
}

describe('authClient login endpoints', () => {
  test('login keeps the main auth endpoint email-only', async () => {
    const calls = [];
    const authClient = loadAuthClient(async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          role: 'student',
          redirectPath: '/dashboard',
        }),
      };
    });

    const result = await authClient.login('student@example.com', 'Pass123!');

    expect(result.success).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/auth/login');
    expect(JSON.parse(calls[0].options.body)).toMatchObject({
      email: 'student@example.com',
      password: 'Pass123!',
    });
  });

  test('legacy identifier login posts CRFV-compatible IDs to /login', async () => {
    const calls = [];
    const authClient = loadAuthClient(async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          role: 'manager',
          redirectPath: '/crfv',
        }),
      };
    });

    const result = await authClient.loginWithIdentifier('2024001', 'Pass123!', {
      returnTo: '/crfv',
    });

    expect(result.success).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/login');
    expect(JSON.parse(calls[0].options.body)).toEqual({
      username: '2024001',
      password: 'Pass123!',
      returnTo: '/crfv',
    });
  });
});
