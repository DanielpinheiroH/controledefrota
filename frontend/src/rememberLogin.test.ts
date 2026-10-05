import {afterEach, expect, it, vi} from 'vitest';
import {readRememberedEmail,rememberEmail,rememberedEmailKey,offerPasswordSave,rememberedPassword} from './rememberLogin';
afterEach(()=>{localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('stores only the normalized email and removes it on opt-out',()=>{
  rememberEmail(' WILL@EXAMPLE.COM ');
  expect(readRememberedEmail()).toBe('will@example.com');
  expect(Object.keys(localStorage)).toEqual([rememberedEmailKey]);
  rememberEmail('');
  expect(readRememberedEmail()).toBe('');
});
it('does not break login when browser storage is denied',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('denied');});
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('denied');});
  expect(readRememberedEmail()).toBe('');
  expect(()=>rememberEmail('will@example.com')).not.toThrow();
});
it('uses the browser credential manager without persisting the password in app storage',async()=>{
  class PasswordCredential {type='password';id:string;password:string;constructor(data:{id:string;password:string}){this.id=data.id;this.password=data.password;}}
  const store=vi.fn().mockResolvedValue(null);
  const get=vi.fn().mockResolvedValue({type:'password',id:'will@example.com',password:'sample-only'});
  vi.stubGlobal('PasswordCredential',PasswordCredential);
  vi.stubGlobal('navigator',{credentials:{store,get}});
  await offerPasswordSave('will@example.com','sample-only');
  expect(store).toHaveBeenCalledOnce();
  expect(localStorage.length).toBe(0);
  expect(await rememberedPassword('will@example.com')).toBe('sample-only');
  expect(await rememberedPassword('will@example.com', '1')).toBeUndefined();
  await offerPasswordSave('will@example.com','tenant-one-secret','1');
  expect(store.mock.calls.at(-1)?.[0].id).toBe('1:will@example.com');
  expect(await rememberedPassword('other@example.com')).toBeUndefined();
  get.mockRejectedValue(new Error('denied'));
  expect(await rememberedPassword('will@example.com')).toBeUndefined();
});
