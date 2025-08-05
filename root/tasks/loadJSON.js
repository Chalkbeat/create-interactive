import fs from "node:fs/promises";
import path from "node:path";

export default function(heist) {

  heist.defineTask("json", "Import JSON files from the data folder", async function(target, context) {
    var files = await heist.find("**/*.json", "data");
    // also load the project.json file
    var { default: project } = await import("../project.json", { with: { type: "json" } });
    var json = { project };
    for (var f of files) {
      var [ slug ] = path.basename(f).split(".");
      var contents = await fs.readFile(path.join("data", f), "utf-8");
      var parsed = JSON.parse(contents);
      console.log(`Loaded ${f} as json.${slug}`);
      json[slug] = parsed;
    }

    context.json = json;
  });

}