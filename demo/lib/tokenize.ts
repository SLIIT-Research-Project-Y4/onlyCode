import type { Token } from "./types";

const KW =
  "def|class|return|if|elif|else|for|while|in|not|is|and|or|None|True|False|import|from|raise|continue|break|as|with|try|except|lambda|set|float|print";
const KW_RE = new RegExp(`^(?:${KW})$`);
const TOKEN_RE = new RegExp(
  `(#[^\\n]*)|("""[\\s\\S]*?"""|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|\\b(?:${KW})\\b|\\b\\d+\\.?\\d*\\b|\\b[A-Za-z_]\\w*(?=\\()`,
  "g",
);

export function tokenizeLine(src: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  const push = (text: string, cls?: Token["cls"]) => {
    if (text) out.push({ text, cls });
  };
  while ((m = TOKEN_RE.exec(src)) !== null) {
    push(src.slice(last, m.index));
    const tk = m[0];
    if (m[1]) push(tk, "comment");
    else if (m[2]) push(tk, "string");
    else if (/^[\d.]+$/.test(tk)) push(tk, "num");
    else if (KW_RE.test(tk)) push(tk, "kw");
    else push(tk, "fn");
    last = m.index + tk.length;
  }
  push(src.slice(last));
  return out;
}
