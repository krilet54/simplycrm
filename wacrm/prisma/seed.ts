// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-workspace' },
    update: {},
    create: {
      id: 'demo-workspace',
      businessName: 'My Business',
      plan: 'TRIAL',
    },
  });

  // Seed default Kanban stages
  const stages = [
    { name: 'New Lead',       color: '#6366f1', position: 0, isDefault: true },
    { name: 'In Discussion',  color: '#f59e0b', position: 1 },
    { name: 'Invoice Sent',   color: '#3b82f6', position: 2 },
    { name: 'Closed Won',     color: '#22c55e', position: 3 },
    { name: 'Closed Lost',    color: '#ef4444', position: 4 },
  ];

  for (const stage of stages) {
    await prisma.kanbanStage.upsert({
      where: { id: `${workspace.id}-${stage.position}` },
      update: {},
      create: {
        id: `${workspace.id}-${stage.position}`,
        workspaceId: workspace.id,
        ...stage,
      },
    });
  }

  // Seed default quick replies
  const quickReplies = [
    {
      shortcut: '/hello',
      title: 'Greeting',
      content: 'Hi! Thanks for reaching out. How can I help you today? 😊',
    },
    {
      shortcut: '/hours',
      title: 'Business Hours',
      content: 'We are open Monday to Friday, 9am - 6pm. We reply to all messages within 1 hour during business hours.',
    },
    {
      shortcut: '/price',
      title: 'Pricing Info',
      content: 'Thanks for your interest! Could you share more details about what you need so I can give you the right quote?',
    },
    {
      shortcut: '/thanks',
      title: 'Thank You',
      content: 'Thank you for your business! 🙏 Please don\'t hesitate to reach out if you need anything.',
    },
  ];

  for (const qr of quickReplies) {
    await prisma.quickReply.upsert({
      where: {
        workspaceId_shortcut: {
          workspaceId: workspace.id,
          shortcut: qr.shortcut,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        ...qr,
      },
    });
  }

  // Seed default tags
  const tags = [
    { name: 'VIP',             color: '#f59e0b' },
    { name: 'Supplier',        color: '#6366f1' },
    { name: 'Pending Payment', color: '#ef4444' },
    { name: 'Repeat Customer', color: '#22c55e' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: tag.name,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        ...tag,
      },
    });
  }

  console.log('✅ Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
