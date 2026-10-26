import { Fragment } from "react";
import { tokenize } from "./tokens";

/**
 * Renders copy with its *marked* words set in serif italic. Static; use it
 * where a heading should not animate.
 */
export default function Emph({ text }: { text: string }) {
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((t, i) => (
        <Fragment key={i}>
          {t.emph ? <em className="sv-accent">{t.word}</em> : t.word}
          {i < tokens.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
