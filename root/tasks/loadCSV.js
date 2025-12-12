/*

Build CSV into JSON and then load that structure onto the shared state object.
Will use cached data if it hasn't changed since the last run.

*/

import path from "node:path";
import fs from "node:fs/promises";

export default function(heist) {

  heist.defineTask("csv", "Convert CSV to JSON and load onto grunt.data", async function(target, context) {

    var { parse } = await import("csv-parse");

    var files = await heist.find("**/*.csv", "data");

    var csv = context.csv = {};

    for (var file of files) {
      var parser = parse({
        columns: true,
        cast: true
      });
      var handle = await fs.open(path.join("data", file));
      var stream = handle.createReadStream();
      stream.pipe(parser);
      var parsed = [];
      var keyed = false;
      for await (var record of parser) {
        // check to see if we've found a keyed row
        if (record.key || keyed) {
          // swap output to an object the first time it happens
          if (parsed instanceof Array) {
            parsed = {};
            keyed = true;
          }
          parsed[record.key] = record;
          delete record.key;
        } else {
          parsed.push(record);
        }
      }
      var sanitized = path.basename(file)
        .replace(".csv", "")
        .replace(/\W(\w)/g, function(_, letter) { return letter.toUpperCase() });
      console.log(`Loaded ${file} as csv.${sanitized}`);
      csv[sanitized] = parsed;
    }

  });

};