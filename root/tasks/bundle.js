/*
Build a bundled app.js file using browserify
*/
import fs from "node:fs/promises";
import path from "node:path";
import config from "../project.json" with { type: "json" };

var cache = null;

export default function(heist) {

  heist.defineTask("bundle", "Build app.js using browserify", async function(mode, context) {

    var { rollup } = await import("rollup");
    var { default: terser } = await import("@rollup/plugin-terser");
    var { nodeResolve } = await import("@rollup/plugin-node-resolve");
    var { default: commonJS } = await import("@rollup/plugin-commonjs");
    var { importText } = await import("./lib/rollup-plugins.js");

    //run in dev mode unless otherwise specified
    mode = mode || "dev";

    //specify starter files here - if you need additionally built JS, just add it.
    var seeds = config.scripts;

    var plugins = [
      nodeResolve({
        rootDir: "node_modules",
        browser: true
      }),
      importText(),
      // importLESS(),
      commonJS({
        requireReturnsDefault: "auto"
      }),
      terser({
        mangle: false,
        compress: false
      })
    ];

    await fs.mkdir("build", { recursive: true });

    for (var [src, dest] of Object.entries(seeds)) {

      var rolled = await rollup({
        input: src,
        plugins,
        cache
      });

      cache = rolled.cache;

      var { output } = await rolled.generate({
        name: "interactive",
        format: "es",
        sourcemap: true,
        interop: "default"
      });

      var [ bundle ] = output;

      var { code, map } = bundle;

      // add source map reference
      var smURL = `./${path.basename(dest)}.map`;
      code += `\n//# sourceMappingURL=${smURL}`;

      var writeCode = fs.writeFile(dest, code);
      var writeMap = fs.writeFile(dest + ".map", map.toString());

      await Promise.all([writeCode, writeMap]);
      console.log(`Wrote ${src} -> ${dest}`);
    }

  });

};
