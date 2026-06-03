import express from "express";
import connectDB from "./config/dataBase.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import route from "./routes/index.js"
import cors from "cors";

dotenv.config()

// DB connection
await connectDB()
    .then(() => {
        console.log("mongoDB atlas connected successfully ")
    })
    .catch((error) => {
        console.log("MongoDB connection error", error)
    })

const app = express()

// Behind nginx (production): trust the proxy so `secure` cookies and
// req.protocol reflect the original HTTPS request.
app.set("trust proxy", 1)

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.MLSERVER_URL
]

app.use(cors({
    // allow requests with no origin (like mobile apps, curl)
    origin: function (origin, callback) {

        if (!origin) 
            return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            callback(null, true) // allow this origin

        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true // allow cookies, Authorization headers
}))

app.use(express.json({ limit: "10mb" })); //Increase JSON payload size
app.use(express.urlencoded({ extended: true, limit: "10mb" })); //For form data
app.use(cookieParser())


// routes
app.use("/api", route)


// SERVER Connecting 
const PORT = process.env.PORT || 5000;

app.listen(PORT, (()=>{
    console.log("Server is listening...");
}))




