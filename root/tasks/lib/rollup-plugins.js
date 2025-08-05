import fs from "node:fs/promises"
import path from "node:path";

// text import plugin
var textExtensions = new Set([".svg", ".html", ".txt", ".glsl"]);
export function importText() {
  return {
    name: "import-text",
    async load(id) {
      var extension = path.extname(id);
      if (!textExtensions.has(extension)) return null;
      var text = await fs.readFile(id, "utf-8");
      var code = "export default " + JSON.stringify(text);
      return { code };
    }
  }
};

var resolve = import.meta.resolve;

var npmImporter = {
  install: function(less, pluginManager) {

    var FileManager = function() {};
    FileManager.prototype = new less.FileManager();
    FileManager.prototype.supports = function(file, dir) {
      return file.indexOf("npm://") == 0;
    };
    FileManager.prototype.supportsSync = FileManager.prototype.supports;
    FileManager.prototype.resolve = function(file) {
      file = file.replace("npm://", "");
      try {
        var resolved = resolve(file, {
          extensions: [".less", ".css"],
          packageFilter: function(pkg) { 
            if (pkg.style) pkg.main = pkg.style;
            return pkg;
          }
        });
        return resolved;
      } catch (err) {
        console.log(err);
      }
    };
    FileManager.prototype.loadFile = function(url, dir, options, env) {
      var filename = this.resolve(url);
      return less.FileManager.prototype.loadFile.call(this, filename, "", options, env);
    };
    FileManager.prototype.loadFileSync = function(url, dir, options, env) {
      var filename = this.resolve(url);
      return less.FileManager.prototype.loadFileSync.call(this, filename, "", options, env);
    };

    pluginManager.addFileManager(new FileManager());
  },
  minVersion: [2, 1, 1]
};

var cssExtensions = new Set([".css", ".less"]);
export function importLess() {
  return {
    name: "import-less",
    async load(id) {
      var extension = path.extname(id);
      if (!cssExtensions.has(extension)) return null;
      var file = await fs.readFile(id, "utf-8");
      var options = {
        paths: [ path.dirname(id) ],
        plugins: [ npmImporter ]
      };
      var { css } = await less.render(file, options);
      return `
var style = document.createElement("style");
style.setAttribute("data-less-source", "${path.basename(id)}");
style.innerHTML = ${JSON.stringify(css)};
document.head.appendChild(style);`;
    }
  }
};