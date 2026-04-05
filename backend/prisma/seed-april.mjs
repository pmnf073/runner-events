import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Verifica se ja existem eventos em Abril
const existing = await prisma.event.count({
  where: {
    date: { gte: new Date("2026-04-01"), lte: new Date("2026-04-30") },
  },
});

if (existing > 0) {
  console.log(`${existing} eventos ja existem em Abril. A eliminar para reimportar...`);
  await prisma.event.deleteMany({
    where: {
      date: { gte: new Date("2026-04-01"), lte: new Date("2026-04-30") },
    },
  });
}

const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
const createdBy = adminUser?.id || "system";

const events = [
  // Treinos semanais (todas as tercas e quintas)
  {
    title: "Treino Regular - Circuito",
    type: "training",
    date: new Date("2026-04-07T19:00:00"),
    location: "Parque da Cidade, Alverca",
    distance: 8,
    description: "Treino semanal de circuito. Ritmo moderado.\n\nTrazer água e calçado adequado.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Intervalos",
    type: "training",
    date: new Date("2026-04-09T19:00:00"),
    location: "Pista Municipal Alverca",
    distance: 6,
    description: "Treino de intervalos: 10x400m com recuperacao de 2 min.\n\nNivel intermediario/avancado.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Longo",
    type: "training",
    date: new Date("2026-04-12T08:00:00"),
    location: "Passeio Ribeirinho, Vila Franca de Xira",
    distance: 12,
    description: "Rodagem longa ao ritmo de conversa.\n\nIdeal para preparar meia maratona.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Fartlek",
    type: "training",
    date: new Date("2026-04-14T19:00:00"),
    location: "Parque da Cidade, Alverca",
    distance: 7,
    description: "Fartlek: variacoes de ritmo durante o percurso.\n\nTodos os niveis bem-vindos.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Colinas",
    type: "training",
    date: new Date("2026-04-16T19:00:00"),
    location: "Elevador da Mata, Alverca",
    distance: 6,
    elevation: 120,
    description: "Treino de subidas. Foco na forca e tecnica.\n\nPreparar para trilhos.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Tempo Run",
    type: "training",
    date: new Date("2026-04-21T19:00:00"),
    location: "Passeio Ribeirinho, Vila Franca de Xira",
    distance: 10,
    description: "5 km aquecimento + 3 km ritmo de prova + 2 km recuperacao.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Regenerativo",
    type: "training",
    date: new Date("2026-04-23T19:00:00"),
    location: "Parque da Cidade, Alverca",
    distance: 5,
    description: "Corrida regenerativa a ritmo muito lento.\n\nRecuperacao activa.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Progressivo",
    type: "training",
    date: new Date("2026-04-28T19:00:00"),
    location: "Passeio Ribeirinho, Vila Franca de Xira",
    distance: 8,
    description: "Progressivo: comecar devagar e acelerar a cada 2 km.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Treino Regular - Intervalos Curto",
    type: "training",
    date: new Date("2026-04-30T19:00:00"),
    location: "Pista Municipal Alverca",
    distance: 5,
    description: "200m rapidos x 10, com 90s recuperacao.\n\nTreino de velocidade.",
    club: "Alverca Urban Runners",
    createdBy,
  },

  // Provas e eventos
  {
    title: "Corrida de Alverca - 10K",
    type: "race",
    date: new Date("2026-04-05T09:00:00"),
    endDate: new Date("2026-04-05T12:00:00"),
    location: "Centro de Alverca",
    distance: 10,
    elevation: 45,
    description: "Prova oficial de 10 km de Alverca.\n\nInscricoes abertas em: https://exemplo.pt\n\nPonto de encontro as 08h no local.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Trilho da Serra da Arroja",
    type: "trail",
    date: new Date("2026-04-18T07:30:00"),
    endDate: new Date("2026-04-18T12:00:00"),
    location: "Serra da Arroja, Alhandra",
    distance: 14,
    elevation: 350,
    description: "Trilho de medio nivel pela Serra da Arroja.\n\nPercurso com subidas exigentes e vistas fantasticas.\n\nTrazer agua (min 1.5L), proteccao solar e telemovel carregado.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Meia Maratona de Lisboa",
    type: "race",
    date: new Date("2026-04-26T08:30:00"),
    endDate: new Date("2026-04-26T13:00:00"),
    location: "Lisboa",
    distance: 21.1,
    description: "Meia maratona de Lisboa.\n\nApoio do grupo - vamos juntos!\n\nPonto de encontro as 07:00 no Marques de Pombal.",
    club: "Alverca Urban Runners",
    createdBy,
  },

  // Eventos sociais
  {
    title: "Pequeno-Almoco no Cafe Central",
    type: "social",
    date: new Date("2026-04-04T10:00:00"),
    location: "Cafe Central, Alverca",
    description: "Encontro informal para pequeno-almoco.\n\nAparece para conhecer o grupo e trocar ideias sobre treinos.",
    club: "Alverca Urban Runners",
    createdBy,
  },
  {
    title: "Jantar de Grupo - Fim de Mes",
    type: "social",
    date: new Date("2026-04-30T20:00:00"),
    location: "Restaurante O Tasco, Alverca",
    description: "Jantar de confraternizacao de fim de mes.\n\nLocal: O Tasco\nConfirmar presenca para reserva.",
    club: "Alverca Urban Runners",
    createdBy,
  },

  // Reunioes
  {
    title: "Reuniao Mensal do Grupo",
    type: "meeting",
    date: new Date("2026-04-15T20:00:00"),
    endDate: new Date("2026-04-15T21:30:00"),
    location: "Sede do Grupo, Alverca",
    description: "Reuniao para discutir:\n- Objectivos do mes de Maio\n- Planeamento de provas\n- Feedback dos treinos",
    club: "Alverca Urban Runners",
    createdBy,
  },
];

console.log(`A inserir ${events.length} eventos para Abril 2026...`);

const inserted = [];
for (const evt of events) {
  const created = await prisma.event.create({ data: evt });
  inserted.push(created.title);
}

console.log("✅ Eventos criados com sucesso:");
inserted.forEach((t) => console.log(`  • ${t}`));
console.log(`\nTotal: ${inserted.length} eventos`);

await prisma.$disconnect();
