// backend/server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors'); // Import cors middleware
const { MongoClient, ServerApiVersion } = require('mongodb'); // Import MongoClient

const app = express();
const PORT = process.env.PORT || 3000; // Use port from environment variable or default to 3000
const uri = process.env.MONGO_URI; // Get MongoDB URI from .env

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let productsCollection; // Declare a variable to hold the reference to the products collection

// Middleware
app.use(cors()); // Enable CORS for all routes (important for frontend to backend communication)
app.use(express.json()); // To parse JSON request bodies from the frontend

// Function to connect to MongoDB
async function connectToMongoDB() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Get a reference to your database and collection
    // Replace 'your_database_name' with the actual database name from your MONGO_URI
    // For example, if your URI is .../agromarketplace?..., use 'agromarketplace'
    const dbName = new URL(uri).pathname.substring(1) || 'test'; // Extracts db name from URI or defaults to 'test'
    const database = client.db(dbName);
    productsCollection = database.collection('products'); // 'products' is the name of your collection

    console.log(`Connected to database: ${dbName}, collection: products`);

  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Exit the process if the database connection fails, as the server won't function without it
    process.exit(1);
  }
}

// Call the connection function when the server starts
connectToMongoDB();

// API Routes

// POST /api/products - Add a new product
app.post('/api/products', async (req, res) => {
  // Ensure the collection is available before performing operations
  if (!productsCollection) {
    return res.status(500).json({ message: 'Database not connected.' });
  }

  try {
    const productData = {
      productName: req.body.productName,
      productDescription: req.body.productDescription,
      productPrice: parseFloat(req.body.productPrice), // Ensure price is a number
      contactInfo: req.body.contactInfo,
      createdAt: new Date() // Add a timestamp for sorting
    };

    const result = await productsCollection.insertOne(productData);
    res.status(201).json({
      message: 'Product added successfully',
      insertedId: result.insertedId,
      product: productData // Return the full product data that was inserted
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(400).json({
      message: 'Error adding product',
      error: error.message
    });
  }
});

// GET /api/products - Get all products
app.get('/api/products', async (req, res) => {
  // Ensure the collection is available before performing operations
  if (!productsCollection) {
    return res.status(500).json({ message: 'Database not connected.' });
  }

  try {
    // Find all products and sort by createdAt in descending order (newest first)
    const products = await productsCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      message: 'Error fetching products',
      error: error.message
    });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown: Close MongoDB connection when the Node.js process exits
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection...');
  await client.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});