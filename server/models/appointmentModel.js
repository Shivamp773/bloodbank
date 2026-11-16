import mongoose from 'mongoose';
import { APPOINTMENT_STATUSES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

/** A donor's booked donation slot. Completing it creates an IN inventory record. */
const appointmentSchema = new mongoose.Schema(
  {
    donor: { type: ObjectId, ref: 'User', required: true },
    organisation: { type: ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: [true, 'Date and time are required'] },
    note: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled' },
    cancelledBy: { type: String, enum: ['donor', 'organisation', 'admin'] },
    completedAt: { type: Date },
    inventory: { type: ObjectId, ref: 'Inventory' },
  },
  { timestamps: true },
);

appointmentSchema.index({ organisation: 1, status: 1, scheduledAt: 1 });
appointmentSchema.index({ donor: 1, status: 1, scheduledAt: -1 });
// A donor can have at most one upcoming appointment, enforced by the database even under concurrency.
appointmentSchema.index(
  { donor: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' }, name: 'one_scheduled_per_donor' },
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);
