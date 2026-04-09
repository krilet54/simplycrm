const fs = require('fs');
const path = require('path');

const basePath = 'c:\\Users\\kirpe\\Downloads\\simplycrm\\simplycrm\\wacrm';

const directories = [
    path.join(basePath, 'src', 'app', '(marketing)'),
    path.join(basePath, 'src', 'app', '(marketing)', 'terms'),
    path.join(basePath, 'src', 'app', '(marketing)', 'privacy'),
    path.join(basePath, 'src', 'components', 'marketing'),
    path.join(basePath, 'src', 'app', 'api', 'cron', 'trial-expiry'),
    path.join(basePath, 'src', 'lib')
];

directories.forEach(dir => {
    try {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created: ' + dir);
    } catch (err) {
        console.error('Error creating ' + dir + ': ' + err.message);
    }
});

console.log('\nAll directories created successfully!');
console.log('\nYou can now run: npm run dev');
console.log('This file can be deleted: create_dirs.js');
console.log('Also delete: create_dirs.bat');
