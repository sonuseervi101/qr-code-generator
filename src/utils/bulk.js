// Turns pasted text or a CSV file into a list of QR codes to generate.
// Pure logic, so it is unit-tested in bulk.test.js.
import { BULK_LIMIT } from "./constants";

// Each line becomes one QR code. With namedRows, lines look like: name,content
export function parseBulkInput(input, namedRows) {
  const rows = [];
  const problems = [];
  const usedNames = new Set();

  input.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return; // skip blank lines
    const lineNo = index + 1;
    let name = "";
    let content = line.trim();

    if (namedRows) {
      const comma = line.indexOf(",");
      if (comma === -1) {
        problems.push(`Line ${lineNo}: expected "name,content".`);
        return;
      }
      name = line.slice(0, comma).trim();
      content = stripQuotes(line.slice(comma + 1).trim());
    }

    if (!content) {
      problems.push(`Line ${lineNo}: nothing to encode.`);
      return;
    }
    if (content.length > 1000) {
      problems.push(`Line ${lineNo}: longer than 1000 characters.`);
      return;
    }

    // Safe, unique file names: "1-gdgsrm-com.png", "2-...".
    let fileName = `${rows.length + 1}-${slugify(name || content)}`;
    while (usedNames.has(fileName)) fileName += "-x";
    usedNames.add(fileName);
    rows.push({ fileName, content });
  });

  if (rows.length > BULK_LIMIT) {
    problems.push(`Only the first ${BULK_LIMIT} rows will be generated.`);
    rows.length = BULK_LIMIT;
  }
  return { rows, problems };
}

export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "qr";
}

function stripQuotes(value) {
  return value.length > 1 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replace(/""/g, '"') : value;
}
