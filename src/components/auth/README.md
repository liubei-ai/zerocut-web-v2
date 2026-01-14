# Authentication Setup

This authentication system uses Authing Guard for user login/registration.

## Configuration

1. Add your Authing App ID to the environment files:
   - `.env` - Production
   - `.env.development` - Development

```env
VITE_AUTHING_APP_ID=your_authing_app_id_here
```

2. The auth store (`src/stores/authStore.ts`) handles:
   - User authentication state
   - Login/logout operations
   - User profile syncing with backend
   - Persistent storage (localStorage)

## Usage

The Header component automatically shows:
- Login/Register buttons when user is not authenticated
- User menu with logout option when authenticated

## API Endpoints

The following endpoints are expected on the backend:

- `POST /auth/sync` - Sync user profile from Authing
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Validate token and get current user

## Components

- `LoginModal.vue` - Modal dialog with Authing Guard
- `Header.vue` - Main header with login/user menu
- `authStore.ts` - Pinia store for auth state management
