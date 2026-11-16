import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/userModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { BloodRequest } from '../models/requestModel.js';
import { Appointment } from '../models/appointmentModel.js';
import { BLOOD_GROUPS, DAY_MS, DONATION_INTERVAL_DAYS } from '../config/constants.js';

export const DEMO_PASSWORD = 'Demo@1234';

/** Shown on the login page (demo mode only) and printed when the server starts. */
export const DEMO_ACCOUNTS = [
  { role: 'organisation', label: 'City Blood Bank', email: 'city@bloodbank.test' },
  { role: 'hospital', label: "St. Mary's Hospital", email: 'stmarys@bloodbank.test' },
  { role: 'donor', label: 'Aarav Sharma', email: 'aarav@bloodbank.test' },
  { role: 'admin', label: 'Kiran Malik', email: 'admin@bloodbank.test' },
].map((account) => ({ ...account, password: DEMO_PASSWORD }));

const ORGANISATIONS = [
  {
    key: 'city',
    organisationName: 'City Blood Bank',
    email: 'city@bloodbank.test',
    phone: '+91 98450 11001',
    address: '12 MG Road, Bengaluru',
    website: 'https://citybloodbank.example',
  },
  {
    key: 'hope',
    organisationName: 'Hope Blood Centre',
    email: 'hope@bloodbank.test',
    phone: '+91 98450 11002',
    address: '48 Lake View Road, Pune',
    website: 'https://hopebloodcentre.example',
  },
];

const HOSPITALS = [
  { key: 'stmarys', hospitalName: "St. Mary's Hospital", email: 'stmarys@bloodbank.test', address: '5 Church Street, Bengaluru' },
  { key: 'greenvalley', hospitalName: 'Green Valley Hospital', email: 'greenvalley@bloodbank.test', address: '220 FC Road, Pune' },
  { key: 'sunrise', hospitalName: "Sunrise Children's Hospital", email: 'sunrise@bloodbank.test', address: '9 Palace Road, Mysuru' },
];

// Rarer blood groups get fewer donors, roughly as in real life.
const DONORS = [
  ['Aarav Sharma', 'O+'], ['Priya Nair', 'A+'], ['Rohan Gupta', 'B+'], ['Ananya Iyer', 'O+'],
  ['Vikram Singh', 'O-'], ['Meera Reddy', 'AB+'], ['Arjun Mehta', 'A-'], ['Kavya Rao', 'B+'],
  ['Ishaan Kapoor', 'O+'], ['Sneha Pillai', 'A+'], ['Aditya Joshi', 'B-'], ['Diya Menon', 'O+'],
  ['Karan Malhotra', 'A+'], ['Nisha Verma', 'AB-'], ['Siddharth Das', 'B+'], ['Pooja Desai', 'O+'],
  ['Varun Chopra', 'A+'], ['Tanvi Kulkarni', 'B+'], ['Nikhil Bose', 'O+'], ['Riya Saxena', 'A+'],
  ['Manish Yadav', 'AB+'], ['Shreya Ghosh', 'O+'], ['Amit Patel', 'B+'], ['Lakshmi Krishnan', 'A+'],
  ['Dev Bhatia', 'O-'], ['Neha Agarwal', 'O+'], ['Kabir Sethi', 'B+'], ['Aditi Banerjee', 'A+'],
  ['Yash Thakur', 'O+'], ['Simran Gill', 'A-'], ['Harsh Vora', 'B+'], ['Isha Mukherjee', 'O+'],
  ['Omkar Patil', 'AB+'], ['Pallavi Shetty', 'A+'], ['Sameer Khan', 'O-'], ['Divya Hegde', 'B-'],
  ['Gaurav Jain', 'O+'], ['Anjali Mishra', 'A+'], ['Farhan Qureshi', 'B+'], ['Zoya Sheikh', 'O+'],
];

const DONOR_AREAS = ['Indiranagar', 'Koramangala', 'Jayanagar', 'Kothrud', 'Baner', 'Viman Nagar', 'Whitefield', 'Aundh'];

/** Small deterministic PRNG, so the demo data looks the same on every run. */
function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills an empty database with demo accounts and about ten months of consistent activity.
 * Returns null (and changes nothing) if the database already has users.
 */
export async function seedDemoData({ now = new Date() } = {}) {
  if ((await User.estimatedDocumentCount()) > 0) return null;

  const rand = mulberry32(20261115);
  const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
  const pick = (items) => items[Math.floor(rand() * items.length)];
  const newId = () => new mongoose.Types.ObjectId();
  const at = (dayOffset, hour = 10, minute = 0) => {
    const date = new Date(now.getTime() + dayOffset * DAY_MS);
    date.setHours(hour, minute, 0, 0);
    return date;
  };
  const stamp = (date) => ({ createdAt: date, updatedAt: date });

  // ---------- Accounts ----------
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = {
    _id: newId(),
    role: 'admin',
    name: 'Kiran Malik',
    email: 'admin@bloodbank.test',
    phone: '+91 98450 10000',
    address: 'Head Office, Bengaluru',
    password,
    ...stamp(at(-420)),
  };
  const orgs = ORGANISATIONS.map(({ key, ...org }, index) => ({
    _id: newId(),
    key,
    role: 'organisation',
    ...org,
    password,
    ...stamp(at(-400 + index * 7)),
  }));
  const hospitals = HOSPITALS.map(({ key, ...hospital }, index) => ({
    _id: newId(),
    key,
    role: 'hospital',
    ...hospital,
    phone: `+91 98450 2200${index + 1}`,
    website: `https://${key}.example`,
    password,
    ...stamp(at(-380 + index * 5)),
  }));
  const donors = DONORS.map(([name, bloodGroup], index) => ({
    _id: newId(),
    role: 'donor',
    name,
    bloodGroup,
    email: `${name.split(' ')[0].toLowerCase()}@bloodbank.test`,
    phone: `+91 98450 ${String(33000 + index * 17)}`,
    address: `${between(1, 99)} ${pick(DONOR_AREAS)}`,
    password,
    ...stamp(at(-330 - index)),
  }));
  const byKey = Object.fromEntries([...orgs, ...hospitals].map((u) => [u.key, u]));
  const aarav = donors[0];

  // ---------- Donations (each donor at most once every DONATION_INTERVAL_DAYS) ----------
  const donations = [];
  donors.forEach((donor, index) => {
    const home = orgs[index % 2];
    const other = orgs[(index + 1) % 2];
    const days = [];
    if (donor === aarav) {
      days.push(-290, -192, -100); // last donation 100 days ago, so Aarav can book an appointment now
    } else {
      // Work backwards from the donor's latest donation. About 30% donated in the last month (so the
      // 30-day charts have activity) and about half are eligible to donate again today.
      const roll = rand();
      const latest = roll < 0.3 ? between(-30, -2) : roll < 0.5 ? between(-89, -31) : between(-200, -90);
      for (let day = latest; day >= -300; day -= DONATION_INTERVAL_DAYS + between(3, 50)) {
        days.unshift(day);
      }
    }
    for (const day of days) {
      donations.push({
        type: 'in',
        date: at(day, between(9, 16), pick([0, 15, 30, 45])),
        donor,
        org: donor === aarav || rand() < 0.8 ? home : other,
        quantity: rand() < 0.8 ? 450 : 350,
      });
    }
  });

  // ---------- Issues to hospitals, simulated in date order so stock never goes negative ----------
  const supplyOrder = {
    city: ['stmarys', 'stmarys', 'sunrise', 'greenvalley'],
    hope: ['greenvalley', 'greenvalley', 'sunrise', 'stmarys'],
  };
  const issueSlots = [];
  orgs.forEach((org, index) => {
    // Hospitals are supplied every few days, more often in recent weeks.
    for (let day = -280 + index * 2; day <= -1; day += day > -45 ? between(2, 4) : between(4, 8)) {
      issueSlots.push({ type: 'out', date: at(day, between(10, 18), pick([0, 20, 40])), org });
    }
  });

  const stock = new Map();
  const stockKey = (org, group) => `${org._id}|${group}`;
  const inventory = [];

  for (const event of [...donations, ...issueSlots].sort((a, b) => a.date - b.date)) {
    if (event.type === 'in') {
      const group = event.donor.bloodGroup;
      stock.set(stockKey(event.org, group), (stock.get(stockKey(event.org, group)) ?? 0) + event.quantity);
      inventory.push({
        _id: newId(),
        inventoryType: 'in',
        bloodGroup: group,
        quantity: event.quantity,
        email: event.donor.email,
        organisation: event.org._id,
        donor: event.donor._id,
        ...stamp(event.date),
      });
      continue;
    }

    // Only issue from groups with comfortable stock, and always keep at least 1,350 ml back.
    const candidates = BLOOD_GROUPS.map((group) => ({ group, available: stock.get(stockKey(event.org, group)) ?? 0 }))
      .filter((c) => c.available >= 1800);
    if (candidates.length === 0) continue;
    let ticket = rand() * candidates.reduce((sum, c) => sum + c.available, 0);
    const choice = candidates.find((c) => (ticket -= c.available) <= 0) ?? candidates.at(-1);
    const units = between(1, Math.min(3, Math.floor((choice.available - 1350) / 450)));
    const quantity = units * 450;
    const hospital = byKey[pick(supplyOrder[event.org.key])];

    stock.set(stockKey(event.org, choice.group), choice.available - quantity);
    inventory.push({
      _id: newId(),
      inventoryType: 'out',
      bloodGroup: choice.group,
      quantity,
      email: hospital.email,
      organisation: event.org._id,
      hospital: hospital._id,
      ...stamp(event.date),
    });
  }

  const available = (orgKey, group) => stock.get(stockKey(byKey[orgKey], group)) ?? 0;
  const isOut = (orgKey) => (r) => r.inventoryType === 'out' && String(r.organisation) === String(byKey[orgKey]._id);
  const recentOuts = (orgKey, count) =>
    inventory.filter((r) => isOut(orgKey)(r) && r.createdAt > at(-60)).slice(-count);

  // ---------- Blood requests ----------
  const requests = [];
  const request = (fields) => {
    const doc = { _id: newId(), urgency: 'normal', ...fields };
    requests.push(doc);
    return doc;
  };

  // Some past issues came from approved requests.
  for (const record of [...recentOuts('city', 3), ...recentOuts('hope', 1)]) {
    const created = new Date(record.createdAt.getTime() - between(2, 20) * 60 * 60 * 1000);
    const doc = request({
      hospital: record.hospital,
      organisation: record.organisation,
      bloodGroup: record.bloodGroup,
      quantity: record.quantity,
      urgency: pick(['normal', 'normal', 'urgent']),
      status: 'approved',
      respondedAt: record.createdAt,
      inventory: record._id,
      ...stamp(created),
    });
    doc.updatedAt = record.createdAt;
    record.request = doc._id;
  }

  request({
    hospital: byKey.greenvalley._id,
    organisation: byKey.city._id,
    bloodGroup: 'AB-',
    quantity: 1350,
    status: 'rejected',
    responseNote: 'We are short on AB- right now. Please try Hope Blood Centre.',
    respondedAt: at(-11, 16),
    ...stamp(at(-12, 9, 30)),
  });
  request({
    hospital: byKey.sunrise._id,
    organisation: byKey.hope._id,
    bloodGroup: 'O+',
    quantity: 450,
    status: 'cancelled',
    note: 'Arranged from our own reserve.',
    ...stamp(at(-20, 11)),
  });

  // Open requests for the demo: one that can be approved straight away and one that will fail the stock check.
  const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  request({
    hospital: byKey.stmarys._id,
    organisation: byKey.city._id,
    bloodGroup: 'O+',
    quantity: Math.max(450, Math.min(900, Math.floor(available('city', 'O+') / 450) * 450 - 450)),
    urgency: 'urgent',
    note: 'Two scheduled surgeries tomorrow morning.',
    status: 'pending',
    ...stamp(hoursAgo(3)),
  });
  request({
    hospital: byKey.greenvalley._id,
    organisation: byKey.city._id,
    bloodGroup: 'A+',
    quantity: 450,
    status: 'pending',
    ...stamp(hoursAgo(26)),
  });
  request({
    hospital: byKey.stmarys._id,
    organisation: byKey.city._id,
    bloodGroup: 'AB-',
    quantity: Math.max(1350, available('city', 'AB-') + 450),
    note: 'Planned cardiac surgery next week.',
    status: 'pending',
    ...stamp(hoursAgo(50)),
  });
  request({
    hospital: byKey.sunrise._id,
    organisation: byKey.hope._id,
    bloodGroup: 'B+',
    quantity: 450,
    urgency: 'critical',
    note: 'Paediatric emergency, patient in theatre.',
    status: 'pending',
    ...stamp(hoursAgo(1)),
  });

  // ---------- Appointments ----------
  const appointments = [];
  const lastDonation = (donor) =>
    inventory.filter((r) => r.inventoryType === 'in' && r.donor === donor._id).at(-1);
  const eligibleOn = (donor, date) => {
    const last = lastDonation(donor);
    return !last || last.createdAt.getTime() + DONATION_INTERVAL_DAYS * DAY_MS <= date.getTime();
  };

  // Past donations that were booked as appointments.
  const completedFor = [aarav, donors[2], donors[3]];
  for (const donor of completedFor) {
    const record = lastDonation(donor);
    if (!record) continue;
    const id = newId();
    record.appointment = id;
    appointments.push({
      _id: id,
      donor: donor._id,
      organisation: record.organisation,
      scheduledAt: record.createdAt,
      status: 'completed',
      completedAt: record.createdAt,
      inventory: record._id,
      ...stamp(new Date(record.createdAt.getTime() - 5 * DAY_MS)),
    });
  }

  // Upcoming and overdue appointments, only for donors who are eligible on that date.
  const slots = [
    { date: at(-1, 15, 0), org: byKey.city, status: 'scheduled', note: 'Booked last week; did not arrive yet.' },
    { date: at(1, 10, 0), org: byKey.city, status: 'scheduled' },
    { date: at(3, 11, 30), org: byKey.city, status: 'scheduled', note: 'First donation, slightly nervous.' },
    { date: at(6, 14, 0), org: byKey.hope, status: 'scheduled' },
    { date: at(-9, 12, 0), org: byKey.hope, status: 'no-show' },
    { date: at(4, 10, 30), org: byKey.city, status: 'cancelled', cancelledBy: 'donor' },
  ];
  const used = new Set(completedFor.map((d) => d._id));
  for (const slot of slots) {
    const donor = donors.find((d) => !used.has(d._id) && eligibleOn(d, slot.date) && eligibleOn(d, now));
    if (!donor) continue;
    used.add(donor._id);
    appointments.push({
      _id: newId(),
      donor: donor._id,
      organisation: slot.org._id,
      scheduledAt: slot.date,
      status: slot.status,
      ...(slot.note && { note: slot.note }),
      ...(slot.cancelledBy && { cancelledBy: slot.cancelledBy }),
      ...stamp(new Date(Math.min(slot.date.getTime(), now.getTime()) - between(3, 8) * DAY_MS)),
    });
  }

  // ---------- Save ----------
  const users = [admin, ...orgs, ...hospitals, ...donors].map(({ key, ...user }) => user);
  await User.insertMany(users);
  await Inventory.insertMany(inventory);
  await BloodRequest.insertMany(requests);
  await Appointment.insertMany(appointments);

  return {
    users: users.length,
    inventory: inventory.length,
    requests: requests.length,
    appointments: appointments.length,
  };
}
