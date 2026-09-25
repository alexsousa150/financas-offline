/**
 * Script de Automação de Release
 * Execução: node scripts/release.js [patch|minor|major]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tipo = process.argv[2] || 'patch';

const packagePath = path.resolve(__dirname, '../package.json');
const appJsonPath = path.resolve(__dirname, '../app.json');
const versionTsPath = path.resolve(__dirname, '../src/utils/version.ts');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const partes = pkg.version.split('.').map(Number);
let [major, minor, patch] = partes;

if (tipo === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (tipo === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const novaVersao = `${major}.${minor}.${patch}`;
const novoBuild = (appJson.expo.android.versionCode || 1) + 1;

console.log(`\n🚀 Atualizando versão de ${pkg.version} -> ${novaVersao} (Build ${novoBuild})...\n`);

// Atualiza package.json
pkg.version = novaVersao;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

// Atualiza app.json
appJson.expo.version = novaVersao;
appJson.expo.android.versionCode = novoBuild;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// Atualiza src/utils/version.ts
const versionTsContent = `/**
 * Informações de versão e build da aplicação.
 * Atualize este arquivo sempre que lançar uma nova versão.
 */
export const APP_VERSION = '${novaVersao}';
export const APP_BUILD = ${novoBuild};
`;
fs.writeFileSync(versionTsPath, versionTsContent);

console.log(`✅ Arquivos de versão atualizados!`);
console.log(`📝 Lembre-se de registrar as alterações no CHANGELOG.md.`);
console.log(`💡 Para criar tag e enviar ao GitHub:`);
console.log(`   git commit -am "chore: release v${novaVersao}"`);
console.log(`   git tag -a v${novaVersao} -m "Release v${novaVersao}"`);
console.log(`   git push origin main --tags`);
console.log(`📱 Para gerar o APK no EAS:`);
console.log(`   npx eas build -p android --profile preview\n`);
