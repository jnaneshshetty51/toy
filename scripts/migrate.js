import { migrateUp, migrateDown, migrationStatus } from '../server/migrator.js';

const command = process.argv[2] || 'up';

async function run() {
  console.log(`🚀 ToyVerse Migration Runner [Action: ${command.toUpperCase()}]`);

  if (command === 'up') {
    const res = await migrateUp();
    console.log(`\n🎉 Applied ${res.applied.length} migration(s).`);
  } else if (command === 'down' || command === 'rollback') {
    const res = await migrateDown();
    console.log(`\n⏪ Rolled back ${res.rolledBack.length} migration(s).`);
  } else if (command === 'status') {
    const list = await migrationStatus();
    console.log('\nMigration Status:');
    console.table(list);
  } else {
    console.error(`Unknown command: ${command}. Use 'up', 'down', or 'status'.`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('\n❌ Migration error:', err);
  process.exit(1);
});
