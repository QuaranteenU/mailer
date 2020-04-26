require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const fetch = require("node-fetch");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    console.log(schools);

    const uniqueEmails = new Set(
      contacts.filter((c) => c.Timestamp).map((c) => c["University Email"])
    );
    const uniqueContacts = Array.from(uniqueEmails).map((email) =>
      contacts.find((c) => c["University Email"] === email)
    );

    uniqueContacts.forEach((contact) => {
      const onlySignup = !schools.hasOwnProperty(contact["Email Domain"]);
      const oneOtherSignup =
        !onlySignup && schools[contact["Email Domain"]] == 2;

      const msg = {
        to: contact["University Email"],
        from: "admissions@quaranteen.university",
        templateId: "d-3a14eba083624a22b27ea0e51e48eb2c",
        dynamic_template_data: {
          firstName: contact["First Name"],
          role: contact["Role"],
          numFromSchool: schools[contact["Email Domain"]] - 1,
          onlySignup,
          oneOtherSignup,
        },
      };

      sgMail
        .send(msg)
        .then((res) => {
          console.log(`${contact["University Email"]}: Success!`);
        })
        .catch((error) => {
          console.error(`${contact["University Email"]}: Failure!`, error);

          if (error.response) {
            console.error(error.response.body);
          }
        });
    });
  });
