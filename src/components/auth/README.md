# Authentication System

## Overview

The authentication system is now centralized through the `authStore` with the following key features:

- **Centralized Login Modal Control**: The login modal is controlled by the `authStore.showLoginModal` state
- **Automatic Modal Display**: When API calls detect unauthenticated users (401 errors), the login modal is automatically shown
- **No Page Redirects**: Instead of redirecting to a login page, the modal is displayed over the current page

## Usage

### Showing the Login Modal

```typescript
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

// Show the login modal
authStore.openLoginModal();

// Hide the login modal
authStore.closeLoginModal();

// Check if modal is open
console.log(authStore.showLoginModal);
```

### API Client Integration

The API client (`src/api/client.ts`) automatically:

1. **Adds Authorization Headers**: Uses `authStore.token` for authenticated requests
2. **Handles 401 Errors**: Automatically shows the login modal when authentication fails
3. **Clears Auth State**: Clears user data when authentication expires

### Example API Call

```typescript
import { request } from '@/api/client';

try {
  const response = await request.get('/protected-endpoint');
  // Handle success
} catch (error) {
  // If this is a 401 error, the login modal will automatically be shown
  // No need to manually handle authentication errors
}
```

### Components

#### Header Component
- Uses `authStore.showLoginModal` to control the modal
- Login/Register buttons call `authStore.openLoginModal()`

#### LoginModal Component
- Controlled by `authStore.showLoginModal` prop
- Automatically closes via `authStore.closeLoginModal()` on successful login
- Uses Authing Guard for authentication

## Store State

```typescript
interface AuthStore {
  // State
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  user: User | null;
  currentWorkspaceId: string | null;
  showLoginModal: boolean;  // NEW: Controls modal visibility
  token: string | null;     // NEW: Stores auth token

  // Computed
  isAuthenticated: boolean;
  userName: string;

  // Methods
  openLoginModal(): void;   // NEW: Show login modal
  closeLoginModal(): void;  // NEW: Hide login modal
  setAuthingUser(user: AuthingUser): Promise<void>;
  logout(): Promise<void>;
  clearAuthState(): void;
  handleAuthError(error: ApiError): void;
  clearError(): void;
}
```

## Benefits

1. **Better UX**: No page redirects, users stay in context
2. **Centralized Control**: All login modal logic in one place
3. **Automatic Handling**: API errors automatically trigger login modal
4. **Consistent Behavior**: Same login flow across the entire app