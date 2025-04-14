// 1. REQUIRE DEPENDENCIES
const express = require('express');
const { connectDB, getDB } = require('./db'); // your db.js for MongoDB connection
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const nodeMailer = require("nodemailer");
require('dotenv').config();

console.log("SMTP config:", {
  host: process.env.SMPT_HOST,
  port: process.env.SMPT_PORT,
  user: process.env.SMPT_MAIL,
});

// 2. INITIALIZE EXPRESS APP
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. MIDDLEWARE
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600 * 1000
  }
}));

// 4. CONNECT TO DATABASE
connectDB().then(() => {
  console.log("✅ MongoDB connected");
}).catch(err => {
  console.error("❌ MongoDB connection failed:", err);
});

// 5. SERVE FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

// 6. LOGIN ROUTE
app.post('/api/login', async (req, res) => {
  console.log('Received login request');
  try {
    const { email, password } = req.body;
    const db = getDB();

    if (!req.session.loginAttempts) {
      req.session.loginAttempts = 0;
      req.session.lockedUntil = null;
    }

    if (req.session.lockedUntil && Date.now() < req.session.lockedUntil) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.collection('users').findOne({ email });
    if (!user) {
      req.session.loginAttempts += 1;
      if (req.session.loginAttempts >= 3) {
        req.session.lockedUntil = Date.now() + 5 * 60 * 1000;
        return res.status(429).json({ error: 'Too many attempts. Try again in 5 minutes.' });
      }
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.password !== password) {
      req.session.loginAttempts += 1;
      if (req.session.loginAttempts >= 3) {
        req.session.lockedUntil = Date.now() + 5 * 60 * 1000;
        return res.status(429).json({ error: 'Too many attempts. Try again in 5 minutes.' });
      }
      return res.status(401).json({ error: 'Invalid password' });
    }

    req.session.loginAttempts = 0;
    req.session.lockedUntil = null;
    req.session.user = { id: user._id, email: user.email };

    return res.json({ success: true, message: 'Login successful' });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 7. LOGOUT
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// 8. CHECK AUTH
app.get('/api/check-auth', (req, res) => {
  res.json({ loggedIn: !!req.session.user, user: req.session.user || null });
});


// 9. OTP REQUEST
app.post('/api/signup/request', async (req, res) => {
  try {
    const { email } = req.body;
    const db = getDB();

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection('signup_otps').updateOne(
      { email },
      { $set: { otp, otpExpiry } },
      { upsert: true }
    );

    console.log(`🔐 OTP for ${email}: ${otp}`);

    await sendEmail({ to: email, otp }); // ✅ call correctly
    res.json({ success: true, message: 'OTP sent' });

  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Send email function (defined outside the route!)
const sendEmail = async ({ to, otp }) => {
  const transporter = nodeMailer.createTransport({
    host: process.env.SMPT_HOST,
    port: parseInt(process.env.SMPT_PORT),
    secure: false, // true for port 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_APP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    }
  });

  const mailOptions = {
    from: `"Tax Optimizer" <${process.env.SMPT_MAIL}>`,
    to: to,
    subject: "Your OTP for Tax Optimizer Signup",
    html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,

  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email send failed:", error);
    } else {
      console.log("✅ Email sent:", info.response);
    }
  });
  ;
};


// 10. OTP VERIFY + REGISTER
app.post('/api/signup/verify', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const db = getDB();

    const otpRecord = await db.collection('signup_otps').findOne({ email });
    if (!otpRecord) return res.status(400).json({ error: 'OTP not requested or expired' });

    if (otpRecord.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > otpRecord.otpExpiry) return res.status(400).json({ error: 'OTP expired' });

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      await db.collection('users').insertOne({
        email,
        password, // In real apps: hash password!
        createdAt: new Date()
      });

      await db.collection('signup_otps').deleteOne({ email });

      return res.json({ success: true, message: 'Registration complete' });
    }

    res.json({ success: true, message: 'OTP verified' });

  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 11. HANDLE FRONTEND ROUTES
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 12. START SERVER
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
// 
