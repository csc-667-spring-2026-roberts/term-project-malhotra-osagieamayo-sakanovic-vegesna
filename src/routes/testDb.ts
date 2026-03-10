import { Router } from "express";
import db from "../db/connection.js";

const router = Router(); // create a router instance 
// we are creating a mini-express app just for these routes

router.get("/test-db", async (_req, res) => { // GET route for test-db
  // we are pulling all messages from DB
  try {
    // ordered by newest first so it looks nicer
    const rows = await db.any(
      "SELECT * FROM test_messages ORDER BY id DESC",
    );
    // send the rows back as JSON
    res.json(rows);
  } catch (error) {
    console.error("GET /test-db failed:", error);
    res.status(500).json({ error: "Failed to fetch test messages" });
  }
});

// POST route for /test-db
// this lets us insert a message into the table
router.post("/test-db", async (req, res) => {
  try {
    // grabbing message from request body
    const { message } = req.body as { message?: unknown };
    // making sure message is a string and not empty
    if (typeof message !== "string" || message.trim() === "") {
      res.status(400).json({ error: "message must be a non-empty string" });
      return;
    }
    // insert message into database
    const inserted = await db.one(
      "INSERT INTO test_messages (message) VALUES ($1) RETURNING *",
      [message.trim()],
    );

    // send the inserted row back
    // 201 means "created"
    res.status(201).json(inserted);
  } catch (error) {
    console.error("POST /test-db failed:", error);
    res.status(500).json({ error: "Failed to insert test message" });
  }
});

export default router;
