const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const morgan = require("morgan");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

//

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dqssj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const userCollection = client.db("OddhayonCoaching").collection("users");
    const movieCollection = client.db("sample_mflix").collection("comments");



     //jwt related api
     app.post("/jwt", (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "60h",
        });
        res.send({ token });
      });



    //User Related API
    //user post , user save in database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const remainingUser = await userCollection.findOne(query);
      if (remainingUser) {
        return res.send({ message: "User allready exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
       //get users
       app.get("/users", async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });





















    //finish
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//
app.get("/", (req, res) => {
  res.send("Oddhayon Coaching Server is running...");
});

app.listen(port, () => {
  console.log(`Oddhayon Coaching Server is running: ${port}`);
});
