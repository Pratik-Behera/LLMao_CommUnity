# CommUnity - React Native Rapid Prototype Plan

## Overview
CommUnity is a community-driven emergency fund platform. For this rapid prototype, we are migrating the HTML/Tailwind templates into a **React Native (Expo)** application to evaluate the user experience on mobile devices.

To speed up development and focus on the UI/UX flow, the backend logic for **Triggers, Distribution, and Payments** will be decoupled into isolated, mocked service modules. These can be swapped out for real Open Payments APIs and server endpoints later.

## Core Architecture
- **Frontend Stack**: React Native, Expo, NativeWind (for Tailwind-like styling).
- **Navigation**: Expo Router (or React Navigation) for handling flows:
  - Login / Onboarding
  - Main Dashboard (Member / Admin views)
  - Circles List
  - Contribution Flow
  - Wallet Connection (Open Payments Input)
  - User Profile
- **State Management**: React Context or Zustand for holding dummy users, mock wallets, and mock fund states.

## Decoupled Engines (Mock Modules)
We will build three core mock services inside a `services/` or `engines/` directory:

1. **Payment Engine (Mock)**
   - Simulates Open Payments interactions using test wallets.
   - Provides functions like `generateQuote()`, `authorizePayment()`, and `getWalletBalance()`.
   - Hardcoded to return success for "S$10" contributions and deduct from a dummy user's balance.

2. **Trigger Engine (Mock)**
   - Simulates external disaster triggers (e.g. NEA weather alerts) or Admin manual triggers.
   - Provides function `simulateDisasterEvent(type, zone)` which generates a mock alert payload.

3. **Distribution Engine (Mock)**
   - Acts on payloads from the Trigger Engine.
   - Calculates the split (70% Community, 20% Reserve, 10% Admin).
   - Simulates looping through affected users in a zone and calls the Payment Engine to "disburse" funds.

## Rapid Prototyping Phases
1. **Phase 1: Project Scaffolding**
   - Initialize Expo project (`npx create-expo-app`).
   - Setup NativeWind and base styles.
   - Create the navigation structure (Tabs & Stacks).
2. **Phase 2: UI Implementation**
   - Translate HTML templates (Dashboard, Admin, Profile, Circles, Contribute, Login) into React Native components.
   - **[NEW] Wallet Connection Screen**: Build a simple React Native screen containing a text input field for the `Payment Pointer` (e.g., `$wallet.example.com/user`) and a "Connect Wallet & Pay" CTA. This screen appears after the user clicks "Pay Now" on the Contribute page.
   - Create reusable sub-components (Cards, Buttons, Avatars).
3. **Phase 3: Mock Engines & State**
   - Build the `PaymentEngine`, `TriggerEngine`, and `DistributionEngine` with hardcoded dummy data.
   - Create a dummy user context.
4. **Phase 4: Wiring and Testing**
   - Connect the screens to the Mock Engines.
   - Run end-to-end user flows on iOS/Android simulators to ensure smooth transitions and state updates.
