/*

Run the PostCSS compiler against seed.css and output to style.css.

*/

import fs from "node:fs/promises";
import path from "node:path";

var lazy = async (mods) => {
  return Promise.all(mods.map(async (specifier) => {
    var pkg = await import(specifier);
    return pkg.default;
  }));
}

export default function(heist) {

  heist.defineTask("css", "Compile styles from src/css/seed.css", async function() {

    var [ postcss, variables, atImport, env ] = await lazy("postcss postcss-simple-vars postcss-import postcss-preset-env".split(" "));

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