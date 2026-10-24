export function Privacy() {
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 24, paddingBottom: 80, maxWidth: 720 }}>
      <h1 style={{ fontSize: 'clamp(44px, 8vw, 72px)' }}>Privacy</h1>
      <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
        <p>Memory Lane asks for a birth year, up to three artist names, an optional first name, and the one-line notes you choose to write. It does not ask about health, diagnosis or location, and there are no accounts.</p>
        <p>A session is stored for 30 days so you can come back to it and print the Memory Book. It holds those inputs, the songs and shows chosen, your reactions and your notes. Delete it from the Memory Book at any time and it is gone. Please do not write medical details in a note.</p>
        <p>Artist lookups go to Qloo. Audio previews and cover art come from Apple's iTunes Search. Cached lookups stay on the server and are not shared.</p>
        <p>Memory Lane is an activity planner for family caregivers. It is not therapy and gives no medical advice.</p>
      </div>
    </main>
  );
}
