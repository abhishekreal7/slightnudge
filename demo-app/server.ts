import http from 'http';

export function createBenchmarkServer(port: number = 3100): Promise<http.Server> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buggy Acme SaaS - Benchmark App</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 20px; background: #f9fafb; color: #111827; }
    .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
    /* DELIBERATE BUG 3: Mobile overflow bug */
    .wide-table-container {
      width: 780px;
      min-width: 780px;
      background: #e5e7eb;
      padding: 16px;
      border-radius: 6px;
      border: 2px dashed #9ca3af;
    }
    input, button { padding: 8px 12px; margin: 6px 0; border: 1px solid #d1d5db; border-radius: 4px; }
    button { background: #2563eb; color: white; cursor: pointer; border: none; }
    .error { color: #dc2626; font-size: 14px; }
  </style>
</head>
<body>
  <header>
    <h1>Buggy Acme SaaS</h1>
    <p>Welcome to Acme SaaS platform testing ground.</p>
  </header>

  <main>
    <!-- Feature 1: Broken Form Validation (Bug 1) -->
    <div class="card">
      <h2>Create Account (Broken Validation)</h2>
      <form id="signup-form">
        <label for="email">Email address:</label><br>
        <!-- Deliberate lack of type="email" and pattern validation -->
        <input id="email" name="email" placeholder="not-an-email"><br>
        <label for="password">Password:</label><br>
        <input id="password" name="password" type="password" placeholder="Pass"><br>
        <button type="submit" id="submit-signup">Register Now</button>
      </form>
      <div id="signup-result"></div>
    </div>

    <!-- Feature 2: 500 Network Failure Endpoint (Bug 2) -->
    <div class="card">
      <h2>Subscribe / Checkout (Fails with 500)</h2>
      <p>Click below to test backend billing integration:</p>
      <button id="btn-checkout">Submit Checkout</button>
      <div id="checkout-result"></div>
    </div>

    <!-- Feature 3: Deliberate Console Error (Bug 4) -->
    <div class="card">
      <h2>Analytics & Feature Flags (Fires Console Error)</h2>
      <button id="btn-analytics">Track Conversion Event</button>
    </div>

    <!-- Feature 4: Deliberate Mobile Overflow (Bug 3) -->
    <div class="card">
      <h2>Pricing Matrix (Deliberate Fixed-Width Mobile Overflow)</h2>
      <div class="wide-table-container">
        <table>
          <tr><th>Feature Tier</th><th>Monthly Price</th><th>Bandwidth</th><th>Dedicated Support</th></tr>
          <tr><td>Starter</td><td>$19/mo</td><td>100 GB</td><td>Email only</td></tr>
          <tr><td>Pro Enterprise</td><td>$99/mo</td><td>10,000 GB</td><td>24/7 Phone & Slack</td></tr>
        </table>
      </div>
    </div>
  </main>

  <script>
    // Trigger deliberate console error on page load or on click
    console.error("Uncaught TypeError: Cannot read properties of undefined (reading 'telemetry_config')");

    document.getElementById('btn-analytics').addEventListener('click', () => {
      console.error("Unhandled Promise Rejection: Network request to https://analytics.internal/event failed with CORS error");
      alert("Triggered console error!");
    });

    document.getElementById('signup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      // DELIBERATE BUG 1: Accepts invalid email and empty passwords with zero validation feedback
      document.getElementById('signup-result').innerText = "Account created with email: " + email;
    });

    document.getElementById('btn-checkout').addEventListener('click', async () => {
      try {
        const resp = await fetch('/api/checkout', { method: 'POST' });
        if (!resp.ok) {
          document.getElementById('checkout-result').innerHTML = '<span class="error">Checkout error HTTP ' + resp.status + '</span>';
        }
      } catch (e) {
        document.getElementById('checkout-result').innerHTML = '<span class="error">Network error: ' + e.message + '</span>';
      }
    });
  </script>
</body>
</html>`;

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/checkout' && req.method === 'POST') {
        // DELIBERATE BUG 2: 500 Internal Server Error
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error: Database pool exhausted', code: 'DB_ERR_500' }));
        return;
      }

      if (req.url === '/' || req.url?.startsWith('/?')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  createBenchmarkServer(3100).then(() => {
    console.log('Buggy benchmark server running at http://localhost:3100');
  });
}
