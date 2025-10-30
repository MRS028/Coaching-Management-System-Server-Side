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
    origin: [
      "http://localhost:5173",
      "https://oddhayon-coaching-center.netlify.app",
    ],
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
    const studentCollection = client
      .db("OddhayonCoaching")
      .collection("allStudents");
    const routineCollection = client
      .db("OddhayonCoaching")
      .collection("classRoutine");
    const courseCollection = client
      .db("OddhayonCoaching")
      .collection("courses");
    const admissionCollection = client
      .db("OddhayonCoaching")
      .collection("admissions");

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
      // console.log(result);
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

    app.patch("/course/:id", async (req, res) => {
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
          date: updatedCourseData.date,
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
    app.delete("/course/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    });

    //Routine related routes
    app.get("/routines", async (req, res) => {
      const result = await routineCollection.find().toArray();
      res.send(result);
    });

    app.patch("/routines/:className/:version", async (req, res) => {
      const className = req.params.className.replace("%20", " ");
      const version = req.params.version;

      const { schedule } = req.body;

      const filter = { class: className, "subjects.name": version };
      const update = { $set: { "subjects.$.schedule": schedule } };

      const result = await routineCollection.findOneAndUpdate(filter, update, {
        returnDocument: "after",
      });

      if (!result.value) {
        return res.status(404).json({
          success: false,
          message: `Routine for ${className} - ${version} not found`,
        });
      }

      res.status(200).json({ success: true, data: result.value });
    });

    //student related api
    app.get("/allStudents", async (req, res) => {
      const result = await studentCollection.find().toArray();
      res.send(result);
    });

    //Enrollment related api for all students
    // Enrollment related api for all students
// Updated enrollment API route
// Enrollment related API - FIXED VERSION
app.post("/enrollments", async (req, res) => {
  const enrollmentData = req.body;
  const { email, courseID } = enrollmentData;

  try {
    // প্রথমে চেক করুন এই ইমেইল দিয়ে ইতিমধ্যে স্টুডেন্ট রেকর্ড আছে কিনা
    const existingStudent = await studentCollection.findOne({ email: email });
    
    let studentID;
    
    if (existingStudent) {
      // যদি স্টুডেন্ট ইতিমধ্যে exists করে, তাহলে একই studentID ব্যবহার করুন
      studentID = existingStudent.studentID;
      
      // চেক করুন যে একই কোর্সে ইতিমধ্যে এনরোল করা আছে কিনা
      const existingEnrollment = await studentCollection.findOne({
        email: email,
        courseID: courseID
      });
      
      if (existingEnrollment) {
        return res.status(400).json({
          error: true,
          message: "You are already enrolled in this course"
        });
      }
    } else {
      // নতুন স্টুডেন্টের জন্য নতুন studentID জেনারেট করুন
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      studentID = `STU${year}${randomNum}`;
    }

    enrollmentData.studentID = studentID;
    // console.log(studentID);

    // Generate admission ID
    const admissionId = `ADM${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Prepare clean student record
    const studentRecord = {
      // Student Personal Info
      studentID: studentID,
      name: enrollmentData.name,
      email: enrollmentData.email,
      phone: enrollmentData.phone,
      age: enrollmentData.age,
      gender: enrollmentData.gender,
      address: enrollmentData.address,

      // Educational Info
      class: enrollmentData.class,
      schoolName: enrollmentData.schoolName,
      version: enrollmentData.version,
      subjects: enrollmentData.subjects,

      // Course Info
      courseID: courseID,
      courseTitle: enrollmentData.courseTitle,
      courseName: enrollmentData.courseTitle,
      courseDuration: enrollmentData.courseDuration,
      fee: enrollmentData.fee,

      // Payment Info
      paymentStatus: "paid",
      paymentDate: enrollmentData.paymentDate,
      transactionId: enrollmentData.transactionId,
      paymentMethod: enrollmentData.paymentMethod,
      paymentNumber: enrollmentData.paymentNumber,
      paidAmount: enrollmentData.paidAmount,

      // Enrollment Status
      status: "active",
      enrollmentDate: new Date().toISOString(),
      progress: 0,
      completedLessons: 0,
      totalLessons: 12,

      // System Info
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Prepare clean admission record
    const admissionRecord = {
      admissionId: admissionId,
      
      // Student Info
      studentID: studentID,
      fullName: enrollmentData.name,
      email: enrollmentData.email,
      phone: enrollmentData.phone,
      age: enrollmentData.age,
      gender: enrollmentData.gender,
      address: enrollmentData.address,

      // Educational Info
      currentInstitution: enrollmentData.schoolName,
      classLevel: enrollmentData.class,
      version: enrollmentData.version,
      previousQualification: "",

      // Course Info
      courseId: courseID,
      courseName: enrollmentData.courseTitle,
      courseFee: enrollmentData.fee,
      courseDuration: enrollmentData.courseDuration,
      subjects: enrollmentData.subjects,

      // Payment Info
      paymentStatus: "paid",
      paymentDate: enrollmentData.paymentDate,
      transactionId: enrollmentData.transactionId,
      paymentMethod: enrollmentData.paymentMethod,
      paidAmount: enrollmentData.paidAmount,

      // Admission Status
      status: "approved",
      admissionDate: new Date().toISOString(),

      // System Info
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enrollmentType: "course_enrollment"
    };

    // Save to student collection
    const studentResult = await studentCollection.insertOne(studentRecord);

    // Save to admission collection
    const admissionResult = await admissionCollection.insertOne(admissionRecord);

    // Update user collection if user exists
    try {
      const user = await userCollection.findOne({ email: email });
      
      if (user) {
        // যদি ইউজারের studentID না থাকে তাহলে সেট করুন
        const updateData = {
          $set: { 
            updatedAt: new Date().toISOString()
          },
          $push: {
            enrollments: {
              enrollmentId: admissionId,
              courseId: courseID,
              courseTitle: enrollmentData.courseTitle,
              enrollmentDate: new Date().toISOString(),
              paymentStatus: "paid",
              status: "active",
              progress: 0
            }
          }
        };
        
        // শুধুমাত্র studentID সেট করুন যদি আগে না থাকে
        if (!user.studentID) {
          updateData.$set.studentID = studentID;
        }
        
        await userCollection.updateOne(
          { email: email },
          updateData
        );
      }
    } catch (userError) {
      // console.log("User update optional, continuing...");
    }

    res.status(201).json({
      success: true,
      studentID: studentID,
      admissionId: admissionId,
      studentInsertedId: studentResult.insertedId,
      admissionInsertedId: admissionResult.insertedId,
      message: "Enrollment completed successfully!"
    });

  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({
      error: true,
      message: "Server error: " + error.message,
    });
  }
});


    // Get enrolled courses by student email
    // Get enrolled courses by student email
    app.get("/enrollments/student/:email", async (req, res) => {
      const { email } = req.params;

      try {
        // console.log("Fetching enrollments for email:", email);

        const enrollments = await studentCollection
          .find({ email: email })
          .toArray();

        // console.log("Found enrollments:", enrollments.length);

        if (enrollments.length === 0) {
          return res.status(200).json({
            success: true,
            data: [],
            message: "No courses found for this student",
          });
        }

        res.status(200).json({
          success: true,
          data: enrollments,
          count: enrollments.length,
        });
      } catch (error) {
        // console.error("Get student enrollments error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch enrolled courses",
          error: error.message,
        });
      }
    });

    // Generate certificate (optional)
    app.post("/generate-certificate", async (req, res) => {
      const { studentId, courseId, courseName, studentName } = req.body;

      try {
        // Implement certificate generation logic here
        // This could generate a PDF certificate and return the URL

        const certificateUrl = `https://your-domain.com/certificates/${studentId}_${courseId}.pdf`;

        res.status(200).json({
          success: true,
          certificateUrl: certificateUrl,
          message: "Certificate generated successfully",
        });
      } catch (error) {
        console.error("Certificate generation error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to generate certificate",
        });
      }
    });

    // ==================== NEW ADMISSION API ROUTES ====================

    // Get all admissions (for admin)
    app.get("/admissions", async (req, res) => {
      try {
        const result = await admissionCollection
          .find()
          .sort({ admissionDate: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Get admissions error:", error);
        res.status(500).send({ error: true, message: "Server error" });
      }
    });

    // Get single admission by ID
    app.get("/admissions/:admissionId", async (req, res) => {
      const { admissionId } = req.params;

      try {
        const admission = await admissionCollection.findOne({ admissionId });

        if (admission) {
          res.status(200).json({
            success: true,
            data: admission,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Admission not found",
          });
        }
      } catch (error) {
        console.error("Get admission error:", error);
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    // Create new admission
    app.post("/admissions", async (req, res) => {
      const admissionData = req.body;

      try {
        // Check if admission already exists with same email and course
        const existingAdmission = await admissionCollection.findOne({
          email: admissionData.email,
          courseId: admissionData.courseId,
          status: { $in: ["pending", "approved"] },
        });

        if (existingAdmission) {
          return res.status(400).json({
            error: true,
            message:
              "You have already applied for this course. Please check your application status.",
          });
        }

        const result = await admissionCollection.insertOne(admissionData);

        res.status(201).json({
          success: true,
          admissionId: admissionData.admissionId,
          insertedId: result.insertedId,
          message: "Admission application submitted successfully!",
        });
      } catch (error) {
        console.error("Admission submission error:", error);
        res.status(500).json({
          error: true,
          message: "Failed to submit admission application",
        });
      }
    });

    // Update admission status (for admin)
    app.patch("/admissions/:admissionId", async (req, res) => {
      const { admissionId } = req.params;
      const updateData = req.body;

      try {
        const filter = { admissionId: admissionId };
        const updateDoc = {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        };

        const result = await admissionCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.status(200).json({
            success: true,
            message: "Admission updated successfully",
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Admission not found",
          });
        }
      } catch (error) {
        console.error("Update admission error:", error);
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    // Delete admission (for admin)
    app.delete("/admissions/:admissionId", async (req, res) => {
      const { admissionId } = req.params;

      try {
        const result = await admissionCollection.deleteOne({ admissionId });

        if (result.deletedCount > 0) {
          res.status(200).json({
            success: true,
            message: "Admission deleted successfully",
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Admission not found",
          });
        }
      } catch (error) {
        console.error("Delete admission error:", error);
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    // Get admissions by email (for students to check their applications)
    app.get("/admissions/student/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const admissions = await admissionCollection
          .find({ email })
          .sort({ admissionDate: -1 })
          .toArray();

        res.status(200).json({
          success: true,
          data: admissions,
        });
      } catch (error) {
        console.error("Get student admissions error:", error);
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    // ==================== END OF ADMISSION API ====================

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
