export default async function(heist) {

  heist.defineTask("serve", "Run an 11ty dev server and enable watch tasks", async function(target, context) {
    var { default: Server } = await import("@11ty/eleventy-dev-server");

    // set up our own watcher
    var chokidar = await import("chokidar");
    var watcher = chokidar.watch("src", {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 25,
      }
    });

    // initialize the server
    var server = new Server("11ty", "build", {
      watcher,
      liveReload: true,
      logger: {
        info: console.info,
        log() {},
        debug() {},
        error() {}
      },
    });

    async function onModification(path) {
      console.log(`\n> File changed (${path}), running tasks...`)
      if (path.match(/\.js$/)) {
        await heist.run("bundle", context);
      }
      if (path.match(/\.html$/)) {
        await heist.run("template", context);
      }
      if (path.match(/\.css$/)) {
        await heist.run("css", context);
      }
      server.reloadFiles([path]);
    }

    for (var e of ["change", "add", "unlink"]) {
      watcher.on(e, onModification);
    }

    server.serve(8000);

  });
  
}