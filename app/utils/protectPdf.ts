/**
 * Password-protect a PDF using @cantoo/pdf-lib (a fork of pdf-lib that
 * adds native PDF encryption support compatible with every standard
 * PDF reader — Preview, Acrobat, Chrome, Edge, Foxit, etc.).
 *
 * Runs 100% in the browser — the PDF and password never leave the user's
 * device. We keep the original pdf-lib in place for /sign and /fill so
 * existing code paths are untouched.
 */

// `@cantoo/pdf-lib` is a drop-in fork of `pdf-lib` that adds PDF
// encryption support. Original pdf-lib remains the library used by
// /sign and /fill — no behavior change for those tools.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { PDFDocument } from '@cantoo/pdf-lib';

type UserPermissions = {
  printing?: boolean | 'lowResolution' | 'highResolution';
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
  fillingForms?: boolean;
  contentAccessibility?: boolean;
  documentAssembly?: boolean;
};

export interface ProtectOptions {
  pdfFile: File;
  userPassword: string;
  preventEditing: boolean;
  preventCopying: boolean;
  preventPrinting: boolean;
}

/**
 * Encrypt a PDF with the given user password and permission flags.
 *
 * Returns a Blob containing the encrypted PDF. Throws on failure —
 * callers should wrap in try/catch and show a user-friendly error.
 */
export async function protectPdfInBrowser(opts: ProtectOptions): Promise<Blob> {
  const { pdfFile, userPassword, preventEditing, preventCopying, preventPrinting } = opts;

  if (!userPassword) throw new Error('Password is required');

  const arrayBuffer = await pdfFile.arrayBuffer();

  // ignoreEncryption: true lets us handle source PDFs that already carry
  // an /Encrypt dict (we simply replace it with our own).
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // @cantoo/pdf-lib exposes encryption via PDFDocument.save({ userPassword, ownerPassword, permissions })
  // The owner password is set to a random token — it gives the document
  // owner unrestricted access while the user password is what recipients
  // type to open the file.
  const ownerPassword = randomOwnerPassword();

  // Build permissions object. In PDF encryption, a permission set to `false`
  // means the action is DISALLOWED for the user opening with the user
  // password. Setting all three to false still lets the recipient view
  // the document — they just can't edit, copy text, or print it.
  const permissions: UserPermissions = {
    printing: preventPrinting ? false : 'highResolution',
    modifying: !preventEditing,
    copying: !preventCopying,
    annotating: !preventEditing,
    fillingForms: !preventEditing,
    contentAccessibility: true, // keep accessibility on — best practice
    documentAssembly: !preventEditing,
  };

  // @cantoo/pdf-lib exposes encrypt() on PDFDocument; it mutates the
  // document's security context so the subsequent save() emits an
  // encrypted PDF. The method isn't in the package's .d.ts, so we cast.
  (pdfDoc as unknown as { encrypt: (opts: { userPassword: string; ownerPassword: string; permissions: UserPermissions }) => void }).encrypt({
    userPassword,
    ownerPassword,
    permissions,
  });

  const encryptedBytes = await pdfDoc.save();

  // Uint8Array → Blob (industry-standard PDF MIME type)
  return new Blob([encryptedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/** 32-char random owner password — never shown to the user. */
function randomOwnerPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const arr = new Uint32Array(32);
  crypto.getRandomValues(arr);
  let out = '';
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

/**
 * Generate a strong 16-character user password.
 * Mix of upper/lower/digit/symbol for maximum entropy.
 * Exported so the UI can offer "Generate strong password".
 */
export function generateStrongPassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digit = '23456789';
  const symbol = '!@#$%^&*-_=+';
  const all = upper + lower + digit + symbol;

  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);

  // Guarantee at least one of each category, then fill remainder from `all`
  const required = [upper, lower, digit, symbol];
  const picked: string[] = required.map((pool, i) => pool[arr[i] % pool.length]);
  for (let i = required.length; i < length; i++) picked.push(all[arr[i] % all.length]);

  // Shuffle Fisher–Yates using fresh random values
  const shuffleIdx = new Uint32Array(length);
  crypto.getRandomValues(shuffleIdx);
  for (let i = length - 1; i > 0; i--) {
    const j = shuffleIdx[i] % (i + 1);
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.join('');
}

/**
 * Score a password 0–4:
 *   0 = Weak | 1 = Fair | 2 = Strong | 3 = Very Strong | 4 = Excellent
 * Simple heuristic — no dictionary, deliberately conservative.
 */
export function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: 'Weak', color: '#ef4444' };

  let points = 0;
  if (pw.length >= 8) points++;
  if (pw.length >= 12) points++;
  if (pw.length >= 16) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;

  // Cap to 0..4
  const score = Math.max(0, Math.min(4, points - 2)) as 0 | 1 | 2 | 3 | 4;
  const labels: Record<number, { label: string; color: string }> = {
    0: { label: 'Weak', color: '#ef4444' },
    1: { label: 'Fair', color: '#f59e0b' },
    2: { label: 'Strong', color: '#eab308' },
    3: { label: 'Very Strong', color: '#16a34a' },
    4: { label: 'Excellent', color: '#16a34a' },
  };
  return { score, ...labels[score] };
}
