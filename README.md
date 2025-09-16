

````markdown
# MongoDB Cluster Backup & Restore Scripts

**Author:** TARIKUL ISLAM  
**Website:** [tarikul.dev](https://tarikul.dev/)  
**Email:** ti@tarikul.dev  
**Repository:** [https://github.com/faketi101/mongo-db-backup](https://github.com/faketi101/mongo-db-backup)

This repository contains two Node.js scripts to **backup** and **restore** MongoDB clusters using JSON exports. The scripts allow easy management of multiple databases and collections without requiring MongoDB tools like `mongodump`.

---

## Features

- **Cluster-wide backup**: Exports all user databases and collections in a MongoDB cluster.  
- **Timestamped folders**: Each backup is stored in `exports/<username>@<cluster>_<YYYY-MM-DD_HH-MM-SS>/`.  
- **JSON format**: Collections are saved as JSON files.  
- **Restore options**: Supports both append mode and overwrite (drop collections before restore).  
- Fully automatic folder creation and organized structure.  

---

## Prerequisites

- Node.js >= 18  
- pnpm  
- MongoDB cluster URI  

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/faketi101/mongo-db-backup.git
   cd mongo-db-backup
````

2. Install dependencies using **pnpm**:

   ```bash
   pnpm install
   ```

3. Create a `.env` file in the project root and add your MongoDB URI:

   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>"
   ```

4. Update both scripts (`cluster-backup.js` and `cluster-restore.js`) to read the URI from `.env` at the top:

   ```js
   import 'dotenv/config';

   const uri = process.env.MONGODB_URI;
   ```

---

## Usage

### 1. Backup Cluster

Run the backup script to export all databases and collections:

```bash
pnpm exec node cluster-backup.js
```

* Creates an `exports` folder in the project root if it doesn't exist.
* Creates a timestamped folder named `<username>@<cluster>_<YYYY-MM-DD_HH-MM-SS>` inside `exports`.
* Each database gets its own subfolder with JSON files for each collection.

**Example folder structure:**

```
exports/
  tarik@mycluster-mongodb-net_2025-09-16_21-05-33/
    mydb1/
      users.json
      orders.json
    mydb2/
      products.json
```

---

### 2. Restore Cluster

Run the restore script to import a backup:

```bash
pnpm exec node cluster-restore.js
```

* Lists available backup folders under `exports/`.
* Prompts to choose a folder to restore.
* Prompts for **restore mode**:

  * `Append`: Add documents to existing collections.
  * `Overwrite`: Drop collections before inserting documents.

---

## Notes

* The scripts **only export data** (JSON format). Indexes and BSON-specific types are not preserved.
* For full BSON-level backups with indexes, use `mongodump` and `mongorestore`.

---

## Contact

If you have any questions or suggestions, reach out to:

* **TARIKUL ISLAM**
* Website: [https://tarikul.dev/](https://tarikul.dev/)
* Email: [ti@tarikul.dev](mailto:ti@tarikul.dev)

```


