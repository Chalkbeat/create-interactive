#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, cwd } from "node:process";
import { compile } from "./root/tasks/lib/template.js";
import { exec } from "node:child_process";

function run(cmd, print) {
  return new Promise(function(ok, fail) {
    var child = exec(cmd, (err, result) => err ? fail(err) : ok(result));
    if (print) child.stdout.pipe(process.stdout);
  });
}

var here = import.meta.dirname;
var root = path.join(here, "root");

var readline = createInterface({
  input: stdin,
  output: stdout
});

var author = (await run("git config --global --get user.name")).trim();
if (!author) {
  author = await readline.question("Who are you?");
}
var app_name = path.basename(cwd());
var now = new Date();
readline.close();

console.log(`
Initializing an interactive project with values:
  - author: ${author}
  - project name: ${app_name}
`.trim());

var context = {
  author,
  app_name,
  year: now.getFullYear()
}

var templated = {
  "_gitignore": ".gitignore",
  "_package.json": "package.json",
  "project.json": "project.json",
  "readme.rst": "readme.rst"
}

console.log(`Copying standard project files...`)

// copy over files in bulk, skipping templated files
await fs.cp(root, ".", {
  recursive: true,
  filter(src, dest) {
    var relative = path.relative(root, src);
    return !(relative in templated);
  }
});

console.log(`Writing customized files...`)

// process files that must be templated
for (var [ source, dest ] of Object.entries(templated)) {
  var contents = await fs.readFile(path.join(root, source), "utf-8");
  var template = compile(contents);
  var output = await template(context);
  await fs.writeFile(dest, output);
  console.log(`  - wrote ${dest}`)
}

await fs.mkdir("data", { recursive: true });
await fs.mkdir("src/assets/synced", { recursive: true });

console.log("Installing dependencies from npm...");
await run("npm install");

console.log("All set!");