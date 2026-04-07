const https = require('https');
https.get('https://ics.teamup.com/feed/ksqvj6k9irbm6cadp6/0.ics', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Size:', d.length, 'bytes');
    const events = (d.match(/BEGIN:VEVENT/g) || []).length;
    console.log('Events:', events);
    const start = d.indexOf('BEGIN:VEVENT');
    if (start >= 0) console.log('\nFirst event:\n' + d.substring(start, start + 600));
  });
});
