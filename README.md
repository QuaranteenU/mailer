# mailer

Send timeslots/generated diplomas to contacts using [SendGrid](https://sendgrid.com/).

## Installation

Clone the repo and run `npm install` to get the dependencies. You're also going to need Miktex for generating the Latex diplomas (set Miktex to download necessary plugins on the fly so you don't keep getting interrupted on the first run). Copy `.env.sample` to `.env` and fill in the values appropriately. Finally, you'll need a CSV file of your contacts' data called `finaldata.csv` placed at the project root. From there, you're all set to run the scripts.

## Flags

The scripts have a set of flags at the top of each file, consider these a final check to look at before running a script.

- PRUNE: Prune duplicates, bounces, and unsubscribes from the contact list
- IS_HIGHSCHOOL: Use Highschool variations
- SEND_EMAIL: Whether to actually fire the API call to SendGrid. If this is false, running the script will be a dry run that prints the data that would've been sent to SendGrid for each contact.

## Fonts Used (for diplomas)

- [Agane](https://www.fontsquirrel.com/fonts/agane)
- [Cloister Black](https://www.dafont.com/cloister-black.font)
- [Minecraft Regular](https://fonts2u.com/minecraft-regular.font) (converted to Minecraft Regular.fnt with Hiero)
- [Pixel 5x3](https://fontstruct.com/fontstructions/show/1618858/pixel-5x3-2) (converted to Minecraft Tiny.fnt with Hiero)

## Todo

- Use Firebase for data instead of CSVs
- Make datasource/URL a configurable option
- Translate code to Python so it's synchronous
