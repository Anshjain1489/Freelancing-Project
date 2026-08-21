const { z } = require('zod');

const registerSchema = {
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
    email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
};

const loginSchema = {
  body: z.object({
    identifier: z.string().min(3, 'Please enter a valid mobile number or email'),
    password: z.string().min(1, 'Password is required')
  })
};

const googleAuthSchema = {
  body: z.object({
    idToken: z.string().min(1, 'Google ID token credential is required')
  })
};

const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
};

const forgotPasswordSchema = {
  body: z.object({
    phoneOrEmail: z.string().min(3, 'Please enter a valid mobile number or email')
  })
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters')
  })
};

const updateProfileSchema = {
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    avatarUrl: z.string().url().optional().or(z.literal(''))
  })
};

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema
};
