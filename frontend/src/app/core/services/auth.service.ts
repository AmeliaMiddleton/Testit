import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private recoverySubject = new BehaviorSubject<boolean>(false);
  session$ = this.sessionSubject.asObservable();
  recoverySession$ = this.recoverySubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn()
      }
    });
    this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSubject.next(data.session);
    });
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.sessionSubject.next(session);
      if (event === 'PASSWORD_RECOVERY') {
        this.recoverySubject.next(true);
      }
    });
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  get currentUser(): User | null { return this.sessionSubject.value?.user ?? null; }

  isLoggedIn(): boolean { return this.currentUser !== null; }

  currentUserId(): string | null { return this.currentUser?.id ?? null; }

  getAccessToken(): string | null { return this.sessionSubject.value?.access_token ?? null; }

  async signUp(email: string, password: string, username: string) {
    return this.supabase.auth.signUp({ email, password, options: { data: { username } } });
  }

  async signIn(email: string, password: string) {
    const result = await this.supabase.auth.signInWithPassword({ email, password });
    if (result.data.session) {
      this.sessionSubject.next(result.data.session);
    }
    return result;
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async resetPasswordForEmail(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
  }

  async updatePassword(newPassword: string) {
    return this.supabase.auth.updateUser({ password: newPassword });
  }
}
