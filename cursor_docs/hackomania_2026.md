# Hackomania 2026 & Open Payments Reference

This document serves as a quick reference for Hackomania 2026 and the Open Payments resources required for the CommUnity project.

## Hackomania 2026 Details
- **Main Information Path**: [Hackomania 2026 Notion](https://interledger.notion.site/hackomania-2026-1a0670d8a59480838166c7f8c09d5718)
- **Primary Goal**: Leveraging Interledger Protocol (ILP) and Open Payments for financial inclusion and community empowerment.

---

## Open Payments Resources

### Documentation & Learning
- **API Reference**: [openpayments.dev](http://openpayments.dev/)
- **Video Tutorials**: [Open Payments YouTube Playlist](https://youtube.com/playlist?list=PLDHju0onYcAJakrsF-I7LK_0phEqurn46)

### Testing Infrastructure
- **Test Wallet**: [https://wallet.interledger-test.dev](https://wallet.interledger-test.dev/auth/login?callbackUrl=%2F)
  - *Purpose*: Create test accounts and payment pointers for development.
- **Test Boutique (Example App)**: [https://boutique.interledger-test.dev](https://boutique.interledger-test.dev/products)
  - *Purpose*: Reference implementation showing how Open Payments works in a real-world checkout flow.

---

## Integration Notes for CommUnity
- Use the **Test Wallet** to generate `$ilp.rafiki.money/...` payment pointers for the "Brooklyn Heights Circle" and test member accounts.
- Reference the **Test Boutique** source code (if available) or network traffic to see the `grant` and `outgoing-payment` flow in action.
