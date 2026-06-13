import emailjs from '@emailjs/browser';

// ─── EmailJS config ──────────────────────────────────────────────────────────
// 1. Sign up at https://www.emailjs.com (free tier: 200 emails/month)
// 2. Add an Email Service (Gmail works great) → copy Service ID
// 3. Create a Template with these variables:
//      {{to_email}}  {{member_name}}  {{member_email}}  {{signup_date}}
//    Copy the Template ID
// 4. Go to Account → API Keys → copy your Public Key
// 5. Replace the values below
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';

// Admin email that receives notifications
export const ADMIN_EMAIL = 'manchisrikanth73@gmail.com';

export async function sendNewMemberNotification(memberName: string, memberEmail: string) {
  if (
    EMAILJS_SERVICE_ID  === 'YOUR_SERVICE_ID' ||
    EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' ||
    EMAILJS_PUBLIC_KEY  === 'YOUR_PUBLIC_KEY'
  ) {
    console.warn('[EmailJS] Not configured — skipping email notification.');
    return;
  }

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email:    ADMIN_EMAIL,
      member_name:  memberName,
      member_email: memberEmail,
      signup_date:  new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    },
    EMAILJS_PUBLIC_KEY,
  );
}
