import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const deals = [
    {
      title: "Website corporativo",
      company: "Acme Ltda",
      contact: "Mariana Souza",
      value: 18000,
      dueDate: new Date(Date.now() + 7*24*60*60*1000),
      priority: "HIGH",
      notes: "Cliente com urgência",
      stage: "LEAD",
      orderIndex: 0
    },
    {
      title: "Sistema interno",
      company: "BetaTech",
      contact: "Carlos Lima",
      value: 42000,
      dueDate: new Date(Date.now() + 15*24*60*60*1000),
      priority: "MEDIUM",
      notes: "Precisa de proposta detalhada",
      stage: "QUALIFIED",
      orderIndex: 0
    },
    {
      title: "Consultoria Analytics",
      company: "DataWave",
      contact: "Ana Paula",
      value: 22000,
      dueDate: new Date(Date.now() + 30*24*60*60*1000),
      priority: "LOW",
      notes: "Retorno por e-mail",
      stage: "PROPOSAL",
      orderIndex: 0
    },
    {
      title: "App Mobile",
      company: "GigaSoft",
      contact: "Rafael Dias",
      value: 65000,
      dueDate: new Date(Date.now() + 20*24*60*60*1000),
      priority: "HIGH",
      notes: "Negociação de escopo",
      stage: "NEGOTIATION",
      orderIndex: 0
    },
    {
      title: "Manutenção anual",
      company: "Omega Inc",
      contact: "Beatriz Rocha",
      value: 12000,
      dueDate: new Date(Date.now() + 5*24*60*60*1000),
      priority: "MEDIUM",
      notes: "Fechado com desconto",
      stage: "WON",
      orderIndex: 0
    }
  ];

  for (const d of deals) {
    await prisma.deal.create({ data: d });
  }
  console.log("Seed concluído ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
