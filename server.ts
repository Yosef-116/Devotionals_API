// Import necessary packages
import express from 'express';              // Web framework for building APIs
import type { Request, Response } from 'express'; // Types for request & response (TypeScript)
import Database from 'better-sqlite3';     // SQLite database library
import path from 'path';                   // Helps with file & folder paths
import { existsSync } from 'fs';           // To check if a file exists
import { fileURLToPath } from 'url';       // Converts module URL to a path
import bcrypt from 'bcryptjs';             // For hashing passwords (security)
import { error } from 'console';

// Initialize Express app
const app = express();
const PORT = 3000;

// Middleware: allows Express to read JSON request bodies
app.use(express.json())

// Setup database file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'devotionals.db');

// Check if database already exists
const isDbCreated = existsSync(dbPath);
const db = new Database(dbPath);

// If database is new, create a devotionals table
if (!isDbCreated) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS devotionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        verse TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT NULL,
        deleted_at TEXT DEFAULT NULL
      );
    `);
    console.log('Database and all tables created successfully!');
}

// Always make sure users table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL
  )`
);

// ------------------- ROUTES -------------------

// Test route: just to check if server works
app.get('/hello_world', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

// Get ALL devotionals
app.get('/api/devotionals', (req: Request, res: Response) => {
  try {
      const statement = db.prepare('SELECT * FROM devotionals WHERE deleted_at IS NULL ORDER BY created_at DESC');
      const devotionals = statement.all();
      res.status(200).json(devotionals);
  } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve devotionals.' });
  }
});

// Get ONE devotional by ID
app.get('/api/devotionals/:id', (req: Request, res: Response) => {
  try {
      const {id} = req.params;

      // Validate that ID is a number
      if(isNaN(Number(id))){
        return res.status(400).json({ error: 'Invalid id provided. Id must be a number' })
      }

      const statement = db.prepare('SELECT * FROM devotionals WHERE id = ? AND deleted_at IS NULL');
      const devotionals = statement.get(id);

      if(devotionals){
        res.status(200).json(devotionals);
      } else {
        res.status(404).json({ error: 'Devotional not found or deleted.' })
      }
  } catch (error) {
      res.status(404).json({ error: 'Devotional Not Found' });
  }
});

// Create a new devotional
app.post('/api/devotionals', (req: Request, res: Response) => {
  try{
    const { verse, content } = req.body;

    // Validate input
    if (!verse || !content) {
      return res.status(400).json({ error: 'Both Verse and Content are required' });
    }

    const statement = db.prepare('INSERT INTO devotionals (verse, content) VALUES (?, ?)');
    const devotionals = statement.run(verse, content);

    res.status(201).json({
      message: 'Devotional created successfully',
      id: devotionals.lastInsertRowid,
      verse,
      content
    });
  } catch(error){
    console.error('Error creating devotional:', error);
    res.status(500).json({ error: 'Failed to create devotional.' });
  }
})

// Register a new user
app.post('/api/register', (req: Request, res: Response) => {
  try{
    const { username, password } = req.body;

    // Validate input
    if(!username || !password){
      return res.status(400).json({ error: 'Both username and password are required'})
    }

    // Hash password before saving (important for security!)
    const saltRounds = 10;
    const password_hash = bcrypt.hashSync(password, saltRounds);

    const statement = db.prepare(`INSERT INTO users (username, password_hash) VALUES(?, ?)`);
    statement.run(username, password_hash);

    res.status(201).json({
      message: 'You are registered successfully',
      username
    })
  } catch {
    console.error('Error registering user: ', error);
    res.status(500).json({ error: 'Registration Failed' });
  }
});

// Update a devotional by ID
app.patch('/api/devotionals/:id', (req: Request, res: Response) => {
  try{
    const {id} = req.params;

    if(isNaN(Number(id))){
      return res.status(400).json({ error: 'Invalid id provided. Id must be a number' })
    }

    const { verse, content } = req.body;

    if (!verse && !content) {
      return res.status(400).json({ error: 'At least Verse or Content is required' });
    }

    let devotionals;

    // Update based on provided fields
    if(!verse){
      devotionals = db.prepare(`
        UPDATE devotionals 
        SET content = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND deleted_at IS NULL
      `).run(content, id);
    } else if(!content){
      devotionals = db.prepare(`
        UPDATE devotionals 
        SET verse = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND deleted_at IS NULL
      `).run(verse, id);
    } else {
      devotionals = db.prepare(`
        UPDATE devotionals 
        SET content = ?, verse = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND deleted_at IS NULL
      `).run(content, verse, id); // ⚠️ careful with order of values
    }

    if(devotionals.changes > 0){
      res.status(200).json({
        message: `Devotional with id ${id} updated successfully`, 
        verse, content
      })
    } else {
      res.status(404).json({ error: 'Devotional not found or could not be updated.' });
    }
  } catch(error){
    console.error('Error updating devotional:', error);
    res.status(500).json({ error: 'Failed to update devotional.' });
  }
})

// Soft delete a devotional (mark as deleted, don’t actually remove from DB)
app.delete('/api/devotionals/:id', (req: Request, res: Response) => {
  try{
    const {id} = req.params;

    if(isNaN(Number(id))){
      return res.status(400).json({ error: 'Invalid id provided. Id must be a number' });
    }

    const statement = db.prepare(`
      UPDATE devotionals 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `);

    const devotionals = statement.run(Number(id));

    if(devotionals.changes > 0){
      res.status(204).send(); // 204 = No Content (successful delete)
    } else {
      res.status(404).json({ error: 'Devotional not found or already deleted.' });
    }
  } catch(error){
    console.error(`Error deleting devotional with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete devotional.' });
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
