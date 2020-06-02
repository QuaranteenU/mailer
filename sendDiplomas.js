require("dotenv").config();
const execSync = require("child_process").execSync;
const fs = require("fs");
const csv = require("csv-parser");
const fetch = require("node-fetch");
const Jimp = require("jimp");
const sgMail = require("@sendgrid/mail");
const sgClient = require("@sendgrid/client");
const { abbreviateDegree, splitIntoLines, pruneContacts } = require("./util");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

const contacts = [];
const PRUNE = true;
const IS_HIGHSCHOOL = true;
const SEND_EMAIL = true;

fs.createReadStream("finaldata.csv")
  .pipe(csv())
  .on("data", (data) => contacts.push(data))
  .on("end", async () => {
    const uniqueContacts = PRUNE
      ? await pruneContacts(contacts, sgClient)
      : contacts;
    const processContact = async (index) => {
      if (index < uniqueContacts.length) {
        const contact = uniqueContacts[index];
        const emailData = {
          firstName: contact["Your Full Name"].split(" ")[0],
        };

        const name = contact["Your Full Name"];
        const nameLines = splitIntoLines(name);
        const degree = IS_HIGHSCHOOL ? "" : contact["Your Degree"];
        const shortDegree =
          degree.length > 35 ? abbreviateDegree(degree) : degree;
        const major = IS_HIGHSCHOOL ? "" : contact["Your Major(s)"];
        const majorLines = splitIntoLines(major);

        console.log(`=> Generating diploma for ${name}`);
        const latexFile = IS_HIGHSCHOOL ? "highschool" : "university";
        const code = execSync(
          `miktex-lualatex "\\def\\QUDiplomaName{${name}} \\def\\QUDegreeType{${degree}} \\def\\QUMajor{${major}} \\input{${latexFile}}"`
        );

        let loadedImage, largeFont, smallFont;
        const diplomaBg = IS_HIGHSCHOOL
          ? "diploma_bg_QUA.png"
          : "diploma_bg_QU.png";
        await Jimp.read(diplomaBg)
          .then((image) => {
            loadedImage = image;
            return Jimp.loadFont("fonts/Minecraft Regular.fnt");
          })
          .then((font) => {
            largeFont = font;
            return Jimp.loadFont("fonts/Minecraft Tiny.fnt");
          })
          .then(async (font) => {
            smallFont = font;
            if (nameLines.length > 1) {
              loadedImage = await loadedImage
                .print(
                  largeFont,
                  0,
                  IS_HIGHSCHOOL ? 490 : 360,
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
                  IS_HIGHSCHOOL ? 590 : 460,
                  {
                    text: nameLines[1],
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                  },
                  1024,
                  1024
                );
            } else {
              loadedImage = await loadedImage.print(
                largeFont,
                0,
                IS_HIGHSCHOOL ? 540 : 410,
                {
                  text: nameLines[0],
                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                },
                1024,
                1024
              );
            }

            if (major.length >= 40) {
              loadedImage = await loadedImage
                .print(
                  smallFont,
                  0,
                  700,
                  {
                    text: majorLines[0],
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                  },
                  1024,
                  1024
                )
                .print(
                  smallFont,
                  0,
                  750,
                  {
                    text: majorLines[1],
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                  },
                  1024,
                  1024
                );
            } else {
              loadedImage = await loadedImage.print(
                smallFont,
                0,
                700,
                {
                  text: major,
                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                },
                1024,
                1024
              );
            }

            return loadedImage
              .print(
                smallFont,
                0,
                650,
                {
                  text: shortDegree,
                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                },
                1024,
                1024
              )
              .write("minecraft.png");
          })
          .then((img) => img.getBase64Async("image/png"))
          .then(async (minecraftDiplomaData) => {
            const normalDiplomaData = fs.readFileSync(`${latexFile}.pdf`, {
              encoding: "base64",
            });

            const msg = {
              to: contact["Email Address"],
              from: "Rudy from QU <rooday@bu.edu>",
              replyTo:
                "Quaranteen University <admissions@quaranteen.university>",
              templateId: IS_HIGHSCHOOL ? "d-3108b5bceb4c46e1860d55f2516f822f" : "d-b6038557df6e4c0c80dcc6c422c7d640",
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
                  content: minecraftDiplomaData.replace(
                    "data:image/png;base64,",
                    ""
                  ),
                  filename: "QU-Minecraft-Diploma.png",
                  type: "image/png",
                  disposition: "attachment",
                  contentId: "minecraftDiploma",
                },
              ],
            };

            if (SEND_EMAIL) {
              await sgMail
                .send(msg)
                .then((res) => {
                  console.log(`${contact["Email Address"]}: Success!`);
                  processContact(index + 1);
                })
                .catch((error) => {
                  console.error(`${contact["Email Address"]}: Failure!`, error);

                  if (error.response) {
                    console.error(error.response.body);
                  }
                });
            }
          })
          .catch((err) => {
            console.error(err);
          });
      } else {
        console.log("=> Done!");
      }
    };

    process.chdir("latex");
    processContact(0);
  });
