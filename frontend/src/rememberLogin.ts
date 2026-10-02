export const rememberedEmailKey = 'frotagest.remembered-email';

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

export async function offerPasswordSave(email: string, password: string) {
  try {
    const Constructor = passwordConstructor();
    if (Constructor && navigator.credentials?.store) {
      await navigator.credentials.store(new Constructor({id: email, password}));
    }
  } catch { /* Saving is optional and controlled by the browser/user. */ }
}

export async function rememberedPassword(email: string): Promise<string | undefined> {
  try {
    if (!passwordConstructor() || !navigator.credentials?.get) return;
    const entry = await navigator.credentials.get({password: true, mediation: 'silent'} as CredentialRequestOptions) as PasswordEntry | null;
    if (entry?.type === 'password' && entry.id.toLowerCase() === email.toLowerCase()) return entry.password;
  } catch { /* Fall back to normal password-manager autofill. */ }
}
