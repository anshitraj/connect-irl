# Resend + Supabase email verification

Connect IRL uses one Supabase account/session for Google OAuth and email-code sign-in. Resend transports the verification email through Supabase's custom SMTP setting. No Resend API key belongs in the frontend or `NEXT_PUBLIC_` variables.

1. In Resend, add and verify `connectirl.xyz` (or a dedicated sending subdomain). Add the exact DNS records shown by Resend at your domain's DNS host. Use its generated SPF/DKIM records; do not guess DNS values or replace unrelated mail records.
2. Create a Resend API key for the sending domain. In Supabase Auth's Email/SMTP settings, enable custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, password the Resend API key. Choose sender name **Connect IRL** and sender address **hello@connectirl.xyz** after that sending domain is verified. This address sends verification emails; set `NEXT_PUBLIC_CONTACT_EMAIL` separately to an inbox you actually monitor.
3. Enable the Email provider in Supabase. Configure six-digit email OTPs and an appropriate expiry and rate limit. The app supports six digits, paste/autofill, errors for expired/invalid codes, changing the email address, and a 60-second resend cooldown.
4. Replace the Supabase **Magic Link** email template with `supabase/templates/magic-link.html`. Set subject to **Your Connect IRL verification code**. Supabase uses this template for `signInWithOtp`; `{{ .Token }}` supplies the code. The frontend verifies it with `verifyOtp` using type `email`. Do not remove the token placeholder or substitute a hardcoded code. The user verifies ownership by entering the code, with no password to create.
5. Set Supabase Site URL to `https://connectirl.xyz`, allow `https://connectirl.xyz/auth/callback`, and configure the corresponding Vercel environment variables. Keep development callbacks explicitly allowed only where needed. Google OAuth remains a separate primary sign-in option using the same Supabase accounts; it does not require an extra email-code step.
6. Test with a real mailbox: one correct code, one wrong code, expired/resend behavior, existing/new accounts, and returning to the root while signed in. Confirm the production email arrives through Resend and sender authentication passes.

The template and verification flow are implemented locally. DNS, Resend, Supabase SMTP, real email delivery, and hosted OAuth still need dashboard configuration and end-to-end verification.

References checked 26 October 2026: [Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp), [Supabase email OTP guide](https://supabase.com/docs/guides/auth/auth-email-passwordless).
