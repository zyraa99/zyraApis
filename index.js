import express from 'express';
import chalk from 'chalk';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 4000;

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/src', express.static(path.join(__dirname, 'src')));

const settingsPath = path.join(__dirname, './src/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status,
                creator: settings.apiSettings.creator || "Created Using Rynn UI",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');

const loadRoutes = async () => {
    const subfolders = fs.readdirSync(apiFolder);
    for (const subfolder of subfolders) {
        const subfolderPath = path.join(apiFolder, subfolder);
        if (fs.statSync(subfolderPath).isDirectory()) {
            const files = fs.readdirSync(subfolderPath);
            for (const file of files) {
                const filePath = path.join(subfolderPath, file);
                if (path.extname(file) === '.js') {
                    try {
                        let routeFn;
                        try {
                            const mod = await import(filePath);
                            routeFn = mod.default ?? mod;
                        } catch {
                            routeFn = require(filePath);
                        }

                        if (typeof routeFn === 'function') {
                            routeFn(app);
                            totalRoutes++;
                            console.log(chalk.green(`✓ Loaded Route: ${path.basename(file)}`));
                        } else {
                            console.warn(chalk.yellow(`⚠ Skipped (not a function): ${file}`));
                        }
                    } catch (e) {
                        console.error(chalk.red(`✗ Failed: ${file} → ${e.message}`));
                    }
                }
            }
        }
    }
    console.log(chalk.cyan('Load Complete! ✓'));
    console.log(chalk.magenta(`Total Routes Loaded: ${totalRoutes}`));
};

await loadRoutes();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

app.get('/music', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'music.html'));
});

app.use((req, res, next) => {
    res.status(404).sendFile(process.cwd() + "/api-page/404.html");
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).sendFile(process.cwd() + "/api-page/500.html");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(chalk.blue(`Server is running on port ${PORT}`));
});
export default app;