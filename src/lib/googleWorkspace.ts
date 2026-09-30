import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserAccount } from '../types';

/**
 * Requested Google Workspace Scopes
 */
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// In-memory token cache (Do NOT store in localStorage or sessionStorage per SKILL.md guidelines)
let cachedAccessToken: string | null = null;
let currentGoogleUser: User | null = null;

// Listen to auth state to clear cached token on sign-out
onAuthStateChanged(auth, (user) => {
  currentGoogleUser = user;
  if (!user) {
    cachedAccessToken = null;
  }
});

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export function getCurrentGoogleUser(): User | null {
  return currentGoogleUser || auth.currentUser;
}

/**
 * Sign in using Google with all Workspace Scopes (Drive, Gmail, Calendar)
 */
export async function signInWithGoogleWorkspace(): Promise<{ user: User; accessToken: string; userAccount: UserAccount }> {
  const provider = new GoogleAuthProvider();
  
  // Add Workspace scopes
  WORKSPACE_SCOPES.forEach((scope) => {
    provider.addScope(scope);
  });

  provider.setCustomParameters({ 
    prompt: 'consent',
    access_type: 'offline'
  });

  let credential;
  try {
    credential = await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
      const cancelErr = new Error('Sign-in popup was closed before completing authentication.');
      (cancelErr as any).code = 'auth/popup-closed-by-user';
      (cancelErr as any).isCancelled = true;
      throw cancelErr;
    }
    if (err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('cancelled-popup-request')) {
      const cancelReqErr = new Error('Sign-in request was cancelled.');
      (cancelReqErr as any).code = 'auth/cancelled-popup-request';
      (cancelReqErr as any).isCancelled = true;
      throw cancelReqErr;
    }
    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
      const blockedErr = new Error('The sign-in popup was blocked by your browser. Please allow popups or open the app in a new window.');
      (blockedErr as any).code = 'auth/popup-blocked';
      throw blockedErr;
    }
    throw err;
  }

  const user = credential.user;
  const authCred = GoogleAuthProvider.credentialFromResult(credential);

  if (!authCred?.accessToken) {
    throw new Error('Failed to retrieve Google Workspace access token from credentials.');
  }

  cachedAccessToken = authCred.accessToken;
  currentGoogleUser = user;

  const isAdmin = user.email === 'biswasrishikseh606@gmail.com' || (user.email && user.email.includes('admin'));

  const userAccount: UserAccount = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Patient',
    phone: user.phoneNumber || '',
    abhaId: '',
    role: isAdmin ? 'admin' : 'patient',
    photoUrl: user.photoURL || undefined,
    createdAt: new Date().toISOString(),
  };

  // Upsert user profile in Firestore
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userDocRef);
    if (existing.exists()) {
      const data = existing.data() as UserAccount;
      return { user, accessToken: cachedAccessToken, userAccount: { ...userAccount, ...data } };
    } else {
      await setDoc(userDocRef, {
        ...userAccount,
        provider: 'google.com',
        workspaceConnected: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not persist Google user to Firestore:', err);
  }

  return { user, accessToken: cachedAccessToken, userAccount };
}

// -------------------------------------------------------------
// GOOGLE DRIVE API CLIENT
// -------------------------------------------------------------

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

/**
 * List files from Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  options?: { query?: string; pageSize?: number }
): Promise<DriveFileItem[]> {
  const pageSize = options?.pageSize || 20;
  let q = "trashed = false";
  if (options?.query && options.query.trim()) {
    q += ` and name contains '${options.query.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink)&pageSize=${pageSize}&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Drive API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileItem[];
}

/**
 * Upload a file directly to Google Drive via multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  content: string,
  description?: string
): Promise<DriveFileItem> {
  const boundary = '-------MediKioskBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: description || 'Clinical document exported from MediKiosk OPD Platform',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive: ${res.status}`);
  }

  return (await res.json()) as DriveFileItem;
}

/**
 * Download raw binary/text content of a Google Drive file
 */
export async function fetchDriveFileBlob(accessToken: string, fileId: string): Promise<Blob> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive: ${res.status}`);
  }

  return await res.blob();
}

/**
 * Delete a file from Google Drive (MUST be preceded by user confirmation dialog)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive: ${res.status}`);
  }
}

// -------------------------------------------------------------
// GMAIL API CLIENT
// -------------------------------------------------------------

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
}

/**
 * Helper to encode RFC 2822 email into URL-safe Base64
 */
function createMimeMessage(to: string, from: string, subject: string, htmlContent: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent,
  ];

  const emailRaw = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email via Gmail API (MUST be preceded by user confirmation dialog)
 */
export async function sendGmailMessage(
  accessToken: string,
  params: {
    to: string;
    fromEmail?: string;
    subject: string;
    htmlBody: string;
  }
): Promise<{ id: string; threadId: string }> {
  const sender = params.fromEmail || 'me';
  const raw = createMimeMessage(params.to, sender, params.subject, params.htmlBody);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email via Gmail: ${res.status}`);
  }

  return await res.json();
}

/**
 * List recent emails from Gmail
 */
export async function listGmailMessages(
  accessToken: string,
  options?: { query?: string; maxResults?: number }
): Promise<GmailMessageSummary[]> {
  const maxResults = options?.maxResults || 8;
  const q = options?.query ? `&q=${encodeURIComponent(options.query)}` : '';
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${q}`;

  const res = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch messages from Gmail: ${res.status}`);
  }

  const data = await res.json();
  const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

  if (rawList.length === 0) {
    return [];
  }

  // Fetch headers for each message concurrently
  const messageDetails = await Promise.all(
    rawList.slice(0, 8).map(async (msg) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!itemRes.ok) return { id: msg.id, threadId: msg.threadId };
        const itemData = await itemRes.json();
        const headers = itemData.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

        return {
          id: msg.id,
          threadId: msg.threadId,
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From') || 'Unknown Sender',
          date: getHeader('Date') || '',
          snippet: itemData.snippet || '',
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId };
      }
    })
  );

  return messageDetails;
}

// -------------------------------------------------------------
// GOOGLE CALENDAR API CLIENT
// -------------------------------------------------------------

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
}

/**
 * List upcoming events from Google Calendar
 */
export async function listCalendarEvents(
  accessToken: string,
  options?: { timeMin?: string; maxResults?: number }
): Promise<CalendarEventItem[]> {
  const timeMin = options?.timeMin || new Date().toISOString();
  const maxResults = options?.maxResults || 10;
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Calendar events: ${res.status}`);
  }

  const data = await res.json();
  return (data.items || []) as CalendarEventItem[];
}

/**
 * Create a new event on Google Calendar (MUST be preceded by user confirmation dialog)
 */
export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: string[];
  }
): Promise<CalendarEventItem> {
  const body: any = {
    summary: event.summary,
    description: event.description || '',
    location: event.location || 'Hospital OPD Clinic',
    start: {
      dateTime: event.startDateTime,
    },
    end: {
      dateTime: event.endDateTime,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 },
      ],
    },
  };

  if (event.attendees && event.attendees.length > 0) {
    body.attendees = event.attendees.map((email) => ({ email }));
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to schedule Google Calendar event: ${res.status}`);
  }

  return (await res.json()) as CalendarEventItem;
}

/**
 * Delete an event from Google Calendar (MUST be preceded by user confirmation dialog)
 */
export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete Google Calendar event: ${res.status}`);
  }
}
