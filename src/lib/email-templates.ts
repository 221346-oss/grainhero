function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#f6faf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.06)">
      ${content}
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0">© GrainHero</p>
  </div>
</body>
</html>`;

export function welcomeEmailHTML(firstName: string, dashboardUrl: string) {
  const content = `
    <div style="background:linear-gradient(135deg,#00a63e,#22c55e);padding:32px;color:#fff;text-align:center">
      <h1 style="margin:0 0 8px;font-size:26px">Welcome to GrainHero, ${escapeHtml(firstName)}! 🌾</h1>
      <p style="margin:0;opacity:0.95;font-size:15px">Let's revolutionize your grain storage</p>
    </div>
    <div style="padding:28px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Welcome to GrainHero! You're equipped with cutting-edge tools to monitor grain storage.</p>
      <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:20px;margin:24px 0">
        <h3 style="margin:0 0 16px;color:#065f46">🎉 Your trial includes:</h3>
        <ul>
          <li>📊 Unlimited Silo Monitoring</li>
          <li>⚡ Real-Time Tracking</li>
          <li>🤖 AI Predictions</li>
          <li>📱 Mobile Access</li>
        </ul>
      </div>
      <h3>Quick Start Guide</h3>
      <ol>
        <li><strong>Add Your First Silo</strong></li>
        <li><strong>Set Up Sensors</strong></li>
        <li><strong>Configure Alerts</strong></li>
      </ol>
      <div style="text-align:center;margin:32px 0">
        <a href="${dashboardUrl}" style="display:inline-block;background:#00a63e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600">Start Monitoring Now →</a>
      </div>
    </div>`;
  return emailWrapper(content);
}

export function day3EmailHTML(firstName: string, siloCount: number, analyticsUrl: string) {
  const content = `
    <div style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:32px;color:#fff;text-align:center">
      <h1 style="margin:0 0 8px;font-size:26px">Maximize Your Trial 🚀</h1>
    </div>
    <div style="padding:28px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>You're 3 days into your trial! Here's how to get the most from GrainHero:</p>
      <ol>
        <li><strong>View Real-Time Analytics</strong></li>
        <li><strong>Set Up Smart Alerts</strong></li>
        <li><strong>Try AI Predictions</strong></li>
      </ol>
      ${siloCount === 0 ? `
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:12px;padding:20px;text-align:center">
        <h3 style="color:#92400e">⚠️ Haven't added your first silo yet?</h3>
        <a href="${analyticsUrl}/support" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none">Book Setup Call</a>
      </div>` : `
      <div style="background:#d1fae5;padding:20px;text-align:center">
        <h3 style="color:#065f46">✅ Great progress!</h3>
        <p>You've added <strong>${siloCount} silo${siloCount > 1 ? 's' : ''}</strong></p>
      </div>`}
      <div style="text-align:center;margin:32px 0">
        <a href="${analyticsUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:10px;font-weight:600;text-decoration:none">View Analytics →</a>
      </div>
    </div>`;
  return emailWrapper(content);
}

export function day10EmailHTML(firstName: string, siloCount: number, storageGB: number, featuresUrl: string) {
  const content = `
    <div style="background:linear-gradient(135deg,#8b5cf6,#a78bfa);padding:32px;color:#fff;text-align:center">
      <h1 style="margin:0 0 8px;font-size:26px">Unlock Hidden Features 💎</h1>
    </div>
    <div style="padding:28px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Advanced features you might have missed:</p>
      <ul>
        <li>📊 <strong>Batch Comparison</strong> - Compare multiple silos</li>
        <li>📈 <strong>Historical Analysis</strong> - View trends over time</li>
        <li>📄 <strong>Custom Reports</strong> - Generate PDF reports</li>
      </ul>
      <div style="background:#f0fdf4;padding:20px;margin:24px 0">
        <h3 style="color:#065f46">📊 Your Stats</h3>
        <p>Silos: <strong>${siloCount}</strong> | Storage: <strong>${storageGB} GB</strong></p>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${featuresUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:14px 28px;border-radius:10px;font-weight:600;text-decoration:none">Explore Features →</a>
      </div>
    </div>`;
  return emailWrapper(content);
}

export function trialEndingEmailHTML(firstName: string, daysLeft: number, pricingUrl: string) {
  const content = `
    <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;color:#fff;text-align:center">
      <h1 style="margin:0 0 8px;font-size:26px">Trial Ends in ${daysLeft} Days ⏰</h1>
    </div>
    <div style="padding:28px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Your trial expires soon. Choose a plan to continue:</p>
      <div style="background:#fee2e2;padding:20px;text-align:center;margin:24px 0">
        <div style="font-size:48px;font-weight:700;color:#dc2626">${daysLeft}</div>
        <div>Days Remaining</div>
      </div>
      <div style="padding:20px;background:#f9fafb;border-radius:10px;margin:12px 0;text-align:center">
        <div>🌱 <strong>BASIC</strong></div>
        <div style="font-size:24px;font-weight:700;color:#00a63e">$49<span style="font-size:14px">/mo</span></div>
      </div>
      <div style="padding:20px;background:linear-gradient(135deg,#00a63e,#22c55e);border-radius:10px;margin:12px 0;text-align:center;color:#fff">
        <div>🌾 <strong>PROFESSIONAL ⭐</strong></div>
        <div style="font-size:24px;font-weight:700">$99<span style="font-size:14px">/mo</span></div>
      </div>
      <div style="background:#fef3c7;padding:20px;text-align:center;margin:24px 0">
        <div>🎁 <strong>Special Offer</strong></div>
        <div>Use code <strong>TRIAL20</strong> for 20% off first 3 months!</div>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${pricingUrl}?coupon=TRIAL20" style="display:inline-block;background:#ef4444;color:#fff;padding:16px 32px;border-radius:10px;font-weight:700;text-decoration:none">Choose Plan →</a>
      </div>
    </div>`;
  return emailWrapper(content);
}

export function reengagementEmailHTML(firstName: string, siloCount: number, storageGB: number, loginUrl: string) {
  const content = `
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px;color:#fff;text-align:center">
      <h1 style="margin:0 0 8px;font-size:26px">We Miss You, ${escapeHtml(firstName)}! 👋</h1>
    </div>
    <div style="padding:28px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>It's been a while! We've made exciting improvements:</p>
      <ul>
        <li><strong>Enhanced AI</strong> - 30% more accurate</li>
        <li><strong>New Mobile App</strong> - Monitor on the go</li>
        <li><strong>More Integrations</strong> - ERP systems</li>
      </ul>
      <div style="background:#f0fdf4;padding:20px;margin:24px 0">
        <h3 style="color:#065f46">📊 Your Account</h3>
        <p>Silos: <strong>${siloCount}</strong> | Data: <strong>${storageGB} GB</strong></p>
        <p style="color:#16a34a">✓ All your data is safe</p>
      </div>
      <div style="background:linear-gradient(135deg,#fbbf24,#f59e0b);padding:24px;text-align:center;color:#fff;margin:24px 0">
        <div style="font-size:28px">🎉</div>
        <div style="font-size:20px;font-weight:700">Welcome Back Offer</div>
        <div>Get <span style="font-size:24px;font-weight:700">50% OFF</span> for 3 months!</div>
        <div style="background:#fff;color:#92400e;padding:8px 16px;border-radius:8px;display:inline-block;font-weight:700;margin-top:12px">COMEBACK50</div>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${loginUrl}?promo=COMEBACK50" style="display:inline-block;background:#f97316;color:#fff;padding:14px 28px;border-radius:10px;font-weight:600;text-decoration:none">Reactivate Now →</a>
      </div>
    </div>`;
  return emailWrapper(content);
}