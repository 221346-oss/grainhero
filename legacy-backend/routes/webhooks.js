require("dotenv").config();
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_SECRET_WEBHOOK;
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");
const sendEmail = require("../utils/emailHelper");
const {
  getPlanMapping,
  checkoutPlanIdToPlanKey,
  getSubscriptionPlanName,
} = require("../configs/plan-mapping");
const { getPlanFeatures } = require("../configs/plan-features");
const {
  SUBSCRIPTION_STATUSES,
  BILLING_CYCLES,
  PAYMENT_STATUSES,
} = require("../configs/enum");
const plans = [
  {
    id: "basic",
    name: "Starter",
    priceFrontend: "Rs. 1,499/mo",
    description: "Perfect for small grain operations with a single warehouse.",
    features: [
      "1 Warehouse",
      "3 Silos",
      "5 Staff (2 Managers + 3 Technicians)",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    priceId: "price_starter_1499",
    price: 1499,
    duration: "/month",
  },
  {
    id: "intermediate",
    name: "Professional",
    priceFrontend: "Rs. 3,899/mo",
    description:
      "Advanced features for growing grain operations with multiple warehouses.",
    features: [
      "2 Warehouses",
      "6 Silos",
      "10 Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    priceId: "price_professional_3899",
    price: 3899,
    duration: "/month",
  },
  {
    id: "pro",
    name: "Enterprise",
    priceFrontend: "Rs. 5,999/mo",
    description:
      "Complete solution for large grain operations with unlimited staff.",
    features: [
      "5 Warehouses",
      "15 Silos",
      "Unlimited Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    priceId: "price_enterprise_5999",
    price: 5999,
    duration: "/month",
  },
];

router.post("/", (request, response) => {
  let event = request.body;
  if (endpointSecret) {
    const signature = request.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      // This is handled by checkout.session.completed, just log it
      break;
    }
    case "payment_method.attached": {
      const paymentMethod = event.data.object;
      console.log(`Payment method attached: ${paymentMethod.id}`);
      // Just log, no action needed
      break;
    }
    case "charge.succeeded": {
      const charge = event.data.object;
      console.log(`Charge succeeded: ${charge.id} for amount ${charge.amount}`);
      // This is handled by checkout.session.completed, just log it
      break;
    }
    case "customer.created": {
      const customer = event.data.object;
      console.log(
        `Customer created in Stripe: ${customer.id} (${customer.email})`
      );
      // Customer is created automatically by Stripe, no action needed
      break;
    }
    case "customer.updated": {
      const customer = event.data.object;
      console.log(`Customer updated in Stripe: ${customer.id}`);
      // Just log, no action needed unless you want to sync customer data
      break;
    }
    case "customer.subscription.created": {
      const subscription = event.data.object;
      console.log(`Subscription created in Stripe: ${subscription.id}`);
      // This is handled by checkout.session.completed, just log it
      break;
    }
    case "payment_intent.created": {
      const paymentIntent = event.data.object;
      console.log(`Payment intent created: ${paymentIntent.id}`);
      // Just log, payment will be handled by checkout.session.completed
      break;
    }
    case "invoice.created": {
      const invoice = event.data.object;
      console.log(`Invoice created: ${invoice.id}`);
      // Just log, invoice.payment_succeeded will handle the actual payment
      break;
    }
    case "invoice.finalized": {
      const invoice = event.data.object;
      console.log(`Invoice finalized: ${invoice.id}`);
      // Just log, invoice.payment_succeeded will handle the actual payment
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      console.log(`Invoice paid: ${invoice.id}`);
      // This is similar to invoice.payment_succeeded, but we handle payment_succeeded
      // Just log it
      break;
    }
    case "invoice_payment.paid": {
      const invoicePayment = event.data.object;
      console.log(`Invoice payment paid: ${invoicePayment.id}`);
      // This is handled by invoice.payment_succeeded, just log it
      break;
    }
    case "checkout.session.completed": {
      // Grant access to the product (subscription)
      (async () => {
        try {
          // Retrieve the full session with line_items
          const sessionFull = await stripe.checkout.sessions.retrieve(
            event.data.object.id,
            { expand: ["line_items"] }
          );

          const customerId = sessionFull?.customer;
          const customer = await stripe.customers.retrieve(customerId);

          const planId = sessionFull?.metadata?.planId;
          const priceId = sessionFull?.line_items?.data[0]?.price?.id;

          // Define plan details (same as checkout session)
          const planDetails = {
            basic: { id: "basic", name: "Starter", price: 1499 },
            intermediate: {
              id: "intermediate",
              name: "Professional",
              price: 3899,
            },
            pro: { id: "pro", name: "Enterprise", price: 5999 },
          };

          const plan = planDetails[planId];
          if (!plan) {
            console.error("Plan not found for planId:", planId);
            // Fallback to unit amount logic if planId is missing for some reason
            const priceAmount = sessionFull?.line_items?.data[0]?.price?.unit_amount;
            const fallbackPlanDetails = {
              149900: { id: "basic", name: "Starter", price: 1499 },
              389900: { id: "intermediate", name: "Professional", price: 3899 },
              599900: { id: "pro", name: "Enterprise", price: 5999 },
            };
            const fallbackPlan = fallbackPlanDetails[priceAmount];
            if (!fallbackPlan) return;
            // Use fallback
            Object.assign(plan || {}, fallbackPlan);
          }

          // Get plan mapping for consistent naming
          const planKey = checkoutPlanIdToPlanKey(plan.id); // Convert to plan-features key
          const planFeatures = getPlanFeatures(planKey);
          const subscriptionPlanName = getSubscriptionPlanName(plan.id);

          let user;
          if (customer.email) {
            user = await User.findOne({ email: customer.email });

            if (!user) {
              // No pre-created user found — create new user for payment-first flow
              console.log("Creating new user for email:", customer.email);

              // Check if metadata has signup data
              const userName = sessionFull?.metadata?.userName || customer.name || "Admin User";

              const userData = {
                email: customer.email,
                name: userName,
                role: "pending", // Keep as pending until they complete signup via the redirect
                hasAccess: plan.id,
                subscription_plan: planKey,
                customerId: customerId,
                priceId: priceId,
                status: "active",
                emailVerified: true,
                createdAt: new Date(),
                updated_at: new Date(),
                admin_id: null,
                business_type: "farm"
              };

              try {
                user = new User(userData);
                await user.save();
                console.log("New user created:", user.email);
              } catch (createErr) {
                console.error("Failed to create user, sending recovery email:", createErr.message);
                // SAFETY NET: Send recovery email with signup link
                const recoveryToken = sessionFull?.metadata?.recoveryToken;
                const frontendUrl = process.env.FRONT_END_URL || "http://localhost:3000";
                const recoveryLink = recoveryToken
                  ? `${frontendUrl}/auth/signup?payment=success&email=${encodeURIComponent(customer.email)}&recovery=${recoveryToken}`
                  : `${frontendUrl}/auth/signup?payment=success&email=${encodeURIComponent(customer.email)}`;

                try {
                  await sendEmail(
                    customer.email,
                    "Complete Your GrainHero Account Setup",
                    `Your payment was successful! However, we encountered an issue creating your account.\n\nPlease use this link to complete your signup:\n${recoveryLink}\n\nYour plan: ${plan.name}\nTransaction: ${sessionFull.payment_intent || sessionFull.id}\n\nIf you need help, contact support@grainhero.com`,
                    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px 24px;">
                      <h2 style="color:#2d3748;">Complete Your Account Setup</h2>
                      <p>Your payment was successful! However, we encountered an issue creating your account automatically.</p>
                      <p><strong>Plan:</strong> ${plan.name}<br><strong>Amount:</strong> Rs. ${plan.price}/mo</p>
                      <a href="${recoveryLink}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Complete Signup →</a>
                      <p style="color:#718096;font-size:13px;">If the button doesn't work, copy this link: ${recoveryLink}</p>
                    </div>`
                  );
                  console.log("Recovery email sent to:", customer.email);
                } catch (emailErr) {
                  console.error("Failed to send recovery email:", emailErr);
                }
                return;
              }
            } else {
              // User exists (pre-created as pending during checkout, or existing)
              user.priceId = priceId;
              user.hasAccess = plan.id;
              user.subscription_plan = planKey;
              user.customerId = customerId;
              user.emailVerified = true;
              user.admin_id = null; // Top-level admin

              // If user was pre-created with password, upgrade to admin
              if (user.role === "pending") {
                // Check if they have a password set (from pre-creation during checkout)
                const userWithPassword = await User.findById(user._id).select("+password");
                if (userWithPassword && userWithPassword.password) {
                  user.role = "admin";
                  console.log("Upgraded pending user to admin:", user.email);
                }
                // If no password, keep as pending — they'll set it on the signup page
              }

              await user.save();
              console.log("User updated:", user.email);
            }

            // Create or update Subscription record
            try {
              // The admin_id in subscription is the user ID for top-level admins
              const subscriptionAdminId = user._id;

              // Check if subscription already exists for this user
              let subscription = await Subscription.findOne({
                $or: [
                  { admin_id: subscriptionAdminId },
                  { stripe_customer_id: customerId },
                ],
                stripe_subscription_id: sessionFull.subscription || null,
                status: {
                  $in: [
                    SUBSCRIPTION_STATUSES.ACTIVE,
                    SUBSCRIPTION_STATUSES.TRIAL,
                  ],
                },
              });

              const now = new Date();
              const endDate = new Date(now);
              endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription

              // Map plan features to Subscription model format
              const subscriptionFeatures = {
                max_users: planFeatures.limits.users.total,
                max_devices: planFeatures.limits.sensors,
                max_storage_gb: planFeatures.limits.storage_gb,
                max_batches:
                  planFeatures.limits.grain_batches === -1
                    ? -1
                    : planFeatures.limits.grain_batches,
                ai_features: planFeatures.features.ai_predictions || false,
                priority_support:
                  planFeatures.features.priority_support || false,
                custom_integrations:
                  planFeatures.features.custom_integrations || false,
                advanced_analytics:
                  planFeatures.features.advanced_analytics || false,
              };

              if (subscription) {
                // Update existing subscription
                subscription.plan_name = subscriptionPlanName;
                subscription.plan_description = planFeatures.description;
                subscription.price_per_month = plan.price;
                subscription.currency = planFeatures.currency || "USD";
                subscription.billing_cycle = BILLING_CYCLES.MONTHLY;
                subscription.start_date = now;
                subscription.end_date = endDate;
                subscription.status = SUBSCRIPTION_STATUSES.ACTIVE;
                subscription.payment_status = PAYMENT_STATUSES.PAID;
                subscription.last_payment_date = now;
                subscription.next_payment_date = endDate;
                subscription.payment_method = "stripe";
                subscription.stripe_subscription_id = sessionFull.subscription;
                subscription.stripe_customer_id = customerId;
                subscription.stripe_price_id = priceId;
                subscription.features = subscriptionFeatures;
                subscription.auto_renew = true;
                subscription.created_by = user._id;
                await subscription.save();
                console.log("Subscription updated for user:", user.email);
              } else {
                // Create new subscription
                subscription = new Subscription({
                  admin_id: subscriptionAdminId,
                  plan_name: subscriptionPlanName,
                  plan_description: planFeatures.description,
                  price_per_month: plan.price,
                  currency: planFeatures.currency || "USD",
                  billing_cycle: BILLING_CYCLES.MONTHLY,
                  start_date: now,
                  end_date: endDate,
                  status: SUBSCRIPTION_STATUSES.ACTIVE,
                  payment_status: PAYMENT_STATUSES.PAID,
                  last_payment_date: now,
                  next_payment_date: endDate,
                  payment_method: "stripe",
                  stripe_subscription_id: sessionFull.subscription,
                  stripe_customer_id: customerId,
                  stripe_price_id: priceId,
                  features: subscriptionFeatures,
                  auto_renew: true,
                  created_by: user._id,
                });
                await subscription.save();
              }
            } catch (subError) {
              console.error("Subscription update/creation failed:", subError.message);
            }

            // Send payment confirmation email
            try {
              // Get payment intent ID or use session ID as fallback
              const transactionId =
                sessionFull.payment_intent || sessionFull.id || "N/A";
              const paymentDate = new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const billingPeriod = "/month"; // Monthly subscription

              // Generate signup completion link
              const signupLink = `${process.env.FRONT_END_URL}/auth/signup?payment=success&email=${encodeURIComponent(customer.email)}`;

              const emailContent = `
Dear ${customer.name || "Valued Customer"},

Thank you for your successful payment! Your GrainHero subscription has been activated.

Payment Details:
- Plan: ${plan.name}
- Amount: Rs. ${plan.price}${billingPeriod}
- Transaction ID: ${transactionId}
- Date: ${paymentDate}

To complete your account setup, please click the link below:

🔗 Complete Your Account Setup: ${signupLink}

This will take you to our signup page where you can:
- Set your full name
- Create a secure password
- Add your phone number (optional)
- Complete your admin account registration

After completing signup, you can:

1. Login to your dashboard at ${process.env.FRONT_END_URL}/auth/login
2. Start managing your grain storage with AI-powered insights
3. Invite team members to collaborate
4. Access 24/7 customer support

Welcome to GrainHero!

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                  `;

              await sendEmail(
                user.email,
                "Payment Confirmation - GrainHero Subscription Activated",
                emailContent,
                emailContent.replace(/\n/g, "<br>")
              );
              console.log("Payment confirmation email sent to:", user.email);
            } catch (emailError) {
              console.error(
                "Failed to send payment confirmation email:",
                emailError
              );
              console.error("Email error details:", emailError.message);
            }

            // Create one-time IoT invoice if IoT quantity was selected and NOT already billed in checkout
            try {
              const iotPriceId = sessionFull?.metadata?.iotPriceId;
              const iotQty = parseInt(sessionFull?.metadata?.siloCount) || 0;
              const alreadyBilled = sessionFull?.metadata?.iotBilledInCheckout === "true";
              
              if (iotPriceId && iotQty > 0 && customerId && !alreadyBilled) {
                await stripe.invoiceItems.create({
                  customer: customerId,
                  price: iotPriceId,
                  quantity: iotQty,
                  description: `IoT Device Setup Fee (${iotQty} devices)`,
                });

                const iotInvoice = await stripe.invoices.create({
                  customer: customerId,
                  auto_advance: true,
                  collection_method: 'charge_automatically',
                  description: 'GrainHero IoT Device Setup - One-time Fee',
                });

                await stripe.invoices.finalizeInvoice(iotInvoice.id);
                console.log(`IoT invoice created for ${iotQty} devices:`, iotInvoice.id);
              }
            } catch (iotError) {
              console.error("Failed to create IoT invoice:", iotError.message);
            }
          } else {
            console.error(
              "No user found for email:",
              customer?.email || "unknown"
            );
            // Don't throw - log the error but don't crash the webhook
            // The user might be created later via signup flow
          }
        } catch (err) {
          console.error("Error handling checkout.session.completed:", err);
          if (err.code === 11000) {
            console.error(
              "Duplicate key error - this should be handled gracefully now"
            );
          }
        }
      })();
      break;
    }
    case "invoice.payment_succeeded": {
      // Handle subscription renewal
      (async () => {
        try {
          const invoice = event.data.object;
          const stripeSubscriptionId = invoice.subscription;

          if (!stripeSubscriptionId) {
            console.log("No subscription ID in invoice, skipping");
            return;
          }

          // Retrieve subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );

          // Find subscription in database
          const subscription = await Subscription.findOne({
            stripe_subscription_id: stripeSubscriptionId,
          });

          if (subscription) {
            // Update subscription with renewal info
            const now = new Date();
            subscription.last_payment_date = new Date(invoice.created * 1000);
            subscription.payment_status = PAYMENT_STATUSES.PAID;
            subscription.status = SUBSCRIPTION_STATUSES.ACTIVE;

            // Calculate next payment date based on billing cycle
            const nextPaymentDate = new Date(
              stripeSubscription.current_period_end * 1000
            );
            subscription.next_payment_date = nextPaymentDate;
            subscription.end_date = nextPaymentDate;

            await subscription.save();

            // Get user to send renewal email
            const user = await User.findOne({
              customerId: stripeSubscription.customer,
            });

            if (user) {
              // Send renewal confirmation email
              try {
                const renewalEmailContent = `
Dear ${user.name || "Valued Customer"},

Your GrainHero subscription has been successfully renewed!

Renewal Details:
- Plan: ${subscription.plan_name}
- Amount: Rs. ${subscription.price_per_month}/${subscription.billing_cycle === BILLING_CYCLES.MONTHLY
                    ? "month"
                    : "year"
                  }
- Invoice ID: ${invoice.id}
- Next Billing Date: ${nextPaymentDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}

Your subscription is active and will continue automatically.

Thank you for being a valued GrainHero customer!

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                `;

                await sendEmail(
                  user.email,
                  "Subscription Renewed - GrainHero",
                  renewalEmailContent,
                  renewalEmailContent.replace(/\n/g, "<br>")
                );
                console.log("Renewal confirmation email sent to:", user.email);
              } catch (emailError) {
                console.error("Failed to send renewal email:", emailError);
              }
            }

            console.log("Subscription renewed:", subscription._id);
          } else {
            console.log(
              "Subscription not found in database for renewal:",
              stripeSubscriptionId
            );
          }
        } catch (err) {
          console.error("Error handling subscription renewal:", err);
        }
      })();
      break;
    }
    case "customer.subscription.updated": {
      // Handle subscription upgrade/downgrade
      (async () => {
        try {
          const stripeSubscription = event.data.object;

          // Find subscription in database
          const subscription = await Subscription.findOne({
            stripe_subscription_id: stripeSubscription.id,
          });

          if (subscription) {
            const oldPlanName = subscription.plan_name;
            const oldPrice = subscription.price_per_month;

            // Get new price ID from Stripe subscription
            const newPriceId = stripeSubscription.items.data[0]?.price?.id;
            const newPriceAmount =
              stripeSubscription.items.data[0]?.price?.unit_amount;

            if (newPriceAmount) {
              // Map price amount to plan
              const planDetails = {
                149900: { id: "basic", name: "Starter", price: 1499 },
                389900: {
                  id: "intermediate",
                  name: "Professional",
                  price: 3899,
                },
                599900: { id: "pro", name: "Enterprise", price: 5999 },
              };

              const newPlan = planDetails[newPriceAmount];
              if (newPlan) {
                const planKey = checkoutPlanIdToPlanKey(newPlan.id);
                const planFeatures = getPlanFeatures(planKey);
                const subscriptionPlanName = getSubscriptionPlanName(
                  newPlan.id
                );

                // Update subscription with new plan
                subscription.plan_name = subscriptionPlanName;
                subscription.plan_description = planFeatures.description;
                subscription.price_per_month = newPlan.price;
                subscription.stripe_price_id = newPriceId;

                // Update features based on new plan
                subscription.features = {
                  max_users: planFeatures.limits.users.total,
                  max_devices: planFeatures.limits.sensors,
                  max_storage_gb: planFeatures.limits.storage_gb,
                  max_batches:
                    planFeatures.limits.grain_batches === -1
                      ? -1
                      : planFeatures.limits.grain_batches,
                  ai_features: planFeatures.features.ai_predictions || false,
                  priority_support:
                    planFeatures.features.priority_support || false,
                  custom_integrations:
                    planFeatures.features.custom_integrations || false,
                  advanced_analytics:
                    planFeatures.features.advanced_analytics || false,
                };

                // Update end date based on current period
                subscription.end_date = new Date(
                  stripeSubscription.current_period_end * 1000
                );
                subscription.next_payment_date = new Date(
                  stripeSubscription.current_period_end * 1000
                );

                await subscription.save();

                // Update user model
                const user = await User.findOne({
                  customerId: stripeSubscription.customer,
                });

                if (user) {
                  user.hasAccess = newPlan.id;
                  user.subscription_plan = planKey;
                  user.priceId = newPriceId;
                  await user.save();

                  // Determine if upgrade or downgrade
                  const isUpgrade =
                    newPlan.price > oldPrice ||
                    (oldPlanName === "Grain Starter" &&
                      subscriptionPlanName !== "Grain Starter");

                  // Send upgrade/downgrade email
                  try {
                    const changeEmailContent = `
Dear ${user.name || "Valued Customer"},

Your GrainHero subscription has been ${isUpgrade ? "upgraded" : "downgraded"}!

Subscription Changes:
- Previous Plan: ${oldPlanName}
- New Plan: ${subscriptionPlanName}
- New Price: Rs. ${newPlan.price}/month
- Effective Date: ${new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}

${isUpgrade
                        ? "🎉 Congratulations! You now have access to additional features and higher limits."
                        : "Your subscription has been adjusted. Some features may no longer be available."
                      }

You can manage your subscription from your dashboard.

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                    `;

                    await sendEmail(
                      user.email,
                      `Subscription ${isUpgrade ? "Upgraded" : "Downgraded"
                      } - GrainHero`,
                      changeEmailContent,
                      changeEmailContent.replace(/\n/g, "<br>")
                    );
                    console.log(
                      `Subscription ${isUpgrade ? "upgrade" : "downgrade"
                      } email sent to:`,
                      user.email
                    );
                  } catch (emailError) {
                    console.error("Failed to send change email:", emailError);
                  }
                }

                console.log(
                  `Subscription ${isUpgrade ? "upgraded" : "downgraded"
                  } from ${oldPlanName} to ${subscriptionPlanName}`
                );
              }
            }
          } else {
            console.log(
              "Subscription not found in database for update:",
              stripeSubscription.id
            );
          }
        } catch (err) {
          console.error("Error handling subscription update:", err);
        }
      })();
      break;
    }
    case "invoice.payment_failed": {
      // Handle failed payment
      (async () => {
        try {
          const invoice = event.data.object;
          const stripeSubscriptionId = invoice.subscription;

          if (stripeSubscriptionId) {
            const subscription = await Subscription.findOne({
              stripe_subscription_id: stripeSubscriptionId,
            });

            if (subscription) {
              subscription.payment_status = PAYMENT_STATUSES.FAILED;
              await subscription.save();

              // Get user to send failure notification
              const stripeSubscription = await stripe.subscriptions.retrieve(
                stripeSubscriptionId
              );
              const user = await User.findOne({
                customerId: stripeSubscription.customer,
              });

              if (user) {
                try {
                  const failureEmailContent = `
Dear ${user.name || "Valued Customer"},

We were unable to process your payment for your GrainHero subscription.

Payment Details:
- Plan: ${subscription.plan_name}
- Amount: Rs. ${subscription.price_per_month}
- Invoice ID: ${invoice.id}

Please update your payment method to avoid service interruption.

Update Payment: ${process.env.FRONT_END_URL}/profile/billing

If you have any questions, please contact our support team.

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                  `;

                  await sendEmail(
                    user.email,
                    "Payment Failed - GrainHero Subscription",
                    failureEmailContent,
                    failureEmailContent.replace(/\n/g, "<br>")
                  );
                } catch (emailError) {
                  console.error("Failed to send failure email:", emailError);
                }
              }

              console.log("Payment failed for subscription:", subscription._id);
            }
          }
        } catch (err) {
          console.error("Error handling payment failure:", err);
        }
      })();
      break;
    }
    case "customer.subscription.deleted": {
      (async () => {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            event.data.object.id
          );
          const user = await User.findOne({
            customerId: stripeSubscription.customer,
          });

          if (user) {
            // Update user access
            user.hasAccess = "none";
            user.subscription_plan = undefined;
            await user.save();

            // Update Subscription record
            const subscription = await Subscription.findOne({
              stripe_subscription_id: event.data.object.id,
              admin_id: user.admin_id || user._id,
            });

            if (subscription) {
              subscription.status = SUBSCRIPTION_STATUSES.CANCELLED;
              subscription.cancellation_date = new Date();
              subscription.auto_renew = false;
              await subscription.save();
              console.log(
                "Subscription cancelled in database:",
                subscription._id
              );
            }
          }
          console.log("Subscription deleted:", stripeSubscription.id);
        } catch (err) {
          console.error("Error handling subscription deletion:", err);
        }
      })();
      break;
    }
    case "customer.deleted": {
      // Handle customer deletion from Stripe
      (async () => {
        try {
          const customerId = event.data.object.id;
          console.log("Customer deleted from Stripe:", customerId);

          // Find user with this customer ID
          const user = await User.findOne({ customerId: customerId });

          if (user) {
            // Find all subscriptions for this customer
            const subscriptions = await Subscription.find({
              stripe_customer_id: customerId,
            });

            // Cancel all subscriptions
            for (const subscription of subscriptions) {
              subscription.status = SUBSCRIPTION_STATUSES.CANCELLED;
              subscription.cancellation_date = new Date();
              subscription.auto_renew = false;
              await subscription.save();
              console.log(
                "Subscription cancelled due to customer deletion:",
                subscription._id
              );
            }

            // Update user access (but don't delete user - they may still have account)
            user.hasAccess = "none";
            user.subscription_plan = undefined;
            user.customerId = undefined; // Clear customer ID
            await user.save();

            console.log(
              "User access revoked due to customer deletion:",
              user.email
            );
          } else {
            console.log("No user found for deleted customer:", customerId);
          }
        } catch (err) {
          console.error("Error handling customer deletion:", err);
        }
      })();
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  response.send();
});

module.exports = router;
