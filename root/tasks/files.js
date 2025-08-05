import fs from "node:fs/promises";
import path from "node:path";

const RECURSIVE = { recursive: true };

export default function(heist) {

  var { home } = heist;

  heist.defineTask("clean", "Erase the contents of the build folder", async function() {
    await fs.mkdir("build", RECURSIVE);
    for (var f of await fs.readdir("build")) {
      var filename = path.join("build", f);
      await fs.rm(filename, RECURSIVE);
    }
  });

  heist.defineTask("copy", "Copy assets to the static folder", async function() {
    await fs.cp("src/assets", "build/assets", RECURSIVE);
  });

}