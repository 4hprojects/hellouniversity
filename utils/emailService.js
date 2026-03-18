const { Resend } = require('resend');
const axios = require('axios');

// ============ SAFELY INITIALIZE RESEND CLIENTS ============
let resend1, resend2, resendHenzoom;

try {
    if (process.env.RESEND_API_KEY) {
        resend1 = new Resend(process.env.RESEND_API_KEY);
        console.log('✅ [Email] Resend (Primary) initialized');
    }
} catch (err) {
    console.warn('⚠️ [Email] Resend Primary init error:', err.message);
}

try {
    if (process.env.RESEND_API_KEY2) {
        resend2 = new Resend(process.env.RESEND_API_KEY2);
        console.log('✅ [Email] Resend (Backup) initialized');
    }
} catch (err) {
    console.warn('⚠️ [Email] Resend Backup init error:', err.message);
}

try {
    if (process.env.RESEND_API_KEY_HENZOOM) {
        resendHenzoom = new Resend(process.env.RESEND_API_KEY_HENZOOM);
        console.log('✅ [Email] Resend (HenZoom) initialized');
    }
} catch (err) {
    console.warn('⚠️ [Email] Resend HenZoom init error:', err.message);
}

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hensonsagorsor@gmail.com';

/**
 * Send email with automatic fallback to multiple providers
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email content
 * @returns {object} { success: boolean, provider: string, error?: string }
 */
async function sendEmailWithFallback(to, subject, html) {
    const providers = [];

    // Only add providers that are initialized
    if (resend1) {
        providers.push({ name: 'Resend (Primary)', fn: () => sendViaResend(to, subject, html, resend1) });
    }

    if (resend2) {
        providers.push({ name: 'Resend (Backup)', fn: () => sendViaResend(to, subject, html, resend2) });
    }

    if (resendHenzoom) {
        providers.push({ name: 'Resend (HenZoom)', fn: () => sendViaResend(to, subject, html, resendHenzoom) });
    }

    if (process.env.MAILERSEND_API_KEY) {
        providers.push({ name: 'MailerSend', fn: () => sendViaMailerSend(to, subject, html) });
    }

    if (process.env.ELASTIC_API_KEY) {
        providers.push({ name: 'Elastic Email', fn: () => sendViaElastic(to, subject, html) });
    }

    if (providers.length === 0) {
        console.error('❌ [Email] No email providers configured');
        return {
            success: false,
            provider: 'none',
            error: 'No email providers configured in .env'
        };
    }

    console.log(`📧 [Email] Trying ${providers.length} providers for: ${to}`);

    for (const provider of providers) {
        try {
            console.log(`📧 [Email] Attempting ${provider.name}...`);
            
            // Add 15 second timeout
            const result = await Promise.race([
                provider.fn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`${provider.name} timeout after 15s`)), 15000)
                )
            ]);
            
            console.log(`✅ [Email] SUCCESS via ${provider.name}`);
            console.log(`   Message ID: ${result.messageId || result.id || 'unknown'}`);
            return { 
                success: true, 
                provider: provider.name,
                messageId: result.messageId || result.id || 'sent'
            };
        } catch (error) {
            console.error(`❌ [Email] ${provider.name} FAILED`);
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack?.split('\n')[0]}`);
            continue;
        }
    }

    console.error('❌ [Email] ALL PROVIDERS FAILED - Submission still succeeded');
    return { 
        success: false, 
        provider: 'none',
        error: 'All email providers failed but submission saved'
    };
}

/**
 * Send via Resend
 */
async function sendViaResend(to, subject, html, resendClient) {
    if (!resendClient) {
        throw new Error('Resend client not initialized');
    }

    try {
        const result = await resendClient.emails.send({
            from: SENDER_EMAIL,
            to: to,
            subject: subject,
            html: html
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        return { id: result.data.id };
    } catch (error) {
        throw new Error(`Resend error: ${error.message}`);
    }
}

/**
 * Send via MailerSend
 */
async function sendViaMailerSend(to, subject, html) {
    if (!process.env.MAILERSEND_API_KEY) {
        throw new Error('MAILERSEND_API_KEY not configured');
    }

    try {
        const response = await axios.post('https://api.mailersend.com/v1/email', {
            from: { email: SENDER_EMAIL },
            to: [{ email: to }],
            subject: subject,
            html: html
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.status !== 202) {
            throw new Error(`Status ${response.status}`);
        }

        return { messageId: response.data.message_id };
    } catch (error) {
        throw new Error(`MailerSend error: ${error.message}`);
    }
}

/**
 * Send via Elastic Email
 */
async function sendViaElastic(to, subject, html) {
    if (!process.env.ELASTIC_API_KEY) {
        throw new Error('ELASTIC_API_KEY not configured');
    }

    try {
        const response = await axios.post('https://api.elasticemail.com/v2/email/send', null, {
            params: {
                apikey: process.env.ELASTIC_API_KEY,
                from: SENDER_EMAIL,
                to: to,
                subject: subject,
                bodyHtml: html
            },
            timeout: 10000
        });

        if (response.data.success !== true) {
            throw new Error(response.data.error);
        }

        return { messageId: response.data.messageid };
    } catch (error) {
        throw new Error(`Elastic error: ${error.message}`);
    }
}

/**
 * Send submission confirmation with fallback
 */
async function sendSubmissionConfirmation(senderEmail, groupNumber, submissionData, members, projectUrl) {
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { background: white; padding: 20px; margin-top: 20px; border-radius: 8px; }
        .field { margin: 15px 0; }
        .label { font-weight: bold; color: #10b981; }
        .value { margin-top: 5px; padding: 10px; background: #f0fdf4; border-left: 4px solid #10b981; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
        .ref-number { font-size: 14px; background: #fef3c7; padding: 10px; border-radius: 4px; text-align: center; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Project Submission Confirmation</h1>
            <p>HelloUniversity Lessons - Group Project</p>
        </div>
        
        <div class="content">
            <p>Dear Group ${groupNumber},</p>
            <p>Thank you for submitting your project! Your submission has been successfully recorded.</p>
            
            <div class="field">
                <div class="label">Submission Reference Number:</div>
                <div class="ref-number"><strong>${submissionData.submissionNumber}</strong></div>
            </div>
            
            <div class="field">
                <div class="label">Group Number:</div>
                <div class="value">${groupNumber}</div>
            </div>
            
            <div class="field">
                <div class="label">Group Members:</div>
                <div class="value">${members.join(', ')}</div>
            </div>
            
            <div class="field">
                <div class="label">Project URL:</div>
                <div class="value"><a href="${projectUrl}" target="_blank">${projectUrl}</a></div>
            </div>
            
            <div class="field">
                <div class="label">Submitted At:</div>
                <div class="value">${new Date(submissionData.submittedAt).toLocaleString()}</div>
            </div>
            
            <p style="margin-top: 25px; color: #dc2626;">
                <strong>⚠️ Important Notice:</strong> Submissions are final and cannot be modified or resubmitted. 
                Please keep your submission reference number for your records.
            </p>
            
            <div class="footer">
                <p>This is an automated confirmation email. Please do not reply to this message.</p>
                <p>&copy; 2025 HelloUniversity. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmailWithFallback(
        senderEmail,
        `Project Submission Confirmation - Group ${groupNumber} - Reference: ${submissionData.submissionNumber}`,
        emailContent
    );
}

module.exports = {
    sendEmailWithFallback,
    sendSubmissionConfirmation
};
