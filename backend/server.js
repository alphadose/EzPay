const {account_sid, auth_token, from_number, port} = require("./config.json");

const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

const client = require('twilio')(account_sid, auth_token);

const sampleResp = `{ ToCountry: 'US',
ToState: 'MD',
SmsMessageSid: 'SM6914236ab02a297748253565d73af560',
NumMedia: '0',
ToCity: 'LINTHICUM HEIGHTS',
FromZip: '',
SmsSid: 'SM6914236ab02a297748253565d73af560',
FromState: 'Dakshin Kanada (Mangalore)',
SmsStatus: 'received',
FromCity: 'Mangalore',
Body: 'Test',
FromCountry: 'IN',
To: '+14109819498',
ToZip: '21090',
NumSegments: '1',
MessageSid: 'SM6914236ab02a297748253565d73af560',
AccountSid: 'AC073d4e011e126d45a8274152ded5cd1f',
From: '+918249009191',
ApiVersion: '2010-04-01' }`;

app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();
  
  console.log(req.body); // output in sampleResp, Can be used as JSON like req.body.Body

  const message = twiml.message();
  message.body('Meow > Nyan');
  message.media('https://farm8.staticflickr.com/7090/6941316406_80b4d6d50e_z_d.jpg');

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

function sendSMS(body) {
client.messages
  .create({
     body: body,
     from: from_number,
     to: '+918249009191'
   })
  .then(message => console.log(message.sid));
}

// sendSMS("Meow again?");

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
