const express = require('express');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailSender');
const { getPublicBaseUrl } = require('../utils/publicBaseUrl');

module.exports = function createResendConfirmationApi({ getUsersCollection }) {
const router = express.Router();

router.get('/', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.render('pages/auth/confirmation-status', {
      title: 'Resend Confirmation | HelloUniversity',
      description: 'Resend your HelloUniversity account confirmation email.',
      canonicalUrl: 'https://hellouniversity.online/resend-confirmation',
      stylesheets: ['/css/auth.css'],
      heading: 'Resend confirmation email',
      message: 'Enter the email address you used when signing up and we will send a fresh confirmation link.',
      primaryLinkHref: '/login',
      primaryLinkText: 'Back to Login',
      secondaryLinkHref: '/signup',
      secondaryLinkText: 'Create an account',
      showEmailForm: true,
      emailValue: ''
    });
  }

  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne({ emaildb: email });

  if (!user) {
    return res.render('pages/auth/confirmation-status', {
      title: 'User Not Found | HelloUniversity',
      description: 'No HelloUniversity account was found for that email address.',
      canonicalUrl: 'https://hellouniversity.online/resend-confirmation',
      stylesheets: ['/css/auth.css'],
      heading: 'User not found',
      message: 'No account was found with that email address.',
      primaryLinkHref: '/signup',
      primaryLinkText: 'Create an account',
      secondaryLinkHref: '/login',
      secondaryLinkText: 'Back to Login',
      showEmailForm: true,
      emailValue: email
    });
  }
  if (user.emailConfirmed) {
    return res.render('pages/auth/confirmation-status', {
      title: 'Email Already Confirmed | HelloUniversity',
      description: 'This HelloUniversity email address is already confirmed.',
      canonicalUrl: 'https://hellouniversity.online/resend-confirmation',
      stylesheets: ['/css/auth.css'],
      heading: 'Email already confirmed',
      message: 'Your email is already confirmed. You can log in now.',
      primaryLinkHref: '/login',
      primaryLinkText: 'Go to Login',
      secondaryLinkHref: '/signup',
      secondaryLinkText: 'Create an account',
      showEmailForm: false
    });
  }

  // Generate new token and expiry
  const confirmationToken = crypto.randomBytes(32).toString('hex');
  const confirmationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { emailConfirmationToken: confirmationToken, emailConfirmationExpires: confirmationExpires } }
  );

  // Send confirmation email
  const baseUrl = getPublicBaseUrl();
  const confirmationLink = `${baseUrl}/confirm-email/${confirmationToken}`;
  const emailHtml = `
    <p>Hi ${user.firstName},</p>
    <p>Please confirm your email address by clicking the button below:</p>
    <p>
      <a href="${confirmationLink}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Confirm Email</a>
    </p>
    <p>This link will expire in 7 days.</p>
    <p>If you did not sign up, you can ignore this email.</p>
    <p>Best regards,<br>The HelloUniversity Team</p>
  `;
  try {
    await sendEmail({
      to: user.emaildb,
      subject: 'Confirm your HelloUniversity account',
      html: emailHtml
    });
  } catch (err) {
    console.error('Failed to send confirmation email:', err);
    return res.render('pages/auth/confirmation-status', {
      title: 'Confirmation Email Error | HelloUniversity',
      description: 'HelloUniversity could not send a confirmation email right now.',
      canonicalUrl: 'https://hellouniversity.online/resend-confirmation',
      stylesheets: ['/css/auth.css'],
      heading: 'Unable to send email',
      message: 'Failed to send confirmation email. Please try again later.',
      primaryLinkHref: '/resend-confirmation',
      primaryLinkText: 'Try again',
      secondaryLinkHref: '/login',
      secondaryLinkText: 'Back to Login',
      showEmailForm: false
    });
  }

  return res.render('pages/auth/confirmation-status', {
    title: 'Confirmation Email Sent | HelloUniversity',
    description: 'A new HelloUniversity confirmation email has been sent.',
    canonicalUrl: 'https://hellouniversity.online/resend-confirmation',
    stylesheets: ['/css/auth.css'],
    heading: 'Confirmation sent',
    message: 'A new confirmation email has been sent. Please check your inbox.',
    primaryLinkHref: '/login',
    primaryLinkText: 'Back to Login',
    secondaryLinkHref: '/resend-confirmation',
    secondaryLinkText: 'Send again',
    showEmailForm: false
  });
});

return router;
};
