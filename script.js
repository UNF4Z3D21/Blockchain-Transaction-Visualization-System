//global varibale ot track if the tooltip is currently displayed
let tooltipDisplayed = false;

// Function to show the tooltip
function showTooltip(text) {
  let tooltip = document.getElementById("tooltip");
  tooltip.innerHTML = text;
  tooltip.style.display = "block";
  tooltipDisplayed = true;
}

// Function to hide the tooltip
function hideTooltip() {
  let tooltip = document.getElementById("tooltip");
  tooltip.style.display = "none";
  tooltipDisplayed = false;
}

// Function to create and display a graph based on given wallet address and data
function visualizeGraph(walletAddress, data) {
  const neighbors = data.neighbors;
  const nodes = {};
  const links = [];
  
  //getting DOM elements and setting up basic configuration
  const container = document.getElementById("graph");
  const width = container.clientWidth || 800;
  const height = 600;
  /**
   * @type {any[]}
   */
  const relationships = data.relationships;

  //check if there are any neighbor nodes
  if (neighbors.length > 0) {
    //filter relevant relationships for each neighbor
    const a = neighbors.map((neighbor) => {
      return relationships.filter((relationship) => {
        return (
          relationship.details &&
          (relationship.details.properties.To === neighbor.addressId ||
            relationship.details.properties.From === neighbor.addressId)
        );
      });
    });
    //create nodes and link for the graph
    neighbors.forEach((node, idx) => {
      nodes[walletAddress] = {
        id: walletAddress,
        type: data.nodeData.type,
        balance: data.nodeData.Balance,
      };
      nodes[node.addressId] = {
        id: node.addressId,
        type: node.type,
        balance: node.Balance,
      };
      // if(a[idx]) includes walletAddress -> push source: node.addressId, target: walletAddress
      //determine the direction of the links
      if (
        a[idx].some(
          (relationship) =>
            relationship.details.properties.To === walletAddress
        )
      ) {
        links.push({
          source: node.addressId,
          target: walletAddress,
          data: a[idx],
        });
      } else {
        links.push({
          source: walletAddress,
          target: node.addressId,
          data: a[idx],
        });
      }
    });
  } else {
    //if no neighbors found, display a message
    container.innerText = "No transaction was made by this node!";
    container.display = "block";
    container.style.color = "black";
    return;
  }

  //generate the graph visualisation using the forcegraph library
  const graph = ForceGraph()
  //set graph dimensions
    .width(width)
    .height(height)
    //provide the data for the graph
    .graphData({ nodes: Object.values(nodes), links })
    //define node labels and their properties
    .nodeLabel((node) => {
      let text = "Address: " + node.id;
      text += "<br>";
      text += "Balance: " + node.balance;
      text += "<br>";
      text += "Type: " + node.type;
      return text;
    })
    //define node colors based on their identity
    .nodeColor((node) => (node.id === walletAddress ? "blue" : "green"))
    //define visual properties of the link
    .linkDirectionalArrowLength(6)
    .onNodeClick((node) => {
      tooltip.display = "none";
      searchTransaction2(node.id);
    })
    .linkLabel((link) => "Click to see transactions")
    //define behaviour when a node is clicked
    .onLinkClick((link) => {
      let text = `<main><table>`; // Start a table
      text +=
        "<tr><th>From</th><th>To</th><th>Block Hash</th><th>Block Number</th><th>Block Timestamp</th><th>Gas</th><th>Gas Price</th><th>Gas Used</th><th>Hash</th><th>Transaction Fee</th><th>Transaction Index</th><th>Value</th></tr>";

      // Iterate over each relationship in link.data
      link.data.forEach((relationship) => {
        // Truncate each property value to the first 5 characters
        const block_hash = relationship.details.properties.block_hash;
        const block_number = relationship.details.properties.block_number;
        const block_timestamp = relationship.details.properties.block_timestamp;
        const gas = relationship.details.properties.gas;
        const gas_price = relationship.details.properties.gas_price;
        const gas_used = relationship.details.properties.gas_used;
        const hash = relationship.details.properties.hash;
        const transaction_fee = relationship.details.properties.transaction_fee;
        const transaction_index =
          relationship.details.properties.transaction_index;
        const value = relationship.details.properties.value;
        const from = relationship.details.properties.From;
        const to = relationship.details.properties.To;
        // Add rows for each property with truncated values
        text += "<tr>";
        text += `<td>${from}</td><td>${to}</td><td>${block_hash}</td><td>${block_number}</td><td>${block_timestamp}</td><td>${gas}</td><td>${gas_price}</td><td>${gas_used}</td><td>${hash}</td><td>${transaction_fee}</td><td>${transaction_index}</td><td>${value}</td>`;
        text += "</tr>";
      });

      text += "</table></main>"; // End the table
      showTooltip(text);
    });

  graph.nodeCanvasObject((node, ctx, globalScale) => {
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, 10 / globalScale, 0, 2 * Math.PI);
    ctx.fillStyle = node.id === walletAddress ? "blue" : "green";
    ctx.fill();
    ctx.closePath();

    // Draw node label
    const label = node.id; // Get the node's id
    const fontSize = 12 / globalScale; // Adjust font size based on zoom level
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.fillStyle = "black";
    ctx.fillText(label, node.x + 5, node.y); // Adjust the position as needed
  });

  container.addEventListener("click", () => {
    if (tooltipDisplayed) {
      hideTooltip();
    }
  });
  graph(container);
}

function searchTransaction2(walletAddress) {
  const apiUrl = `http://localhost:3000/api/search?address=${encodeURIComponent(
    walletAddress
  )}`;

  axios
    .get(apiUrl)
    .then((response) => {
      const data = response.data;
      const walletInfo = document.getElementById("walletInfo");
      if(data.error==="No wallet found"){
        hideTooltip();
        document.getElementById("graph").innerHTML = "";
        walletInfo.innerHTML = "Wallet not found!";
        walletInfo.style.display = "block";
        return;
      }
      else{
        walletInfo.innerHTML = `Balance: ${data.nodeData.Balance}`;
        walletInfo.style.display = "block";
      }
      const tooltip = document.getElementById("tooltip");
      if (data.relationships.length !== 0) {
        const relationships = data.relationships;
        let flag = false;
        let html = "";
        html += `<main><table>`;
        html += `<tr><th>Fromh</th><th>To</th><th>Block Hash</th><th>Block Number</th><th>Block Timestamp</th><th>Gas</th><th>Gas Price</th><th>Gas Used</th><th>Hash</th><th>Transaction Fee</th><th>Transaction Index</th><th>Value</th></tr>`;
        relationships.forEach((relationship) => {
          if (relationship.details !== null) {
            flag = true;
            const block_hash = relationship.details.properties.block_hash;
            const block_number = relationship.details.properties.block_number;
            const block_timestamp =
              relationship.details.properties.block_timestamp;
            const gas = relationship.details.properties.gas;
            const gas_price = relationship.details.properties.gas_price;
            const gas_used = relationship.details.properties.gas_used;
            const hash = relationship.details.properties.hash;
            const transaction_fee =
              relationship.details.properties.transaction_fee;
            const transaction_index =
              relationship.details.properties.transaction_index;
            const value = relationship.details.properties.value;
            const from = relationship.details.properties.From;
            const to = relationship.details.properties.To;
            // Add rows for each property with truncated values
            html += "<tr>";
            html += `<td>${from}</td><td>${to}</td><td>${block_hash}</td><td>${block_number}</td><td>${block_timestamp}</td><td>${gas}</td><td>${gas_price}</td><td>${gas_used}</td><td>${hash}</td><td>${transaction_fee}</td><td>${transaction_index}</td><td>${value}</td>`;
            html += "</tr>";
          }
        });
        html += `</table></main>`;
        if (flag) {
          tooltip.style.display = "block";
          tooltipDisplayed = true;
          tooltip.innerHTML = html;
        }
      }
      visualizeGraph(walletAddress, data);
    })
    .catch((error) => {
      console.error(
        "Error:",
        error.response ? error.response.data : error.message
      );
    });
}

function searchTransaction() {
  const walletAddress = document.getElementById("walletAddress").value;
  searchTransaction2(walletAddress);
}
