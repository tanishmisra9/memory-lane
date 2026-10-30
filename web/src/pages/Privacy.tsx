export function Privacy() {
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <div className="col" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 'clamp(44px, 8vw, 72px)' }}>Privacy</h1>
        <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
          <p>Memory Lane asks for a birth year, up to three artist names, an optional first name, an optional city, and the one-line notes you choose to write. The city is only used to find a restaurant near them: give a city name, never an address. It does not ask about health or diagnosis, and there are no accounts.</p>
          <p>A session is stored for 30 days so you can come back to it and print the Memory Book. It holds those inputs, the songs and shows chosen, your reactions and your notes. Delete it from the Memory Book at any time and it is gone. Please do not write medical details in a note.</p>
          <p>What goes to Qloo: the artist names, release-year ranges worked out from the birth year, and the city if you give one. The first name and your notes never go to Qloo. What you type in Tell the agent goes to the agent (Cloudflare Workers AI), so please keep names and medical details out of it. Audio previews and cover art come from Apple's iTunes Search, which receives song and artist names. Cached lookups stay on the server and are not shared.</p>
          <p>Qloo describes what groups of people tend to like, not what one person will do. You know the person, so you decide what to play.</p>
          <p>Memory Lane is an activity planner for family caregivers. It is not therapy and gives no medical advice.</p>
        </div>
      </div>
    </main>
  );
}
