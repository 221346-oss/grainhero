const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

/**
 * @swagger
 * components:
 *   schemas:
 *     ContactForm:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - message
 *         - inquiry
 *       properties:
 *         name:
 *           type: string
 *           description: Full name of the contact
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *         company:
 *           type: string
 *           description: Company name (optional)
 *         phone:
 *           type: string
 *           description: Phone number (optional)
 *         inquiry:
 *           type: string
 *           enum: [general, sales, technical, integration, partnership, media, custom_solution]
 *           description: Type of inquiry
 *         message:
 *           type: string
 *           description: Contact message
 *         subscribe:
 *           type: boolean
 *           description: Newsletter subscription preference
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit contact form
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactForm'
 *     responses:
 *       200:
 *         description: Contact form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, company, phone, inquiry, message, subscribe } =
      req.body;

    // Validate required fields
    if (!name || !email || !message || !inquiry) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: name, email, message, and inquiry are required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Create email transporter (prefer STARTTLS on 587; fall back to service if needed)
    const smtpUser = process.env.EMAIL_USER || "noreply.grainhero1@gmail.com";
    const smtpPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      socketTimeout: 20000,
    });

    // Email content
    const emailContent = `
New Contact Form Submission - GrainHero

Name: ${name}
Email: ${email}
Company: ${company || "Not provided"}
Phone: ${phone || "Not provided"}
Inquiry Type: ${inquiry}
Newsletter Subscription: ${subscribe ? "Yes" : "No"}

Message:
${message}

---
Submitted on: ${new Date().toLocaleString()}
    `;

    // Send email to admin
    const mailOptions = {
      from: smtpUser,
      to:
        process.env.SUPPORT_EMAIL ||
        process.env.EMAIL_TO ||
        "noreply.grainhero1@gmail.com",
      subject: `GrainHero Contact: ${inquiry} - ${name}`,
      text: emailContent,
      replyTo: email,
    };

    console.log("Sending contact email to admin...");
    await transporter.sendMail(mailOptions);
    console.log("Contact email sent successfully to admin");

    // Send auto-reply to user
    const autoReplyContent = `
Dear ${name},

Thank you for contacting GrainHero! We have received your inquiry about "${inquiry}" and will get back to you within 24 hours.

Your message:
"${message}"

Best regards,
GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
    `;

    const autoReplyOptions = {
      from: smtpUser,
      to: email,
      subject: "Thank you for contacting GrainHero",
      text: autoReplyContent,
    };

    console.log("Sending auto-reply to user...");
    await transporter.sendMail(autoReplyOptions);
    console.log("Auto-reply sent successfully to user");

    res.status(200).json({
      success: true,
      message:
        "Contact form submitted successfully. We will get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message:
        "Failed to submit contact form. Please try again or email us directly.",
    });
  }
});

module.exports = router;
