const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailSender');
const { getPublicBaseUrl } = require('../utils/publicBaseUrl');
const {
  ALLOWED_TYPES,
  normalizeInstitutionType,
  findInstitutionById
} = require('../utils/institutionsDirectory');

const RECAPTCHA_SECRET_KEY = process.env.SECRET_KEY;

function createSignupApi({
  getUsersCollection,
  getLogsCollection,
  bcrypt,
  validator
}) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const isDev = process.env.NODE_ENV === 'development' || process.env.DISABLE_CAPTCHA === 'true';
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      studentIDNumber,
      termsCheckbox,
      accountType,
      institutionType,
      institutionId,
      institutionName,
      institutionSource,
      institutionNotListed,
      'g-recaptcha-response': recaptchaToken
    } = req.body;

    const usersCollection = getUsersCollection();
    const logsCollection = getLogsCollection ? getLogsCollection() : null;

    if (!usersCollection) {
      return res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
    }

    if (!isDev) {
      if (!recaptchaToken) {
        return res.status(400).json({ success: false, message: 'reCAPTCHA token missing.' });
      }
      try {
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;
        const response = await axios.post(verifyUrl);
        if (!response.data.success) {
          return res.status(400).json({ success: false, message: 'reCAPTCHA failed. Please try again.' });
        }
      } catch (err) {
        return res.status(500).json({ success: false, message: 'reCAPTCHA verification error.' });
      }
    }

    const normalizedFirstName = validator.trim(String(firstName || ''));
    const normalizedLastName = validator.trim(String(lastName || ''));
    const normalizedEmail = validator.normalizeEmail(String(email || '').trim(), { gmail_remove_dots: false }) || String(email || '').trim().toLowerCase();
    const normalizedStudentId = String(studentIDNumber || '').trim();
    const normalizedAccountType = String(accountType || '').trim().toLowerCase();
    const normalizedInstitutionType = normalizeInstitutionType(institutionType);
    const manualInstitution = validator.trim(String(institutionName || ''));
    const wantsManualInstitution = String(institutionNotListed || '').toLowerCase() === 'true' || String(institutionSource || '').toLowerCase() === 'manual';

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !confirmPassword || !normalizedStudentId || !termsCheckbox || !normalizedAccountType || !normalizedInstitutionType) {
      return res.status(400).json({ success: false, message: 'All required fields must be completed.' });
    }

    if (!['student', 'teacher'].includes(normalizedAccountType)) {
      return res.status(400).json({ success: false, message: 'Select whether you are signing up as a student or teacher.' });
    }

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must meet all criteria.' });
    }

    if (!/^\d{7,8}$/.test(normalizedStudentId)) {
      return res.status(400).json({ success: false, message: 'ID number must be 7 or 8 digits.' });
    }

    let resolvedInstitution = null;
    if (institutionId) {
      resolvedInstitution = findInstitutionById(institutionId);
    }

    if (!resolvedInstitution && !wantsManualInstitution) {
      return res.status(400).json({
        success: false,
        message: 'Select your institution from the directory or use School not listed.'
      });
    }

    if (!resolvedInstitution && wantsManualInstitution && manualInstitution.length < 3) {
      return res.status(400).json({ success: false, message: 'Enter your school name when using School not listed.' });
    }

    if (resolvedInstitution && resolvedInstitution.type !== normalizedInstitutionType) {
      return res.status(400).json({
        success: false,
        message: `Selected institution does not match the chosen type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
      });
    }

    const existingEmail = await usersCollection.findOne({
      emaildb: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'The email is already registered.' });
    }

    const existingStudentID = await usersCollection.findOne({ studentIDNumber: normalizedStudentId });
    if (existingStudentID) {
      return res.status(400).json({ success: false, message: 'ID number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const requestedRole = normalizedAccountType;
    const isTeacherRequest = requestedRole === 'teacher';
    const role = isTeacherRequest ? 'teacher_pending' : 'student';
    const approvalStatus = isTeacherRequest ? 'pending' : 'approved';

    const institutionRecord = resolvedInstitution
      ? {
          institutionId: resolvedInstitution.id,
          institutionName: resolvedInstitution.name,
          institutionType: resolvedInstitution.type,
          institutionSource: 'directory',
          institutionNotListed: false,
          institutionCountry: resolvedInstitution.country || 'Philippines',
          institutionRegion: resolvedInstitution.region || '',
          institutionCity: resolvedInstitution.city || ''
        }
      : {
          institutionId: null,
          institutionName: manualInstitution,
          institutionType: normalizedInstitutionType,
          institutionSource: 'manual',
          institutionNotListed: true,
          institutionCountry: 'Philippines',
          institutionRegion: '',
          institutionCity: ''
        };

    const newUser = {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      emaildb: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
      invalidLoginAttempts: 0,
      accountLockedUntil: null,
      invalidResetAttempts: 0,
      accountDisabled: false,
      role,
      requestedRole,
      approvalStatus,
      accountType: requestedRole,
      studentIDNumber: normalizedStudentId,
      emailConfirmed: false,
      emailConfirmationToken: confirmationToken,
      emailConfirmationExpires: confirmationExpires,
      ...institutionRecord
    };

    const insertResult = await usersCollection.insertOne(newUser);

    if (!insertResult.acknowledged) {
      return res.status(500).json({ success: false, message: 'Failed to create account.' });
    }

    if (logsCollection) {
      await logsCollection.insertOne({
        studentIDNumber: normalizedStudentId,
        name: `${normalizedFirstName} ${normalizedLastName}`.trim(),
        action: isTeacherRequest ? 'TEACHER_SIGNUP_REQUESTED' : 'SIGNUP_CREATED',
        role,
        requestedRole,
        approvalStatus,
        institutionName: institutionRecord.institutionName,
        institutionType: institutionRecord.institutionType,
        timestamp: new Date()
      });
    }

    const baseUrl = getPublicBaseUrl();
    const confirmationLink = `${baseUrl}/confirm-email/${confirmationToken}`;
    const emailHtml = isTeacherRequest
      ? `
        <p>Hi ${normalizedFirstName},</p>
        <p>Thank you for signing up for <b>HelloUniversity</b> as a teacher.</p>
        <p>Please confirm your email address by clicking the button below:</p>
        <p>
          <a href="${confirmationLink}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Confirm Email</a>
        </p>
        <p>After email confirmation, your teacher access request will remain pending until an admin approves it.</p>
        <p>This link will expire in 7 days.</p>
        <p>Best regards,<br>The HelloUniversity Team</p>
      `
      : `
        <p>Hi ${normalizedFirstName},</p>
        <p>Thank you for signing up for <b>HelloUniversity</b>!</p>
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
        to: normalizedEmail,
        subject: 'Confirm your HelloUniversity account',
        html: emailHtml
      });
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    return res.json({
      success: true,
      message: isTeacherRequest
        ? 'Account created. Please confirm your email. Teacher access stays pending until approved by an admin.'
        : 'Account created. Please check your email to confirm your account.'
    });
  });

  return router;
}

module.exports = createSignupApi;
