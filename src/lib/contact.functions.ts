import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactFormInput = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormInput = z.infer<typeof contactFormInput>;

/**
 * Send contact form email
 * This function sends an email notification when someone submits the contact form
 */
export const sendContactEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactFormInput.parse(d))
  .handler(async ({ data }) => {
    try {
      // Create professional email template
      const emailHtml = generateEmailTemplate(data);
      const emailText = generateEmailText(data);

      // Send email using Resend API
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GrainHero Contact Form <noreply@grainhero.com>",
          to: "grainhero@gmail.com",
          reply_to: data.email,
          subject: `New Contact Form Submission: ${data.subject}`,
          html: emailHtml,
          text: emailText,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Email send failed:", error);
        throw new Error("Failed to send email");
      }

      const result = await response.json();
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error("Error sending contact email:", error);
      throw new Error(
        "Failed to send message. Please try again or email us directly at grainhero@gmail.com",
      );
    }
  });

/**
 * Generate HTML email template
 */
function generateEmailTemplate(data: ContactFormInput): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EDE9D4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EDE9D4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #252d26 0%, #404F44 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #2FAC0C; font-size: 32px; font-weight: 900; letter-spacing: -0.5px;">
                GrainHero
              </h1>
              <p style="margin: 10px 0 0 0; color: #EDE9D4; font-size: 16px; font-weight: 500;">
                New Contact Form Submission
              </p>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <div style="display: inline-block; background-color: #2FAC0C; color: #FFFFFF; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                ${data.subject}
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 30px 30px 30px;">
              
              <!-- Contact Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #EDE9D4;">
                    <table width="100%">
                      <tr>
                        <td style="width: 120px; color: #404F44; font-size: 14px; font-weight: 700;">
                          Name
                        </td>
                        <td style="color: #252d26; font-size: 14px;">
                          ${data.name}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #EDE9D4;">
                    <table width="100%">
                      <tr>
                        <td style="width: 120px; color: #404F44; font-size: 14px; font-weight: 700;">
                          Email
                        </td>
                        <td style="color: #252d26; font-size: 14px;">
                          <a href="mailto:${data.email}" style="color: #2FAC0C; text-decoration: none;">
                            ${data.email}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                ${
                  data.phone
                    ? `
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #EDE9D4;">
                    <table width="100%">
                      <tr>
                        <td style="width: 120px; color: #404F44; font-size: 14px; font-weight: 700;">
                          Phone
                        </td>
                        <td style="color: #252d26; font-size: 14px;">
                          <a href="tel:${data.phone}" style="color: #2FAC0C; text-decoration: none;">
                            ${data.phone}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              <!-- Message -->
              <div style="margin-top: 30px; padding: 20px; background-color: #EDE9D4; border-radius: 12px; border-left: 4px solid #2FAC0C;">
                <p style="margin: 0 0 10px 0; color: #404F44; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  Message
                </p>
                <p style="margin: 0; color: #252d26; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${data.message}
                </p>
              </div>

              <!-- CTA Button -->
              <div style="margin-top: 30px; text-align: center;">
                <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" 
                   style="display: inline-block; background-color: #2FAC0C; color: #FFFFFF; padding: 14px 32px; border-radius: 25px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">
                  Reply to ${data.name}
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #252d26; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; color: #EDE9D4; font-size: 12px; line-height: 1.6;">
                This email was sent from the GrainHero contact form<br>
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
  `.trim();
}

/**
 * Generate plain text email (fallback)
 */
function generateEmailText(data: ContactFormInput): string {
  return `
NEW CONTACT FORM SUBMISSION - GRAINHERO

Subject: ${data.subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTACT DETAILS

Name: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MESSAGE

${data.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To reply, send an email to: ${data.email}

---
GrainHero | Smart Grain Storage Monitoring
https://grainhero.com
  `.trim();
}
