import * as fs from "node:fs/promises";
import * as path from "node:path";
import { compile } from "./lib/template.js";

export default function(heist) {

  heist.defineTask("html", "Generate HTML files", async function(target, context) {

    var { default: typogr } = await import("typogr");
    var { HtmlRenderer, Parser } = await import("commonmark");

    var writer = new HtmlRenderer();
    var reader = new Parser();

    //monkey-patch writer to handle typographical entities
    var escape = writer.escape;
    writer.escape = function(str) {
      return escape(str, true);
    };

    var process = function(source, data, filename) {
      var fn = compile(source, { sourceURL: filename });
      var input = Object.create(data || context);
      input.t = templateFunctions;
      return fn(input);
    };


    var templateFunctions = {

      smarty(text) {
        var filters = ["amp", "widont", "smartypants", "ord"];
        filters = filters.map(k => typogr[k]);
        var filtered = filters.reduce((t, f) => f(t), text);
        return filtered;
      },

      async include(where, data = context) {
        // console.log(" - Including file: " +  where);
        var file = await fs.readFile(path.resolve("src/", where), "utf-8");
        var templateData = Object.create(data);
        templateData.t = this;
        return process(file, templateData, where);
      },

      renderMarkdown(input) {
        var parsed = reader.parse(typogr.typogrify(input));

        var walker = parsed.walker();
        //merge text nodes together
        var e;
        var previous;
        while (e = walker.next()) {
          var node = e.node;
          //is this an adjacent text node?
          if (node && previous && previous.parent == node.parent && previous.type == "Text" && node.type == "Text") {
            previous.literal += node.literal;
            // grunt.log.oklns(previous.literal);
            node.unlink();
          } else {
            previous = node;
          }
        }

        var rendered = writer.render(parsed);
        return rendered
          .replace(/&#8211;/g, "&mdash;")
          .replace(/([’']) ([”"])/g, "$1&nbsp;$2");
      }
    };

    var src = path.join(heist.home, "src");
    var inputs = await heist.find(["**/*.html", "!_*.html"], "src");
    for (var filename of inputs) {
      var contents = await fs.readFile(path.join("src", filename), "utf-8");
      var output = await process(contents, context, filename);
      console.log(`Building file ${filename}...`);
      var dest = path.join("build", filename);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, output);
    }
  });

}