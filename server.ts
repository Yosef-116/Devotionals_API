import express from 'express';
import type { Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

app.use(express.json())

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL
    )`
  );

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
        res.status(404).json( { error: 'Devotionals Not Found or devotionals is deleted.'})
      }
  } 
  catch (error) {
      res.status(404).json({ error: 'Devotionals Not Found' });
  }
});

app.post('/api/devotionals', (req: Request, res: Response) => {
  try{
    const { verse, content } = req.body;

    if (!verse || !content) {
      return res.status(400).json({ error: 'Both Verse and content are required' });
    }
    const statement = db.prepare('INSERT INTO devotionals (verse ,content) VALUES (? , ?)');
    const devotionals = statement.run(verse, content);

    res.status(201).json({
      message: 'Devotional Created Successfully',
      id: devotionals.lastInsertRowid,
      verse,
      content
    });
  }
  catch(error){
    console.error('Error creating devotional:', error);
    res.status(500).json({ error: 'Failed to create devotional.' });
  }
})

app.patch('/api/devotionals/:id', (req: Request, res: Response) => {
  try{
    const {id} = req.params;
    if(isNaN(Number(id))){
      return res.status(400).json( {error: 'Invalid id provided. Id must be a number'})
      }

    const { verse, content } = req.body;
    if (!verse && !content) {
      return res.status(400).json({ error: 'Atleast Verse or content is required' });
    }
    let devotionals;
    if(!verse){
      devotionals = db.prepare(`UPDATE devotionals SET content = ? , updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(content, id);
    }else if(!content){
      devotionals = db.prepare(`UPDATE devotionals SET verse = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(verse, id);
    }else{
      devotionals = db.prepare(`UPDATE devotionals SET content = ?, verse = ? ,updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(verse, content, id);
    }

    if(devotionals.changes > 0){
      res.status(200).json({
        message: `Devotionals with id ${id} is updated successfully`, 
        verse, content
      })
    }else{
      res.status(404).json({ error: 'Devotional not found or could not be updated.' });
      }
  }
  catch(error){
    console.error('Error updating devotional:', error);
    res.status(500).json({ error: 'Failed to update devotionals.' });
  }
})

app.delete('/api/devotionals/:id', (req: Request, res: Response) => {
  try{
    const {id} = req.params;
    if(isNaN(Number(id))){
      return res.status(400).json({error: 'Invalid id provided. Id must be a number'});
      }

    const statement = db.prepare('UPDATE devotionals SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL');
    const devotionals = statement.run(Number(id));
    if(devotionals.changes > 0){
      res.status(204).send()
    }else{
      res.status(404).json({ error: 'Devotional not found or already deleted.' });
    }
  }
  catch(error){
    console.error(`Error deleting devotional with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete devotionals.' });
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});