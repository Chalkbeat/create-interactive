/*

Run the PostCSS compiler against seed.css and output to style.css.

*/

import postcss from "postcss";
import variables from "postcss-simple-vars";
import atImport from "postcss-import";
import env from "postcss-preset-env";
import fs from "node:fs/promises";
import path from "node:path";

export default function(heist) {

  heist.defineTask("css", "Compile styles from src/css/seed.css", async function() {

    var { default: config } = await import("../project.json", { with: { type: "json" } });

    var seeds = config.styles;

    var processor = postcss([
      variables(),
      atImport(),
      env()
    ]);

    for (var [src, dest] of Object.entries(seeds)) {
      var seed = await fs.readFile(src);
      try {
        var result = await processor.process(seed, { from: src });
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, result.css);
        console.log(`Wrote ${src} to ${dest}`)
      } catch (err) {
        console.error(err.message + " - " + err.filename + ":" + err.line);
      }
    }

  });

}