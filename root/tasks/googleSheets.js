/*

Uses the Google Sheets API to pull data from Sheets and load it onto shared
state. Writes the data out to JSON for later reference. Does not currently
check for existing data to merge--it does a fresh pull every time.

*/

import project from "../project.json" with { type: "json" };
import os from "node:os";
import path from "node:path";
import * as google from "@googleapis/sheets";
import { authenticate } from "./googleAuth.js";

var api = google.sheets("v4");

var camelCase = function(str) {
  return str.replace(/[^\w]+(\w)/g, function(all, match) {
    return match.toUpperCase();
  });
};

var cast = function(str) {
  if (typeof str !== "string") {
    if (typeof str.value == "string") {
      str = str.value;
    } else {
      return str;
    }
  }
  if (str.match(/^-?(0?\.|[1-9])[\d\.]*$/) || str == "0") {
    var n = Number(str);
    if (isNaN(n)) return str;
    return n;
  }
  if (str.toLowerCase() == "true" || str.toLowerCase() == "false") {
    return str.toLowerCase() == "true" ? true : false;
  }
  return str;
};

export default function(heist) {

  heist.defineTask("sheets", "Downloads from Google Sheets -> JSON", async function() {

    var auth = null;
    try {
      auth = authenticate();
    } catch (err) {
      console.log("No access token from ~/.google_oauth_token, private spreadsheets will be unavailable.", err)
    };

    var sheetKeys = project.sheets;

    if (!sheetKeys || !sheetKeys.length) {
      return grunt.fail.fatal("You must specify a spreadsheet key in project.json or auth.json!");
    }

    var bookRequests = sheetKeys.map(async function(spreadsheetId) {
      var book = (await api.spreadsheets.get({ auth, spreadsheetId })).data;
      var { sheets, spreadsheetId } = book;
      var sheetRequests = sheets.map(async function(sheet) {
        if (sheet.properties.title[0] == "_") return;
        var response = await api.spreadsheets.values.get({
          auth,
          spreadsheetId,
          range: `${sheet.properties.title}!A:AAA`,
          majorDimension: "ROWS"
        });
        var { values } = response.data;
        var header = values.shift();
        var types = header.map(function(h, i) {
          var [ column, type ] = h.split(":");
          if (type) {
            header[i] = column;
            return type;
          }
          return null;
        })
        var isKeyed = header.indexOf("key") > -1;
        var isValued = header.indexOf("value") > -1;
        var out = isKeyed ? {} : [];
        for (var row of values) {
          // skip blank rows
          if (!row.length) continue;
          var obj = {};
          row.forEach(function(value, i) {
            var key = header[i];
            if (key[0] == "_") return;
            var type = types[i];
            // manual cast
            if (type) {
              switch (type) {
                case "number":
                case "numeric":
                case "int":
                case "float":
                  obj[key] = value * 1;
                  break;

                case "boolean":
                case "bool":
                  obj[key] = !!value;
                  break;

                default:
                  obj[key] = value + "";
              }
            } else {
              // auto cast
              obj[key] = cast(value);
            }
          });
          if (isKeyed) {
            out[obj.key] = isValued ? obj.value : obj;
          } else {
            out.push(obj);
          }
        }
        var filename = `data/${sheet.properties.title.replace(/[\s\/]+/g, "_")}.sheet.json`;
        console.log(`Saving sheet to ${filename}`);
        grunt.file.write(filename, JSON.stringify(out, null, 2));
      });

      await Promise.all(sheetRequests);
    });

    await Promise.all(bookRequests);

  });

};
