const axios = require('axios');

const sendSMS = async ({ to, message }) => {
  const provider = process.env.SMS_PROVIDER || 'msg91';

  if (provider === 'msg91') {
    await axios.post('https://api.msg91.com/api/v5/flow/', {
      template_id: process.env.MSG91_TEMPLATE_ID,
      short_url: '0',
      mobiles: to.replace('+', ''),
      VAR1: message,
    }, {
      headers: { authkey: process.env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
    });
  } else if (provider === 'twilio') {
    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    await twilio.messages.create({ body: message, from: process.env.TWILIO_FROM, to });
  } else if (provider === 'fast2sms') {
    await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q', message, language: 'english', flash: 0, numbers: to,
    }, { headers: { authorization: process.env.FAST2SMS_KEY } });
  }
};

module.exports = { sendSMS };
