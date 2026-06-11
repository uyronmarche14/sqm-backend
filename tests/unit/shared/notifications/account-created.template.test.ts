import { describe, expect, it } from 'vitest';
import { buildAccountCreatedTemplate } from '../../../../src/shared/notifications/templates/account-created.template.js';

describe('buildAccountCreatedTemplate', () => {
  it('renders the legacy-equivalent account confirmation template with both links', () => {
    const rendered = buildAccountCreatedTemplate({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      temporaryPassword: 'Temp1234',
      localUrl: 'http://localhost:5000/auth/login',
      internetUrl: 'https://sqm.example.com/auth/login',
    });

    expect(rendered.subject).toBe('Account Confirmation');
    expect(rendered.html).toContain('Welcome to Toshiba Global SQM');
    expect(rendered.html).toContain('Web Link:');
    expect(rendered.html).toContain('Local Link:');
    expect(rendered.html).toContain('https://sqm.example.com/auth/login');
    expect(rendered.html).toContain('http://localhost:5000/auth/login');
    expect(rendered.text).toContain('Temporary Password: Temp1234');
  });
});
