/**
 * Structured data for search engines, as Next's own guide renders it: a plain
 * script tag in the server HTML. "<" is escaped so nothing inside a string can
 * close the tag.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
