const axios = require('axios');

const sendWhatsApp = async ({ to, message, templateName, templateParams = [] }) => {
  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';

  if (provider === 'twilio') {
    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
    });
  } else if (provider === 'meta') {
    // Meta WhatsApp Cloud API
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.META_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'template',
        template: {
          name: templateName || 'notification',
          language: { code: 'en' },
          components: templateParams.length ? [{
            type: 'body',
            parameters: templateParams.map(p => ({ type: 'text', text: p })),
          }] : [],
        },
      },
      { headers: { Authorization: `Bearer ${process.env.META_WA_TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } else if (provider === 'gupshup') {
    await axios.post('https://api.gupshup.io/sm/api/v1/msg', {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_SOURCE,
      destination: to,
      message: JSON.stringify({ type: 'text', text: message }),
      'src.name': process.env.GUPSHUP_APP_NAME,
    }, { headers: { apikey: process.env.GUPSHUP_API_KEY } });
  }
};

module.exports = { sendWhatsApp };
