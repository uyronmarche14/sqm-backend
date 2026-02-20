/**
 * QMQA Email Service
 * Handles automated email notifications for workflow events
 * 
 * NOTE: This is a mock implementation that logs emails to console.
 * In production, integrate with nodemailer or your email service provider.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Mock email sender (logs to console)
 * Replace with actual email service in production
 */
const sendEmail = async (emailData) => {
    console.log('📧 [EMAIL-SERVICE] Sending Email');
    console.log('   To:', emailData.to.join(', '));
    if (emailData.cc?.length) {
        console.log('   CC:', emailData.cc.join(', '));
    }
    console.log('   Subject:', emailData.subject);
    console.log('   Body Preview:', emailData.html.substring(0, 100) + '...');
    
    // In production, replace with:
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail(emailData);
    
    return { success: true, messageId: `mock-${Date.now()}` };
};

/**
 * Get user emails from user IDs
 * In production, query the database for user emails
 */
const getUserEmails = async (userIds) => {
    // Mock implementation - returns placeholder emails
    return userIds.map(id => `user-${id}@example.com`);
};

/**
 * Render email template with dynamic content
 */
const renderTemplate = (templateName, data) => {
    // Simple template rendering
    // In production, use a template engine like Handlebars or EJS
    
    const templates = {
        'cycle1-submit': `
            <html>
            <body>
                <h2>QMQA Audit Submitted for Approval</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p><strong>Audit Plan Date:</strong> ${data.auditPlanDate}</p>
                <p><strong>Your Role:</strong> ${data.role}</p>
                <p>Please review and approve this audit:</p>
                <p><a href="${data.approvalLink}">Click here to review</a></p>
            </body>
            </html>
        `,
        'cycle1-approved': `
            <html>
            <body>
                <h2>QMQA Audit Approved</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p>Your audit has been approved and is ready to be issued.</p>
                <p><a href="${data.detailsLink}">View Details</a></p>
            </body>
            </html>
        `,
        'issued': `
            <html>
            <body>
                <h2>QMQA Audit Issued</h2>
                <p>Dear ${data.supplierName},</p>
                <p>An audit has been issued to your company:</p>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
                <p>Please submit your response using the link below:</p>
                <p><a href="${data.responseLink}">Submit Response</a></p>
                <p>This link will expire on ${data.expirationDate}.</p>
            </body>
            </html>
        `,
        'final-report': `
            <html>
            <body>
                <h2>Supplier Final Report Submitted</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p>The supplier has submitted their final report.</p>
                <p><a href="${data.detailsLink}">View Report</a></p>
            </body>
            </html>
        `,
        'due-date-changed': `
            <html>
            <body>
                <h2>QMQA Audit Due Date Changed</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p><strong>Old Due Date:</strong> ${data.oldDueDate}</p>
                <p><strong>New Due Date:</strong> ${data.newDueDate}</p>
                <p><a href="${data.detailsLink}">View Details</a></p>
            </body>
            </html>
        `,
        'cycle2-submit': `
            <html>
            <body>
                <h2>QMQA Verification Submitted for Cycle 2 Approval</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p><strong>Your Role:</strong> ${data.role}</p>
                <p>Please review the verification and approve:</p>
                <p><a href="${data.approvalLink}">Click here to review</a></p>
            </body>
            </html>
        `,
        'closed': `
            <html>
            <body>
                <h2>QMQA Audit Closed</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p>This audit has been completed and closed.</p>
                <p><a href="${data.detailsLink}">View Final Report</a></p>
            </body>
            </html>
        `,
        'initial-report': `
            <html>
            <body>
                <h2>Supplier Initial Report Submitted</h2>
                <p><strong>Control No:</strong> ${data.controlNo}</p>
                <p><strong>Supplier:</strong> ${data.supplierName}</p>
                <p>${data.skipped ? 'The supplier has skipped the initial report.' : 'The supplier has submitted their initial report.'}</p>
                <p><a href="${data.detailsLink}">View Details</a></p>
            </body>
            </html>
        `
    };
    
    return templates[templateName] || '<p>Template not found</p>';
};

export const qmqaEmailService = {
    
    /**
     * Email #1 & #2: Send Cycle 1 approval request to checker and approver
     */
    async sendCycle1SubmitEmail(record) {
        console.log('📨 [EMAIL-SERVICE] Sending Cycle 1 Submit Emails');
        
        const checkerEmail = await getUserEmails([record.checkerId]);
        const approverEmail = await getUserEmails([record.approverId]);
        
        // Email to Checker
        await sendEmail({
            to: checkerEmail,
            subject: `QMQA Audit Submitted for Review - ${record.controlNo}`,
            html: renderTemplate('cycle1-submit', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                auditPlanDate: record.auditPlan?.auditPlanDate || 'N/A',
                role: 'Checker',
                approvalLink: `${BASE_URL}/qmqa/approve/${record.id}`
            })
        });
        
        // Email to Approver
        await sendEmail({
            to: approverEmail,
            subject: `QMQA Audit Submitted for Approval - ${record.controlNo}`,
            html: renderTemplate('cycle1-submit', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                auditPlanDate: record.auditPlan?.auditPlanDate || 'N/A',
                role: 'Approver',
                approvalLink: `${BASE_URL}/qmqa/approve/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Cycle 1 Submit Emails Sent');
    },
    
    /**
     * Email #3: Send approval notification to issuer
     */
    async sendCycle1ApprovedEmail(record) {
        console.log('📨 [EMAIL-SERVICE] Sending Cycle 1 Approved Email');
        
        const issuerEmail = await getUserEmails([record.issuerId]);
        
        await sendEmail({
            to: issuerEmail,
            subject: `QMQA Audit Approved - ${record.controlNo}`,
            html: renderTemplate('cycle1-approved', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                detailsLink: `${BASE_URL}/qmqa/records/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Cycle 1 Approved Email Sent');
    },
    
    /**
     * Email #4: Send issuance notification to supplier with response link
     */
    async sendIssuedEmail(record, token) {
        console.log('📨 [EMAIL-SERVICE] Sending Issued Email to Supplier');
        
        // In production, get supplier contact email from database
        const supplierEmail = [`supplier-${record.auditPlan?.supplierId}@example.com`];
        
        const dueDate = new Date(record.auditDetails?.dueDate);
        const expirationDate = new Date(dueDate);
        expirationDate.setDate(expirationDate.getDate() + 7);
        
        await sendEmail({
            to: supplierEmail,
            subject: `QMQA Audit Issued - ${record.controlNo}`,
            html: renderTemplate('issued', {
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                controlNo: record.controlNo,
                dueDate: dueDate.toLocaleDateString(),
                responseLink: `${BASE_URL}/qmqa/response/${token}`,
                expirationDate: expirationDate.toLocaleDateString()
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Issued Email Sent');
    },
    
    /**
     * Email #5: Send final report notification to issuer
     */
    async sendFinalReportEmail(record) {
        console.log('📨 [EMAIL-SERVICE] Sending Final Report Email');
        
        const issuerEmail = await getUserEmails([record.issuerId]);
        
        await sendEmail({
            to: issuerEmail,
            subject: `Supplier Final Report Submitted - ${record.controlNo}`,
            html: renderTemplate('final-report', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                detailsLink: `${BASE_URL}/qmqa/records/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Final Report Email Sent');
    },
    
    /**
     * Email #6: Send due date change notification to issuer
     */
    async sendDueDateChangedEmail(record, oldDueDate, newDueDate) {
        console.log('📨 [EMAIL-SERVICE] Sending Due Date Changed Email');
        
        const issuerEmail = await getUserEmails([record.issuerId]);
        
        await sendEmail({
            to: issuerEmail,
            subject: `Due Date Changed - ${record.controlNo}`,
            html: renderTemplate('due-date-changed', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                oldDueDate: new Date(oldDueDate).toLocaleDateString(),
                newDueDate: new Date(newDueDate).toLocaleDateString(),
                detailsLink: `${BASE_URL}/qmqa/records/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Due Date Changed Email Sent');
    },
    
    /**
     * Email #7 & #8: Send Cycle 2 approval request to checker and approver
     */
    async sendCycle2SubmitEmail(record) {
        console.log('📨 [EMAIL-SERVICE] Sending Cycle 2 Submit Emails');
        
        const checkerId = record.response?.checkerId;
        const approverId = record.response?.approverId;
        
        if (!checkerId || !approverId) {
            console.log('⚠️  [EMAIL-SERVICE] Missing Cycle 2 approvers');
            return;
        }
        
        const checkerEmail = await getUserEmails([checkerId]);
        const approverEmail = await getUserEmails([approverId]);
        
        // Email to Cycle 2 Checker
        await sendEmail({
            to: checkerEmail,
            subject: `QMQA Verification Submitted for Review - ${record.controlNo}`,
            html: renderTemplate('cycle2-submit', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                role: 'Cycle 2 Checker',
                approvalLink: `${BASE_URL}/qmqa/approve/${record.id}`
            })
        });
        
        // Email to Cycle 2 Approver
        await sendEmail({
            to: approverEmail,
            subject: `QMQA Verification Submitted for Approval - ${record.controlNo}`,
            html: renderTemplate('cycle2-submit', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                role: 'Cycle 2 Approver',
                approvalLink: `${BASE_URL}/qmqa/approve/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Cycle 2 Submit Emails Sent');
    },
    
    /**
     * Email #9: Send closure notification to all parties
     */
    async sendClosedEmail(record) {
        console.log('📨 [EMAIL-SERVICE] Sending Closed Email to All Parties');
        
        const recipients = [
            record.issuerId,
            record.checkerId,
            record.approverId
        ];
        
        // Add CC list
        if (record.ccList?.length) {
            recipients.push(...record.ccList.map(cc => cc.userId));
        }
        
        const emails = await getUserEmails(recipients);
        
        // In production, also send to supplier
        const supplierEmail = `supplier-${record.auditPlan?.supplierId}@example.com`;
        emails.push(supplierEmail);
        
        await sendEmail({
            to: emails,
            subject: `QMQA Audit Closed - ${record.controlNo}`,
            html: renderTemplate('closed', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                detailsLink: `${BASE_URL}/qmqa/records/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Closed Email Sent');
    },
    
    /**
     * Email #11: Send initial report notification to issuer
     */
    async sendInitialReportEmail(record, skipped = false) {
        console.log('📨 [EMAIL-SERVICE] Sending Initial Report Email');
        
        const issuerEmail = await getUserEmails([record.issuerId]);
        
        await sendEmail({
            to: issuerEmail,
            subject: `Supplier Initial Report ${skipped ? 'Skipped' : 'Submitted'} - ${record.controlNo}`,
            html: renderTemplate('initial-report', {
                controlNo: record.controlNo,
                supplierName: record.auditPlan?.supplierName || 'Unknown',
                skipped,
                detailsLink: `${BASE_URL}/qmqa/records/${record.id}`
            })
        });
        
        console.log('✅ [EMAIL-SERVICE] Initial Report Email Sent');
    }
};
