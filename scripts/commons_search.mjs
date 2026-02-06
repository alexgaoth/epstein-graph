async function commonsSearch(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json&origin=*`;
  const r = await fetch(url);
  const d = await r.json();
  const pages = d.query?.pages;
  if (!pages) { console.log(query + ': NONE'); return; }
  for (const p of Object.values(pages)) {
    const thumb = p.imageinfo?.[0]?.thumburl;
    if (thumb && /\.(jpg|png|JPG|jpeg)$/i.test(thumb)) {
      console.log(query + ': ' + thumb);
      return;
    }
  }
  console.log(query + ': NONE');
}

const queries = [
  'Virginia Giuffre', 'Leon Black billionaire', 'Tom Pritzker',
  'Peggy Siegal', 'Jean-Luc Brunel', 'Sarah Kellen',
  'Nadia Marcinkova', 'Bradley Edwards attorney',
];
for (const q of queries) {
  await commonsSearch(q);
}
