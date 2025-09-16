import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import readline from "readline";
import dotenv from "dotenv";


// ==== CONFIG ====
dotenv.config();

// ==== CONFIG ====
const uri = process.env.MONGODB_URI;
const exportsRoot = path.join(process.cwd(), "exports"); // root folder where backups are stored
// ===============

// Helper to select backup folder
async function chooseBackupFolder() {
  const folders = fs.readdirSync(exportsRoot).filter(f =>
    fs.statSync(path.join(exportsRoot, f)).isDirectory()
  );

  if (folders.length === 0) {
    console.log("❌ No backups found in exports/");
    process.exit(1);
  }

  console.log("Available backup folders:");
  folders.forEach((f, i) => console.log(`${i + 1}: ${f}`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const folderIndex = await new Promise(resolve => {
    rl.question("Enter folder number to restore: ", ans => {
      rl.close();
      resolve(parseInt(ans) - 1);
    });
  });

  if (folderIndex < 0 || folderIndex >= folders.length) {
    console.log("❌ Invalid selection");
    process.exit(1);
  }

  return path.join(exportsRoot, folders[folderIndex]);
}

// Helper to choose mode
async function chooseMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const mode = await new Promise(resolve => {
    rl.question(
      "Restore mode: [1] Append / [2] Overwrite (drop collections first): ",
      ans => {
        rl.close();
        resolve(ans.trim());
      }
    );
  });

  if (!["1", "2"].includes(mode)) {
    console.log("❌ Invalid mode");
    process.exit(1);
  }

  return mode === "2"; // true = overwrite
}

async function restoreCluster() {
  const backupDir = await chooseBackupFolder();
  const overwrite = await chooseMode();

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Cluster");

    // Loop through databases in backup folder
    const dbFolders = fs.readdirSync(backupDir).filter(f =>
      fs.statSync(path.join(backupDir, f)).isDirectory()
    );

    for (const dbName of dbFolders) {
      console.log(`\n=== 📦 Restoring database: ${dbName} ===`);
      const db = client.db(dbName);

      const dbDir = path.join(backupDir, dbName);
      const files = fs.readdirSync(dbDir).filter(f => f.endsWith(".json"));

      for (const file of files) {
        const collName = file.replace(".json", "");
        const filePath = path.join(dbDir, file);

        const data = JSON.parse(fs.readFileSync(filePath));

        if (overwrite) {
          console.log(`🗑 Dropping collection: ${dbName}.${collName}`);
          await db.collection(collName).drop().catch(() => {}); // ignore if doesn't exist
        }

        if (data.length > 0) {
          console.log(`⬆️  Inserting ${data.length} docs into ${dbName}.${collName}`);
          await db.collection(collName).insertMany(data);
        } else {
          console.log(`⚠️  Collection ${dbName}.${collName} is empty`);
        }
      }
    }

    console.log("\n🎉 Restore completed!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

restoreCluster();
