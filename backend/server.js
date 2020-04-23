const {account_sid, auth_token, from_number, port, private_key} = require("./config.json");

const rsa = require("node-jsencrypt");

const key = new rsa();
key.setPrivateKey(private_key);

const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

const client = require('twilio')(account_sid, auth_token);
const request = require('request');


function generateTransactionID(length=32, chars='0123456789abcdefghijklmnopqrstuvwxyz') {
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return "NPC" + result;
}

function base64(data) {
  let buff = new Buffer(data);
  return buff.toString('base64');
}

function decrypt(encrypted) {
  let result = ""
  let arr = encrypted.split(" ");
  for(let idx in arr)
    result += key.decrypt(arr[idx], 'utf8')
  return result;
}

async function getToken() {
  const options = {
    'method': 'POST',
    'url': 'https://api.infinit.co.in/usrmgt/generateToken',
    'headers': {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({"owner":"NPCI/alphadose","grantType":"password refresh_token"})
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response) => { 
      if (error) reject(error);
      resolve(JSON.parse(response.body)["access_token"]);
    });
  });
}

async function UPIPay({
  payer_address,
  acc_type,
  acc_number,
  ifsc_code,
  pin,
  amount,
  recipient_address
}) {
  const token = await getToken();
  const transaction_id = generateTransactionID();
  const msg_id = generateTransactionID();
  const base64_encoded_pin = base64(pin);

  const options = {
    'method': 'POST',
    'url': `https://api.infinit.co.in/upi/2.0/ReqPay/2.0/urn:txnid:${transaction_id}`,
    'headers': {
      'Content-Type': 'application/xml',
      'Authorization': `Bearer ${token}`
    },
    body: `<upi:ReqPay xmlns:upi="http://npci.org/upi/schema/">
        <Head ver="2.0" ts="2018-02-17T13:39:54.939+05:30" orgId="112233" msgId="${msg_id}"/>
        <Txn id="${transaction_id}" note="smspay" custRef="804813039157" refId="804813039157" refUrl="http://axis.com/upi" ts="2018-02-17T13:39:54.944+05:30" type="PAY" initiationMode="00" purpose="00"/>
        <Payer addr="${payer_address}" name="AS" seqNum="1" type="ENTITY" code="0000">
            <Info>
                <Identity id="058010100083492" type="ACCOUNT" verifiedName="AS"/>
                <Rating VerifiedAddress="TRUE"/>
            </Info>
            <Device>
                <Tag name="MOBILE" value="919438440614"/>
                <Tag name="GEOCODE" value="34.7273,74.8278"/>
                <Tag name="LOCATION" value="pune"/>
                <Tag name="IP" value="192.68.0.12"/>
                <Tag name="TYPE" value="MOB"/>
                <Tag name="ID" value="3356"/>
                <Tag name="OS" value="ios"/>
                <Tag name="APP" value="10000629091"/>
                <Tag name="CAPABILITY" value="1234556789"/>
            </Device>
            <Ac addrType="ACCOUNT">
                <Detail name="ACTYPE" value="${acc_type}"/>
                <Detail name="ACNUM" value="${acc_number}"/>
                <Detail name="IFSC" value="${ifsc_code}"/>
            </Ac>
            <Creds>
                <Cred type="PIN" subType="MPIN">
                    <Data code="NPCI" ki="20150822">
                        ${base64_encoded_pin}                    
                    </Data>
                </Cred>
            </Creds>
            <Amount value="${amount}" curr="INR">
                <Split name="PURCHASE" value="1"/>
            </Amount>
        </Payer>
        <Payees>
            <Payee addr="${recipient_address}" name="AS" seqNum="1" type="PERSON" code="4000">
                <Device>
                    <Tag name="MOBILE" value="919438440614"/>
                    <Tag name="GEOCODE" value="34.7273,74.8278"/>
                    <Tag name="LOCATION" value="pune"/>
                    <Tag name="IP" value="192.68.0.12"/>
                    <Tag name="TYPE" value="MOB"/>
                    <Tag name="ID" value="3356"/>
                    <Tag name="OS" value="ios"/>
                    <Tag name="APP" value="10000629091"/>
                    <Tag name="CAPABILITY" value="1234556789"/>
                </Device>
                <Amount value="${amount}" curr="INR">
                    <Split name="PURCHASE" value="1"/>
                </Amount>
            </Payee>
        </Payees>
    </upi:ReqPay>`
  };
  
  return new Promise((resolve, reject) => {
    request(options, (error, response) => { 
      if (error) reject(error);
      console.log(response.body)
      resolve(response.body);
    });
  });
}

// UPIPay({
//   payer_address: "anish.mukherjee1996@oksbi",
//   acc_type: "CURRENT",
//   acc_number: 30617312009,
//   ifsc_code: "SBIN0006621",
//   pin: 69911,
//   amount: 1000,
//   recipient_address: "anish.mukherjee1996@oksbi"
// });

async function sendSMS(body, to_number='+918249009191') {
  client.messages
    .create({
       body: body,
       from: from_number,
       to: to_number
     })
    .then(message => console.log(message.sid));
}

const sampleResp = {
    ToCountry: 'US',
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
    ApiVersion: '2010-04-01' 
};

app.post('/sms', async (req, res) => {
  const twiml = new MessagingResponse();
  
  console.log(req.body); // output in sampleResp, Can be used as JSON like req.body.Body

  let body = JSON.parse(decrypt(req.body.Body));

  let response = await UPIPay({
       payer_address: body.payer_address,
       acc_type: body.account_type,
       acc_number: body.account_number,
       ifsc_code: body.ifsc_code,
       pin: body.pin,
       amount: body.amount,
       recipient_address: body.recipient_address
  });

  if(body.recipient_phone) sendSMS(`
Your account ${body.recipient_address} has been credited by Rs ${body.amount} from source ${body.payer_address}

XML response from NPCI API:-

${response}

`, body.recipient_phone)

  const message = twiml.message();

  message.body(`
Successfully delivered Rs ${body.amount} from ${body.payer_address} to ${body.recipient_address}

XML response from NPCI API:-

${response}

`);

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.listen(port, () => console.log(`Listening on port ${port}!`))
