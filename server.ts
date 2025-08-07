import express from 'express';
import type { Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'devotionals.db');

const isDbCreated = existsSync(dbPath);
const db = new Database(dbPath);

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

app.get('/hello_world', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.get('/api/devotionals', (req: Request, res: Response) => {
  try {
      const statement = db.prepare('SELECT * FROM devotionals WHERE deleted_at IS NULL ORDER BY created_at DESC');
      const devotionals = statement.all();
      res.status(200).json(devotionals);
  } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve devotionals.' });
  }
});

app.get('/api/devotionals/:id', (req: Request, res: Response) => {
  try {
      const {id} = req.params;

      if(isNaN(Number(id))){
        return res.status(400).json( {error: 'Invalid id provided. Id must be a number'})
      }
      const statement = db.prepare('SELECT * FROM devotionals WHERE id = ? AND deleted_at IS NULL');
      const devotionals = statement.get(id);

      if(devotionals){
        res.status(200).json(devotionals);
      }else{
        res.status(404).json( { error: 'Devotionals Not Found'})
      }
  } 
  catch (error) {
      res.status(404).json({ error: 'Devotionals Not Found' });
  }
});

app.post('/api/devotionals', (req: Request, res: Response) => {
  try{
    const statement = db.prepare('INSERT INTO devotionals WHERE created_at IS NULL ORDER BY created_at DESC');
    const devotionals = statement
    res.status(201).json(devotionals)
  }
  catch(error){
    res.status(500).json({ error: 'Failed to create devotionals.' });
  }
})

app.patch('/api/devotionals/:id', (req: Request, res: Response) => {
  try{
    const statement = db.prepare('INSERT INTO devotionals WHERE id IS NULL ORDER BY created_at DESC');
    const devotionals = statement
    res.status(200).json(devotionals)
  }
  catch(error){
    res.status(500).json({ error: 'Failed to update devotionals.' });
  }
})

app.delete('/api/devotionals/:id', (req: Request, res: Response) => {
  try{
    const statement = db.prepare('UPDATE devotionals WHERE id = ?, deleted_at IS NULL');
    const devotionals = statement
    res.status(204).json(devotionals)
  }
  catch(error){
    res.status(500).json({ error: 'Failed to delete devotionals.' });
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});