require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const fetch = require("node-fetch");
const sgMail = require("@sendgrid/mail");
const sgClient = require('@sendgrid/client');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

const getSchools = async () => {
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/1R8R4Y9mlxURvyXY4xml_1LUddAtiWUI-fGF5aZV_nWM/values/API!C3:D?key=AIzaSyA-pLbYH5fK9S3b2nmnog6fc1XkSY-eG6M";
  const response = await fetch(url, { method: "GET" });
  const data = await response.json();
  const schools = {};
  data.values.forEach((val) => {
    if (val[0] !== "gmail.com" && val[1] > 1) {
      schools[val[0]] = val[1];
    }
  });
  return schools;
};

const contacts = [];
fs.createReadStream("responses.csv")
  .pipe(csv())
  .on("data", (data) => contacts.push(data))
  .on("end", async () => {
    const schools = await getSchools();

    console.log("original contacts", contacts.length)
    const uniqueEmails = new Set(
      contacts.filter((c) => c.Timestamp).map((c) => c["University Email"])
    );
    let uniqueContacts = Array.from(uniqueEmails).map((email) =>
      contacts.find((c) => c["University Email"] === email)
    );
    console.log("unique contacts", uniqueContacts.length)

    let [response, bounces] = await sgClient.request({
      method: 'GET',
      url: '/v3/suppression/bounces'
    });
    bounces = bounces.map(c => c.email);
    uniqueContacts = uniqueContacts.filter(c => !bounces.includes(c["University Email"]))
    console.log("remove bounces", uniqueContacts.length)

    //uniqueContacts = uniqueContacts.filter(c => c["Role"] === 'Audience');
    //console.log("audience only", uniqueContacts.length)

    const wedointhis = false;
    if (wedointhis) {
      uniqueContacts.forEach((contact) => {
        const onlySignup = !schools.hasOwnProperty(contact["Email Domain"]);
        const oneOtherSignup =
          !onlySignup && schools[contact["Email Domain"]] == 2;
        const emailData = {
          firstName: contact["First Name"],
          /*role: contact["Role"],
          numFromSchool: schools[contact["Email Domain"]] - 1,
          onlySignup,
          oneOtherSignup,*/
        };

        const msg = {
          to: contact["University Email"],
          from: "Quaranteen University <admissions@quaranteen.university>",
          templateId: "d-d36e0bf5a61c4187a4e189adde9e4c66",
          dynamic_template_data: emailData,
        };

        
        sgMail
          .send(msg)
          .then((res) => {
            console.log(`${contact["University Email"]}: Success!`, emailData);
          })
          .catch((error) => {
            console.error(
              `${contact["University Email"]}: Failure!`,
              emailData,
              error
            );

            if (error.response) {
              console.error(error.response.body);
            }
          });
      });
    } else {
      console.log("Flag set to false!");
    }
  });
