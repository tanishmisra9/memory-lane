// Parses a stream of newline-delimited JSON that arrives in arbitrary chunks. Pure so it can be tested without a browser.
export function ndjsonParser(onLine: (value: unknown) => void) {
  let buffer = '';
  return {
    push(chunk: string) {
      buffer += chunk;
      let at: number;
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1);
        if (line) onLine(JSON.parse(line));
      }
    },
    // A well-formed stream ends with a newline; anything left over is a line that was cut off.
    rest() { return buffer.trim(); },
  };
}
