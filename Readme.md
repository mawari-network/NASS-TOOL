# Mawari Node Deployment Platform

A web application for deploying and managing Mawari nodes with wallet integration and license management.

## Features

- Wallet connection and management (MetaMask integration)
- License delegation and management
- Node deployment interface
- Real-time transaction monitoring
- Persistent wallet state management
- Dark mode UI with custom styling

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- MetaMask browser extension
- NPM or Yarn package manager

# Installation

## 1. Clone Repository

```bash
git clone https://github.com/Jay9997/Naas.git
cd Naas
```

## 2. Install Dependencies

```bash
npm install
# or
yarn install
```

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# DatabaseSetup
Create Database
CREATE DATABASE your_database_name;
```

## Start Development Server
```bash
npm run dev
# or
yarn dev
```


## Project Structure

```bash
├── app/
│   ├── api/           # API routes
│   ├── components/    # React components
│   └── pages/         # Page components
├── config/            # Configuration files
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── public/            # Static files
├── styles/            # CSS styles
└── types/             # TypeScript type definitions
```
