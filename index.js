import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import dotenv from "dotenv";

// ==== CONFIG ====
dotenv.config();
const uri = process.env.MONGODB_URI;
const exportsRoot = path.join(process.cwd(), "exports"); // root folder where backups are stored
// ===============


// =========== BACKUP ===========

async function backupDatabase(client, dbName, backupDir) {
    console.log(`\n=== 📦 Backing up database: ${dbName} ===`);
    const db = client.db(dbName);

    const dbDir = path.join(backupDir, dbName);
    fs.mkdirSync(dbDir, { recursive: true });

    const collections = await db.listCollections().toArray();

    for (const coll of collections) {
        await backupCollection(db, coll.name, dbDir);
    }
}

async function backupCollection(db, collName, dbDir) {
    console.log(`⬇️  Backing up collection: ${db.databaseName}.${collName}`);
    const data = await db.collection(collName).find({}).toArray();
    const filePath = path.join(dbDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${db.databaseName}.${collName} (${data.length} docs) -> ${filePath}`);
}

async function selectionPrompt(choices, message) {
    const { selection } = await inquirer.prompt([
        {
            type: 'rawlist',
            name: 'selection',
            message,
            choices,
        }
    ]);
    return selection;
}

async function createBackupDir() {
    if (!fs.existsSync(exportsRoot)) {
        fs.mkdirSync(exportsRoot, { recursive: true });
    }
    const regex = /^mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)/;
    const match = uri.match(regex);
    let user = "unknownUser";
    let cluster = "unknownCluster";
    if (match) {
        user = match[1];
        cluster = match[2].replace(/\./g, "-");
    }
    const timestamp = new Date().toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0];
    const folderName = `${user}@${cluster}_${timestamp}`;
    const backupDir = path.join(exportsRoot, folderName);
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📂 Backup folder: ${backupDir}`);
    return backupDir;
}

async function backup() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB Cluster");

        const backupType = await selectionPrompt(['Full Cluster', 'Database', 'Collection'], "Select backup type:");
        if (!backupType) return;

        const adminDb = client.db().admin();
        const dbs = (await adminDb.listDatabases()).databases.map(db => db.name);

        let backupDir;

        if (backupType === 'Full Cluster') {
            backupDir = await createBackupDir();
            for (const dbName of dbs) {
                if (["admin", "local", "config"].includes(dbName)) {
                    console.log(`⏩ Skipping system db: ${dbName}`);
                    continue;
                }
                await backupDatabase(client, dbName, backupDir);
            }
        } else if (backupType === 'Database' || backupType === 'Collection') {
            const dbName = await selectionPrompt(dbs, "Select database to backup:");
            if (!dbName) return;

            if (backupType === 'Database') {
                backupDir = await createBackupDir();
                await backupDatabase(client, dbName, backupDir);
            } else {
                const db = client.db(dbName);
                const collections = (await db.listCollections().toArray()).map(c => c.name);
                const collName = await selectionPrompt(collections, "Select collection to backup:");
                if (!collName) return;

                backupDir = await createBackupDir();
                const dbDir = path.join(backupDir, dbName);
                fs.mkdirSync(dbDir, { recursive: true });
                await backupCollection(db, collName, dbDir);
            }
        }

        console.log("\n🎉 Backup completed!");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}

// =========== RESTORE ===========

async function chooseBackupFolder() {
    const folders = fs.readdirSync(exportsRoot).filter(f =>
        fs.statSync(path.join(exportsRoot, f)).isDirectory()
    );

    if (folders.length === 0) {
        console.log("❌ No backups found in exports/");
        return null;
    }

    const folder = await selectionPrompt(folders, "Select backup folder to restore:");
    return folder ? path.join(exportsRoot, folder) : null;
}

async function restoreCollection(db, collName, filePath, overwrite) {
    const data = JSON.parse(fs.readFileSync(filePath));

    if (overwrite) {
        console.log(`🗑 Dropping collection: ${db.databaseName}.${collName}`);
        await db.collection(collName).drop().catch(() => { });
    }

    if (data.length > 0) {
        console.log(`⬆️  Inserting ${data.length} docs into ${db.databaseName}.${collName}`);
        await db.collection(collName).insertMany(data);
    } else {
        console.log(`⚠️  Collection ${db.databaseName}.${collName} is empty`);
    }
}

async function restore() {
    const backupDir = await chooseBackupFolder();
    if (!backupDir) return;

    const overwriteAnswer = await selectionPrompt(['Yes', 'No'], "Overwrite mode (drop collections first)?");
    const overwrite = overwriteAnswer === 'Yes';

    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB Cluster");

        const restoreType = await selectionPrompt(['Full Cluster', 'Database', 'Collection'], "Select restore type:");
        if (!restoreType) return;

        const dbFolders = fs.readdirSync(backupDir).filter(f => fs.statSync(path.join(backupDir, f)).isDirectory());

        if (restoreType === 'Full Cluster') {
            for (const dbName of dbFolders) {
                console.log(`\n=== 📦 Restoring database: ${dbName} ===`);
                const db = client.db(dbName);
                const dbDir = path.join(backupDir, dbName);
                const files = fs.readdirSync(dbDir).filter(f => f.endsWith(".json"));
                for (const file of files) {
                    const collName = file.replace(".json", "");
                    const filePath = path.join(dbDir, file);
                    await restoreCollection(db, collName, filePath, overwrite);
                }
            }
        } else if (restoreType === 'Database' || restoreType === 'Collection') {
            const dbName = await selectionPrompt(dbFolders, "Select database to restore:");
            if (!dbName) return;

            const dbDir = path.join(backupDir, dbName);
            const db = client.db(dbName);

            if (restoreType === 'Database') {
                const files = fs.readdirSync(dbDir).filter(f => f.endsWith(".json"));
                for (const file of files) {
                    const collName = file.replace(".json", "");
                    const filePath = path.join(dbDir, file);
                    await restoreCollection(db, collName, filePath, overwrite);
                }
            } else {
                const collections = fs.readdirSync(dbDir).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
                const collName = await selectionPrompt(collections, "Select collection to restore:");
                if (!collName) return;

                const filePath = path.join(dbDir, `${collName}.json`);
                await restoreCollection(db, collName, filePath, overwrite);
            }
        }

        console.log("\n🎉 Restore completed!");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}


async function main() {
    const action = await selectionPrompt(['Backup', 'Restore'], "Select action:");

    if (action === 'Backup') {
        await backup();
    } else if (action === 'Restore') {
        await restore();
    }
}

main();
