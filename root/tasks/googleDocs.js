import os from "node:os";
import path from "node:path";
import { authenticate } from "./googleAuth.js";
import fs from "node:fs/promises";
import config from "../project.json" with { type: "json" };

var formatters = {
  link: (text, style) => `<a href="${style.link.url}">${text}</a>`,
  bold: (text) => `<b>${text}</b>`,
  italic: (text) => `<i>${text}</i>`,
};

export default function(heist) {

  heist.defineTask("docs", "Save Google Docs into the data folder", async function () {
    var google = await import("@googleapis/docs");

    var auth = null;
    try {
      auth = await authenticate();
    } catch (err) {
      console.log(err);
      return console.error(
        "Couldn't load access token for Docs, try running `heist google-auth`"
      );
    }
    var docs = google.docs({ auth, version: "v1" }).documents;

    /*
     * Large document sets may hit rate limits; you can find details on your quota at:
     * https://console.developers.google.com/apis/api/drive.googleapis.com/quotas?project=<project>
     * where <project> is the project you authenticated with using `heist google-auth`
     */

    var rateLimit = 2;
    var keys = Object.keys(config.docs);

    for (var i = 0; i < keys.length; i += rateLimit) {
      var chunk = keys.slice(i, i + rateLimit);
      var batch = chunk.map(async function (key) {
        var documentId = config.docs[key];
        var suggestionsViewMode = "PREVIEW_WITHOUT_SUGGESTIONS";
        var docResponse = await docs.get({
          documentId,
          suggestionsViewMode,
        });
        var name = key + ".docs.txt";
        var body = docResponse.data.body.content;
        var text = "";

        var lists = docResponse.data.lists;

        for (var block of body) {
          if (!block.paragraph) continue;
          // manage lists
          if (block.paragraph.bullet) {
            var list = lists[block.paragraph.bullet.listId];
            var level = block.paragraph.bullet.nestingLevel || 0;
            var style = list.listProperties.nestingLevels[level];
            var bullet = "- ";
            if (style) {
              if (style.glyphType == "DECIMAL") {
                bullet = "1. ";
              }
            }
            var indent = "  ".repeat(level);
            text += indent + bullet;
          }
          // handle the individual text spans in a paragraph
          for (var element of block.paragraph.elements) {
            // console.log(element);
            if (!element.textRun) continue;
            var { content, textStyle } = element.textRun;
            if (content.trim()) for (var f in formatters) {
              if (textStyle[f]) {
                var [_, before, inside, after] =
                  content.match(/^(\s*)(.*?)(\s*)$/);
                content = before + formatters[f](inside, textStyle) + after;
              }
            }
            text += content;
          }
        }

        text = text.replace(/\x0b/g, "\n");

        console.log(`Writing document as data/${name}`);
        await fs.writeFile(path.join("data", name), text);
      });
      await Promise.all(batch);
    }
  });
};
