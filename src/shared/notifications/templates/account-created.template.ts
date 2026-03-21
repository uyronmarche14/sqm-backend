function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;color:#5f6368;font-size:13px;width:180px;border-bottom:1px solid #e8eaed;">${label}</td>
    <td style="padding:10px 0;color:#202124;font-size:14px;font-weight:600;border-bottom:1px solid #e8eaed;">${value}</td>
  </tr>`;
}

export interface AccountCreatedTemplateInput {
  fullName: string;
  email: string;
  temporaryPassword: string;
  localUrl: string;
  internetUrl: string;
  roleName?: string | null;
  siteId?: string | null;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export function buildAccountCreatedTemplate(input: AccountCreatedTemplateInput): RenderedTemplate {
  const fullName = escapeHtml(input.fullName);
  const email = escapeHtml(input.email);
  const temporaryPassword = escapeHtml(input.temporaryPassword);
  const localUrl = escapeHtml(input.localUrl);
  const internetUrl = escapeHtml(input.internetUrl);

  const subject = 'Account Confirmation';

  const html = `<div style="margin:0;padding:0;background-color:#f5f5f5;">
  <div style="display:none;font-size:1px;color:#f5f5f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your Toshiba Global SQM account has been confirmed.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f5;margin:0;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="width:640px;max-width:640px;background-color:#ffffff;border-collapse:collapse;border:1px solid #dadce0;">
          <tr>
            <td style="padding:0;background-color:#e60012;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:18px 28px;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">
                    TOSHIBA
                  </td>
                  <td align="right" style="padding:18px 28px;color:#ffd9dd;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;">
                    Supplier Quality Management
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 12px 36px;color:#202124;">
              <div style="font-size:24px;font-weight:700;line-height:1.3;margin-bottom:8px;">Account Confirmation</div>
              <div style="font-size:14px;line-height:1.7;color:#5f6368;">
                Dear ${fullName},
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 8px 36px;color:#202124;font-size:14px;line-height:1.8;">
              <p style="margin:0 0 16px 0;">Welcome to Toshiba Global SQM (Supplier Quality Management).</p>
              <p style="margin:0 0 16px 0;">Your account has been confirmed. If you skip to change your password you are still require to change when you login. Please use temporay password to login to SQM.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 8px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#ffffff;border:1px solid #e8eaed;">
                <tr>
                  <td style="padding:18px 22px;background-color:#fafafa;color:#202124;font-size:13px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;border-bottom:1px solid #e8eaed;">
                    Account Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 22px 8px 22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      ${renderDetailRow('Name', fullName)}
                      ${renderDetailRow('Email', email)}
                      ${renderDetailRow('Username', email)}
                      ${renderDetailRow('Temporary Password', temporaryPassword)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 36px 8px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 10px 0;color:#5f6368;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                    Access Links
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px 0;">
                    <a href="${internetUrl}" target="_blank" style="display:inline-block;background-color:#e60012;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:2px;">Open SQM Web</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px 0;color:#5f6368;font-size:13px;line-height:1.7;">
                    Web Link: <a href="${internetUrl}" target="_blank" style="color:#e60012;text-decoration:none;">${internetUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;color:#5f6368;font-size:13px;line-height:1.7;">
                    Local Link: <a href="${localUrl}" target="_blank" style="color:#e60012;text-decoration:none;">${localUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 36px 14px 36px;color:#202124;font-size:13px;line-height:1.8;">
              <div style="padding:14px 16px;background-color:#fafafa;border-left:4px solid #e60012;color:#5f6368;">
                Note: This email was autogenerated. Please do not reply.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px 36px;color:#5f6368;font-size:13px;line-height:1.8;">
              Very truly yours,<br />
              <span style="color:#202124;font-weight:700;">TIP SQM Admin</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 36px;background-color:#f1f3f4;color:#5f6368;font-size:11px;line-height:1.6;border-top:1px solid #e8eaed;">
              Toshiba Global SQM notification service
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;

  const textLines = [
    `Dear ${input.fullName},`,
    '',
    'Welcome to Toshiba Global SQM (Supplier Quality Management).',
    'Your account has been confirmed. If you skip to change your password you are still require to change when you login. Please use temporay password to login to SQM.',
    '',
    `Web Link: ${input.internetUrl}`,
    `Local Link: ${input.localUrl}`,
    '',
    `Name: ${input.fullName}`,
    `Email: ${input.email}`,
    `Username: ${input.email}`,
    `Temporary Password: ${input.temporaryPassword}`,
    '',
    'Note: This email was autogenerated. Please do not reply.',
    '',
    'Very truly yours,',
    'TIP SQM Admin',
  ].filter((line): line is string => Boolean(line));

  return {
    subject,
    html,
    text: textLines.join('\n'),
  };
}
