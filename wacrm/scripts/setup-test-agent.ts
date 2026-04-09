import { db } from '@/lib/db';

async function setupTestAgent() {
  try {
    console.log('Setting up test agent account...\n');

    // 1. Create workspace
    const workspace = await db.workspace.create({
      data: {
        businessName: 'microsite studio',
      },
    });
    console.log('✅ Workspace created:', workspace.businessName);
    console.log('   ID:', workspace.id);

    // 2. Create agent user
    // Note: This creates a DB user record, but the Supabase auth user needs to exist separately
    // For testing, we'll create a pending/test user record
    const agent = await db.user.create({
      data: {
        workspaceId: workspace.id,
        supabaseId: 'test_agent_kirpesh', // Placeholder - would need real Supabase user
        name: 'Agent Test',
        email: 'kirpessh54@gmail.com',
        role: 'AGENT',
      },
    });
    console.log('\n✅ Agent user created:');
    console.log('   Name:', agent.name);
    console.log('   Email:', agent.email);
    console.log('   Role:', agent.role);
    console.log('   Workspace ID:', agent.workspaceId);

    console.log('\n📝 Setup Summary:');
    console.log('   Workspace: microsite studio');
    console.log('   Email: kirpessh54@gmail.com');
    console.log('   Role: AGENT');
    console.log('   Password: 123456789 (set this up in Supabase Auth)');
    console.log('\n⚠️  NOTE: The Supabase Auth user needs to be created separately.');
    console.log('   You would need to create it via Supabase console or auth API.');

  } catch (error) {
    console.error('Error setting up test agent:', error);
  }
}

setupTestAgent();
