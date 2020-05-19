require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const sgMail = require("@sendgrid/mail");
const sgClient = require('@sendgrid/client');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

const contacts = [];
fs.createReadStream("test.csv")
  .pipe(csv())
  .on("data", (data) => contacts.push(data))
  .on("end", () => {
    const wedointhis = false;
    if (wedointhis) {
      contacts.forEach((contact) => {
        const emailData = {
          firstName: contact["Name"].split(' ')[0],
        };

        const msg = {
          to: contact["Email"],
          from: "Rudy from QU <rooday@bu.edu>",
          replyTo: "Quaranteen University <admissions@quaranteen.university>",
          templateId: "d-f1f6775fab744b2ebd60746103458c78",
          dynamic_template_data: emailData,
          asm: {
            group_id: 13368,
          },
        };
        
        sgMail
          .send(msg)
          .then((res) => {
            console.log(`${contact["Email"]}: Success!`, emailData);
          })
          .catch((error) => {
            console.error(
              `${contact["Email"]}: Failure!`,
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