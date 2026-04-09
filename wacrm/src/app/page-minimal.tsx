// Minimal test page
export default async function HomePage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>✅ Crebo is Live!</h1>
      <p>If you see this, the 404 is fixed.</p>
      <a href="/login" style={{ marginTop: '20px', display: 'inline-block', padding: '10px 20px', backgroundColor: '#06804f', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
        Sign In
      </a>
    </div>
  );
}
