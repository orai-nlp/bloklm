const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

const envConfig = dotenv.config({ path: path.resolve(__dirname, '../../.env') }).parsed;

const targetPath = path.resolve(__dirname, '../src/environments/environment.ts');

const envFileContent = `
export const environment = {
  production: false,
  apiBaseUrl: 'http://${envConfig.API_HOST}:${envConfig.PORT}/api'
};
`;

fs.writeFileSync(targetPath, envFileContent, { encoding: 'utf8' });
console.log(`Environment file generated at ${targetPath}`);
