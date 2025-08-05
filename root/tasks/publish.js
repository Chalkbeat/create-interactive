import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { gzip } from "zlib";
import mime from "mime";

import * as s3 from "./lib/s3.js";

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

var gzippable = new Set([
  "js",
  "json",
  "map",
  "css",
  "txt",
  "csv",
  "svg",
  "geojson",
]);

var zip = function (buffer) {
  return new Promise((ok, fail) => {
    gzip(buffer, (err, result) => {
      if (err) return fail(err);
      ok(result);
    });
  });
};

import config from "../project.json" with { type: "json" };

export default function (heist) {

  var findBuiltFiles = function () {
    var pattern = ["**/*", "!assets/synced/**/*"];
    var embargo = config.embargo;
    if (embargo) {
      if (!(embargo instanceof Array)) embargo = [embargo];
      embargo.forEach(function (item) {
        pattern.push("!" + item);
        console.log(chalk.bgRed.white("File embargoed: %s"), item);
      });
    }
    var files = grunt.file.expand({ cwd: "build", filter: "isFile" }, pattern);
    var list = files.map(function (file) {
      var buffer = fs.readFileSync(path.join("build", file));
      return {
        path: file,
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
        var checklist = grunt.file.read("tasks/checklist.txt");
        grunt.fail.fatal(checklist);
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
        grunt.fail.fatal(
          "You must specify a destination path in your project.json."
        );
      }

      var BATCH_SIZE = 10;

      var uploads = findBuiltFiles();

      for (var i = 0; i < uploads.length; i += BATCH_SIZE) {
        var batch = uploads.slice(i, i + BATCH_SIZE);

        var puts = batch.map(async function (upload) {
          var putObject = {
            Bucket: bucketConfig.bucket,
            Key: join(
              bucketConfig.path,
              upload.path.replace(/^\\?build/, "")
            ),
            Body: upload.buffer,
            ACL: "public-read",
            ContentType: mime.getType(upload.path),
            CacheControl: "public,max-age=120",
          };

          // gzip may not be necessary anymore?
          var isCompressed = false;
          var extension = upload.path.split(".").pop();
          if (gzippable.has(extension)) {
            putObject.Body = await zip(upload.buffer);
            putObject.ContentEncoding = "gzip";
            isCompressed = true;
          }

          var before = upload.buffer.length;
          var after = putObject.Body.length;
          var logString = isCompressed
            ? "- %s - %s %s %s (%s)"
            : "- %s - %s";

          var abbreviated = putObject.Key.split("/").map(w => cut(w, 30)).join("/");

          var args = [
            logString,
            abbreviated,
            chalk.cyan(formatSize(before)),
          ];
          if (isCompressed) {
            args.push(
              chalk.yellow("=>"),
              chalk.cyan(formatSize(after)),
              chalk.bold.green(
                Math.round((after / before) * 100).toFixed(1) + "% via gzip"
              )
            );
          }
          console.log(...args);
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
