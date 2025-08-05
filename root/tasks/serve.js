export default async function(heist) {

  heist.defineTask("serve", "Run an 11ty dev server and enable watch tasks", async function(target, context) {
    var Server = await import("@11ty/eleventy-dev-server");

    var server = new Server("11ty", "build", {
      watch: "src",
      logger: {
        info: console.info,
        log() {},
        debug() {},
        error() {}
      }
    });
    server.serve(8000);

    async function onModification(path) {
      if (path.match(/\.js$/)) {
        await heist.run("bundle", context);
      }
      if (path.match(/\.html$/)) {
        await heist.run("template", context);
      }
      if (path.match(/\.css$/)) {
        await heist.run("css", context);
      }
      console.log("Reloading page...");
      server.reload();
    }

    var watcher = server.watcher;
    for (var e of ["change", "add", "unlink"]) {
      watcher.on(e, onModification);
    }
  });
  
}