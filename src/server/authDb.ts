import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PatientRecord {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  preferredLanguage: string;
  address?: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface DoctorRecord {
  id: string;
  doctorId: string;
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  department: string;
  opdRoom: string;
  role: 'doctor';
  accountType: 'Development / Test Account';
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface PatientCaseRecord {
  id: string;
  caseId: string;
  patientId: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    abhaId?: string;
    department: string;
  };
  tokenNumber: string;
  department: string;
  roomNumber: string;
  status: 'Waiting' | 'In Consultation' | 'Verified';
  chiefComplaint: string;
  duration?: string;
  location?: string;
  triggers?: string;
  associations?: string;
  allAnswers?: Record<string, string>;
  documents?: any[];
  physicianNotes?: string;
  ayushAssessment?: any;
  severityRating?: any;
  prescriptions?: any[];
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionData {
  userId: string;
  role: 'patient' | 'doctor';
  name: string;
  expiresAt: number;
}

interface DBData {
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  cases: PatientCaseRecord[];
  sessions: Record<string, SessionData>;
  counters: {
    patientSeq: number;
    caseSeq: number;
    tokenSeq: number;
  };
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'medikiosk_db.json');

// Helper: Hash password with salt
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Helper: Verify password
function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

class AuthDatabase {
  private data: DBData;

  constructor() {
    this.data = this.loadData();
    this.ensureDefaultDoctor();
  }

  private loadData(): DBData {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure structure integrity
        return {
          patients: Array.isArray(parsed.patients) ? parsed.patients : [],
          doctors: Array.isArray(parsed.doctors) ? parsed.doctors : [],
          cases: Array.isArray(parsed.cases) ? parsed.cases : [],
          sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
          counters: parsed.counters || { patientSeq: 0, caseSeq: 0, tokenSeq: 0 },
        };
      }
    } catch (err) {
      console.warn('[AuthDB] Could not load database file, initializing empty state:', err);
    }

    return {
      patients: [],
      doctors: [],
      cases: [],
      sessions: {},
      counters: { patientSeq: 0, caseSeq: 0, tokenSeq: 0 },
    };
  }

  private saveData(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AuthDB] Failed to save database file:', err);
    }
  }

  private ensureDefaultDoctor(): void {
    const existing = this.data.doctors.find((d) => d.doctorId === 'DOC-AYU-001');
    if (!existing) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword('AyurDoc@2026!', salt);

      const doctor: DoctorRecord = {
        id: 'DOC-AYU-001',
        doctorId: 'DOC-AYU-001',
        name: 'Dr. Ananya Sharma',
        email: 'dr.ananya@medikiosk.internal',
        phone: '9811002233',
        specialization: 'Kayachikitsa (Internal Medicine & Panchakarma)',
        department: 'Kayachikitsa',
        opdRoom: '12',
        role: 'doctor',
        accountType: 'Development / Test Account',
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };

      this.data.doctors.push(doctor);
      this.saveData();
    }
  }

  // --- PATIENT AUTH & REGISTRATION ---

  public registerPatient(params: {
    name: string;
    phone: string;
    age: number;
    gender: string;
    password: string;
    preferredLanguage?: string;
    address?: string;
  }): { patient: Omit<PatientRecord, 'passwordHash' | 'salt'>; token: string } {
    const name = params.name?.trim();
    const phone = params.phone?.replace(/\D/g, '');
    const age = Number(params.age);
    const gender = params.gender?.trim() || 'unspecified';
    const password = params.password;

    if (!name || name.length < 2) {
      throw new Error('Please enter a valid full patient name.');
    }
    if (!phone || phone.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }
    if (!age || isNaN(age) || age <= 0 || age > 125) {
      throw new Error('Please enter a valid age between 1 and 125.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Check for duplicate account by phone
    const existingPhone = this.data.patients.find((p) => p.phone === phone);
    if (existingPhone) {
      const err: any = new Error('An account with this mobile number already exists. Please log in instead.');
      err.statusCode = 409;
      throw err;
    }

    // Increment patient counter
    this.data.counters.patientSeq += 1;
    const seqStr = String(this.data.counters.patientSeq).padStart(4, '0');
    const patientId = `PAT-2026-${seqStr}`;

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newPatient: PatientRecord = {
      id: patientId,
      patientId,
      name,
      phone,
      age,
      gender,
      preferredLanguage: params.preferredLanguage || 'hi',
      address: params.address?.trim() || '',
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    this.data.patients.push(newPatient);

    // Create session token
    const token = this.createSession(newPatient.id, 'patient', newPatient.name);
    this.saveData();

    const { passwordHash: _ph, salt: _s, ...sanitized } = newPatient;
    return { patient: sanitized, token };
  }

  public loginPatient(identifier: string, password: string): { patient: Omit<PatientRecord, 'passwordHash' | 'salt'>; token: string } {
    const cleanId = identifier?.trim();
    if (!cleanId) {
      throw new Error('Please enter your Patient ID or registered mobile number.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const cleanDigits = cleanId.replace(/\D/g, '');
    const patient = this.data.patients.find(
      (p) => p.patientId.toUpperCase() === cleanId.toUpperCase() || (cleanDigits.length === 10 && p.phone === cleanDigits)
    );

    if (!patient) {
      const err: any = new Error('This patient account does not exist. Please check your Patient ID or mobile number.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = verifyPassword(password, patient.salt, patient.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Invalid credentials. Please try again.');
      err.statusCode = 401;
      throw err;
    }

    const token = this.createSession(patient.id, 'patient', patient.name);
    this.saveData();

    const { passwordHash: _ph, salt: _s, ...sanitized } = patient;
    return { patient: sanitized, token };
  }

  // --- DOCTOR AUTH ---

  public loginDoctor(doctorIdOrEmail: string, password: string): { doctor: Omit<DoctorRecord, 'passwordHash' | 'salt'>; token: string } {
    const cleanInput = doctorIdOrEmail?.trim();
    if (!cleanInput) {
      throw new Error('Please enter your Doctor ID or registered email.');
    }
    if (!password) {
      throw new Error('Please enter your doctor password.');
    }

    const doctor = this.data.doctors.find(
      (d) => d.doctorId.toUpperCase() === cleanInput.toUpperCase() || d.email.toLowerCase() === cleanInput.toLowerCase()
    );

    if (!doctor) {
      const err: any = new Error('Doctor account not found. Please verify your Doctor ID.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = verifyPassword(password, doctor.salt, doctor.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Invalid credentials. Please try again.');
      err.statusCode = 401;
      throw err;
    }

    const token = this.createSession(doctor.id, 'doctor', doctor.name);
    this.saveData();

    const { passwordHash: _ph, salt: _s, ...sanitized } = doctor;
    return { doctor: sanitized, token };
  }

  // --- SESSIONS ---

  private createSession(userId: string, role: 'patient' | 'doctor', name: string): string {
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.data.sessions[token] = { userId, role, name, expiresAt };
    return token;
  }

  public validateSession(token?: string): SessionData | null {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const session = this.data.sessions[cleanToken];
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[cleanToken];
      this.saveData();
      return null;
    }

    return session;
  }

  public destroySession(token?: string): void {
    if (!token) return;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (this.data.sessions[cleanToken]) {
      delete this.data.sessions[cleanToken];
      this.saveData();
    }
  }

  public getUserProfile(session: SessionData): any {
    if (session.role === 'doctor') {
      const doctor = this.data.doctors.find((d) => d.id === session.userId);
      if (!doctor) return null;
      const { passwordHash: _ph, salt: _s, ...sanitized } = doctor;
      return sanitized;
    } else {
      const patient = this.data.patients.find((p) => p.id === session.userId);
      if (!patient) return null;
      const { passwordHash: _ph, salt: _s, ...sanitized } = patient;
      return sanitized;
    }
  }

  // --- PATIENT CASE MANAGEMENT ---

  public createCase(casePayload: {
    patientId: string;
    patientName?: string;
    age?: number;
    gender?: string;
    phone?: string;
    department: string;
    chiefComplaint: string;
    duration?: string;
    location?: string;
    triggers?: string;
    associations?: string;
    allAnswers?: Record<string, string>;
    documents?: any[];
    ayushAssessment?: any;
    severityRating?: any;
  }): PatientCaseRecord {
    const patient = this.data.patients.find((p) => p.id === casePayload.patientId);

    const patientName = patient?.name || casePayload.patientName || 'Patient';
    const age = patient?.age || Number(casePayload.age) || 45;
    const gender = patient?.gender || casePayload.gender || 'unspecified';
    const phone = patient?.phone || casePayload.phone || '';
    const abhaId = `${phone || casePayload.patientId}@abdm`;

    // Increment case counter
    this.data.counters.caseSeq += 1;
    const caseSeqStr = String(this.data.counters.caseSeq).padStart(4, '0');
    const caseId = `CASE-2026-${caseSeqStr}`;

    // Increment token counter
    this.data.counters.tokenSeq += 1;
    const tokenSeqStr = String(this.data.counters.tokenSeq).padStart(3, '0');
    const tokenNumber = `A-${tokenSeqStr}`;

    // Map department to standard room
    const roomMap: Record<string, string> = {
      Kayachikitsa: '12',
      Panchakarma: '08',
      'Shalya Tantra': '05',
      'Shalakya Tantra': '03',
      'Prasuti & Stri Roga': '14',
      Other: '01',
    };
    const roomNumber = roomMap[casePayload.department] || '12';

    const newCase: PatientCaseRecord = {
      id: caseId,
      caseId,
      patientId: casePayload.patientId,
      patient: {
        id: casePayload.patientId,
        name: patientName,
        age,
        gender,
        phone,
        abhaId,
        department: casePayload.department,
      },
      tokenNumber,
      department: casePayload.department,
      roomNumber,
      status: 'Waiting',
      chiefComplaint: casePayload.chiefComplaint || 'General Clinical Consultation',
      duration: casePayload.duration || '',
      location: casePayload.location || '',
      triggers: casePayload.triggers || '',
      associations: casePayload.associations || '',
      allAnswers: casePayload.allAnswers || {},
      documents: casePayload.documents || [],
      physicianNotes: '',
      ayushAssessment: casePayload.ayushAssessment || null,
      severityRating: casePayload.severityRating || null,
      prescriptions: [],
      registeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.cases.push(newCase);
    this.saveData();

    return newCase;
  }

  public getDoctorCases(departmentFilter?: string): PatientCaseRecord[] {
    let cases = [...this.data.cases];
    if (departmentFilter && departmentFilter !== 'All') {
      cases = cases.filter((c) => c.department.toLowerCase() === departmentFilter.toLowerCase());
    }
    // Sort newest first
    return cases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getPatientCases(patientId: string): PatientCaseRecord[] {
    return this.data.cases
      .filter((c) => c.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public updateCase(
    caseId: string,
    updates: {
      status?: 'Waiting' | 'In Consultation' | 'Verified';
      physicianNotes?: string;
      prescriptions?: any[];
      chiefComplaint?: string;
    }
  ): PatientCaseRecord {
    const target = this.data.cases.find(
      (c) => c.id === caseId || c.caseId === caseId || c.tokenNumber === caseId || c.patientId === caseId
    );
    if (!target) {
      throw new Error('Case not found');
    }

    if (updates.status) target.status = updates.status;
    if (updates.physicianNotes !== undefined) target.physicianNotes = updates.physicianNotes;
    if (updates.prescriptions) target.prescriptions = updates.prescriptions;
    if (updates.chiefComplaint) target.chiefComplaint = updates.chiefComplaint;

    target.updatedAt = new Date().toISOString();
    this.saveData();

    return target;
  }
}

export const authDb = new AuthDatabase();
