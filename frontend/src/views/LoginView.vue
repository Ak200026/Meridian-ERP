<template>
  <div class="login-page">
    <!-- Ambient Backdrop (Linear / Vercel style) -->
    <div class="login-backdrop"></div>

    <div class="login-container">
      <!-- Brand Header -->
      <div class="login-logo">
        <div class="login-logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <h1 class="login-logo-name">Meridian</h1>
        <p class="login-logo-tagline">Enterprise Resource Planning &amp; AI Intelligence</p>
      </div>

      <!-- Authentication Card -->
      <div class="login-card">
        <!-- Auth Mode Navigation Tabs (Sign In vs Create Account) -->
        <div v-if="mode !== 'forgot' && mode !== 'reset-form'" class="auth-tabs">
          <button 
            type="button" 
            class="auth-tab" 
            :class="{ active: mode === 'login' }"
            @click="switchMode('login')"
          >
            Sign In
          </button>
          <button 
            type="button" 
            class="auth-tab" 
            :class="{ active: mode === 'register' }"
            @click="switchMode('register')"
          >
            Create Account
          </button>
        </div>

        <!-- Card Header Text -->
        <div class="login-card-header">
          <h2 v-if="mode === 'login'">Welcome Back</h2>
          <h2 v-else-if="mode === 'register'">Create Your Workspace</h2>
          <h2 v-else-if="mode === 'forgot'">Reset Password</h2>
          <h2 v-else-if="mode === 'reset-form'">Set New Password</h2>

          <p v-if="mode === 'login'">Enter your credentials to access your organization workspace</p>
          <p v-else-if="mode === 'register'">Set up your enterprise account; confirmation will be emailed to you</p>
          <p v-else-if="mode === 'forgot'">Enter your work email and we'll dispatch a secure reset token</p>
          <p v-else-if="mode === 'reset-form'">Enter the token received in your email and choose a new password</p>
        </div>

        <!-- Global Status Messages -->
        <div v-if="successMsg" class="login-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{{ successMsg }}</span>
        </div>

        <div v-if="errorMsg" class="login-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ errorMsg }}</span>
        </div>

        <!-- 1. SIGN IN FORM -->
        <form v-if="mode === 'login'" @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label">Work Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              class="form-control"
              placeholder="name@company.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <div class="flex items-center justify-between" style="margin-bottom: 5px">
              <label class="form-label" style="margin-bottom: 0">Password</label>
              <button 
                type="button" 
                class="link-btn" 
                @click="switchMode('forgot')"
              >
                Forgot password?
              </button>
            </div>
            <div style="position: relative">
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                placeholder="••••••••"
                required
                autocomplete="current-password"
                style="padding-right: 36px"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="pw-toggle-btn"
                :title="showPassword ? 'Hide password' : 'Show password'"
              >
                <svg v-if="!showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-full btn-lg" 
            :disabled="authStore.loading"
            style="margin-top: 14px"
          >
            <span v-if="authStore.loading" class="spinner"></span>
            <span>{{ authStore.loading ? 'Authenticating...' : 'Sign In to Workspace' }}</span>
          </button>
        </form>

        <!-- 2. CREATE ACCOUNT FORM -->
        <form v-else-if="mode === 'register'" @submit.prevent="handleRegister">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input
              v-model="registerForm.name"
              type="text"
              class="form-control"
              placeholder="e.g. John Doe"
              required
              autocomplete="name"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Work Email</label>
            <input
              v-model="registerForm.email"
              type="email"
              class="form-control"
              placeholder="john@company.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Company / Workspace Name</label>
            <input
              v-model="registerForm.company_name"
              type="text"
              class="form-control"
              placeholder="e.g. Acme Enterprise Ltd"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <div style="position: relative">
              <input
                v-model="registerForm.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                placeholder="Minimum 6 characters"
                minlength="6"
                required
                autocomplete="new-password"
                style="padding-right: 36px"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="pw-toggle-btn"
              >
                <svg v-if="!showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input
              v-model="registerForm.confirm_password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control"
              placeholder="Re-enter password"
              minlength="6"
              required
              autocomplete="new-password"
            />
          </div>

          <div class="notice-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>A confirmation email with your workspace details and username will be dispatched to your inbox.</span>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-full btn-lg" 
            :disabled="authStore.loading"
            style="margin-top: 14px"
          >
            <span v-if="authStore.loading" class="spinner"></span>
            <span>{{ authStore.loading ? 'Creating Workspace...' : 'Create Account & Workspace' }}</span>
          </button>
        </form>

        <!-- 3. FORGOT PASSWORD (REQUEST TOKEN) -->
        <form v-else-if="mode === 'forgot'" @submit.prevent="handleForgotPassword">
          <div class="form-group">
            <label class="form-label">Work Email Address</label>
            <input
              v-model="forgotForm.email"
              type="email"
              class="form-control"
              placeholder="name@company.com"
              required
              autocomplete="email"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-full btn-lg" 
            :disabled="authStore.loading"
            style="margin-top: 14px"
          >
            <span v-if="authStore.loading" class="spinner"></span>
            <span>{{ authStore.loading ? 'Dispatching Token...' : 'Send Password Reset Token' }}</span>
          </button>

          <div class="auth-switch-links">
            <button type="button" class="link-btn" @click="switchMode('reset-form')">
              Already have a token? Set new password &rarr;
            </button>
            <button type="button" class="link-btn" @click="switchMode('login')">
              &larr; Back to Sign In
            </button>
          </div>
        </form>

        <!-- 4. RESET PASSWORD (ENTER TOKEN & NEW PASSWORD) -->
        <form v-else-if="mode === 'reset-form'" @submit.prevent="handleResetPassword">
          <div class="form-group">
            <label class="form-label">Registered Email</label>
            <input
              v-model="resetForm.email"
              type="email"
              class="form-control"
              placeholder="name@company.com"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Reset Token</label>
            <input
              v-model="resetForm.token"
              type="text"
              class="form-control font-mono"
              placeholder="Paste token received in email"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">New Password</label>
            <input
              v-model="resetForm.newPassword"
              type="password"
              class="form-control"
              placeholder="Minimum 6 characters"
              minlength="6"
              required
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-full btn-lg" 
            :disabled="authStore.loading"
            style="margin-top: 14px"
          >
            <span v-if="authStore.loading" class="spinner"></span>
            <span>{{ authStore.loading ? 'Updating Password...' : 'Update Password & Return to Sign In' }}</span>
          </button>

          <div class="auth-switch-links">
            <button type="button" class="link-btn" @click="switchMode('forgot')">
              &larr; Need a new reset token?
            </button>
            <button type="button" class="link-btn" @click="switchMode('login')">
              Back to Sign In
            </button>
          </div>
        </form>

        <!-- Bottom Mode Toggle -->
        <div v-if="mode === 'login'" class="auth-footer-toggle">
          <span>New to Meridian?</span>
          <button type="button" class="auth-toggle-link" @click="switchMode('register')">Create an account</button>
        </div>
        <div v-else-if="mode === 'register'" class="auth-footer-toggle">
          <span>Already registered?</span>
          <button type="button" class="auth-toggle-link" @click="switchMode('login')">Sign in to your workspace</button>
        </div>
      </div>

      <!-- Security & Architecture Footer -->
      <div class="login-footer">
        <span class="tech-tag">Tenant Isolated</span>
        <span class="tech-tag">PostgreSQL 17</span>
        <span class="tech-tag">LangChain RAG</span>
        <span class="tech-tag ai">Local Ollama</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Modes: 'login', 'register', 'forgot', 'reset-form'
const mode = ref('login');

const showPassword = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const loginForm = ref({ email: '', password: '' });
const registerForm = ref({ name: '', email: '', company_name: '', password: '', confirm_password: '' });
const forgotForm = ref({ email: '' });
const resetForm = ref({ email: '', token: '', newPassword: '' });

const switchMode = (newMode) => {
  mode.value = newMode;
  errorMsg.value = '';
  successMsg.value = '';
};

// Handle Sign In
const handleLogin = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  const result = await authStore.login(loginForm.value.email, loginForm.value.password);
  if (result.success) {
    router.push('/');
  } else {
    errorMsg.value = result.message || 'Authentication failed. Please verify credentials.';
  }
};

// Handle Registration
const handleRegister = async () => {
  errorMsg.value = '';
  successMsg.value = '';

  if (registerForm.value.password !== registerForm.value.confirm_password) {
    errorMsg.value = 'Passwords do not match. Please verify.';
    return;
  }

  const payload = {
    name: registerForm.value.name,
    email: registerForm.value.email,
    company_name: registerForm.value.company_name,
    password: registerForm.value.password
  };

  const result = await authStore.register(payload);
  if (result.success) {
    successMsg.value = result.message || 'Account created! Credentials dispatched to your email.';
    // Redirect into the new workspace
    setTimeout(() => {
      router.push('/');
    }, 1200);
  } else {
    errorMsg.value = result.message || 'Registration failed. Please try again.';
  }
};

// Handle Request Password Reset Token
const handleForgotPassword = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  const result = await authStore.forgotPassword(forgotForm.value.email);
  if (result.success) {
    successMsg.value = result.message;
    resetForm.value.email = forgotForm.value.email;
    // Switch to step 2 after a brief delay
    setTimeout(() => {
      mode.value = 'reset-form';
    }, 1500);
  } else {
    errorMsg.value = result.message || 'Failed to dispatch reset token.';
  }
};

// Handle Reset Password with Token
const handleResetPassword = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  const result = await authStore.resetPassword({
    email: resetForm.value.email,
    token: resetForm.value.token,
    newPassword: resetForm.value.newPassword
  });

  if (result.success) {
    successMsg.value = result.message;
    loginForm.value.email = resetForm.value.email;
    setTimeout(() => {
      switchMode('login');
      successMsg.value = 'Password reset complete. Please sign in with your new password.';
    }, 1500);
  } else {
    errorMsg.value = result.message || 'Failed to update password. Please check your token.';
  }
};

onMounted(() => {
  if (route.query.resetToken) {
    mode.value = 'reset-form';
    resetForm.value.token = route.query.resetToken;
    if (route.query.email) {
      resetForm.value.email = route.query.email;
    }
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background-color: var(--bg-base);
}

.login-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 500px;
  background: radial-gradient(ellipse 65% 50% at 50% -10%, rgba(99, 102, 241, 0.16), transparent 70%);
  pointer-events: none;
}

.login-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
}

.login-logo {
  text-align: center;
  margin-bottom: 20px;
}

.login-logo-icon {
  width: 42px;
  height: 42px;
  margin: 0 auto 10px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid rgba(99, 102, 241, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.login-logo-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.login-logo-tagline {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
}

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-lg);
}

/* Auth Tabs */
.auth-tabs {
  display: flex;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px;
  margin-bottom: 20px;
}

.auth-tab {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: var(--transition);
}

.auth-tab:hover {
  color: var(--text-primary);
}

.auth-tab.active {
  background: var(--bg-card);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.login-card-header {
  margin-bottom: 18px;
}

.login-card-header h2 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.2px;
}

.login-card-header p {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.4;
}

.pw-toggle-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: var(--transition);
}

.pw-toggle-btn:hover {
  color: var(--text-primary);
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 11.5px;
  color: var(--primary-light);
  cursor: pointer;
  text-decoration: none;
  transition: var(--transition);
}

.link-btn:hover {
  text-decoration: underline;
  color: #a5b4fc;
}

.notice-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-xs);
  font-size: 11px;
  color: #a5b4fc;
  margin-top: 10px;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--danger-surface);
  border: 1px solid var(--danger-border);
  color: var(--danger);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  margin-bottom: 14px;
}

.login-success {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--success-surface);
  border: 1px solid var(--success-border);
  color: var(--success);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  margin-bottom: 14px;
}

.auth-switch-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.auth-footer-toggle {
  text-align: center;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.auth-toggle-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-light);
  cursor: pointer;
  transition: var(--transition);
}

.auth-toggle-link:hover {
  text-decoration: underline;
  color: #a5b4fc;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.tech-tag {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 500;
}

.tech-tag.ai {
  border-color: rgba(99, 102, 241, 0.25);
  color: var(--primary-light);
}
</style>
