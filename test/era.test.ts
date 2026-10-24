import test from 'node:test';
import assert from 'node:assert/strict';
import { assignLanes, label, spotify } from '../web/src/lib/era';
import { ndjsonParser } from '../web/src/lib/ndjson';
import type { Item } from '../src/engine';

const song = (over: Partial<Item> = {}): Item => ({ id: 'i', kind: 'song', code: 'A1', title: 'T', by: 'B', genres: [], themes: [], year: 1966, age: 20, ages: [20, 20], found: false, notes: [], ...over });

test('markers close together move to another lane, distant ones share a lane', () => {
  assert.deepEqual(assignLanes([10, 11, 25, 26, 40], 2.6), [0, 1, 0, 1, 0]);
  assert.deepEqual(assignLanes([], 2.6), []);
  assert.deepEqual(assignLanes([5, 5, 5], 1), [0, 1, 2], 'identical positions each need their own lane');
});
test('labels: dated songs, career spans, and films read honestly', () => {
  assert.equal(label(song(), 'Margaret'), '1966. Margaret was 20');
  assert.equal(label(song(), undefined), '1966. They were 20');
  assert.equal(label(song({ ages: [10, 30], active: '1914 to 1971' })), 'Active 1914 to 1971');
  assert.equal(label(song({ ages: [10, 30] })), '');
  assert.equal(label(song({ kind: 'film', year: 1965, age: 18 })), 'Film, 1965. They were 18');
});
test('search links encode the title and artist', () => assert.equal(spotify(song({ title: 'Café & Co', by: 'Édith' })), 'https://open.spotify.com/search/Caf%C3%A9%20%26%20Co%20%C3%89dith'));

test('ndjson parser handles lines split across chunks, blank lines, and reports a cut-off line', () => {
  const seen: unknown[] = []; const p = ndjsonParser(v => seen.push(v));
  p.push('{"a":1}\n{"b"'); p.push(':2}\n\n{"c":3}\n');
  assert.deepEqual(seen, [{ a: 1 }, { b: 2 }, { c: 3 }]);
  assert.equal(p.rest(), '');
  p.push('{"half":'); assert.equal(p.rest(), '{"half":');
  assert.throws(() => ndjsonParser(() => {}).push('not json\n'));
});
