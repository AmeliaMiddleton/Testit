import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  session$ = this.sessionSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn()
      }
    });
    this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSubject.next(data.session);
    });
    this.supabase.auth.onAuthStateChange((_, session) => {
      this.sessionSubject.next(session);
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
}
