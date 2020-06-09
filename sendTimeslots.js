require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const date = require("date-and-time");
const sgMail = require("@sendgrid/mail");
const sgClient = require("@sendgrid/client");
const { pruneContacts } = require("./util");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

const contacts = [];
const PRUNE = true;
const IS_HIGHSCHOOL = false;
const SEND_EMAIL = false;

fs.createReadStream("finaldata.csv")
  .pipe(csv())
  .on("data", (data) => contacts.push(data))
  .on("end", async () => {
    const uniqueContacts = PRUNE
      ? await pruneContacts(contacts, sgClient)
      : contacts;

    uniqueContacts.forEach((contact) => {
      const email = contact["Email Address"];
      const firstName = contact["Your Full Name"].split(" ")[0];

      const studentTimezone = parseInt(contact["Time Zone"]);
      const hasTimezone = !Number.isNaN(studentTimezone);
      const defaultSchoolName = IS_HIGHSCHOOL ? "Quaranteen University Academy" : "Quaranteen University";
      const schoolName =
        contact["School"] === "Unknown"
          ? defaultSchoolName
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
        from: process.env.FROM_ADDRESS,
        replyTo: process.env.REPLY_TO_ADDRESS,
        templateId: process.env.TEMPLATE_ID,
        dynamic_template_data: emailData,
        asm: {
          group_id: process.env.ASM_GROUP_ID,
        },
      };

      if (SEND_EMAIL) {
        sgMail
          .send(msg)
          .then(() => {
            console.log(`${email}: Success!`);
          })
          .catch((error) => {
            console.error(`${email}: Failure!`, error);

            if (error.response) {
              console.error(error.response.body);
            }
          });
      } else {
        console.log(msg);
      }
    });
  });
