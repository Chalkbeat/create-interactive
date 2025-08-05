import Server from "@11ty/eleventy-dev-server";

export default async function(heist) {

  heist.defineTask("serve", "Run an 11ty dev server and enable watch tasks", async function(target, context) {
    var server = new Server("11ty", "build", {
      watch: "src"
    });
    server.serve(8000);

    async function onModification(path) {
      if (path.match(/\.js$/)) {
        await heist.run("bundle", context);
      }
      if (path.match(/\.html$/)) {
        await heist.run("build", context);
      }
    }

    var watcher = server.watcher;
    for (var e of ["change", "add", "unlink"]) {
      watcher.on(e, onModification);
    }
  });
  
}