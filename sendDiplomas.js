require("dotenv").config();
const execSync = require("child_process").execSync;
const fs = require("fs");
const csv = require("csv-parser");
const fetch = require("node-fetch");
const Jimp = require("jimp");
const sgMail = require("@sendgrid/mail");
const sgClient = require("@sendgrid/client");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

const abbreviateDegree = (degree) => {
  const words = degree.split(" ");
  return words
    .filter((w) => w[0] === w[0].toUpperCase())
    .map((w) => {
      if (w === "/") return w;
      return `${w[0]}.`;
    })
    .join("");
};

const splitIntoLines = (original) => {
  const nameParts = original.split(" ");
  if (nameParts.length < 2) {
      return [original];
  }

  const partLength = nameParts.map(p => p.length)
  const totalLength = original.length;
  let len1 = totalLength, len2 = 0, split = nameParts.length - 1;

  for (let i = nameParts.length - 1; i >= 0; i--) {
      if (Math.abs((len1 - partLength[i]) - (len2 + partLength[i])) > Math.abs(len1 - len2)) {
          break;
      } else {
          len1 -= partLength[i];
          len2 += partLength[i];
          split--;
      }
  }

  const toReturn = ["", ""];
  for (let i = 0; i < nameParts.length; i++) {
      if (i <= split) {
          toReturn[0] += nameParts[i] + (i == split ? "" : " ");
      } else {
          toReturn[1] += nameParts[i] + (i + 1 == nameParts.length ? "" : " ");
      }
  }

  return toReturn;
}

const contacts = [];
fs.createReadStream("testdata.csv")
  .pipe(csv())
  .on("data", (data) => contacts.push(data))
  .on("end", async () => {
    const PRUNE = false;
    let uniqueContacts;
    if (PRUNE) {
      console.log("=> Pruning contacts");
      console.log("original contacts", contacts.length);
      const uniqueEmails = new Set(contacts.map((c) => c["Email Address"]));
      uniqueContacts = Array.from(uniqueEmails).map((email) =>
        contacts.find((c) => c["Email Address"] === email)
      );
      console.log("unique contacts", uniqueContacts.length);

      let [response, bounces] = await sgClient.request({
        method: "GET",
        url: "/v3/suppression/bounces",
      });
      bounces = bounces.map((c) => c.email);
      uniqueContacts = uniqueContacts.filter(
        (c) => !bounces.includes(c["Email Address"])
      );
      console.log("remove bounces", uniqueContacts.length);

      let [response2, unsubs] = await sgClient.request({
        method: "GET",
        url: "/v3/suppression/unsubscribes",
      });
      unsubs = unsubs.map((c) => c.email);
      uniqueContacts = uniqueContacts.filter(
        (c) => !unsubs.includes(c["Email Address"])
      );
      console.log("remove unsubs", uniqueContacts.length);
    } else {
      uniqueContacts = contacts;
    }

    const wedointhis = true;
    if (wedointhis) {
      uniqueContacts.forEach(async (contact) => {
        const emailData = {
          firstName: contact["Your Full Name"].split(" ")[0],
        };

        const name = contact["Your Full Name"];
        const nameLines = splitIntoLines(name);
        const degree = contact["Your Degree"];
        const shortDegree =
          degree.length > 35 ? abbreviateDegree(degree) : degree;
        const major = contact["Your Major(s)"];

        console.log(`=> Generating diploma for ${name}`);
        process.chdir("latex");
        /*const code = execSync(
          `miktex-lualatex "\\def\\QUDiplomaName{${name}} \\def\\QUDegreeType{${degree}} \\def\\QUMajor{${major}} \\input{main}"`
        );*/

        let loadedImage, largeFont, smallFont;
        await Jimp.read("diploma_bg_QU.png")
          .then((image) => {
            loadedImage = image;
            return Jimp.loadFont("fonts/Minecraft Regular 56.fnt");
          })
          .then((font) => {
            largeFont = font;
            return Jimp.loadFont("fonts/Minecraft Tiny 40.fnt");
          })
          .then((font) => {
            smallFont = font;
            loadedImage
              .print(
                largeFont,
                0,
                360,
                {
                  text: nameLines[0],
                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                },
                1024,
                1024
              )
              .print(
                largeFont,
                0,
                460,
                {
                  text: nameLines[1],
                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                },
                1024,
                1024
              )
              .print(
                smallFont,
                0,
                700,
                {
                  text: shortDegree,
                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                },
                1024,
                1024
              )
              .write("minecraft.png");
          })
          .catch((err) => {
            console.error(err);
          });
        process.chdir("../");

        console.log("converting diploma to base64");
        const normalDiplomaData = fs.readFileSync("latex/main.pdf", {
          encoding: "base64",
        });
        const minecraftDiplomaData = fs.readFileSync("latex/minecraft.png", {
          encoding: "base64",
        });

        const msg = {
          to: contact["Email Address"],
          from: "Rudy from QU <rooday@bu.edu>",
          replyTo: "Quaranteen University <admissions@quaranteen.university>",
          templateId: "d-b6038557df6e4c0c80dcc6c422c7d640",
          dynamic_template_data: emailData,
          asm: {
            group_id: 13368,
          },
          attachments: [
            {
              content: normalDiplomaData,
              filename: "QU-Diploma.pdf",
              type: "application/pdf",
              disposition: "attachment",
              contentId: "normalDiploma",
            },
            {
              content: minecraftDiplomaData,
              filename: "QU-Minecraft-Diploma.png",
              type: "image/png",
              disposition: "attachment",
              contentId: "minecraftDiploma",
            },
          ],
        };

        /*sgMail
          .send(msg)
          .then((res) => {
            console.log(`${contact["Email Address"]}: Success!`);
          })
          .catch((error) => {
            console.error(`${contact["Email Address"]}: Failure!`, error);

            if (error.response) {
              console.error(error.response.body);
            }
          });*/
      });
    } else {
      console.log("Flag set to false!");
    }
  });
