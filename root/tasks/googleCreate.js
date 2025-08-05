import * as google from "@googleapis/drive";
import { authenticate } from "./googleAuth.js";
import opn from "opn";
import fs from "node:fs/promises";
import { parseArgs } from "node:util";

async function readJSON(path) {
  var contents = await fs.readFile(path, "utf-8");
  return JSON.parse(contents);
}

var argv = parseArgs({ strict: false }).values;

export default function(heist) {

  var mimes = {
    sheets: "application/vnd.google-apps.spreadsheet",
    docs: "application/vnd.google-apps.document"
  };

  heist.defineTask("google-create", "Create a linked Drive file (i.e., Google Sheets or Docs)", async function() {

    var config = readJSON("project.json");
    var pkg = readJSON("package.json");
    var auth = null;
    try {
      auth = authenticate();
    } catch (err) {
      console.log(err);
      return console.error("Couldn't load access token for Docs, try running `grunt google-auth`");
    }
    var drive = google.drive({ auth, version: "v3" });

    var type = argv.type;
    if (!type || !(type in mimes)) return console.log("Please specify --type=sheets or --type=docs");
    var mimeType = mimes[type];

    var name = argv.name || pkg.name;

    var result = await drive.files.create({ resource: { name, mimeType }});
    var file = result.data;

    if (!config[type]) config[type] = type == "docs" ? {} : [];
    if (type == "docs") {
      config.docs[name] = file.id;
    } else {
      config.sheets.push(file.id);
    }
    await fs.writeFile("project.json", JSON.stringify(config, null, 2));

    opn(`https://drive.google.com/open?id=${file.id}`)

  });
};
