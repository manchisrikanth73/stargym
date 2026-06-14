import emailjs from '@emailjs/browser';
import { withRetry } from '../utils/retry';

const EMAILJS_SERVICE_ID  = 'service_dev3sz3';
const EMAILJS_TEMPLATE_ID = 'template_13ikyn4';
const EMAILJS_PUBLIC_KEY  = '4FwDMW4Cfr04zOO2R';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

export const ADMIN_EMAIL = 'manchisrikanth73@gmail.com';

export async function sendNewMemberNotification(memberName: string, memberEmail: string) {
  return withRetry('sendNewMemberNotification', () =>
    emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email:     ADMIN_EMAIL,
        member_name:  memberName,
        member_email: memberEmail,
        signup_date:  new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      },
    )
  );
}
