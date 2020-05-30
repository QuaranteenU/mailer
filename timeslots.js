require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const date = require("date-and-time");
const sgMail = require("@sendgrid/mail");
const sgClient = require("@sendgrid/client");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

const contacts = [];
fs.createReadStream("finaldata.csv")
  .pipe(csv())
  .on("data", (data) => contacts.push(data))
  .on("end", async () => {
    console.log("Total Contacts:", contacts.length);

    const wedointhis = false;
    if (wedointhis) {
      contacts.forEach((contact) => {
        const email = contact["Email Address"];
        const firstName = contact["Your Full Name"].split(" ")[0];

        const studentTimezone = parseInt(contact["Time Zone"]);
        const hasTimezone = !Number.isNaN(studentTimezone);
        const schoolName =
          contact["School"] === "Unknown"
            ? "Quaranteen University Academy"
            : contact["School"];

        const schoolStartDate = new Date(contact["School Start Time UTC"]);
        const schoolStartTime = date.format(schoolStartDate, "hh:mm:ss A");
        const schoolStartTimeLocal = hasTimezone
          ? date.format(schoolStartDate.addHours(studentTimezone), "hh:mm:ss A")
          : null;

        const studentStartDate = new Date(contact["Start Time UTC"]);
        const studentStartTime = date.format(studentStartDate, "hh:mm:ss A");
        const studentStartTimeLocal = hasTimezone
          ? date.format(
              studentStartDate.addHours(studentTimezone),
              "hh:mm:ss A"
            )
          : null;

        const emailData = {
          firstName,
          hasTimezone,
          studentTimezone,
          schoolName,
          schoolStartTime,
          studentStartTime,
          schoolStartTimeLocal,
          studentStartTimeLocal,
        };

        const msg = {
          to: email,
          from: "Rudy from QU <rooday@bu.edu>",
          replyTo: "Quaranteen University <admissions@quaranteen.university>",
          templateId: "d-61712775b19a457fbd637b421b2a9c8d",
          dynamic_template_data: emailData,
          asm: {
            group_id: 13368,
          },
        };

        sgMail
          .send(msg)
          .then((res) => {
            console.log(`${email}: Success!`, emailData);
          })
          .catch((error) => {
            console.error(
              `${email}: Failure!`,
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
