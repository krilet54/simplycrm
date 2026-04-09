#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Regenerating Prisma Client...');
console.log('📍 Current directory:', process.cwd());

const prisma = spawn('npx', ['prisma', 'generate'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

prisma.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Prisma Client regenerated successfully!');
    console.log('📱 phoneNumber field is now available in User model');
    process.exit(0);
  } else {
    console.error('\n❌ Failed to regenerate Prisma Client');
    process.exit(1);
  }
});

prisma.on('error', (err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
