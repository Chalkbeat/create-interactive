export default async function(heist) {
  //load tasks
  await heist.loadTasks("./tasks");

  heist.defineTask("update", "Download content from remote services", function(target = stage) {
    heist.run(["sheets", "docs", `sync:${target}`]);
  });
  heist.defineTask("content", "Load content from data files", [
    "json",
    "csv",
    "archieml"
  ]);
  heist.defineTask("template", "Build HTML from content/templates", [
    "content",
    "html"
  ]);
  heist.defineTask("static", "Build all files", [
    "copy",
    "bundle",
    "css",
    "template"
  ]);
  heist.defineTask("quick", "Build without assets", [
    "clean",
    "bundle",
    "css",
    "template"
  ]);
  heist.defineTask("default", ["clean", "static", "serve"]);
};
