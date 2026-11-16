import bcrypt from 'bcryptjs';
import { User } from '../models/userModel.js';
import { signToken } from '../middlewares/authMiddleware.js';
import { ApiError } from '../utils/ApiError.js';
import { withArticle } from '../utils/helpers.js';
import { loginSchema, parse, registerSchema } from '../validation/schemas.js';

// Checked when the email is unknown, so a failed login takes the same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

/** POST /api/v1/auth/register */
export async function register(req, res) {
  const data = parse(registerSchema, req.body);

  if (await User.exists({ email: data.email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    role: data.role,
    email: data.email,
    password: data.password, // hashed by the model's pre-save hook
    address: data.address,
    phone: data.phone,
    website: data.website,
    ...(data.role === 'donor' && { name: data.name, bloodGroup: data.bloodGroup }),
    ...(data.role === 'organisation' && { organisationName: data.organisationName }),
    ...(data.role === 'hospital' && { hospitalName: data.hospitalName }),
  });

  res.status(201).json({ success: true, message: 'Registration successful. You can log in now.', user });
}

/** POST /api/v1/auth/login */
export async function login(req, res) {
  const { email, password, role } = parse(loginSchema, req.body);

  const user = await User.findOne({ email }).select('+password');
  const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Only revealed after the password is verified, so it can't be used to probe accounts.
  if (user.role !== role) {
    throw new ApiError(403, `This account is registered as ${withArticle(user.role)}. Select that role to log in.`);
  }

  res.json({ success: true, message: 'Logged in successfully', token: signToken(user), user });
}

/** GET /api/v1/auth/current-user */
export function currentUser(req, res) {
  res.json({ success: true, user: req.user });
}
