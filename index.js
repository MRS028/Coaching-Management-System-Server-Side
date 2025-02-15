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
    const courseCollection = client
      .db("OddhayonCoaching")
      .collection("courses");

    //jwt related api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "60h",
      });
      res.send({ token });
    });
    
    //single User APi
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
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

    //courses related API
    //get course
    app.get("/courses", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });
    //add a course by admin
    app.post("/course", async (req, res) => {
      const course = req.body;
      const result = await courseCollection.insertOne(course);
      res.send(result);
    });

    //update a course

    app.patch("/course/:id",  async (req, res) => {
      const { id } = req.params;
      const updatedCourseData = req.body;
    
      const filter = { _id: new ObjectId(id) };
      const updatedCourseDoc = {
        $set: {
          title: updatedCourseData.title,
          class: updatedCourseData.class,
          version: updatedCourseData.version,
          subjects: updatedCourseData.subjects,
          duration: updatedCourseData.duration,
          fee: updatedCourseData.fee,
          description: updatedCourseData.description,
          contact: updatedCourseData.contact,
          time: updatedCourseData.time,
          location: updatedCourseData.location,
          days: updatedCourseData.days,
          facilities: updatedCourseData.facilities,
          image: updatedCourseData.image,
          date: updatedCourseData.date 
        },
      };
      const result = await courseCollection.updateOne(filter, updatedCourseDoc);
    
      if (result.modifiedCount > 0) {
        res.status(200).json({
          message: "Course updated successfully!",
          modifiedCount: result.modifiedCount,
        });
      } else if (result.matchedCount === 0) {
        res.status(404).json({
          message: "Course not found.",
        });
      } else {
        res.status(400).json({
          message: "No changes were made.",
        });
      }
    });
     //delete a course
     app.delete("/course/:id", async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    })
    

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
