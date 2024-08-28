// Required modules
const express = require("express");
const neo4j = require("neo4j-driver");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs");

// Load environment variables from a .env file
dotenv.config();

// Extract Neo4j configuration details from environment variables
const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = process.env;

// Neo4j database connection setup
const uri = NEO4J_URI;
const user = NEO4J_USER;
const password = NEO4J_PASSWORD;
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Setting up the Express server
const app = express();
// Enable CORS for all routes
app.use(cors());
const port = process.env.PORT || 3000;

// Utility function to append an address to a local history file
async function appendAddressToHistory(address) {
  try {
    fs.appendFileSync("history.txt", address + "\n");
  } catch (err) {
    console.error("Error appending addressId to file:", err);
  }
}

// API endpoint to search for a wallet in the Neo4j database by its address
app.get("/api/search", async (req, res) => {
  const { address } = req.query;
  const session = driver.session();

  try {
    // Neo4j query that searches for a wallet by its address and its relationships
    const query = `
    MATCH (wallet:Wallet {addressId: $address})
      OPTIONAL MATCH (wallet)-[r]->(neighbour)
      WITH wallet, COLLECT({type: TYPE(r), details: r}) AS allRelationships, COLLECT(neighbour) AS neighbors
      RETURN wallet, allRelationships, neighbors
      UNION
      MATCH (wallet:Wallet {addressId: $address})
      OPTIONAL MATCH (wallet)<-[r2]-(neighbour)
      WITH wallet, COLLECT({type: TYPE(r2), details: r2}) AS allRelationships, COLLECT(neighbour) AS neighbors
      RETURN wallet, allRelationships, neighbors
    `;

    const result = await session.run(query, { address });

    // Handle the response based on the search results
    if (result.records.length === 0) {
      res.json({ error: "No wallet found" });
    } else {
      const record = result.records[0];
      if (result.records.length > 1) {
        const record2 = result.records[1];
        record.get("allRelationships").push(...record2.get("allRelationships"));
        record.get("neighbors").push(...record2.get("neighbors"));
      }
      const nodeData = record.get("wallet").properties;
      const relationships = record.get("allRelationships");
      const neighbors = record.get("neighbors").map((node) => node.properties);
      res.json({ nodeData, relationships, neighbors });
      await appendAddressToHistory(address);
    }
  } catch (error) {
    console.error("Error in API search:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    session.close();
  }
});

// API endpoint to retrieve the last 100 addresses searched in the history
app.get("/history", (req, res) => {
  fs.readFile("history.txt", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading addressIds file:", err);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const addressIds = data
        .split("\n")
        .filter(Boolean)
        .reverse()
        .slice(0, 100);

      res.json( addressIds );
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
