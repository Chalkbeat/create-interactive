import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import mime from "mime";
import { styleText } from "node:util";

import * as s3 from "./lib/s3.js";

// create web-style paths from Windows path strings
var join = (...parts) => path.join(...parts).replace(/\\/g, "/");

var formatSize = function (input) {
  if (input > 1024 * 1024) {
    return Math.round((input * 10) / (1024 * 1024)) / 10 + "MB";
  }
  if (input > 1024) {
    return Math.round(input / 1024) + "KB";
  }
  return input + "B";
};

var cut = (str, max) => {
  if (str.length > max) {
    var half = max / 2;
    return str.slice(0, half) + "..." + str.slice(-half);
  }
  return str;
};

import config from "../project.json" with { type: "json" };

export default function (heist) {

  var findBuiltFiles = async function () {
    var pattern = ["build/**/*", "!build/assets/synced/**/*"];
    var embargo = config.embargo;
    if (embargo) {
      if (!(embargo instanceof Array)) embargo = [embargo];
      for (var item of embargo) {
        pattern.push("!" + item);
        console.log(chalk.bgRed.white("File embargoed: %s"), item);
      };
    }
    var files = await heist.find(pattern);
    var list = files.map(function (file) {
      var buffer = fs.readFileSync(file);
      return {
        path: file.replace(/^\\?build/, ""),
        buffer: buffer,
      };
    });
    return list;
  };

  heist.defineTask(
    "publish",
    "Pushes the build folder to S3",
    async function (deploy) {

      deploy = deploy || "stage";

      if (deploy == "live" && !config.production) {
        return console.error("You're trying to deplay this project to live, but it's not marked as production in project.json");
      }

      var bucketConfig =
        deploy != "simulated"
          ? config.s3[deploy]
          : {
              path: "SIM/" + config.s3.live.path,
            };
      //strip slashes for safety
      bucketConfig.path = bucketConfig.path.replace(/^\/|\/$/g, "");
      if (!bucketConfig.path) {
        return console.error(
          "You must specify a destination path in your project.json."
        );
      }

      var BATCH_SIZE = 10;

      var uploads = await findBuiltFiles();

      for (var i = 0; i < uploads.length; i += BATCH_SIZE) {
        var batch = uploads.slice(i, i + BATCH_SIZE);

        var puts = batch.map(async function (upload) {
          var putObject = {
            Bucket: bucketConfig.bucket,
            Key: join(
              bucketConfig.path,
              upload.path
            ),
            Body: upload.buffer,
            ACL: "public-read",
            ContentType: mime.getType(upload.path),
            CacheControl: "public,max-age=120",
          };

          var abbreviated = putObject.Key.split("/").map(w => cut(w, 30)).join("/");

          console.log(`- ${abbreviated} - ${styleText(["cyan"], formatSize(upload.buffer.length))}`);
          if (deploy == "simulated") return;
          return s3.upload(putObject);
        });

        await Promise.all(puts);
      }

      console.log("All files uploaded successfully");
      if (deploy == "stage" && config.production) {
        grunt.log.error(
          "CHECK YOURSELF: This project is marked as live, but you deployed to stage."
        );
      }
  });
}
