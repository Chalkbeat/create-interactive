/*
Process text files as ArchieML
Anything that has a .txt extension in /data will be loaded
*/

import fs from "node:fs/promises";
import path from "node:path";
import betty from "@nprapps/betty";

export default function(heist) {

  heist.defineTask("archieml", "Loads ArchieML files from data/*.txt", async function(target, context) {

    var archieml = {};
    var files = await heist.find("*.txt", "data");

    for (var f of files) {
      var name = path.basename(f).replace(/(\.docs)?\.txt$/, "");
      var contents = await fs.readFile(path.join("data", f), "utf-8");

      var parsed = betty.parse(contents, {
        onFieldName: t => t[0].toLowerCase() + t.slice(1)
      });
      archieml[name] = parsed;
    }

    context.archieml = archieml;

  });

};