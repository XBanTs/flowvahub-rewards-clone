import emailjs from '@emailjs/browser';

// Initialize EmailJS with your service ID
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key');

export const sendClaimNotification = async (userEmail: string, rewardTitle: string) => {
  try {
    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id',
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id',
      {
        to_email: userEmail,
        reward_title: rewardTitle,
        message: `Congratulations! You have successfully claimed "${rewardTitle}".`,
      }
    );
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
    // Fallback: show alert
    alert(`Email notification: You claimed "${rewardTitle}"!`);
  }
};