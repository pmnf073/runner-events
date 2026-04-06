import fetch from 'node-fetch';

const BASE = 'https://runner-events-api.onrender.com';

async function run() {
  // Login
  console.log('Logging in...');
  const lr = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@alvercaurbanrunners.pt', password: 'Testing!123' })
  });
  const ld = await lr.json();
  if (!ld.token) { console.error('Login failed:', ld); process.exit(1); }
  const tk = ld.token;
  console.log('Auth OK');

  // Events
  const events = [
    {
      title: 'Treino Urbano - Linha Vermelha',
      type: 'training',
      date: '2026-04-09T18:00:00Z',
      endDate: '2026-04-09T19:00:00Z',
      location: 'Estacao de Alverca',
      description: 'Treino semanal. Encontro no parque da estacao. Percurso vermelho - 5km ritmado.',
      distance: 5
    },
    {
      title: 'Trilho da Arrabida',
      type: 'trail',
      date: '2026-04-11T08:00:00Z',
      endDate: '2026-04-11T11:00:00Z',
      location: 'Serra da Arrabida',
      description: 'Trilho com vista para o Sado. Nivel medio. Levar agua e protector solar.',
      distance: 12,
      elevation: 350
    },
    {
      title: 'Prova Alverca 10K',
      type: 'race',
      date: '2026-04-12T09:00:00Z',
      endDate: '2026-04-12T11:00:00Z',
      location: 'Parque Urbano de Alverca',
      description: 'Prova de 10km. Inscricao gratuita. Ponto de encontro 08:30 no parque.',
      distance: 10
    },
    {
      title: 'Treino - Zona Industrial',
      type: 'training',
      date: '2026-04-16T18:00:00Z',
      endDate: '2026-04-16T19:00:00Z',
      location: 'Zona Industrial de Alverca',
      description: 'Percurso plano e rapido. 8km com ritmos progressivos.',
      distance: 8
    },
    {
      title: 'Corrida Social - Marginal',
      type: 'social',
      date: '2026-04-18T09:00:00Z',
      endDate: '2026-04-18T10:30:00Z',
      location: 'Parque Ribeirinho das Naus',
      description: 'Corrida leve seguida de pequeno de almoco em grupo. Todos bem-vindos!',
      distance: 5
    },
    {
      title: 'Reuniao de Grupo',
      type: 'meeting',
      date: '2026-04-19T19:00:00Z',
      endDate: '2026-04-19T20:00:00Z',
      location: 'Cafe Central, Alverca',
      description: 'Planeamento de eventos de Maio. Discussao de percursos e organizacao.',
    },
    {
      title: 'Treino Urbano - Linha Azul',
      type: 'training',
      date: '2026-04-23T18:00:00Z',
      endDate: '2026-04-23T19:00:00Z',
      location: 'Alverca do Ribatejo',
      description: 'Treino semanal - circuito azul. 7km com intervalos.',
      distance: 7
    },
    {
      title: 'Trilho de Sintra',
      type: 'trail',
      date: '2026-04-25T08:00:00Z',
      endDate: '2026-04-25T11:30:00Z',
      location: 'Serra de Sintra',
      description: 'Trilho pela Serra de Sintra. Desafio tecnico com vistas espectaculares.',
      distance: 15,
      elevation: 500
    },
    {
      title: 'Treino Urbano - Linha Verde',
      type: 'training',
      date: '2026-04-30T18:00:00Z',
      endDate: '2026-04-30T19:00:00Z',
      location: 'Alverca do Ribatejo',
      description: 'Treino semanal - circuito verde. 6km recuperacao ativa.',
      distance: 6
    }
  ];

  for (const ev of events) {
    const r = await fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
      body: JSON.stringify(ev)
    });
    const d = await r.json();
    if (r.ok) {
      console.log(`Created: ${ev.title}`);
    } else {
      console.error(`Error ${ev.title}:`, d);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\nDone!');
}

run().catch(e => { console.error(e); process.exit(1); });
