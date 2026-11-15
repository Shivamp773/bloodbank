import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BLOOD_GROUPS, ROLE_LIST, ROLES } from '../config/constants.js';

const requiredForRoles = (...roles) =>
  function isRequired() {
    return roles.includes(this.role);
  };

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: { values: ROLE_LIST, message: '"{VALUE}" is not a valid role' },
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      required: [requiredForRoles(ROLES.ADMIN, ROLES.DONOR), 'Name is required'],
    },
    organisationName: {
      type: String,
      trim: true,
      maxlength: 120,
      required: [requiredForRoles(ROLES.ORGANISATION), 'Organisation name is required'],
    },
    hospitalName: {
      type: String,
      trim: true,
      maxlength: 120,
      required: [requiredForRoles(ROLES.HOSPITAL), 'Hospital name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    // Never returned by queries unless explicitly selected with .select('+password').
    password: { type: String, required: [true, 'Password is required'], select: false },
    website: { type: String, trim: true, maxlength: 200 },
    address: { type: String, required: [true, 'Address is required'], trim: true, maxlength: 200 },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true, maxlength: 20 },
    // Donors: optional, pre-fills the blood group when an organisation records a donation.
    bloodGroup: {
      type: String,
      enum: { values: BLOOD_GROUPS, message: '"{VALUE}" is not a valid blood group' },
    },
    // Organisations: low-stock alert threshold in ml (falls back to DEFAULT_LOW_STOCK_THRESHOLD).
    lowStockThreshold: { type: Number, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, createdAt: -1 });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema, 'users');
