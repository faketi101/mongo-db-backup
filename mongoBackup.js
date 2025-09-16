import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";


// ==== CONFIG ====
dotenv.config();
const uri = process.env.MONGODB_URI;
// ===============

async function backupCluster() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Cluster");

    // 1. Create root "exports" folder (if not exists)
    const rootDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // 2. Extract cluster info & username from URI
    const regex = /^mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)/;
    const match = uri.match(regex);
    let user = "unknownUser";
    let cluster = "unknownCluster";
    if (match) {
      user = match[1];
      cluster = match[2].replace(/\./g, "-"); // replace dots for safe folder names
    }

    // 3. Create timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/T/, "_") // replace T with _
      .replace(/:/g, "-") // replace : with -
      .split(".")[0]; // remove milliseconds

    // 4. Build backup folder name
    const folderName = `${user}@${cluster}_${timestamp}`;
    const backupDir = path.join(rootDir, folderName);
    fs.mkdirSync(backupDir, { recursive: true });

    console.log(`📂 Backup folder: ${backupDir}`);

    // 5. List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();

    console.log(`🔎 Found ${dbs.databases.length} databases`);

    for (const dbInfo of dbs.databases) {
      const dbName = dbInfo.name;
      if (["admin", "local", "config"].includes(dbName)) {
        console.log(`⏩ Skipping system db: ${dbName}`);
        continue;
      }

      console.log(`\n=== 📦 Backing up database: ${dbName} ===`);
      const db = client.db(dbName);

      // Create db folder inside backup dir
      const dbDir = path.join(backupDir, dbName);
      fs.mkdirSync(dbDir, { recursive: true });

      // List collections
      const collections = await db.listCollections().toArray();

      for (const coll of collections) {
        const name = coll.name;
        console.log(`⬇️  Backing up collection: ${dbName}.${name}`);

        const data = await db.collection(name).find({}).toArray();

        // Write to JSON file
        const filePath = path.join(dbDir, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        console.log(`✅ Saved ${dbName}.${name} (${data.length} docs) -> ${filePath}`);
      }
    }

    console.log("\n🎉 Cluster backup completed!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

backupCluster();