const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3');

const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.serialize(() => {
  // Check schema
  db.all("PRAGMA table_info('installed_packages')", (err, cols) => {
    if (err) { console.error('pragma error:', err); return; }
    console.log('installed_packages cols:', cols.map(c => c.name).join(', '));
  });

  db.all("PRAGMA table_info('installed_nodes')", (err, cols) => {
    if (err) { console.error('pragma error:', err); return; }
    console.log('installed_nodes cols:', cols.map(c => c.name).join(', '));
  });

  // Check existing
  db.all("SELECT * FROM installed_packages WHERE packageName = 'n8n-nodes-resend'", (err, rows) => {
    if (err) { console.error('select error:', err); return; }
    console.log('Existing:', JSON.stringify(rows));

    if (rows.length === 0) {
      const pkg = require('/home/node/.n8n/nodes/node_modules/n8n-nodes-resend/package.json');
      const now = new Date().toISOString();

      db.run(
        "INSERT INTO installed_packages (packageName, installedVersion, authorName, authorEmail, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
        ['n8n-nodes-resend', pkg.version, null, null, now, now],
        function(err) {
          if (err) {
            console.error('INSERT installed_packages error:', err.message);
            db.close();
          } else {
            const pkgId = this.lastID;
            console.log('SUCCESS: Registered package, id =', pkgId, 'version =', pkg.version);

            // Register the node
            db.run(
              "INSERT INTO installed_nodes (name, type, latestVersion, package) VALUES (?, ?, ?, ?)",
              ['Resend', 'n8n-nodes-resend.resend', 1, 'n8n-nodes-resend'],
              function(err2) {
                if (err2) { console.error('INSERT installed_nodes error:', err2.message); }
                else { console.log('SUCCESS: Registered node!'); }
                db.close();
              }
            );
          }
        }
      );
    } else {
      console.log('Already registered.');
      db.close();
    }
  });
});
