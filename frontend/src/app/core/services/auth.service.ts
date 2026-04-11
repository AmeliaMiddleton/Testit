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
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.supabase.auth.onAuthStateChange((_, session) => {
      this.sessionSubject.next(session);
    });
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  get currentUser(): User | null { return this.sessionSubject.value?.user ?? null; }

  getAccessToken(): string | null { return this.sessionSubject.value?.access_token ?? null; }

  isLoggedIn(): boolean { return this.sessionSubject.value !== null; }

  async signUp(email: string, password: string, username: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) throw error;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
