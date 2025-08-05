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