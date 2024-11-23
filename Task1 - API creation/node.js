const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const upload = multer({ dest: "uploads/" });

// db connection
const url =
  process.env.MONGODB_URL ||
  "mongodb+srv://rachit_joshi:rachit_joshi@cluster0.6tisf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "test";
let db, events;

MongoClient.connect(url)
  .then((client) => {
    db = client.db(dbName);
    events = db.collection("users");
    console.log("Connected to Database");
  })
  .catch((err) => console.error(err));

// Routes
//GET request:
app.get("/api/v3/app/events", async (req, res) => {
  const { type, limit = 5, page = 1, id } = req.query;

  try {
    if (type === "latest") {
      const eventsList = await events
        .find()
        .sort({ schedule: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .toArray();

      const totalEvents = await events.countDocuments();

      return res.json({
        events: eventsList,
        page: parseInt(page),
        limit: parseInt(limit),
        total_events: totalEvents,
      });
    } else if (id) {
      const event = await events.findOne({ _id: new ObjectId(id) });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.json(event);
    } else {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST request:
app.post(
  "/api/v3/app/events",
  upload.single("files[image]"),
  async (req, res) => {
    const {
      name,
      tagline,
      schedule,
      description,
      moderator,
      category,
      sub_category,
      rigor_rank,
    } = req.body;
    const image = req.file;

    // console.log(req.body);
    if (
      !name ||
      !tagline ||
      !schedule ||
      !description ||
      !moderator ||
      !category ||
      !sub_category ||
      !rigor_rank ||
      !image
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const event = {
      name,
      tagline,
      schedule: new Date(schedule),
      description,
      moderator,
      category,
      sub_category,
      rigor_rank: parseInt(rigor_rank),
      files: { image: image.path },
      attendees: [],
      type: "event",
    };

    try {
      const result = await db.collection("users").insertOne(event);
      res.status(201).json({ id: result.insertedId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT request:
app.put(
  "/api/v3/app/events/:id",
  upload.single("files[image]"),
  async (req, res) => {
    const eventId = req.params.id;
    const {
      name,
      tagline,
      schedule,
      description,
      moderator,
      category,
      sub_category,
      rigor_rank,
    } = req.body;
    const image = req.file;

    const update = {
      ...(name && { name }),
      ...(tagline && { tagline }),
      ...(schedule && { schedule: new Date(schedule) }),
      ...(description && { description }),
      ...(moderator && { moderator }),
      ...(category && { category }),
      ...(sub_category && { sub_category }),
      ...(rigor_rank && { rigor_rank: parseInt(rigor_rank) }),
      ...(image && { "files.image": image.path }),
    };

    try {
      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(eventId) }, { $set: update });
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ message: "Event updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE request:
app.delete("/api/v3/app/events/:id", async (req, res) => {
  const eventId = req.params.id;

  try {
    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(eventId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// server :
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
