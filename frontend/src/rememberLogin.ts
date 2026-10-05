export const rememberedEmailKey = 'frotagest.remembered-email';
const rememberedTenantKey = 'frotagest.remembered-tenant';

export function readRememberedTenant(): string {
  try {
    const value = localStorage.getItem(rememberedTenantKey) || '3';
    return /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647 ? value : '3';
  } catch { return '3'; }
}

export function rememberTenant(value: string): void {
  try {
    if (value) localStorage.setItem(rememberedTenantKey, value);
    else localStorage.removeItem(rememberedTenantKey);
  } catch { /* Remembering is optional. */ }
}

function credentialId(email: string, tenantId: string) {
  return tenantId === '3' ? email : `${tenantId}:${email}`;
}

export function readRememberedEmail(): string {
  try { return localStorage.getItem(rememberedEmailKey) || ''; }
  catch { return ''; }
}

export function rememberEmail(email: string): void {
  try {
    if (email) localStorage.setItem(rememberedEmailKey, email.trim().toLowerCase());
    else localStorage.removeItem(rememberedEmailKey);
  } catch { /* Login remains available when browser storage is blocked. */ }
}

type PasswordEntry = Credential & { password: string };
type PasswordConstructor = new (data: {id: string; password: string}) => PasswordEntry;
function passwordConstructor() {
  return (window as Window & {PasswordCredential?: PasswordConstructor}).PasswordCredential;
}

export async function offerPasswordSave(email: string, password: string, tenantId = '3') {
  try {
    const Constructor = passwordConstructor();
    if (Constructor && navigator.credentials?.store) {
      await navigator.credentials.store(new Constructor({id: credentialId(email, tenantId), password}));
    }
  } catch { /* Saving is optional and controlled by the browser/user. */ }
}

export async function rememberedPassword(email: string, tenantId = '3'): Promise<string | undefined> {
  try {
    if (!passwordConstructor() || !navigator.credentials?.get) return;
    const entry = await navigator.credentials.get({password: true, mediation: 'silent'} as CredentialRequestOptions) as PasswordEntry | null;
    if (entry?.type === 'password' && entry.id.toLowerCase() === credentialId(email, tenantId).toLowerCase()) return entry.password;
  } catch { /* Fall back to normal password-manager autofill. */ }
}
