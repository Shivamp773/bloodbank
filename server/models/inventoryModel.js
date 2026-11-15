import mongoose from 'mongoose';
import { BLOOD_GROUPS, INVENTORY_TYPES, MAX_QUANTITY_ML } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

/** One blood movement for an organisation: IN from a donor, or OUT to a hospital. Quantities are in ml. */
const inventorySchema = new mongoose.Schema(
  {
    inventoryType: {
      type: String,
      required: [true, 'Inventory type is required'],
      enum: { values: INVENTORY_TYPES, message: 'Inventory type must be "in" or "out"' },
    },
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
    // Donor's email for IN records, hospital's email for OUT records (kept for history).
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
    organisation: { type: ObjectId, ref: 'User', required: [true, 'Organisation is required'] },
    donor: {
      type: ObjectId,
      ref: 'User',
      required: [
        function isInRecord() {
          return this.inventoryType === 'in';
        },
        'Donor is required for IN records',
      ],
    },
    hospital: {
      type: ObjectId,
      ref: 'User',
      required: [
        function isOutRecord() {
          return this.inventoryType === 'out';
        },
        'Hospital is required for OUT records',
      ],
    },
    // Set when the record was created from an approved blood request or a completed appointment.
    request: { type: ObjectId, ref: 'BloodRequest' },
    appointment: { type: ObjectId, ref: 'Appointment' },
  },
  { timestamps: true },
);

inventorySchema.index({ organisation: 1, createdAt: -1 });
inventorySchema.index({ organisation: 1, bloodGroup: 1, inventoryType: 1 });
inventorySchema.index({ donor: 1, createdAt: -1 });
inventorySchema.index({ hospital: 1, createdAt: -1 });

export const Inventory = mongoose.model('Inventory', inventorySchema);
