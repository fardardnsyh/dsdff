import express, { text } from "express";
import ImageKit from "imagekit";
import cors from "cors";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import path from "path";
import url, { fileURLToPath } from "url";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to mongoDB");
  } catch (error) {
    console.log(error);
  }
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLICKEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

// Upload image with form via imagekit
app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

// Create OR update chat
app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res) => {
  // Use middleware that provide userId.
  const userId = req.auth.userId;
  const { text } = req.body;
  try {
    //Create a new chats
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });
    const savedChat = await newChat.save();

    // Check if the userChat exists
    const userChats = await UserChats.find({ userId: userId });

    // If user doesn't exist create a new one and add the chat in the chats array
    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });
      await newUserChats.save();
    } else {
      // If user exists, push the chat to the existing array of user
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }
    res.status(201).send(newChat._id);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error creating chat");
  }
});

// Fetch chats history of user - title
app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  try {
    const userChats = await UserChats.find({ userId });
    res.status(200).send(userChats[0].chats);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching userchats");
  }
});

// Fetch each chats history
app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });
    res.status(200).send(chat);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching chat");
  }
});

// Updat eexisting chats
app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { question, answer, img } = req.body;
  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updateChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updateChat);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error adding conversation");
  }
});

// Raises an error when an unauthenticated.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).send("Unauthenticated!");
});

// app.use(express.static(path.join(__dirname, "../client")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client", "index.html"));
// });

app.listen(port, () => {
  connect();
  console.log("Server running on port 3000");
});
