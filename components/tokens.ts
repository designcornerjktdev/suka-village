/**
 * Splits copy into words, carrying an emphasis flag for words wrapped in
 * asterisks: "a day that *filled itself*." becomes six words with the last two
 * flagged. Emphasis can span words and can end before trailing punctuation.
 *
 * It exists so the dictionary can mark the one or two words per heading that
 * should turn to serif italic, without anyone writing JSX in content files.
 */
export type Token = { word: string; emph: boolean };

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let open = false;
  for (const raw of text.split(" ")) {
    if (!raw) continue;
    let word = raw;
    let emph = open;
    if (word.startsWith("*")) {
      word = word.slice(1);
      emph = true;
      open = true;
    }
    const close = word.match(/\*([^A-Za-z0-9]*)$/);
    if (close) {
      word = word.slice(0, close.index) + close[1];
      open = false;
    }
    out.push({ word, emph });
  }
  return out;
}

/** The same text with its markers removed, for aria-label and metadata. */
export function plain(text: string) {
  return text.replace(/\*/g, "");
}
