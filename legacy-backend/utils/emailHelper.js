const nodemailer = require('nodemailer');
const { Resend } = require('resend');
require('dotenv').config();

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send email using Resend API (primary) with Nodemailer/SMTP fallback.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} [html] - HTML body (optional)
 */
async function sendEmail(to, subject, text, html) {
    // Try Resend first (production-ready, works on Vercel/Render)
    if (resend) {
        try {
            const result = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'GrainHero <onboarding@resend.dev>',
                to: Array.isArray(to) ? to : [to],
                subject,
                text,
                ...(html ? { html } : {}),
            });

            if (result.error) {
                console.error('Resend API error:', result.error);
                throw new Error(result.error.message || 'Resend send failed');
            }

            console.log('✅ Email sent via Resend:', result.data?.id, 'to:', to);
            return result;
        } catch (resendErr) {
            console.error('Resend failed, falling back to SMTP:', resendErr.message);
            // Fall through to SMTP
        }
    }

    // Fallback: Nodemailer SMTP (Gmail)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        };
        if (html) {
            mailOptions.html = html;
        }

        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent via SMTP to:', to);
    } else {
        console.warn('⚠️  No email provider configured (RESEND_API_KEY or EMAIL_USER/PASS missing). Email not sent to:', to);
    }
}

module.exports = sendEmail; 