# MongoDB Backup & Restore Utility

**Author:** TARIKUL ISLAM  
**Website:** [tarikul.dev](https://tarikul.dev/)  
**Email:** hello@tarikul.dev  
**Repository:** [https://github.com/faketi101/mongo-db-backup](https://github.com/faketi101/mongo-db-backup)

This repository contains a powerful, all-in-one Node.js script to **backup** and **restore** MongoDB clusters, databases, or individual collections using an interactive command-line interface.

---

## Features

- **Flexible Scope**: Perform backups and restores at three levels: Full Cluster, single Database, or single Collection.
- **Interactive UI**: A user-friendly, selection-based menu guides you through the process—no need to type long names.
- **Timestamped Backups**: Each backup is stored in a neatly organized, timestamped folder: `exports/<username>@<cluster>_<YYYY-MM-DD_HH-MM-SS>/`.
- **Safe Restore Options**: Choose to append data or overwrite existing collections safely.
- **JSON Format**: Collections are saved in easy-to-read JSON format.

---

## Prerequisites

- Node.js >= 18
- pnpm (or npm/yarn)
- A MongoDB cluster URI

---

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/faketi101/mongo-db-backup.git
    cd mongo-db-backup
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Configure your environment:**
    Create a `.env` file in the project root and add your MongoDB connection string:
    ```env
    MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>"
    ```

---

## Usage

Run the script from your terminal:

```bash
node index.js
```

The script will guide you through the following steps:

1.  **Select Action**: Choose between `Backup` or `Restore`.
2.  **Select Scope**: Choose `Full Cluster`, `Database`, or `Collection`.
3.  **Select Target**: Based on your scope, you'll be prompted to select a database or collection from a list.
4.  **Confirm Options** (for restore): Choose a backup folder and decide whether to overwrite existing data.

**Example Backup Folder Structure:**

```
exports/
  └── dev@cluster0-mongodb-net_2025-12-06_13-12-41/
      └── my_database/
          ├── users.json
          └── products.json
```

## Notes

- The scripts **only export data** (JSON format). Indexes and BSON-specific types are not preserved.
- For full BSON-level backups with indexes, use `mongodump` and `mongorestore`.

---

## Contact

If you have any questions or suggestions, reach out to:

- **TARIKUL ISLAM**
- Website: [https://tarikul.dev/](https://tarikul.dev/)
- Email: [ti@tarikul.dev](mailto:ti@tarikul.dev)
