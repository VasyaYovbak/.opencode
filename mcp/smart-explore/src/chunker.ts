import { parseFile, formatFoldedView, detectLanguage, type CodeSymbol, type FoldedFile } from "./parser.js";

export interface Chunk {
  content: string;
  symbolName: string;
  kind: string;
  signature: string;
  lineStart: number;
  lineEnd: number;
  hashStart?: string;
  language: string;
}

const CONTAINER_KINDS = new Set(["class", "struct", "impl", "trait", "interface", "enum", "mixin"]);
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export function chunkFile(
  content: string,
  filePath: string,
  projectRoot?: string,
): Chunk[] {
  const language = detectLanguage(filePath);

  if (language === "markdown") {
    const parsed = parseFile(content, filePath, projectRoot);
    return chunkMarkdown(content, parsed);
  }

  const parsed = parseFile(content, filePath, projectRoot);
  if (parsed.symbols.length === 0) {
    return chunkByChars(content, language);
  }

  return chunkCode(content, parsed, language);
}

export function chunkFromParsed(content: string, parsed: FoldedFile): Chunk[] {
  if (parsed.language === "markdown") {
    return chunkMarkdown(content, parsed);
  }
  if (parsed.symbols.length === 0) {
    return chunkByChars(content, parsed.language);
  }
  return chunkCode(content, parsed, parsed.language);
}

function chunkCode(content: string, parsed: FoldedFile, language: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");

  const processSymbol = (sym: CodeSymbol, parent?: string): void => {
    const fullName = parent ? `${parent}.${sym.name}` : sym.name;

    if (CONTAINER_KINDS.has(sym.kind)) {
      const classFolded: FoldedFile = {
        filePath: parsed.filePath,
        language,
        symbols: [sym],
        imports: [],
        totalLines: sym.lineEnd - sym.lineStart + 1,
        foldedTokenEstimate: 0,
      };
      chunks.push({
        content: formatFoldedView(classFolded),
        symbolName: fullName,
        kind: sym.kind,
        signature: sym.signature,
        lineStart: sym.lineStart,
        lineEnd: sym.lineEnd,
        hashStart: sym.hashStart,
        language,
      });

      if (sym.children) {
        for (const child of sym.children) {
          processSymbol(child, fullName);
        }
      }
    } else {
      const body = lines.slice(sym.lineStart, sym.lineEnd + 1).join("\n");
      if (body.trim().length > 0) {
        chunks.push({
          content: body,
          symbolName: fullName,
          kind: sym.kind,
          signature: sym.signature,
          lineStart: sym.lineStart,
          lineEnd: sym.lineEnd,
          hashStart: sym.hashStart,
          language,
        });
      }

      if (sym.children) {
        for (const child of sym.children) {
          processSymbol(child, fullName);
        }
      }
    }
  };

  for (const sym of parsed.symbols) {
    processSymbol(sym);
  }

  return chunks;
}

function chunkMarkdown(content: string, parsed: FoldedFile): Chunk[] {
  if (parsed.symbols.length === 0) {
    return chunkByChars(content, "markdown");
  }

  const chunks: Chunk[] = [];
  const lines = content.split("\n");
  const sections = parsed.symbols.filter((s) => s.kind === "section");

  for (const sym of sections) {
    const hashMatch = sym.signature.match(/^(#{1,6})\s/);
    const level = hashMatch ? hashMatch[1].length : 1;

    let end = lines.length - 1;
    for (const other of sections) {
      if (other.lineStart > sym.lineStart) {
        const otherHashMatch = other.signature.match(/^(#{1,6})\s/);
        const otherLevel = otherHashMatch ? otherHashMatch[1].length : 1;
        if (otherLevel <= level) {
          end = other.lineStart - 1;
          while (end > sym.lineStart && lines[end].trim() === "") end--;
          break;
        }
      }
    }

    const sectionContent = lines.slice(sym.lineStart, end + 1).join("\n");
    if (sectionContent.trim().length > 0) {
      chunks.push({
        content: sectionContent,
        symbolName: sym.name,
        kind: "section",
        signature: sym.signature,
        lineStart: sym.lineStart,
        lineEnd: end,
        hashStart: sym.hashStart,
        language: "markdown",
      });
    }
  }


  return chunks.length > 0 ? chunks : chunkByChars(content, "markdown");
}

function chunkByChars(content: string, language: string): Chunk[] {
  const lines = content.split("\n");
  if (content.trim().length === 0) return [];

  if (content.length <= CHUNK_SIZE) {
    return [
      {
        content,
        symbolName: "",
        kind: "text",
        signature: "",
        lineStart: 0,
        lineEnd: lines.length - 1,
        language,
      },
    ];
  }

  const breakPoints: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") breakPoints.push(i);
  }

  const chunks: Chunk[] = [];
  let startLine = 0;

  while (startLine < lines.length) {
    let charCount = 0;
    let endLine = startLine;
    while (endLine < lines.length && charCount < CHUNK_SIZE) {
      charCount += lines[endLine].length + 1;
      endLine++;
    }

    if (endLine < lines.length) {
      let bestBreak = -1;
      for (const bp of breakPoints) {
        if (bp >= startLine && bp < endLine) bestBreak = bp;
      }
      if (bestBreak >= 0 && bestBreak > startLine) {
        endLine = bestBreak + 1;
      }
    }

    let overlapStart = startLine;
    if (startLine > 0) {
      let overlapChars = 0;
      let back = startLine - 1;
      while (back >= 0 && overlapChars < CHUNK_OVERLAP) {
        overlapChars += lines[back].length + 1;
        back--;
      }
      overlapStart = back + 1;
    }

    const chunkContent = lines.slice(overlapStart, endLine).join("\n");
    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent,
        symbolName: "",
        kind: "text",
        signature: "",
        lineStart: startLine,
        lineEnd: endLine - 1,
        language,
      });
    }

    startLine = endLine;
  }

  return chunks;
}
