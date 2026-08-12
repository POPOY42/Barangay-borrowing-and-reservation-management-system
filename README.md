# Barangay San Rafael Borrowing and Reservation Management System

A full-stack web application for managing barangay equipment borrowing and reservations in Barangay San Rafael, Guagua, Pampanga. The project currently provides resident account registration and verification, JWT-based login, password recovery, role-protected dashboards, and a protected equipment inventory API.

> **Development status:** This project is under active development. Authentication is connected end to end, and the backend equipment API supports creating, reading, and partially updating inventory records. Borrowing, reservation, reporting, resident management, announcements, settings, profiles, equipment categories, and the frontend equipment workflow are not yet implemented beyond routed placeholder pages.

## Current Features

### Implemented

- Resident registration with first, optional middle, and last name, email, and password
- Email verification using a six-digit, five-minute OTP sent through Gmail
- Verification-code resend with a five-minute cooldown
- Login for verified accounts with role-based redirection
- Password recovery using a separate email OTP flow
- Persistent client authentication using browser `localStorage`
- Automatic Bearer token attachment to API requests
- Automatic logout and login redirection after an API `401` response
- Client- and server-side role guards for Admin and Resident routes
- Responsive Admin layout with grouped navigation and logout
- Equipment data model and authenticated API operations to:
  - create equipment as an Admin;
  - update equipment details and inventory quantities as an Admin;
  - list equipment as any authenticated user; and
  - retrieve one equipment record as any authenticated user.
- A fallback 404 page for unknown frontend routes

### Planned or in development

The following routes and navigation entries exist, but their pages currently contain placeholder content only:

- Admin dashboard data and metrics
- Borrowing request management and borrowing history
- Reservation management
- Equipment list and equipment creation UI
- Equipment category management
- Resident management
- Borrowing, reservation, and equipment reports
- Announcements
- Admin profile and settings
- Resident dashboard functionality

No borrowing or reservation models, controllers, or API endpoints are currently present.

## User Roles

| Role | Current access |
| --- | --- |
| **Admin** | Admin dashboard shell and navigation; permission to create and update equipment; permission to read all equipment or one equipment record. Admin feature pages other than the layout are placeholders. |
| **Resident** | Resident dashboard route and permission to read equipment through the API. The resident dashboard and borrowing/reservation workflows are not yet implemented. |

Newly registered accounts receive the `resident` role by default. The current application does not provide a UI or API endpoint for creating or promoting an Admin account.

## Tech Stack

### Frontend

- React 19
- Vite 8
- React Router 7
- Axios
- React Icons
- CSS
- ESLint

### Backend

- Node.js with ECMAScript modules
- Express 5
- MongoDB and Mongoose
- JSON Web Tokens (`jsonwebtoken`)
- bcrypt
- Nodemailer with Gmail transport
- dotenv
- CORS

## Project Structure

```text
BorrowingSystem/
├── 1frontend/
│   ├── public/                  # Static icons and favicon
│   ├── src/
│   │   ├── components/          # ProtectedRoute role/auth guard
│   │   ├── context/             # Client authentication state
│   │   ├── css/                 # Authentication, admin, and resident styles
│   │   ├── layouts/             # Responsive Admin layout
│   │   ├── pages/
│   │   │   ├── admin/           # Admin routes; mostly placeholder pages
│   │   │   ├── auth/            # Registration, OTP, login, and recovery
│   │   │   └── resident/        # Placeholder Resident dashboard
│   │   ├── routes/              # Application route definitions
│   │   ├── services/            # Axios client and auth storage helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                     # Local frontend configuration; not committed
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/                  # Environment, database, and mail setup
│   ├── controllers/             # Authentication and equipment handlers
│   ├── middleware/              # JWT authentication and role authorization
│   ├── models/                  # User, OTP, and Equipment schemas
│   ├── routes/                  # Authentication and equipment routes
│   ├── services/                # Email delivery service
│   ├── utils/                   # OTP generator
│   ├── .env                     # Local backend configuration; not committed
│   ├── app.js                   # Express application configuration
│   ├── server.js                # Database connection and HTTP server startup
│   └── package.json
└── README.md
```

## Authentication and Authorization Flow

### Registration and verification

1. A resident submits the registration form to `POST /api/auth/register`.
2. The server creates an unverified account. Passwords are hashed before they are stored.
3. A six-digit verification OTP is stored with a five-minute expiry and emailed to the resident.
4. The resident submits the code to `POST /api/auth/register/verify`.
5. A valid code marks the account as verified and is deleted. Only verified accounts may log in.

The registration endpoint also supports resending a verification code for an existing unverified account. Resends are limited by a five-minute cooldown.

### Login and protected requests

1. The user submits their email and password to `POST /api/auth/login`.
2. The backend checks the bcrypt password hash and verifies that the account is email-verified.
3. A successful login returns a JWT that expires after seven days, plus limited user profile data.
4. The frontend stores the token and user object in `localStorage` and routes the user according to their `admin` or `resident` role.
5. Axios adds `Authorization: Bearer <token>` to subsequent API requests.
6. Backend authentication middleware verifies the JWT and reloads the user from MongoDB. Role middleware additionally restricts Admin-only endpoints.

Frontend route protection improves navigation behavior, but backend middleware is the authoritative access control for protected API operations.

### Password recovery

1. `POST /api/auth/forgot-password` creates and emails a five-minute password-reset OTP for an existing account.
2. `POST /api/auth/reset-password` validates the email, OTP, new password, and confirmation.
3. The new password is hashed by the User model before saving, and the used OTP is deleted.

## API Overview

The backend mounts all routes below `/api`. Request and response bodies use JSON.

### Authentication endpoints

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a resident or resend verification for an unverified email. |
| `POST` | `/api/auth/register/verify` | Public | Verify a registration using `email` and `otp`. |
| `POST` | `/api/auth/login` | Public | Authenticate a verified account and return a JWT and user data. |
| `POST` | `/api/auth/forgot-password` | Public | Send a password-reset OTP to an existing email. |
| `POST` | `/api/auth/reset-password` | Public | Reset a password using `email`, `otp`, `password`, and `confirmPassword`. |

### Equipment endpoints

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/equipment` | Admin | Create equipment. Accepts `equipmentName`, `category`, `totalQuantity`, and optional `description`, `status`, and `image`. New equipment starts with zero units under maintenance, so `availableQuantity` initially equals `totalQuantity`. |
| `GET` | `/api/equipment` | Authenticated | Return all equipment records. |
| `GET` | `/api/equipment/:id` | Authenticated | Return one equipment record by MongoDB document ID. |
| `PATCH` | `/api/equipment/:id` | Admin | Partially update equipment details, its `active`/`inactive` status, total quantity, or maintenance quantity. The backend recalculates availability. |

For protected endpoints, send the login token as a Bearer token:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

`availableQuantity` is backend-managed and cannot be submitted during create or update operations. At the current development stage, inventory follows this rule:

```text
availableQuantity = totalQuantity - maintenanceQuantity
```

`maintenanceQuantity` is the number of units under maintenance. An `active` equipment record may be borrowed when units are available; `inactive` disables borrowing for the entire equipment record. Borrowed quantity is not stored in the Equipment document because borrowing functionality has not been implemented.

There is currently no delete equipment endpoint and no borrowing or reservation endpoints.

## Installation and Setup

### Prerequisites

- A current Node.js release compatible with Vite 8 and Express 5
- npm
- MongoDB, either locally or through a hosted provider
- A Gmail account configured for SMTP authentication (an app password is recommended)

### 1. Clone the repository

```bash
git clone <repository-url>
cd BorrowingSystem
```

### 2. Configure and run the backend

```bash
cd backend
npm install
```

Create `backend/.env` with the variables described in [Environment Variables](#environment-variables), then start the development server:

```bash
npm run dev
```

For a normal Node.js start:

```bash
npm start
```

Unless `PORT` is changed, the backend runs at `http://localhost:5000` and the API base path is `http://localhost:5000/api`.

### 3. Configure and run the frontend

Open another terminal from the repository root:

```bash
cd 1frontend
npm install
```

Create `1frontend/.env` with the frontend variable described below, then run:

```bash
npm run dev
```

Open the local URL printed by Vite. The frontend also provides these scripts:

```bash
npm run build
npm run lint
npm run preview
```

## Environment Variables

Do not commit `.env` files or real credentials. Both project folders already ignore their local `.env` files.

### `backend/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Strong, private signing secret for JWTs. |
| `EMAIL_USER` | Yes | Gmail address used to send OTP messages. |
| `EMAIL_PASS` | Yes | Gmail app password or SMTP credential; do not use or commit an account password. |
| `PORT` | No | Backend port. Defaults to `5000`. |

Safe template:

```dotenv
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<a-long-random-secret>
EMAIL_USER=<your-sender-email-address>
EMAIL_PASS=<your-gmail-app-password>
PORT=5000
```

### `1frontend/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend API base URL, including `/api`. For local development this is normally `http://localhost:5000/api`. |

Safe template:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Only variables prefixed with `VITE_` are exposed to frontend code. Never place secrets in a frontend environment variable.

## Security Practices Currently Implemented

- Passwords are hashed with bcrypt using a cost factor of 10 and are excluded from normal Mongoose query results.
- Authentication uses signed JWTs with a seven-day expiry.
- Protected endpoints require a Bearer token and verify both the token and the referenced user account.
- Equipment creation is restricted to users whose current database role is `admin`.
- New accounts cannot log in until their email is verified.
- Registration and password-reset OTPs expire after five minutes, are separated by purpose, and are deleted after successful use.
- OTP resend requests have a five-minute cooldown.
- Mongoose schemas validate required fields, supported roles and equipment statuses, minimum quantities, email format, and Philippine phone-number format.
- The equipment controller validates that quantity is a non-negative whole number.
- Client forms perform basic required-field, password-length, password-confirmation, and six-digit OTP checks; the backend repeats critical checks.
- Local `.env` files and dependency folders are ignored by Git in both applications.

### Current security limitations

This is a development-stage application. Before production deployment, consider adding request rate limiting and brute-force protection, a restrictive CORS allowlist, HTTP security headers, centralized input validation/sanitization, secure server-managed token storage or hardened cookie handling, stronger password rules, hashed OTP storage, generic password-recovery responses to reduce account enumeration, audit logging, and automated security tests.

## Development Status

The authentication lifecycle is the most complete area of the application. The API has an initial equipment inventory implementation, while the frontend currently exposes only placeholder equipment pages. Admin navigation has been designed for the intended modules, but borrowing, reservations, reports, residents, announcements, categories, profiles, and settings still require data models, API handlers, and connected user interfaces.

Because the project does not currently include automated tests, changes should be verified manually and with the frontend lint/build commands until a test suite is added.
