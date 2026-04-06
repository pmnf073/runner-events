// Seed remoto com corridas reais de Portugal
const BASE = 'https://runner-events-api.onrender.com';

async function login() {
  const lr = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alvercaurbanrunners@gmail.com', password: 'Testing!123' })
  });
  const ld = await lr.json();
  if (!ld.token) { console.error('Login failed:', ld); process.exit(1); }
  console.log('Auth OK (role: ' + JSON.parse(atob(ld.token.split('.')[1])).role + ')');
  return ld.token;
}

async function seed(token) {
  const events = [
    // Abril 2026
    {
      title: 'Corrida da Cidade de Loures',
      type: 'race',
      date: '2026-04-12T09:00:00Z',
      endDate: '2026-04-12T12:00:00Z',
      location: 'Loures',
      description: 'Prova de 5km e 10km pelas ruas de Loures. Aberta a todos os runners. Inscricoes no local.',
      distance: 10,
      elevation: 50,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Trail da Ota',
      type: 'trail',
      date: '2026-04-19T08:00:00Z',
      endDate: '2026-04-19T13:00:00Z',
      location: 'Ota, Alenquer',
      description: 'Trilho de 18km pela serra da Ota com vista para o Tejo. Nivel medio-dificil.',
      distance: 18,
      elevation: 420,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Treino Urbano - Circuito Vermelho',
      type: 'training',
      date: '2026-04-22T18:00:00Z',
      endDate: '2026-04-22T19:00:00Z',
      location: 'Estacao de Alverca',
      description: 'Treino semanal do grupo. Encontro no parque da estacao de Alverca.',
      distance: 5
    },
    {
      title: 'Corrida do Tejo - Sacavem',
      type: 'race',
      date: '2026-04-26T09:00:00Z',
      endDate: '2026-04-26T11:00:00Z',
      location: 'Parque Ribeirinho, Sacavem',
      description: 'Prova solidaria de 10km ao longo da marginal do Tejo. Percurso plano e rapido.',
      distance: 10,
      elevation: 30,
      url: 'https://portugalrunning.com'
    },
    // Maio 2026
    {
      title: 'Meia Maratona do Tejo',
      type: 'race',
      date: '2026-05-03T08:30:00Z',
      endDate: '2026-05-03T12:00:00Z',
      location: 'Lisboa',
      description: 'Meia maratona de 21km ao longo da marginal do Tejo. Inscricoes abertas.',
      distance: 21.1,
      elevation: 120,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Trilho da Serra de Sintra - 15km',
      type: 'trail',
      date: '2026-05-10T08:00:00Z',
      endDate: '2026-05-10T12:00:00Z',
      location: 'Sintra',
      description: 'Trilho pelos caminhos da Serra de Sintra. Passa pela Pena e Monserrate. Dificuldade media-alta.',
      distance: 15,
      elevation: 520,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Corrida de Alverca - Prova Oficial',
      type: 'race',
      date: '2026-05-17T09:00:00Z',
      endDate: '2026-05-17T11:00:00Z',
      location: 'Alverca do Ribatejo',
      description: 'Prova oficial organizada pelo grupo. Percurso de 8km urbano. Aberta a todos.',
      distance: 8,
      elevation: 40,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Corrida Noturna de Vila Franca',
      type: 'race',
      date: '2026-05-24T21:00:00Z',
      endDate: '2026-05-24T23:00:00Z',
      location: 'Vila Franca de Xira',
      description: 'Corrida noturna de 5km pelas ruas de Vila Franca. Passe de peito obrigatorio.',
      distance: 5,
      elevation: 20
    },
    // Junho 2026
    {
      title: 'Trail dos 7 Vales - Carregado',
      type: 'trail',
      date: '2026-06-07T08:00:00Z',
      endDate: '2026-06-07T13:00:00Z',
      location: 'Carregado, Alenquer',
      description: 'Trilho de 22km pelos 7 vales da regiao de Alenquer. Circuito de elevada dificuldade tecnica.',
      distance: 22,
      elevation: 680,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Corrida de Lisboa - Meia Maratona',
      type: 'race',
      date: '2026-06-14T09:00:00Z',
      endDate: '2026-06-14T13:00:00Z',
      location: 'Lisboa',
      description: 'Meia maratona de Lisboa. Percurso pela marginal. Prova ITRA.',
      distance: 21.1,
      elevation: 150,
      url: 'https://portugalrunning.com'
    },
    {
      title: 'Treino de Verao - Circuito Azul',
      type: 'training',
      date: '2026-06-21T07:30:00Z',
      endDate: '2026-06-21T08:30:00',
      location: 'Parque da Vila, Alverca',
      description: 'Treino matinal de verao. Circuito azul - 7km com intervalos. Levar agua!',
      distance: 7
    },
  ];

  console.log('\nCreating ' + events.length + ' events...\n');
  let created = 0;
  for (const ev of events) {
    try {
      const r = await fetch(`${BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(ev)
      });
      const d = await r.json();
      if (r.ok) {
        console.log('  OK: ' + ev.title);
        created++;
      } else {
        console.error('  FAIL: ' + ev.title + ' - ' + JSON.stringify(d));
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error('  ERR: ' + ev.title + ' - ' + e.message);
    }
  }
  console.log('\nDone! ' + created + '/' + events.length + ' events created.');
}

(async () => {
  const token = await login();
  await seed(token);
})();
