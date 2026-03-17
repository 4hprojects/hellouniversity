const express = require('express');
const router = express.Router();
const { getUsersCollection } = require('../utils/db');

router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const usersCollection = await getUsersCollection();
  const user = await usersCollection.findOne({ emailConfirmationToken: token });

  if (!user) {
    return res.render('pages/auth/confirmation-status', {
      title: 'Invalid Confirmation Link | HelloUniversity',
      description: 'This HelloUniversity email confirmation link is invalid or expired.',
      canonicalUrl: 'https://hellouniversity.online/confirm-email',
      stylesheets: ['/css/auth.css'],
      heading: 'Invalid or expired link',
      message: 'Your confirmation link is invalid or has already been used.',
      primaryLinkHref: '/resend-confirmation',
      primaryLinkText: 'Resend verification email',
      secondaryLinkHref: '/login',
      secondaryLinkText: 'Back to Login',
      showEmailForm: false
    });
  }

  if (user.emailConfirmed) {
    return res.render('pages/auth/confirmation-status', {
      title: 'Email Already Confirmed | HelloUniversity',
      description: 'This HelloUniversity email address has already been confirmed.',
      canonicalUrl: 'https://hellouniversity.online/confirm-email',
      stylesheets: ['/css/auth.css'],
      heading: 'Email already confirmed',
      message: 'Your email is already confirmed. You can log in now.',
      primaryLinkHref: '/login',
      primaryLinkText: 'Go to Login',
      secondaryLinkHref: '/resend-confirmation',
      secondaryLinkText: 'Resend verification email',
      showEmailForm: false
    });
  }

  if (user.emailConfirmationExpires < new Date()) {
    return res.render('pages/auth/confirmation-status', {
      title: 'Confirmation Link Expired | HelloUniversity',
      description: 'This HelloUniversity confirmation link has expired.',
      canonicalUrl: 'https://hellouniversity.online/confirm-email',
      stylesheets: ['/css/auth.css'],
      heading: 'Link expired',
      message: 'Your confirmation link has expired. Request a fresh verification email to continue.',
      primaryLinkHref: `/resend-confirmation?email=${encodeURIComponent(user.emaildb)}`,
      primaryLinkText: 'Resend verification email',
      secondaryLinkHref: '/login',
      secondaryLinkText: 'Back to Login',
      showEmailForm: false
    });
  }

  // Mark email as confirmed
  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { emailConfirmed: true }, $unset: { emailConfirmationToken: "", emailConfirmationExpires: "" } }
  );

  return res.render('pages/auth/confirmation-status', {
    title: 'Email Confirmed | HelloUniversity',
    description: 'Your HelloUniversity email has been confirmed.',
    canonicalUrl: 'https://hellouniversity.online/confirm-email',
    stylesheets: ['/css/auth.css'],
    heading: 'Email confirmed',
    message: 'Your email has been confirmed. You can now log in to HelloUniversity.',
    primaryLinkHref: '/login',
    primaryLinkText: 'Go to Login',
    secondaryLinkHref: '/signup',
    secondaryLinkText: 'Create another account',
    showEmailForm: false
  });
});

module.exports = router;
