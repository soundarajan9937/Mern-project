const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const { connectDB, closeDB } = require('./config/db');
const User = require('./models/User');
const Student = require('./models/Student');
const GatePass = require('./models/GatePass');
const Visitor = require('./models/Visitor');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const { generateSecureToken, generateQRCodeDataUrl } = require('./services/qrService');

const seedData = async () => {
  try {
    const seedPasswords = {
      admin: process.env.SEED_ADMIN_PASSWORD,
      security: process.env.SEED_SECURITY_PASSWORD,
      staff: process.env.SEED_STAFF_PASSWORD,
      student: process.env.SEED_STUDENT_PASSWORD,
      student2: process.env.SEED_STUDENT2_PASSWORD,
    };
    const missingPasswords = Object.entries(seedPasswords)
      .filter(([, password]) => !password || password.length < 12)
      .map(([role]) => `SEED_${role.toUpperCase()}_PASSWORD`);
    if (missingPasswords.length > 0) {
      throw new Error(`Set passwords of at least 12 characters for: ${missingPasswords.join(', ')}`);
    }

    await connectDB();
    console.log('Seeding initial data into database...');

    // Clear existing
    await User.deleteMany({});
    await Student.deleteMany({});
    await GatePass.deleteMany({});
    await Visitor.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Create Admin
    const adminUser = await User.create({
      name: 'Dr. Alex Morgan',
      email: 'admin@example.com',
      password: seedPasswords.admin,
      role: 'admin',
      phone: '+1-202-555-0101',
      department: 'Hostel Administration',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    });

    // 2. Create Security Staff
    const securityUser = await User.create({
      name: 'Officer Jamie Taylor',
      email: 'security@example.com',
      password: seedPasswords.security,
      role: 'security',
      phone: '+1-202-555-0102',
      department: 'Main Gate Security',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    });

    // 3. Create Faculty/Meeting Person Staff
    const staffUser = await User.create({
      name: 'Prof. Taylor Reed',
      email: 'taylor.reed@example.com',
      password: seedPasswords.staff,
      role: 'staff',
      phone: '+1-202-555-0103',
      department: 'Computer Science & Engineering',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    });

    // 4. Create Students
    const studentUser1 = await User.create({
      name: 'Avery Patel',
      email: 'avery@student.example.com',
      password: seedPasswords.student,
      role: 'student',
      phone: '+1-202-555-0104',
      department: 'Computer Science & Engineering',
      avatar: '',
    });

    const studentRecord1 = await Student.create({
      user: studentUser1._id,
      fullName: 'Avery Patel',
      rollNumber: 'CS2026001',
      department: 'Computer Science & Engineering',
      year: '3',
      phone: '+1-202-555-0104',
      hostelBlock: 'A',
      hostelRoom: '303',
      photoUrl: '',
      guardianName: 'Jordan Patel',
      guardianPhone: '+1-202-555-0105',
    });

    const studentUser2 = await User.create({
      name: 'Casey Lee',
      email: 'casey@student.example.com',
      password: seedPasswords.student2,
      role: 'student',
      phone: '+1-202-555-0106',
      department: 'Electronics & Communication',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    });

    const studentRecord2 = await Student.create({
      user: studentUser2._id,
      fullName: 'Casey Lee',
      rollNumber: 'EC2024012',
      department: 'Electronics & Communication',
      year: '2nd Year',
      phone: '+1-202-555-0106',
      hostelBlock: 'Block C - Gargi Hall',
      hostelRoom: '112',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      guardianName: 'Morgan Lee',
      guardianPhone: '+1-202-555-0107',
    });

    // 5. Create Gate Passes
    // A. Approved Gate Pass with valid QR
    const qrToken1 = generateSecureToken();
    const hostIp = process.env.VITE_HOST_IP || 'localhost';
    const verifyUrl1 = `http://${hostIp}:5173/verify-outpass?passId=GP-2026-0001&token=${qrToken1}`;
    const qrCodeDataUrl1 = await generateQRCodeDataUrl(verifyUrl1);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const leavingDate1 = new Date('2026-10-23T22:24:00+05:30');
    const returnDate1 = new Date('2026-10-26T09:25:00+05:30');
    const submittedDate1 = new Date('2026-10-23T21:25:00+05:30');

    await GatePass.create({
      passId: 'GP-2026-0001',
      student: studentRecord1._id,
      user: studentUser1._id,
      studentDetails: {
        fullName: studentRecord1.fullName,
        rollNumber: studentRecord1.rollNumber,
        department: studentRecord1.department,
        year: studentRecord1.year,
        phone: studentRecord1.phone,
        hostelBlock: studentRecord1.hostelBlock,
        hostelRoom: studentRecord1.hostelRoom,
        photoUrl: studentRecord1.photoUrl,
      },
      reason: 'Home Visit / Weekend',
      destination: 'Tirupathur',
      expectedLeavingDateTime: leavingDate1,
      expectedReturnDateTime: returnDate1,
      status: 'Approved',
      qrToken: qrToken1,
      qrCodeDataUrl: qrCodeDataUrl1,
      submittedAt: submittedDate1,
      actionedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      actionedBy: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
      },
    });

    // B. Pending Gate Pass for Student 2
    await GatePass.create({
      passId: 'GP-2026-0002',
      student: studentRecord2._id,
      user: studentUser2._id,
      studentDetails: {
        fullName: studentRecord2.fullName,
        rollNumber: studentRecord2.rollNumber,
        department: studentRecord2.department,
        year: studentRecord2.year,
        phone: studentRecord2.phone,
        hostelBlock: studentRecord2.hostelBlock,
        hostelRoom: studentRecord2.hostelRoom,
        photoUrl: studentRecord2.photoUrl,
      },
      reason: 'Family wedding ceremony',
      destination: 'Pune, Maharashtra',
      expectedLeavingDateTime: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      expectedReturnDateTime: new Date(now.getTime() + 120 * 60 * 60 * 1000),
      status: 'Pending',
      submittedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    });

    // 6. Create Visitors
    // A. Approved Visitor with valid QR
    const visToken1 = generateSecureToken();
    const visPayload1 = JSON.stringify({
      type: 'VISITOR_PASS',
      token: visToken1,
      visitorId: 'VIS-2026-0001',
    });
    const visQrDataUrl1 = await generateQRCodeDataUrl(visPayload1);

    await Visitor.create({
      visitorId: 'VIS-2026-0001',
      fullName: 'Jordan Patel',
      relationship: 'Father',
      phone: '+1-202-555-0105',
      place: 'Example City',
      meetingPersonName: 'Prof. Taylor Reed',
      meetingPersonContact: '+1-202-555-0103',
      studentRollNumber: 'CS2023045',
      department: 'Computer Science & Engineering',
      purpose: 'Discussing a student project',
      expectedMeetingDate: tomorrow,
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
      consentGiven: true,
      status: 'Approved',
      qrToken: visToken1,
      qrCodeDataUrl: visQrDataUrl1,
      submittedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      actionedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      actionedBy: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
      },
    });

    // B. Pending Visitor
    await Visitor.create({
      visitorId: 'VIS-2026-0002',
      fullName: 'Morgan Ellis',
      relationship: 'Mother',
      phone: '+1-202-555-0108',
      place: 'Sample Town',
      meetingPersonName: 'Prof. Taylor Reed',
      meetingPersonContact: '+1-202-555-0103',
      studentRollNumber: 'EC2024012',
      department: 'Electronics & Communication',
      purpose: 'Academic consultation',
      expectedMeetingDate: dayAfter,
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      consentGiven: true,
      status: 'Pending',
      submittedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    // 7. Meeting Person In-App Notification (as required by section 6)
    await Notification.create({
      recipientContact: '+1-202-555-0103',
      recipientUser: staffUser._id,
      recipientName: 'Prof. Taylor Reed',
      title: 'Visitor Registration Alert',
      message: `A visitor has registered to meet you.
- Visitor Name: Jordan Patel
- Relationship: Father
- Purpose: Discussing a student project
- Registration Date: Automatically recorded
- Registration Time: Automatically recorded`,
      type: 'VISITOR_ALERT',
      metadata: {
        visitorId: 'VIS-2026-0001',
        visitorName: 'Jordan Patel',
        relationship: 'Father',
        purpose: 'Discussing a student project',
        status: 'Approved',
      },
      isRead: false,
      deliveryStatus: 'Delivered',
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    });

    // 8. Initial Audit Logs
    await AuditLog.create([
      {
        action: 'SYSTEM_INITIALIZED',
        actor: { name: 'System Installer', role: 'system' },
        targetType: 'System',
        targetId: 'INIT-2026',
        details: { message: 'Database initialized with demo campus data' },
        timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
      {
        action: 'GATE_PASS_APPROVED',
        actor: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: 'admin' },
        targetType: 'GatePass',
        targetId: 'GP-2026-0001',
        details: { approvedFor: 'Avery Patel (CS2026001)' },
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        action: 'VISITOR_APPROVED',
        actor: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: 'admin' },
        targetType: 'Visitor',
        targetId: 'VIS-2026-0001',
        details: { visitorName: 'Jordan Patel' },
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
    ]);

    console.log('✅ Seed completed successfully!');
    console.log('--------------------------------------------------');
    console.log('Seeded accounts use the passwords configured in SEED_*_PASSWORD variables.');

    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
};

seedData();
