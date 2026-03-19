import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("expenses.db");

// Initialize database with new schema
db.exec(`
  CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT,
    family_id INTEGER,
    FOREIGN KEY (family_id) REFERENCES families(id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    family_id INTEGER,
    FOREIGN KEY (family_id) REFERENCES families(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category_id INTEGER,
    description TEXT,
    date TEXT NOT NULL,
    user_id INTEGER,
    family_id INTEGER,
    participants TEXT, -- JSON array of user IDs or names
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (family_id) REFERENCES families(id)
  );
`);

// Ensure participants column exists (for migration)
const tableInfo = db.prepare("PRAGMA table_info(expenses)").all() as any[];
const hasParticipants = tableInfo.some(col => col.name === 'participants');
if (!hasParticipants) {
  db.prepare("ALTER TABLE expenses ADD COLUMN participants TEXT").run();
}

// Seed initial data if empty
const familiesCount = db.prepare("SELECT count(*) as count FROM families").get() as { count: number };
if (familiesCount.count === 0) {
  const familyId = db.prepare("INSERT INTO families (name, invite_code) VALUES (?, ?)").run("我的温馨小家", "MOE123").lastInsertRowid;
  
  db.prepare("INSERT INTO users (name, avatar, family_id) VALUES (?, ?, ?)").run("小萌", "https://picsum.photos/seed/moe1/100/100", familyId);
  db.prepare("INSERT INTO users (name, avatar, family_id) VALUES (?, ?, ?)").run("大萌", "https://picsum.photos/seed/moe2/100/100", familyId);

  const defaultCats = [
    { name: '餐饮', icon: 'Utensils', color: 'bg-orange-100 text-orange-600' },
    { name: '购物', icon: 'ShoppingBag', color: 'bg-pink-100 text-pink-600' },
    { name: '交通', icon: 'Bus', color: 'bg-blue-100 text-blue-600' },
    { name: '娱乐', icon: 'Gamepad2', color: 'bg-purple-100 text-purple-600' },
    { name: '零食', icon: 'Coffee', color: 'bg-yellow-100 text-yellow-600' },
    { name: '礼物', icon: 'Gift', color: 'bg-red-100 text-red-600' },
    { name: '其他', icon: 'Tag', color: 'bg-gray-100 text-gray-600' },
  ];

  for (const cat of defaultCats) {
    db.prepare("INSERT INTO categories (name, icon, color, family_id) VALUES (?, ?, ?, ?)").run(cat.name, cat.icon, cat.color, familyId);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/login", (req, res) => {
    const { name } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE name = ?").get(name);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "User not found" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.get("/api/categories", (req, res) => {
    const familyId = req.query.familyId || 1;
    const categories = db.prepare("SELECT * FROM categories WHERE family_id = ?").all(familyId);
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name, icon, color, familyId } = req.body;
    const info = db.prepare(
      "INSERT INTO categories (name, icon, color, family_id) VALUES (?, ?, ?, ?)"
    ).run(name, icon, color, familyId || 1);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/expenses", (req, res) => {
    const familyId = req.query.familyId || 1;
    const { categoryId, userId, sortBy = 'date', sortOrder = 'DESC' } = req.query;
    
    let query = `
      SELECT e.*, u.name as user_name, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      JOIN categories c ON e.category_id = c.id
      WHERE e.family_id = ?
    `;
    const params: any[] = [familyId];

    if (categoryId) {
      query += " AND e.category_id = ?";
      params.push(categoryId);
    }
    if (userId) {
      query += " AND e.user_id = ?";
      params.push(userId);
    }

    // Validate sortBy and sortOrder to prevent SQL injection
    const validSortBy = ['date', 'amount'].includes(sortBy as string) ? sortBy : 'date';
    const validSortOrder = ['ASC', 'DESC'].includes((sortOrder as string).toUpperCase()) ? sortOrder : 'DESC';

    query += ` ORDER BY ${validSortBy} ${validSortOrder}, e.id ${validSortOrder}`;

    const expenses = db.prepare(query).all(...params);
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
    try {
      console.log('Received expense request:', req.body);
      const { amount, categoryId, description, date, userId, familyId, participants } = req.body;
      
      if (amount === undefined || amount === null || !categoryId || !date || !userId) {
        console.warn('Missing required fields:', { amount, categoryId, date, userId });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const info = db.prepare(
        "INSERT INTO expenses (amount, category_id, description, date, user_id, family_id, participants) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(amount, categoryId, description, date, userId, familyId || 1, JSON.stringify(participants || []));
      
      console.log('Expense inserted successfully, ID:', info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('Failed to add expense:', err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.delete("/api/expenses/:id", (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const familyId = req.query.familyId || 1;
    const stats = db.prepare(`
      SELECT c.name as category, SUM(e.amount) as total 
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.family_id = ?
      GROUP BY c.id
    `).all(familyId);
    const total = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE family_id = ?").get(familyId) as { total: number };
    res.json({ categories: stats, total: total.total || 0 });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
