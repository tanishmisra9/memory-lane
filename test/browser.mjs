// Real-browser check of the whole product against a running server (default http://localhost:8787, live Qloo).
// Uses installed Chrome when present so audio actually plays; falls back to Playwright's Chromium.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://localhost:8787', shots = process.env.SHOTS;
let browser; try { browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] }); } catch { browser = await chromium.launch(); }
const reducedMotion = 'reduce';
const step = name => console.log('ok', name);

async function guards(page, name) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no horizontal scroll`);
  const bad = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => parseFloat(getComputedStyle(el).borderTopLeftRadius) > 8).map(el => el.tagName + '.' + el.className));
  assert.deepEqual(bad, [], `${name}: no rounded or pill shapes`);
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a.btn, input:not([type=range]), select, textarea, [role=slider]')].filter(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && cs.visibility !== 'hidden' && !el.closest('[inert]') && r.height < 43.5; }).map(el => (el.getAttribute('aria-label') || el.textContent || el.id).slice(0, 30)));
  assert.deepEqual(small, [], `${name}: every control is at least 44px tall`);
}

try {
  for (const [name, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion }), page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && !/fonts\.(googleapis|gstatic)|favicon/.test(m.location().url) && !(/status of 404/.test(m.text()) && /\/api\/sessions\//.test(m.location().url)) /* the deleted session's 404 is expected */ && errors.push(`${m.text()} ${m.location().url}`));

    // 1. Landing: the one action is on the first screen.
    await page.goto(base + '/');
    const cta = page.getByRole('link', { name: 'Start a session' });
    await cta.waitFor(); const box = await cta.boundingBox();
    assert.ok(box && box.y + box.height <= height, `${name}: the Start button is visible without scrolling`);
    await guards(page, `${name} landing`); if (shots) await page.screenshot({ path: `${shots}/${name}-landing.png` });
    step(`${name} landing`);

    // 2. Theme toggle persists across a reload.
    await page.getByRole('button', { name: /dark theme/ }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.reload(); assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.getByRole('button', { name: /light theme/ }).click(); step(`${name} theme`);

    // 3. Wizard with validation, the starter shelf, and a live streamed build.
    await cta.click(); await page.getByRole('heading', { name: 'Who is it for?' }).waitFor();
    await page.fill('#name', 'Eleni'); await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click(); assert.match(await page.locator('[role=alert]').first().innerText(), /year from 1920 to 1975/);
    await page.fill('#born', '1947'); assert.match(await page.locator('#born-help').innerText(), /1957 to 1977/);
    await page.getByRole('button', { name: 'Next' }).click(); await page.getByRole('heading', { name: /Which artists/ }).waitFor();
    await page.getByRole('button', { name: 'Find their music' }).click(); assert.match(await page.locator('[role=alert]').first().innerText(), /at least one artist/);
    await page.selectOption('#shelf', 'greece'); await page.getByRole('list', { name: 'Chosen artists' }).waitFor();
    await page.getByRole('button', { name: 'Find their music' }).click();
    await page.getByText(/Looking through Qloo/).waitFor(); // the tuning screen
    await page.waitForURL(/\/app\/[a-f0-9-]{36}$/, { timeout: 120000 });
    const id = page.url().split('/').pop(); step(`${name} wizard to player`);

    // 4. Player: audio plays, keyboard works, reactions behave.
    await page.locator('[aria-current=step]').waitFor(); // the player itself, not the tuning screen it replaces
    await guards(page, `${name} player`); if (shots) await page.screenshot({ path: `${shots}/${name}-player.png` });
    const title = () => page.getByRole('heading', { level: 1 }).first().textContent();
    const first = await title();
    await page.getByRole('button', { name: 'Play' }).click();
    await page.waitForFunction(() => document.querySelector('[role=slider]')?.getAttribute('aria-valuenow') !== '0' || false, null, { timeout: 8000 }).catch(() => {});
    const playing = await page.getByRole('button', { name: 'Pause' }).count(), blocked = await page.getByText(/would not load|blocked/).count();
    assert.ok(playing === 1 || blocked === 1, `${name}: play either starts or says why it could not`);
    console.log('  audio:', playing ? 'playing' : 'blocked'); if (playing) { await page.waitForTimeout(1500); assert.ok(Number(await page.locator('[role=slider]').getAttribute('aria-valuenow')) > 0, `${name}: the progress moves while it plays`); }
    await page.keyboard.press('ArrowRight'); await page.waitForFunction(t => document.querySelector('h1')?.textContent !== t, first);
    assert.equal(await page.locator('[aria-current=step]').innerText(), 'A2'); await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(t => document.querySelector('h1')?.textContent === t, first);
    step(`${name} audio and keyboard`);

    // W opens the drawer; Escape closes it and focus returns.
    await page.keyboard.press('w'); await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#app-main').getAttribute('inert'), '', `${name}: the page behind the drawer is inert`);
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' }); step(`${name} why drawer`);

    // Upset swaps the song in the same slot; the swapped song is remembered for care staff.
    await page.keyboard.press('3'); await page.waitForFunction(t => document.querySelector('h1')?.textContent !== t, first, { timeout: 60000 });
    assert.equal(await page.locator('[aria-current=step]').innerText(), 'A1'); const second = await title();
    // Smiled opens a note; save it and move on.
    await page.keyboard.press('1'); await page.locator('#note').waitFor(); await page.fill('#note', 'Danced to this at their wedding');
    await page.getByRole('button', { name: 'Save and continue' }).click(); // blur and click both flush: must not conflict
    await page.waitForFunction(t => document.querySelector('h1')?.textContent !== t, second);
    step(`${name} reactions and notes`);

    // Walk to the end: jump to the last item, react, finish.
    await page.getByRole('button', { name: /^B2:/ }).click(); await page.waitForFunction(() => document.querySelector('[aria-current=step]')?.textContent === 'B2');
    await page.keyboard.press('2'); await page.getByRole('button', { name: 'Save and finish' }).click();
    await page.getByRole('heading', { name: 'Your Memory Book is ready' }).waitFor(); step(`${name} finish`);

    // 5. Memory Book: what came out.
    await page.getByRole('link', { name: 'Open the Memory Book' }).click(); await page.getByRole('heading', { name: /Memory Book/ }).first().waitFor();
    await page.getByText('For family and care staff').waitFor();
    const book = await page.locator('main').innerText();
    assert.match(book, /eleni's memory book/i); assert.match(book, /Danced to this at their wedding/); assert.match(book, /Worked\s+Eleni smiled/i); assert.match(book, /Avoid\s+.*upset Eleni/is);
    assert.ok(await page.getByRole('button', { name: 'Print or save as PDF' }).count() === 1);
    assert.ok(await page.locator('a[href^="https://open.spotify.com/search/"]').count() >= 4, `${name}: every song links onward, once, in Keep playing`);
    await guards(page, `${name} book`); if (shots) await page.screenshot({ path: `${shots}/${name}-book.png`, fullPage: true });
    step(`${name} memory book`);

    // 6. Reload restores the session; delete removes it everywhere.
    await page.goto(`${base}/app/${id}`); await page.getByRole('heading', { level: 1 }).first().waitFor();
    await page.goto(`${base}/book/${id}`); await page.getByText('Delete this Memory Book').click(); await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(base + '/'); assert.equal((await fetch(`${base}/api/sessions/${id}`)).status, 404);
    await page.goto(`${base}/app/${id}`); await page.getByRole('heading', { name: 'That session is gone' }).waitFor(); step(`${name} reload and delete`);
    assert.deepEqual(errors, [], `${name}: no console errors`);
    await ctx.close();
  }

  // 7. One-tap example goes straight to the player.
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion })).newPage();
  await page.goto(base + '/'); await page.getByRole('link', { name: 'Greece, 1947' }).click();
  await page.waitForURL(/\/app\/[a-f0-9-]{36}$/, { timeout: 120000 }); await page.getByRole('button', { name: 'Play' }).waitFor(); step('one-tap example');
  // Unknown page.
  await page.goto(base + '/nope'); await page.getByRole('heading', { name: 'That session is gone' }).waitFor(); step('unknown route');
  console.log('Browser flow passed');
} finally { await browser.close(); }
