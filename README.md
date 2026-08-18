Barangay San Rafael Borrowing and Reservation Management System

A full-stack web application for managing barangay equipment borrowing
and facility reservations in Barangay San Rafael, Guagua, Pampanga. The
system provides resident account registration and email verification,
JWT-based authentication, password recovery, role-protected access,
equipment inventory management, and a backend borrowing workflow for
residents and administrators.

**Development status:** This project is under active development.
Authentication is connected end to end, and the backend equipment API
supports creating, reading, and partially updating inventory records.
Borrowing, reservation, reporting, resident management, announcements,
settings, profiles, equipment categories, and the frontend equipment
workflow are not yet implemented beyond routed placeholder pages.

Current Features

Implemented

Resident registration with first, optional middle, and last name,
email, and password

Email verification using a six-digit, five-minute OTP sent through
Gmail

Verification-code resend with a five-minute cooldown

Login for verified accounts with role-based redirection

Password recovery using a separate email OTP flow

Persistent client authentication using browser localStorage

Automatic Bearer token attachment to protected API requests

Automatic logout and login redirection after an API 401 response

Client- and server-side role guards for Admin and Resident routes

Responsive Admin layout with grouped navigation and logout

Equipment inventory backend with:

create equipment;

retrieve all equipment;

retrieve one equipment record;

update equipment details and inventory quantities;

delete equipment when no borrowing history exists;

backend-managed available quantity;

maintenance quantity tracking;

active/inactive equipment status.

Borrowing backend with:

resident borrowing request creation;

resident borrowing history retrieval;

Admin retrieval of all borrowing requests;

Admin approval and rejection;

required rejection reason for rejected requests;

marking approved equipment as borrowed when released;

automatic deduction of available quantity when equipment is
borrowed;

marking borrowed equipment as returned;

automatic restoration of available quantity when equipment is
returned;

actual return date tracking;

resident cancellation of their own pending requests;

status-based validation for borrowing transitions.

A fallback 404 page for unknown frontend routes

Planned or in development

Frontend equipment list and management integration

Resident borrowing request interface

Resident borrowing history interface

Admin borrowing request management interface

Admin dashboard data and metrics

Facility reservation management

Equipment category management

Resident management

Borrowing, reservation, and equipment reports

Announcements

Admin and resident profiles

Settings

Resident dashboard data and functionality

User Roles

Role                                Current access

Admin                           Protected Admin interface and
backend access for equipment
management and borrowing
administration, including approval,
rejection, release, and return
processing.

Newly registered accounts receive the resident role by default. The
current application does not provide a public UI or endpoint for
promoting a resident account to Admin.

Tech Stack

Frontend

React 19

Vite 8

React Router 7

Axios

React Icons

CSS

ESLint

Backend

Node.js with ECMAScript modules

Express 5

MongoDB and Mongoose

JSON Web Tokens (jsonwebtoken)

bcrypt

Nodemailer with Gmail transport

dotenv

CORS

Project Structure

BorrowingSystem/
├── 1frontend/
│   ├── public/                  # Static icons and favicon
│   ├── src/
│   │   ├── components/          # ProtectedRoute role/auth guard
│   │   ├── context/             # Client authentication state
│   │   ├── css/                 # Authentication, admin, and resident styles
│   │   ├── layouts/             # Responsive Admin layout
│   │   ├── pages/
│   │   │   ├── admin/           # Admin routes; mostly placeholder pages
│   │   │   ├── auth/            # Registration, OTP, login, and recovery
│   │   │   └── resident/        # Placeholder Resident dashboard
│   │   ├── routes/              # Application route definitions
│   │   ├── services/            # Axios client and auth storage helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                     # Local frontend configuration; not committed
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/                  # Environment, database, and mail setup
│   ├── controllers/             # Authentication and equipment handlers
│   ├── middleware/              # JWT authentication and role authorization
│   ├── models/                  # User, OTP, and Equipment schemas
│   ├── routes/                  # Authentication and equipment routes
│   ├── services/                # Email delivery service
│   ├── utils/                   # OTP generator
│   ├── .env                     # Local backend configuration; not committed
│   ├── app.js                   # Express application configuration
│   ├── server.js                # Database connection and HTTP server startup
│   └── package.json
└── README.md

Authentication and Authorization Flow

Registration and verification

1. A resident submits the registration form to
POST /api/auth/register. 2. The server creates an unverified account.
Passwords are hashed before they are stored. 3. A six-digit verification
OTP is stored with a five-minute expiry and emailed to the resident. 4.
The resident submits the code to POST /api/auth/register/verify. 5. A
valid code marks the account as verified and is deleted. Only verified
accounts may log in.

The registration endpoint also supports resending a verification code
for an existing unverified account. Resends are limited by a five-minute
cooldown.

Login and protected requests

1. The user submits their email and password to POST /api/auth/login.
2. The backend checks the bcrypt password hash and verifies that the
account is email-verified. 3. A successful login returns a JWT that
expires after seven days, plus limited user profile data. 4. The
frontend stores the token and user object in localStorage and routes
the user according to their admin or resident role. 5. Axios adds
Authorization: Bearer <token> to subsequent API requests. 6. Backend
authentication middleware verifies the JWT and reloads the user from
MongoDB. Role middleware additionally restricts Admin-only endpoints.

Frontend route protection improves navigation behavior, but backend
middleware is the authoritative access control for protected API
operations.

Password recovery

1. POST /api/auth/forgot-password creates and emails a five-minute
password-reset OTP for an existing account. 2.
POST /api/auth/reset-password validates the email, OTP, new password,
and confirmation. 3. The new password is hashed by the User model before
saving, and the used OTP is deleted.

API Overview

The backend mounts all routes below /api. Request and response bodies
use JSON.

Authentication endpoints

Method            Endpoint                      Access            Purpose

POST            /api/auth/register          Public            Register a resident
or resend
verification for an
unverified email.

POST            /api/auth/register/verify   Public            Verify a
registration using
email and otp.

POST            /api/auth/login             Public            Authenticate a
verified account and
return a JWT and
user data.

POST            /api/auth/forgot-password   Public            Send a
password-reset OTP
to an existing
email.

Equipment endpoints

Method            Endpoint               Access            Purpose

POST            /api/equipment       Admin             Create equipment.
Accepts
equipmentName,
category,
totalQuantity, and
optional
description,
status, and
image. New
equipment starts with
zero units under
maintenance, so
availableQuantity
initially equals
totalQuantity.

GET             /api/equipment       Authenticated     Return all equipment
records.

GET             /api/equipment/:id   Authenticated     Return one equipment
record by MongoDB
document ID.

PATCH           /api/equipment/:id   Admin             Partially update
equipment details,
its
active/inactive
status, total
quantity, or
maintenance quantity.
The backend
recalculates
availability.

For protected endpoints, send the login token as a Bearer token:

Authorization: Bearer YOUR_JWT_TOKEN

availableQuantity is backend-managed and cannot be submitted directly
during equipment create or update operations. With borrowing
implemented, inventory follows this rule:

availableQuantity = totalQuantity - maintenanceQuantity - currentlyBorrowedQuantity

maintenanceQuantity represents units temporarily unavailable because
of maintenance. currentlyBorrowedQuantity is derived from borrowing
records whose status is borrowed. When equipment is released to a
resident, the borrowing controller deducts the borrowed quantity from
availableQuantity. When the equipment is returned, the quantity is
added back.

An active equipment record may be requested when units are available,
while inactive disables new borrowing for that equipment.

Borrowing workflow

The backend borrowing lifecycle is:

pending
├── approved → borrowed → returned
├── rejected
└── cancelled

Residents create borrowing requests and can view their own records.

Admins can view all borrowing requests.

Only pending requests can be approved or rejected.

Rejected requests require a rejection reason.

Only approved requests can be marked as borrowed.

Only borrowed requests can be marked as returned.

Residents can cancel only their own pending requests.

actualReturnDate is recorded when an item is returned.

Equipment availability is adjusted only when equipment is actually
released (borrowed) or returned.

Facility reservation endpoints are not yet implemented.

Installation and Setup

Prerequisites

A current Node.js release compatible with Vite 8 and Express 5

npm

MongoDB, either locally or through a hosted provider

A Gmail account configured for SMTP authentication (an app password
is recommended)

1. Clone the repository

git **clone** **<repository-ur**l**>**
**cd** **BorrowingSystem**

2. Configure and run the backend

**cd** **backend**
npm **install**

Create backend/.env with the variables described in [Environment
Variables](#environment-variables), then start the development
server:

npm **run** **dev**

For a normal Node.js start:

npm **start**

Unless PORT is changed, the backend runs at http://localhost:5000
and the API base path is http://localhost:5000/api.

3. Configure and run the frontend

Open another terminal from the repository root:

**cd** **1frontend**
npm **install**

Create 1frontend/.env with the frontend variable described below, then
run:

npm **run** **dev**

Open the local URL printed by Vite. The frontend also provides these
scripts:

npm **run** **build**
npm **run** **lint**
npm **run** **preview**

Environment Variables

Do not commit .env files or real credentials. Both project folders
already ignore their local .env files.

backend/.env

Variable                Required                Description

MONGO_URI             Yes                     MongoDB connection
string.

JWT_SECRET            Yes                     Strong, private signing
secret for JWTs.

EMAIL_USER            Yes                     Gmail address used to
send OTP messages.

EMAIL_PASS            Yes                     Gmail app password or
SMTP credential; do not
use or commit an
account password.

Safe template:

MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<a-long-random-secret>
EMAIL_USER=<your-sender-email-address>
EMAIL_PASS=<your-gmail-app-password>
PORT=5000

1frontend/.env

Variable                Required                Description

VITE_API_URL          Yes                     Backend API base URL,
including /api. For local
development this is normally
http://localhost:5000/api.

Safe template:

VITE_API_URL=http://localhost:5000/api

Only variables prefixed with VITE_ are exposed to frontend code. Never
place secrets in a frontend environment variable.

Security Practices Currently Implemented

Passwords are hashed with bcrypt using a cost factor of 10 and are
excluded from normal Mongoose query results.

Authentication uses signed JWTs with a seven-day expiry.

Protected endpoints require a Bearer token and verify both the token
and the referenced user account.

Equipment creation, update, and deletion operations are restricted
to Admin users.

Borrowing administration actions such as approval, rejection,
release, and return processing are restricted to Admin users.

Resident borrowing actions are protected by authentication and
ownership/status checks.

New accounts cannot log in until their email is verified.

Registration and password-reset OTPs expire after five minutes, are
separated by purpose, and are deleted after successful use.

OTP resend requests have a five-minute cooldown.

Mongoose schemas validate required fields, supported roles and
equipment statuses, minimum quantities, email format, and Philippine
phone-number format.

The equipment controller validates that quantity is a non-negative
whole number.

Client forms perform basic required-field, password-length,
password-confirmation, and six-digit OTP checks; the backend repeats
critical checks.

Local .env files and dependency folders are ignored by Git in both
applications.

Current security limitations

This is a development-stage application. Before production deployment,
consider adding request rate limiting and brute-force protection, a
restrictive CORS allowlist, HTTP security headers, centralized input
validation/sanitization, secure server-managed token storage or hardened
cookie handling, stronger password rules, hashed OTP storage, generic
password-recovery responses to reduce account enumeration, audit
logging, and automated security tests.

Development Status

Authentication, equipment inventory management, and the core borrowing
backend are implemented. The current development focus is connecting the
React frontend to the equipment and borrowing APIs.

The borrowing backend supports the complete basic lifecycle from a
resident submitting a request through Admin approval/rejection,
equipment release, return processing, and resident cancellation of
pending requests. Equipment availability is synchronized with actual
borrowed and returned quantities.

Facility reservations and the remaining management modules---reports,
residents, announcements, categories, profiles, and settings---are still
under development.

Because the project does not currently include automated tests, changes
should be verified manually and with the frontend lint/build commands
until a test suite is added.