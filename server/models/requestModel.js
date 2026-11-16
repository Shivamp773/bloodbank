import mongoose from 'mongoose';
import {
  BLOOD_GROUPS,
  MAX_QUANTITY_ML,
  REQUEST_STATUSES,
  REQUEST_URGENCIES,
} from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

/** A hospital asking an organisation for blood. Approval creates an OUT inventory record. */
const bloodRequestSchema = new mongoose.Schema(
  {
    hospital: { type: ObjectId, ref: 'User', required: true },
    organisation: { type: ObjectId, ref: 'User', required: true },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: { values: BLOOD_GROUPS, message: '"{VALUE}" is not a valid blood group' },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1 ml'],
      max: [MAX_QUANTITY_ML, `Quantity can't exceed ${MAX_QUANTITY_ML} ml`],
    },
    urgency: { type: String, enum: REQUEST_URGENCIES, default: 'normal' },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending' },
    responseNote: { type: String, trim: true, maxlength: 500 },
    respondedAt: { type: Date },
    inventory: { type: ObjectId, ref: 'Inventory' },
  },
  { timestamps: true },
);

bloodRequestSchema.index({ organisation: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ hospital: 1, createdAt: -1 });

export const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
