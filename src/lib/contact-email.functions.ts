import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Input validation
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required').max(100),
  phone: z.string().max(20).optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
})

type ContactFormInput = z.infer<typeof contactFormSchema>

/**
 * Send contact form email using Resend API
 */
export const sendContactEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => contactFormSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'GrainHero <onboarding@grainhero.me>'

      console.log('📧 Attempting to send email...', {
        hasApiKey: !!resendApiKey,
        fromEmail,
        to: 'grainhero@gmail.com',
      })

      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured')
        return {
          success: false,
          error: 'Email service not configured. Please contact support.',
        }
      }

      // Send email via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: 'grainhero@gmail.com',
          reply_to: data.email,
          subject: `🌾 GrainHero Contact: ${data.subject}`,
          html: generateEmailHTML(data),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Resend API error:', {
          status: response.status,
          statusText: response.statusText,
          error: result,
        })
        return {
          success: false,
          error: `Failed to send email: ${result.message || response.statusText}`,
        }
      }

      console.log('✅ Email sent successfully:', result.id)

      return {
        success: true,
        message: 'Thank you for contacting us! We will get back to you within 24 hours.',
      }
    } catch (error) {
      console.error('Email sending error:', error)
      return {
        success: false,
        error: 'Failed to send message. Please try again.',
      }
    }
  })

/**
 * Generate professional HTML email template
 */
function generateEmailHTML(data: ContactFormInput): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GrainHero Contact Form</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #EDE9D4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EDE9D4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #252d26 0%, #404F44 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #2FAC0C; font-size: 32px; font-weight: 900;">GrainHero</h1>
              <p style="margin: 10px 0 0 0; color: #EDE9D4; font-size: 16px;">New Contact Form Submission</p>
            </td>
          </tr>

          <!-- Subject Badge -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <div style="display: inline-block; background-color: #2FAC0C; color: #FFFFFF; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                ${escapeHtml(data.subject)}
              </div>
            </td>
          </tr>

          <!-- Contact Details -->
          <tr>
            <td style="padding: 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #EDE9D4;">
                    <table width="100%">
                      <tr>
                        <td style="width: 100px; color: #404F44; font-size: 14px; font-weight: 700;">Name</td>
                        <td style="color: #252d26; font-size: 14px;">${escapeHtml(data.name)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #EDE9D4;">
                    <table width="100%">
                      <tr>
                        <td style="width: 100px; color: #404F44; font-size: 14px; font-weight: 700;">Email</td>
                        <td style="color: #252d26; font-size: 14px;">
                          <a href="mailto:${escapeHtml(data.email)}" style="color: #2FAC0C; text-decoration: none;">
                            ${escapeHtml(data.email)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #EDE9D4;">
                    <table width="100%">
                      <tr>
                        <td style="width: 100px; color: #404F44; font-size: 14px; font-weight: 700;">Phone</td>
                        <td style="color: #252d26; font-size: 14px;">
                          <a href="tel:${escapeHtml(data.phone)}" style="color: #2FAC0C; text-decoration: none;">
                            ${escapeHtml(data.phone)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="padding: 20px; background-color: #EDE9D4; border-radius: 12px; border-left: 4px solid #2FAC0C;">
                <p style="margin: 0 0 10px 0; color: #404F44; font-size: 12px; font-weight: 700; text-transform: uppercase;">Message</p>
                <p style="margin: 0; color: #252d26; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
              </div>
            </td>
          </tr>

          <!-- Reply Button -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="mailto:${escapeHtml(data.email)}?subject=Re: ${encodeURIComponent(data.subject)}" 
                 style="display: inline-block; background-color: #2FAC0C; color: #FFFFFF; padding: 14px 32px; border-radius: 25px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Reply to ${escapeHtml(data.name)}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #252d26; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; color: #EDE9D4; font-size: 12px;">
                Sent from GrainHero Contact Form<br>
                <a href="https://grainhero.com" style="color: #2FAC0C; text-decoration: none;">grainhero.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
